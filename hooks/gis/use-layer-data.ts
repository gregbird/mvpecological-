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

  // Fetch layer data for all categories
  const fetchLayerData = React.useCallback(
    async (boundary: GeoJSON.Feature<GeoJSON.Polygon>, enabledBuffers: number[]) => {
      if (layerDataFetchedRef.current) return
      layerDataFetchedRef.current = true

      const coords = boundary.geometry.coordinates[0]
      const lats = coords.map((c) => c[1])
      const lngs = coords.map((c) => c[0])
      const maxBuffer = enabledBuffers.length > 0 ? Math.max(...enabledBuffers) : 5
      const bufferDegrees = maxBuffer / 111

      const bbox = {
        minLat: Math.min(...lats) - bufferDegrees,
        maxLat: Math.max(...lats) + bufferDegrees,
        minLng: Math.min(...lngs) - bufferDegrees,
        maxLng: Math.max(...lngs) + bufferDegrees,
      }

      // Fetch all layer data in parallel
      setLayerDataLoading({ npws: true, rivers: true, lakes: true, catchments: true })

      const siteTypes: DesignatedSiteType[] = ['SAC', 'SPA', 'NHA', 'pNHA']

      const [npwsResult, riversResult, lakesResult, catchmentsResult] = await Promise.allSettled([
        queryDesignatedSites({
          bbox: { minX: bbox.minLng, minY: bbox.minLat, maxX: bbox.maxLng, maxY: bbox.maxLat },
          siteTypes,
        }),
        searchRivers({ bbox, limit: 100 }),
        searchLakes({ bbox, limit: 100 }),
        searchCatchments({ bbox, limit: 50 }),
      ])

      if (npwsResult.status === 'fulfilled') {
        setLayerData((prev) => ({ ...prev, npwsSites: npwsResult.value }))
      } else {
        console.error('Error fetching NPWS sites:', npwsResult.reason)
      }
      setLayerDataLoading((prev) => ({ ...prev, npws: false }))

      if (riversResult.status === 'fulfilled') {
        setLayerData((prev) => ({ ...prev, rivers: riversResult.value }))
      } else {
        console.error('Error fetching rivers:', riversResult.reason)
      }
      setLayerDataLoading((prev) => ({ ...prev, rivers: false }))

      if (lakesResult.status === 'fulfilled') {
        setLayerData((prev) => ({ ...prev, lakes: lakesResult.value }))
      } else {
        console.error('Error fetching lakes:', lakesResult.reason)
      }
      setLayerDataLoading((prev) => ({ ...prev, lakes: false }))

      if (catchmentsResult.status === 'fulfilled') {
        setLayerData((prev) => ({ ...prev, catchments: catchmentsResult.value }))
      } else {
        console.error('Error fetching catchments:', catchmentsResult.reason)
      }
      setLayerDataLoading((prev) => ({ ...prev, catchments: false }))
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
