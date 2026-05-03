'use client'

import * as React from 'react'
import {
  area as turfArea,
  bbox as turfBbox,
  booleanIntersects,
  buffer as turfBuffer,
} from '@turf/turf'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'

// Per-feature bbox cache. WeakMap so GC reclaims when habitatPolygons is
// replaced. Avoids recomputing bbox for every feature on every filter
// recompute — for ~5000 features that was ~1M coordinate reads per pass.
const featureBboxCache = new WeakMap<GeoJSON.Feature, [number, number, number, number]>()
function cachedBbox(f: GeoJSON.Feature): [number, number, number, number] | null {
  const cached = featureBboxCache.get(f)
  if (cached) return cached
  try {
    const bb = turfBbox(f) as [number, number, number, number]
    featureBboxCache.set(f, bb)
    return bb
  } catch {
    return null
  }
}

interface UseHabitatSpatialFilterParams {
  results: HabitatResult[]
  habitatPolygons: GeoJSON.FeatureCollection | null
  selectedBuffer: number
  selectedHabitat: HabitatResult | null
  siteId?: string | null
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
}

export function useHabitatSpatialFilter({
  results,
  habitatPolygons,
  selectedBuffer,
  selectedHabitat,
  siteId,
  projectBoundary,
  allBoundaries,
}: UseHabitatSpatialFilterParams) {
  // Spatial filter: when a specific site is selected, filter polygons & results
  const siteFilterPolygon = React.useMemo(() => {
    if (allBoundaries && allBoundaries.length > 0) return null
    if (!siteId || !projectBoundary) return null
    try {
      return turfBuffer(projectBoundary, selectedBuffer, {
        units: 'kilometers',
      }) as GeoJSON.Feature<GeoJSON.Polygon>
    } catch {
      return null
    }
  }, [allBoundaries, siteId, projectBoundary, selectedBuffer])

  const filteredPolygons = React.useMemo((): GeoJSON.FeatureCollection | null => {
    if (!habitatPolygons) return null
    if (!siteFilterPolygon) return habitatPolygons
    // Pre-compute the site buffer's bbox once so we can short-circuit the
    // expensive booleanIntersects call for habitat polygons that are
    // obviously outside the buffer. This is the hottest path when a
    // project has thousands of NLC polygons across many sites.
    let siteBbox: [number, number, number, number] | null = null
    try {
      siteBbox = turfBbox(siteFilterPolygon) as [number, number, number, number]
    } catch {
      siteBbox = null
    }

    const filtered = habitatPolygons.features.filter((f) => {
      try {
        if (siteBbox) {
          const fb = cachedBbox(f)
          if (
            fb &&
            (fb[2] < siteBbox[0] ||
              fb[0] > siteBbox[2] ||
              fb[3] < siteBbox[1] ||
              fb[1] > siteBbox[3])
          ) {
            return false
          }
        }
        return booleanIntersects(f.geometry, siteFilterPolygon)
      } catch {
        return false
      }
    })

    // Re-pick label anchors per filtered set — the original anchor (chosen
    // by osi.ts as the largest parcel in the bbox) might have been outside
    // the site buffer and dropped, which would leave that habitat type
    // unlabeled on the map.
    const largestIndexByNlcId = new Map<string, { area: number; index: number }>()
    filtered.forEach((f, i) => {
      const nlcId = String(f.properties?.nlc_id || '')
      if (!nlcId) return
      const area = Number(f.properties?.area_hectares || 0)
      const current = largestIndexByNlcId.get(nlcId)
      if (!current || area > current.area) {
        largestIndexByNlcId.set(nlcId, { area, index: i })
      }
    })
    const anchorIndexes = new Set(Array.from(largestIndexByNlcId.values()).map((v) => v.index))

    return {
      type: 'FeatureCollection',
      features: filtered.map((f, i) => ({
        ...f,
        properties: {
          ...f.properties,
          is_label_anchor: anchorIndexes.has(i),
        },
      })),
    }
  }, [habitatPolygons, siteFilterPolygon])

  const filteredResults = React.useMemo((): HabitatResult[] => {
    if (!siteFilterPolygon || !filteredPolygons) return results
    // Group filtered polygon areas by nlcId — recalculate from actual site polygons
    const nlcAreaMap = new Map<string, { area: number; count: number }>()
    for (const f of filteredPolygons.features) {
      const nlcId = f.properties?.nlc_id
      if (!nlcId) continue
      const key = String(nlcId).trim()
      const entry = nlcAreaMap.get(key) ?? { area: 0, count: 0 }
      try {
        // turf.area returns m², convert to hectares
        entry.area += turfArea(f) / 10000
      } catch {
        // Fallback chain: feature properties first (already in hectares for
        // our own pipeline), then ArcGIS Shape__Area (always m²).
        const propAreaHa = f.properties?.area_hectares
        const shapeAreaSqm = f.properties?.Shape__Area
        if (typeof propAreaHa === 'number') entry.area += propAreaHa
        else if (typeof shapeAreaSqm === 'number') entry.area += shapeAreaSqm / 10000
      }
      entry.count++
      nlcAreaMap.set(key, entry)
    }
    return results
      .filter((r) => nlcAreaMap.has(r.nlcId))
      .map((r) => {
        const siteData = nlcAreaMap.get(r.nlcId)!
        return {
          ...r,
          areaHectares: Math.round(siteData.area * 100) / 100,
          polygonCount: siteData.count,
        }
      })
  }, [results, siteFilterPolygon, filteredPolygons])

  const filteredTotalArea = React.useMemo(
    () => Math.round(filteredResults.reduce((sum, r) => sum + r.areaHectares, 0) * 100) / 100,
    [filteredResults]
  )

  // Style polygons for map highlight — 3-field fallback matching
  const styledPolygons = React.useMemo((): GeoJSON.FeatureCollection | undefined => {
    if (!filteredPolygons) return undefined
    return {
      type: 'FeatureCollection',
      features: filteredPolygons.features.map((f) => {
        let isMatch = false
        if (selectedHabitat) {
          const p = f.properties
          if (p?.nlc_id && String(p.nlc_id).trim() === selectedHabitat.nlcId) isMatch = true
          else if (
            p?.nlc_label &&
            String(p.nlc_label).trim().toLowerCase() ===
              selectedHabitat.nlcLabel.trim().toLowerCase()
          )
            isMatch = true
          else if (
            p?.fossitt_code &&
            selectedHabitat.fossittCode !== '\u2014' &&
            String(p.fossitt_code) === selectedHabitat.fossittCode
          )
            isMatch = true
        }
        return {
          ...f,
          properties: {
            ...f.properties,
            fillOpacity: !selectedHabitat ? 0.35 : isMatch ? 0.85 : 0.05,
          },
        }
      }),
    }
  }, [filteredPolygons, selectedHabitat])

  return {
    filteredPolygons,
    filteredResults,
    filteredTotalArea,
    styledPolygons,
  }
}
