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
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
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

  const performSearch = React.useCallback(async () => {
    // Multi-site "All Sites" mode: search all site boundaries with bounded
    // concurrency. We used to call `Promise.all(tasks)` which fires every
    // request at once — for projects with 20+ sites this overwhelms the
    // underlying APIs (NPWS/NBDC/EPA rate-limit or time out) and any single
    // rejection nukes the whole batch. Using `batchAsync` with `allSettled`
    // semantics keeps the load sane and preserves successful sites even when
    // a few fail.
    if (allBoundaries && allBoundaries.length > 0) {
      const bboxes = allBoundaries
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
    searchBoundary,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    setSearchResults,
    config,
    toast,
  ])

  // Assign ref so useSubstepSearch can trigger performSearch
  performSearchRef.current = performSearch

  return { isSearching, searchProgress, performSearch }
}
