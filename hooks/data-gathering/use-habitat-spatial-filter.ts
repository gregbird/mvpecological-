'use client'

import * as React from 'react'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'

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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const turf = require('@turf/turf')
      return turf.buffer(projectBoundary, selectedBuffer, {
        units: 'kilometers',
      }) as GeoJSON.Feature<GeoJSON.Polygon>
    } catch {
      return null
    }
  }, [allBoundaries, siteId, projectBoundary, selectedBuffer])

  const filteredPolygons = React.useMemo((): GeoJSON.FeatureCollection | null => {
    if (!habitatPolygons) return null
    if (!siteFilterPolygon) return habitatPolygons
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')
    return {
      type: 'FeatureCollection',
      features: habitatPolygons.features.filter((f) => {
        try {
          return turf.booleanIntersects(f.geometry, siteFilterPolygon)
        } catch {
          return false
        }
      }),
    }
  }, [habitatPolygons, siteFilterPolygon])

  const filteredResults = React.useMemo((): HabitatResult[] => {
    if (!siteFilterPolygon || !filteredPolygons) return results
    const nlcIdsInSite = new Set<string>()
    for (const f of filteredPolygons.features) {
      const nlcId = f.properties?.nlc_id
      if (nlcId) nlcIdsInSite.add(String(nlcId).trim())
    }
    return results.filter((r) => nlcIdsInSite.has(r.nlcId))
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
