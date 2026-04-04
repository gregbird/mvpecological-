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
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'

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

  // Debounced sessionStorage write
  const cacheTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (results.length === 0) return
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(results))
      } catch {
        // SessionStorage full — habitat results are small, unlikely to fail
      }
    }, 1000)
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [results, cacheKey])

  // Auto-refetch polygons when switching back to this tab (results exist from sessionStorage)
  const hasFetchedRef = React.useRef(false)
  React.useEffect(() => {
    if (results.length > 0 && !habitatPolygons && !isSearching && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      const bboxes = buildBboxList(selectedBuffer)
      if (bboxes.length > 0) {
        // Fetch sequentially to avoid ArcGIS timeouts
        ;(async () => {
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
          setHabitatPolygons({
            type: 'FeatureCollection',
            features: allFeatures,
          })
        })()
      }
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

    // Auto-search: fetch lightweight aggregate stats for each site, then merge
    Promise.all(bboxParamsList.map((p) => searchNlcLandCover(p)))
      .then((allAggregated) => {
        const mergedMap = new Map<string, AggregatedHabitat>()
        for (const aggregated of allAggregated) {
          for (const h of aggregated) {
            const existing = mergedMap.get(h.nlcId)
            if (existing) {
              existing.areaHectares += h.areaHectares
              existing.polygonCount += h.polygonCount
            } else {
              mergedMap.set(h.nlcId, { ...h })
            }
          }
        }
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
        // Fetch polygons in background (non-blocking) for map display
        Promise.all(bboxParamsList.map((p) => fetchNlcPolygons(p))).then((collections) => {
          const mergedPolygons: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: collections.flatMap((c) => c.features),
          }
          setHabitatPolygons(mergedPolygons)
          hasFetchedRef.current = true
        })
      })
      .catch(() => {
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
      // Fetch sequentially to avoid ArcGIS server timeouts with multiple large bboxes
      const allSearchResults: [AggregatedHabitat[], GeoJSON.FeatureCollection][] = []
      for (const p of bboxParamsList) {
        const [aggregated, polygons] = await Promise.all([
          searchNlcLandCover(p),
          fetchNlcPolygons(p),
        ])
        allSearchResults.push([aggregated, polygons])
      }

      // Merge aggregated results by nlcId
      const mergedMap = new Map<string, AggregatedHabitat>()
      for (const [aggregated] of allSearchResults) {
        for (const h of aggregated) {
          const existing = mergedMap.get(h.nlcId)
          if (existing) {
            existing.areaHectares += h.areaHectares
            existing.polygonCount += h.polygonCount
          } else {
            mergedMap.set(h.nlcId, { ...h })
          }
        }
      }
      const mergedAggregated = Array.from(mergedMap.values())

      // Merge polygon collections
      const mergedPolygons: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allSearchResults.flatMap(([, polygons]) => polygons.features),
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
      toast({
        title: 'Habitat data loaded',
        description: `Found ${mapped.length} habitat types from ${totalPolygons.toLocaleString()} polygons.`,
      })
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
