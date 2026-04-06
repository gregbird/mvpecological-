'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import { useToast } from '@/hooks/use-toast'
import { batchAsync } from '@/lib/utils/batch-async'

/** Max concurrent external API calls when searching multiple sites.
 *  NPWS has a 10s timeout and most public APIs rate-limit at 5-10 req/s —
 *  firing 20+ concurrent requests reliably times out or drops results. */
const SITE_SEARCH_CONCURRENCY = 3

interface UseShellSearchParams {
  config: SubstepShellConfig
  /** Currently-selected site boundaries (narrowed by the site selector).
   *  Used for display-time spatial filtering. */
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** ALL project site boundaries, regardless of site selection. Search is
   *  always project-wide so the manual `Search` button refreshes every
   *  site's data instead of narrowing to the currently selected one (which
   *  would silently overwrite the project-level cache with partial data). */
  allSiteBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  selectedBuffer: number
  setSearchResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  performSearchRef: React.MutableRefObject<(() => Promise<void>) | null>
}

interface UseShellSearchReturn {
  isSearching: boolean
  searchProgress: string | null
  performSearch: () => Promise<void>
}

export function useShellSearch({
  config,
  allBoundaries,
  allSiteBoundaries,
  searchBoundary,
  projectBoundary,
  projectCenter,
  selectedBuffer,
  setSearchResults,
  performSearchRef,
}: UseShellSearchParams): UseShellSearchReturn {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchProgress, setSearchProgress] = React.useState<string | null>(null)

  // Config object is usually recreated every render by substep callers, so
  // we keep it behind a ref to prevent `performSearch` from being rebuilt on
  // every render (which would in turn invalidate every downstream hook dep).
  // The ref is always up-to-date because we assign during render.
  const configRef = React.useRef(config)
  configRef.current = config

  const performSearch = React.useCallback(async () => {
    const config = configRef.current
    // Search ALWAYS runs at the project level regardless of the site
    // selector. The site selector is a view filter — narrowing the search
    // scope to a single site would silently wipe out the other sites'
    // project-level cache.
    //
    // Priority for multi-site fan-out:
    //   1. `allSiteBoundaries` — every site in the project (preferred)
    //   2. `allBoundaries` — legacy path, same data when nothing is
    //      selected; kept as fallback for callers that don't thread
    //      `allSiteBoundaries` through yet
    //
    // Substeps may opt out of per-site fan-out by setting
    // `multiSiteSearchMode: 'merged'` in their config — e.g. species records,
    // which run a single NBDC report request over the union of all site
    // grid squares. For merged mode we fall through to the single-site path
    // below, using the merged `searchBoundary` for the bbox.
    const effectiveMultiSiteBoundaries =
      allSiteBoundaries && allSiteBoundaries.length > 0
        ? allSiteBoundaries
        : allBoundaries && allBoundaries.length > 0
          ? allBoundaries
          : undefined

    if (
      config.multiSiteSearchMode !== 'merged' &&
      effectiveMultiSiteBoundaries &&
      effectiveMultiSiteBoundaries.length > 1
    ) {
      const bboxes = effectiveMultiSiteBoundaries
        .map((boundary) => {
          const bbox = getBoundingBox(boundary, null, selectedBuffer)
          return bbox ? { boundary, bbox } : null
        })
        .filter(Boolean) as Array<{
        boundary: GeoJSON.Feature<GeoJSON.Polygon>
        bbox: NonNullable<ReturnType<typeof getBoundingBox>>
      }>

      if (bboxes.length === 0) return

      setIsSearching(true)
      setSearchProgress(`0/${bboxes.length} sites...`)
      setSearchResults([])

      let completed = 0
      const tasks = bboxes.map(({ boundary, bbox }) => async () => {
        try {
          const result = await config.performSearch({
            bbox: {
              minLat: bbox.minLat,
              maxLat: bbox.maxLat,
              minLng: bbox.minLng,
              maxLng: bbox.maxLng,
            },
            buffer: selectedBuffer,
            boundary,
          })
          return result
        } finally {
          completed += 1
          setSearchProgress(`${completed}/${bboxes.length} sites...`)
        }
      })

      const settled = await batchAsync(tasks, SITE_SEARCH_CONCURRENCY)

      // Merge successful results; collect failures without throwing away the rest
      const merged: FindingDisplay[] = []
      const seenIndex = new Map<string, number>()
      let failedSites = 0
      for (const outcome of settled) {
        if (outcome.status === 'rejected') {
          failedSites += 1
          console.warn(
            `[${config.cacheKeyPrefix}] site search failed:`,
            outcome.reason instanceof Error ? outcome.reason.message : outcome.reason
          )
          continue
        }
        for (const f of outcome.value) {
          const existing = seenIndex.get(f.id)
          if (existing === undefined) {
            seenIndex.set(f.id, merged.length)
            merged.push(f)
          } else {
            // Merge gridSquares so spatial filter works across all sites
            const prev = merged[existing]
            const prevGrids = (prev.metadata?.gridSquares ?? []) as string[]
            const newGrids = (f.metadata?.gridSquares ?? []) as string[]
            if (newGrids.length > 0 && prev.metadata) {
              const combined = new Set([...prevGrids, ...newGrids])
              prev.metadata = { ...prev.metadata, gridSquares: Array.from(combined) }
            }
          }
        }
      }

      setSearchResults(merged)

      if (config.onPostSearch && merged.length > 0) {
        config.onPostSearch(merged, setSearchResults)
      }

      if (failedSites > 0) {
        toast({
          variant: failedSites === bboxes.length ? 'destructive' : 'default',
          title:
            failedSites === bboxes.length
              ? 'Search failed'
              : `Partial results (${bboxes.length - failedSites}/${bboxes.length} sites)`,
          description:
            failedSites === bboxes.length
              ? `Could not fetch data from ${config.searchButtonLabel.replace('Search ', '')}.`
              : `${failedSites} site${failedSites === 1 ? '' : 's'} failed — results from the rest are shown.`,
        })
      }

      setIsSearching(false)
      setSearchProgress(null)
      return
    }

    // Single site or specific site
    const effectiveBoundary = searchBoundary ?? projectBoundary
    const bbox = getBoundingBox(effectiveBoundary, projectCenter, selectedBuffer)
    if (!bbox) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Please define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      const findings = await config.performSearch({
        bbox: {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        buffer: selectedBuffer,
        boundary: effectiveBoundary,
        // Pass ALL project site boundaries in merged multi-site mode so the
        // substep (e.g. species records) can build a tighter search
        // geometry from the union of site buffers — independent of the
        // current site selection so cache never narrows accidentally.
        allBoundaries:
          config.multiSiteSearchMode === 'merged' && effectiveMultiSiteBoundaries
            ? effectiveMultiSiteBoundaries
            : undefined,
      })

      setSearchResults(findings)

      if (config.onPostSearch && findings.length > 0) {
        config.onPostSearch(findings, setSearchResults)
      }
    } catch (error) {
      console.error(`${config.cacheKeyPrefix} search error:`, error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: `Could not fetch data from ${config.searchButtonLabel.replace('Search ', '')}.`,
      })
    } finally {
      setIsSearching(false)
    }
  }, [
    allBoundaries,
    allSiteBoundaries,
    searchBoundary,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    setSearchResults,
    toast,
  ])

  // Assign ref so useSubstepSearch can trigger performSearch
  performSearchRef.current = performSearch

  return { isSearching, searchProgress, performSearch }
}
