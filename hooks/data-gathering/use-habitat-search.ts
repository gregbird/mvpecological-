'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import {
  searchNlcLandCover,
  fetchNlcPolygons,
  type AggregatedHabitat,
} from '@/lib/external-apis/osi'
import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { batchAsync } from '@/lib/utils/batch-async'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'

/** Max concurrent NLC API requests when searching multi-site projects.
 *  OSI ArcGIS tends to time out with many parallel large-bbox queries. */
const HABITAT_SEARCH_CONCURRENCY = 3

/** Merge AggregatedHabitat lists into a single deduplicated map. */
function mergeAggregated(lists: AggregatedHabitat[][]): Map<string, AggregatedHabitat> {
  const merged = new Map<string, AggregatedHabitat>()
  for (const aggregated of lists) {
    for (const h of aggregated) {
      const existing = merged.get(h.nlcId)
      if (existing) {
        existing.areaHectares += h.areaHectares
        existing.polygonCount += h.polygonCount
      } else {
        merged.set(h.nlcId, { ...h })
      }
    }
  }
  return merged
}

interface UseHabitatSearchParams {
  projectId: string
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  bufferDistances: number[]
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error') => void
}

export function useHabitatSearch({
  projectId,
  projectBoundary,
  projectCenter,
  allBoundaries,
  bufferDistances,
  autoSearchTrigger,
  onAutoSearchComplete,
}: UseHabitatSearchParams) {
  const { toast } = useToast()
  // Cache key is project-level — search covers all sites, filtering is at display time
  const cacheKey = `nlc-habitat-${projectId}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = useSessionStorage<HabitatResult[]>(cacheKey, [])
  const [habitatPolygons, setHabitatPolygons] = React.useState<GeoJSON.FeatureCollection | null>(
    null
  )
  const [selectedBuffer, setSelectedBuffer] = React.useState(bufferDistances[0] || 2)

  /** Build per-site bbox list for multi-site, or single bbox for single-site */
  const buildBboxList = React.useCallback(
    (buffer: number) => {
      if (allBoundaries && allBoundaries.length > 0) {
        return allBoundaries
          .map((b) => getBoundingBox(b, null, buffer))
          .filter(Boolean) as NonNullable<ReturnType<typeof getBoundingBox>>[]
      }
      // Single-site: use only the selected site's boundary, not the merged multi-site bbox.
      // searchBoundary covers ALL sites — using it here would fetch data from the entire
      // project area, producing dissolved MultiPolygons too large to filter accurately.
      const bbox = getBoundingBox(projectBoundary, projectCenter, buffer)
      return bbox ? [bbox] : []
    },
    [allBoundaries, projectBoundary, projectCenter]
  )

  // Debounced sessionStorage write — must survive unmount during auto-search.
  // If the substep is unmounted (e.g. auto-search finishes while user is on a
  // different tab) while the timer is still pending, a plain clearTimeout on
  // cleanup would discard the write and the cache would stay empty.
  const cacheTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestResultsRef = React.useRef(results)
  latestResultsRef.current = results

  const writeResultsCache = React.useCallback(
    (resultsToWrite: HabitatResult[]) => {
      if (resultsToWrite.length === 0) return
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(resultsToWrite))
      } catch {
        // SessionStorage full — habitat results are small, unlikely to fail
      }
    },
    [cacheKey]
  )

  const writeResultsCacheRef = React.useRef(writeResultsCache)
  writeResultsCacheRef.current = writeResultsCache

  React.useEffect(() => {
    if (results.length === 0) return
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      writeResultsCacheRef.current(latestResultsRef.current)
      cacheTimerRef.current = null
    }, 300)
  }, [results])

  // Flush pending write on actual unmount (empty deps)
  React.useEffect(() => {
    return () => {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current)
        cacheTimerRef.current = null
      }
      writeResultsCacheRef.current(latestResultsRef.current)
    }
  }, [])

  // Auto-refetch polygons when switching back to this tab (results exist from
  // sessionStorage). `habitatPolygons` is kept in React state and is lost when
  // the substep unmounts — so on re-mount we re-fetch from the NLC API.
  const hasFetchedRef = React.useRef(false)
  React.useEffect(() => {
    if (results.length === 0 || habitatPolygons || isSearching || hasFetchedRef.current) return
    hasFetchedRef.current = true
    const bboxes = buildBboxList(selectedBuffer)
    if (bboxes.length === 0) {
      hasFetchedRef.current = false
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const allFeatures: GeoJSON.Feature[] = []
        for (const bbox of bboxes) {
          const fc = await fetchNlcPolygons({
            bbox: {
              minLat: bbox.minLat,
              maxLat: bbox.maxLat,
              minLng: bbox.minLng,
              maxLng: bbox.maxLng,
            },
          })
          allFeatures.push(...fc.features)
        }
        if (cancelled) return
        setHabitatPolygons({
          type: 'FeatureCollection',
          features: allFeatures,
        })
      } catch (error) {
        console.error('Failed to re-fetch NLC polygons:', error)
        // Allow a retry on the next mount / effect run
        hasFetchedRef.current = false
      }
    })()
    return () => {
      cancelled = true
    }
  }, [results, habitatPolygons, isSearching, buildBboxList, selectedBuffer])

  // Auto-search: triggered by parent data-gathering-step
  const autoSearchTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (!autoSearchTrigger || autoSearchTriggeredRef.current) return
    if (!projectBoundary) {
      onAutoSearchComplete?.('error')
      return
    }
    // Already have cached results — skip
    if (results.length > 0) {
      onAutoSearchComplete?.('done')
      return
    }
    autoSearchTriggeredRef.current = true

    const bboxes = buildBboxList(selectedBuffer)
    if (bboxes.length === 0) {
      onAutoSearchComplete?.('error')
      return
    }

    setIsSearching(true)
    const bboxParamsList = bboxes.map((bbox) => ({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
    }))

    // Auto-search: fetch lightweight aggregate stats for each site with
    // bounded concurrency (multi-site projects with 10+ sites used to hit
    // OSI ArcGIS timeouts when fired all at once).
    const statsTasks = bboxParamsList.map((p) => () => searchNlcLandCover(p))
    batchAsync(statsTasks, HABITAT_SEARCH_CONCURRENCY)
      .then((settled) => {
        const successful: AggregatedHabitat[][] = []
        let failedSites = 0
        for (const outcome of settled) {
          if (outcome.status === 'fulfilled') {
            successful.push(outcome.value)
          } else {
            failedSites += 1
            console.warn('Habitat stats site failed:', outcome.reason)
          }
        }

        if (successful.length === 0) {
          onAutoSearchComplete?.('error')
          return
        }

        const mergedMap = mergeAggregated(successful)
        const merged = Array.from(mergedMap.values())

        if (merged.length === 0) {
          onAutoSearchComplete?.('done')
          return
        }
        const mapped: HabitatResult[] = merged.map((h: AggregatedHabitat) => {
          const fossitt = mapNlcToFossitt(h.nlcId)
          return {
            nlcId: h.nlcId,
            nlcLabel: h.nlcLabel,
            nlcLevel1: h.nlcLevel1,
            fossittCode: fossitt?.fossittCode || '\u2014',
            fossittName: fossitt?.fossittName || h.nlcLabel,
            areaHectares: h.areaHectares,
            polygonCount: h.polygonCount,
          }
        })
        setResults(mapped)
        onAutoSearchComplete?.('done')

        if (failedSites > 0) {
          toast({
            title: `Habitats: partial results (${bboxParamsList.length - failedSites}/${bboxParamsList.length} sites)`,
            description: `${failedSites} site${failedSites === 1 ? '' : 's'} failed to load habitat stats.`,
          })
        }

        // Claim the re-fetch lock BEFORE kicking off the background polygon
        // fetch. Without this, the auto-refetch effect can race with the
        // background fetch and trigger a duplicate request.
        hasFetchedRef.current = true
        // Fetch polygons in background (non-blocking) for map display
        const polyTasks = bboxParamsList.map((p) => () => fetchNlcPolygons(p))
        batchAsync(polyTasks, HABITAT_SEARCH_CONCURRENCY)
          .then((polySettled) => {
            const allFeatures: GeoJSON.Feature[] = []
            let polyFailures = 0
            for (const outcome of polySettled) {
              if (outcome.status === 'fulfilled') {
                allFeatures.push(...outcome.value.features)
              } else {
                polyFailures += 1
                console.warn('Habitat polygons site failed:', outcome.reason)
              }
            }
            if (allFeatures.length === 0 && polyFailures > 0) {
              // All polygon fetches failed — release the lock so the
              // auto-refetch effect can retry on the next mount
              hasFetchedRef.current = false
              return
            }
            setHabitatPolygons({
              type: 'FeatureCollection',
              features: allFeatures,
            })
          })
          .catch((error) => {
            console.error('Auto-search: unexpected error fetching NLC polygons:', error)
            hasFetchedRef.current = false
          })
      })
      .catch((error) => {
        console.error('Auto-search: unexpected error fetching NLC stats:', error)
        onAutoSearchComplete?.('error')
      })
      .finally(() => {
        setIsSearching(false)
      })
  }, [
    autoSearchTrigger,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    results.length,
    onAutoSearchComplete,
  ])

  const performSearch = async () => {
    const bboxes = buildBboxList(selectedBuffer)
    if (bboxes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setResults([])
    setHabitatPolygons(null)
    hasFetchedRef.current = true

    const bboxParamsList = bboxes.map((bbox) => ({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
    }))

    try {
      // Fetch stats + polygons for each site with bounded concurrency
      // (was strictly sequential — too slow for 20+ sites; Promise.all was
      // previously tried but hit ArcGIS server timeouts).
      const tasks = bboxParamsList.map(
        (p) => async (): Promise<[AggregatedHabitat[], GeoJSON.FeatureCollection]> => {
          const [aggregated, polygons] = await Promise.all([
            searchNlcLandCover(p),
            fetchNlcPolygons(p),
          ])
          return [aggregated, polygons]
        }
      )
      const settled = await batchAsync(tasks, HABITAT_SEARCH_CONCURRENCY)

      const successfulResults: [AggregatedHabitat[], GeoJSON.FeatureCollection][] = []
      let failedSites = 0
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          successfulResults.push(outcome.value)
        } else {
          failedSites += 1
          console.warn('NLC site search failed:', outcome.reason)
        }
      }

      if (successfulResults.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Search failed',
          description: 'Could not fetch land cover data.',
        })
        setIsSearching(false)
        return
      }

      // Merge aggregated results by nlcId
      const mergedMap = mergeAggregated(successfulResults.map(([a]) => a))
      const mergedAggregated = Array.from(mergedMap.values())

      // Merge polygon collections
      const mergedPolygons: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: successfulResults.flatMap(([, polygons]) => polygons.features),
      }

      if (mergedAggregated.length === 0) {
        toast({ title: 'No habitats found', description: 'No land cover data in buffer zone.' })
        setIsSearching(false)
        return
      }

      const mapped: HabitatResult[] = mergedAggregated.map((h: AggregatedHabitat) => {
        const fossitt = mapNlcToFossitt(h.nlcId)
        return {
          nlcId: h.nlcId,
          nlcLabel: h.nlcLabel,
          nlcLevel1: h.nlcLevel1,
          fossittCode: fossitt?.fossittCode || '\u2014',
          fossittName: fossitt?.fossittName || h.nlcLabel,
          areaHectares: h.areaHectares,
          polygonCount: h.polygonCount,
        }
      })

      setResults(mapped)
      setHabitatPolygons(mergedPolygons)

      const totalPolygons = mapped.reduce((sum, m) => sum + m.polygonCount, 0)
      if (failedSites > 0) {
        toast({
          title: `Habitats: partial results (${successfulResults.length}/${bboxParamsList.length} sites)`,
          description: `${mapped.length} habitat types from ${totalPolygons.toLocaleString()} polygons. ${failedSites} site${failedSites === 1 ? '' : 's'} failed.`,
        })
      } else {
        toast({
          title: 'Habitat data loaded',
          description: `Found ${mapped.length} habitat types from ${totalPolygons.toLocaleString()} polygons.`,
        })
      }
    } catch (error) {
      console.error('NLC search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch land cover data.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  /** Reset auto-save trigger when a manual search is performed */
  const resetAutoSave = React.useCallback(() => {
    // Exposed so the main component can reset autoSaveTriggeredRef
  }, [])

  return {
    cacheKey,
    isSearching,
    results,
    habitatPolygons,
    selectedBuffer,
    setSelectedBuffer,
    performSearch,
    resetAutoSave,
    hasFetchedRef,
  }
}
