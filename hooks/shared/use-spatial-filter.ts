'use client'

import { useMemo } from 'react'

interface SpatialFilterOptions<T> {
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferKm: number
  items: T[]
  getGeometry: (item: T) => GeoJSON.Geometry | null | undefined
  /** When true, skip filtering (e.g., "All Sites" mode) */
  disabled?: boolean
}

interface SpatialFilterResult<T> {
  filteredItems: T[]
  filterPolygon: GeoJSON.Feature<GeoJSON.Polygon> | null
}

export function useSpatialFilter<T>(options: SpatialFilterOptions<T>): SpatialFilterResult<T> {
  const { boundary, bufferKm, items, getGeometry, disabled } = options

  const filterPolygon = useMemo(() => {
    if (disabled || !boundary) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const turf = require('@turf/turf')
      return turf.buffer(boundary, bufferKm, {
        units: 'kilometers',
      }) as GeoJSON.Feature<GeoJSON.Polygon>
    } catch {
      return null
    }
  }, [disabled, boundary, bufferKm])

  const filteredItems = useMemo(() => {
    if (!filterPolygon) return items
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')

    // Pre-compute filter bbox for fast rejection
    const filterBbox = turf.bbox(filterPolygon) as [number, number, number, number]

    const bboxOverlaps = (geom: GeoJSON.Geometry): boolean => {
      try {
        const geomBbox = turf.bbox(geom) as [number, number, number, number]
        return (
          geomBbox[0] <= filterBbox[2] &&
          geomBbox[2] >= filterBbox[0] &&
          geomBbox[1] <= filterBbox[3] &&
          geomBbox[3] >= filterBbox[1]
        )
      } catch {
        return true
      }
    }

    const intersects = (geom: GeoJSON.Geometry): boolean => {
      try {
        if (geom.type === 'Point') {
          return turf.booleanPointInPolygon(geom, filterPolygon)
        }
        if (geom.type === 'GeometryCollection') {
          return geom.geometries.some((g: GeoJSON.Geometry) => intersects(g))
        }
        // Fast bbox rejection before expensive intersection test
        if (!bboxOverlaps(geom)) return false
        return turf.booleanIntersects(geom, filterPolygon)
      } catch {
        return false
      }
    }

    return items.filter((item) => {
      const geom = getGeometry(item)
      if (!geom) return true
      return intersects(geom)
    })
  }, [items, filterPolygon, getGeometry])

  return { filteredItems, filterPolygon }
}
