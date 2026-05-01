'use client'

import * as React from 'react'
import {
  queryDesignatedSites,
  type NPWSDesignatedSite,
  type DesignatedSiteType,
} from '@/lib/external-apis/npws'
import {
  searchRivers,
  searchLakes,
  searchCatchments,
  type EPARiver,
  type EPALake,
  type EPACatchment,
} from '@/lib/external-apis/epa'
import { getDefaultVisibleLayers } from '@/lib/config/dataset-layers'
import { batchAsync } from '@/lib/utils/batch-async'
import { getPrimaryBuffer } from '@/lib/gis'
import type { Project } from '@/types/database'

export interface LayerDataState {
  npwsSites: NPWSDesignatedSite[]
  rivers: EPARiver[]
  lakes: EPALake[]
  catchments: EPACatchment[]
}

export function useLayerData(project: Project) {
  const [visibleLayers, setVisibleLayers] = React.useState<string[]>(() => {
    return (project.visible_layers as string[] | null) ?? getDefaultVisibleLayers()
  })

  const [layerData, setLayerData] = React.useState<LayerDataState>({
    npwsSites: [],
    rivers: [],
    lakes: [],
    catchments: [],
  })
  const [layerDataLoading, setLayerDataLoading] = React.useState<Record<string, boolean>>({})
  const [expandedLayers, setExpandedLayers] = React.useState<Set<string>>(new Set())

  // Track ignored and deleted items (persisted to sessionStorage)
  const [ignoredItems, setIgnoredItems] = React.useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`gis-ignored-${project.id}`)
      if (cached) return new Set(JSON.parse(cached))
    }
    return new Set()
  })
  const [deletedItems, setDeletedItems] = React.useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`gis-deleted-${project.id}`)
      if (cached) return new Set(JSON.parse(cached))
    }
    return new Set()
  })

  // Persist ignored/deleted items to sessionStorage
  React.useEffect(() => {
    sessionStorage.setItem(`gis-ignored-${project.id}`, JSON.stringify([...ignoredItems]))
  }, [ignoredItems, project.id])
  React.useEffect(() => {
    sessionStorage.setItem(`gis-deleted-${project.id}`, JSON.stringify([...deletedItems]))
  }, [deletedItems, project.id])

  // Track which categories show all items
  const [showAllItems, setShowAllItems] = React.useState<Set<string>>(new Set())

  // Cache flag to prevent re-fetching
  const layerDataFetchedRef = React.useRef(false)

  const handleLayerToggle = React.useCallback((layerId: string) => {
    setVisibleLayers((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    )
  }, [])

  const handleToggleIgnore = React.useCallback((itemKey: string) => {
    setIgnoredItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemKey)) next.delete(itemKey)
      else next.add(itemKey)
      return next
    })
  }, [])

  const handleDeleteItem = React.useCallback((itemKey: string) => {
    setDeletedItems((prev) => {
      const next = new Set(prev)
      next.add(itemKey)
      return next
    })
  }, [])

  const handleToggleExpand = React.useCallback((layerKey: string, open: boolean) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev)
      if (open) next.add(layerKey)
      else next.delete(layerKey)
      return next
    })
  }, [])

  const handleToggleShowAll = React.useCallback((category: string) => {
    setShowAllItems((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  // Fetch layer data for all categories.
  // Queries each boundary separately in parallel, then deduplicates results.
  const fetchLayerData = React.useCallback(
    async (
      boundaryOrBoundaries: GeoJSON.Feature<GeoJSON.Polygon> | GeoJSON.Feature<GeoJSON.Polygon>[],
      enabledBuffers: number[]
    ) => {
      if (layerDataFetchedRef.current) return
      layerDataFetchedRef.current = true

      const boundaries = Array.isArray(boundaryOrBoundaries)
        ? boundaryOrBoundaries
        : [boundaryOrBoundaries]

      const primaryBuffer = getPrimaryBuffer(enabledBuffers)
      const bufferDegrees = primaryBuffer / 111

      setLayerDataLoading({ npws: true, rivers: true, lakes: true, catchments: true })

      const siteTypes: DesignatedSiteType[] = ['SAC', 'SPA', 'NHA', 'pNHA']

      try {
        // Query each boundary with concurrency limit (max 3 at a time)
        const tasks = boundaries.map((boundary) => async () => {
          const coords = boundary.geometry.coordinates[0]
          const lats = coords.map((c) => c[1])
          const lngs = coords.map((c) => c[0])
          const bbox = {
            minLat: Math.min(...lats) - bufferDegrees,
            maxLat: Math.max(...lats) + bufferDegrees,
            minLng: Math.min(...lngs) - bufferDegrees,
            maxLng: Math.max(...lngs) + bufferDegrees,
          }

          return Promise.allSettled([
            queryDesignatedSites({
              bbox: { minX: bbox.minLng, minY: bbox.minLat, maxX: bbox.maxLng, maxY: bbox.maxLat },
              siteTypes,
            }),
            searchRivers({ bbox, limit: 100 }),
            searchLakes({ bbox, limit: 100 }),
            searchCatchments({ bbox, limit: 50 }),
          ])
        })
        const perSiteResults = await batchAsync(tasks, 3)

        // Merge and deduplicate across all sites
        const seenNpws = new Set<string>()
        const seenRivers = new Set<string>()
        const seenLakes = new Set<string>()
        const seenCatchments = new Set<string>()
        const merged: LayerDataState = { npwsSites: [], rivers: [], lakes: [], catchments: [] }

        for (const siteResult of perSiteResults) {
          if (siteResult.status !== 'fulfilled') continue
          const [npws, rivers, lakes, catchments] = siteResult.value

          if (npws.status === 'fulfilled') {
            for (const s of npws.value) {
              const key = `${s.SITE_TYPE}-${s.SITECODE}`
              if (!seenNpws.has(key)) {
                seenNpws.add(key)
                merged.npwsSites.push(s)
              }
            }
          }
          if (rivers.status === 'fulfilled') {
            for (const r of rivers.value) {
              if (r.RiverCode && !seenRivers.has(r.RiverCode)) {
                seenRivers.add(r.RiverCode)
                merged.rivers.push(r)
              }
            }
          }
          if (lakes.status === 'fulfilled') {
            for (const l of lakes.value) {
              if (l.LakeCode && !seenLakes.has(l.LakeCode)) {
                seenLakes.add(l.LakeCode)
                merged.lakes.push(l)
              }
            }
          }
          if (catchments.status === 'fulfilled') {
            for (const c of catchments.value) {
              if (c.CatchmentId && !seenCatchments.has(c.CatchmentId)) {
                seenCatchments.add(c.CatchmentId)
                merged.catchments.push(c)
              }
            }
          }
        }

        setLayerData(merged)
      } catch (error) {
        console.error('Error fetching layer data:', error)
      } finally {
        setLayerDataLoading({ npws: false, rivers: false, lakes: false, catchments: false })
      }
    },
    []
  )

  // Reset cache when boundary changes
  const resetLayerCache = React.useCallback(() => {
    layerDataFetchedRef.current = false
  }, [])

  return {
    visibleLayers,
    setVisibleLayers,
    layerData,
    layerDataLoading,
    expandedLayers,
    ignoredItems,
    deletedItems,
    showAllItems,
    layerDataFetchedRef,
    handleLayerToggle,
    handleToggleIgnore,
    handleDeleteItem,
    handleToggleExpand,
    handleToggleShowAll,
    fetchLayerData,
    resetLayerCache,
  }
}
