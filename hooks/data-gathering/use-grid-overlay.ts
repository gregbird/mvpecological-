'use client'

import * as React from 'react'

import { wgs84ToItm, itmToGridRef, itmToWgs84 } from '@/lib/utils/grid-reference'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import { getPrimaryBuffer } from '@/lib/gis'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'

/**
 * Convert ITM (EPSG:2157) to approximate ING (EPSG:29903) coordinates.
 * The Irish Grid reference system uses ING, not ITM.
 * This approximation is accurate enough for grid square identification (~100m error).
 */
function itmToIng(itmEasting: number, itmNorthing: number) {
  return {
    easting: itmEasting - 400000,
    northing: itmNorthing - 500000,
  }
}

interface GridDataResult {
  features: GeoJSON.Feature[]
  validRefs: Set<string>
}

interface UseGridOverlayParams {
  projectCenter?: { lat: number; lng: number }
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  bufferDistances: number[]
  gridResolution: '10km' | '2km' | '1km'
}

/**
 * Compute valid grid refs for a set of boundaries at a given buffer + resolution.
 * Returns { features, validRefs } for both overlay and spatial filtering.
 */
function computeGridDataForBoundaries(
  boundaries: GeoJSON.Feature<GeoJSON.Polygon>[],
  projectCenter: { lat: number; lng: number } | undefined,
  gridResolution: '10km' | '2km' | '1km',
  bufferKm: number
): GridDataResult | undefined {
  if (boundaries.length === 0 && !projectCenter) return undefined

  const resolutionMeters =
    gridResolution === '10km' ? 10000 : gridResolution === '2km' ? 2000 : 1000
  const stepSize = resolutionMeters
  const precision: 1 | 2 = gridResolution === '10km' ? 1 : 2

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')
    const features: GeoJSON.Feature[] = []
    const validRefs = new Set<string>()

    // If no boundaries, fall back to single center point
    const sources =
      boundaries.length > 0 ? boundaries : [turf.point([projectCenter!.lng, projectCenter!.lat])]

    for (const source of sources) {
      const bbox = getBoundingBox(
        source.geometry?.type === 'Polygon' ? (source as GeoJSON.Feature<GeoJSON.Polygon>) : null,
        source.geometry?.type === 'Point'
          ? { lat: source.geometry.coordinates[1], lng: source.geometry.coordinates[0] }
          : null,
        bufferKm
      )
      if (!bbox) continue

      const bufferPoly = turf.buffer(source, bufferKm, { units: 'kilometers' })

      const swItm = wgs84ToItm(bbox.minLat, bbox.minLng)
      const neItm = wgs84ToItm(bbox.maxLat, bbox.maxLng)
      const swIng = itmToIng(swItm.easting, swItm.northing)
      const neIng = itmToIng(neItm.easting, neItm.northing)

      const minE = Math.floor(swIng.easting / stepSize) * stepSize
      const minN = Math.floor(swIng.northing / stepSize) * stepSize
      const maxE = Math.floor(neIng.easting / stepSize) * stepSize
      const maxN = Math.floor(neIng.northing / stepSize) * stepSize

      for (let e = minE; e <= maxE; e += stepSize) {
        for (let n = minN; n <= maxN; n += stepSize) {
          try {
            const ref = itmToGridRef(e, n, precision, true)
            const cleanRef = ref.replace(/\s+/g, '')
            if (validRefs.has(cleanRef)) continue

            const sw = itmToWgs84(e + 400000, n + 500000)
            const ne = itmToWgs84(e + resolutionMeters + 400000, n + resolutionMeters + 500000)
            const gridPoly = turf.polygon([
              [
                [sw.lng, sw.lat],
                [ne.lng, sw.lat],
                [ne.lng, ne.lat],
                [sw.lng, ne.lat],
                [sw.lng, sw.lat],
              ],
            ])

            if (!turf.booleanIntersects(gridPoly, bufferPoly)) continue

            validRefs.add(cleanRef)
            features.push({
              type: 'Feature' as const,
              properties: { label: cleanRef },
              geometry: gridPoly.geometry,
            })
          } catch {
            // Outside Irish Grid
          }
        }
      }
    }

    return { features, validRefs }
  } catch {
    return undefined
  }
}

export function useGridOverlay({
  projectCenter,
  projectBoundary,
  searchBoundary,
  allBoundaries,
  bufferDistances,
  gridResolution,
}: UseGridOverlayParams) {
  /**
   * Compute grid data for a given set of boundaries and buffer.
   */
  const computeGridData = React.useCallback(
    (
      bufferKm: number,
      boundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
    ): GridDataResult | undefined => {
      return computeGridDataForBoundaries(boundaries, projectCenter, gridResolution, bufferKm)
    },
    [projectCenter, gridResolution]
  )

  /**
   * Grid overlay for map display. Only includes grid squares that
   * intersect the actual buffer polygon. In "All Sites" mode, computes
   * grids for each site boundary and merges them.
   */
  const computeGridOverlay = React.useCallback(
    (bufferKm: number): GeoJSON.FeatureCollection | undefined => {
      const boundaries =
        allBoundaries && allBoundaries.length > 0
          ? allBoundaries
          : projectBoundary
            ? [projectBoundary]
            : []
      const result = computeGridData(bufferKm, boundaries)
      if (!result) return undefined
      return { type: 'FeatureCollection', features: result.features }
    },
    [computeGridData, projectBoundary, allBoundaries]
  )

  /**
   * Valid grid refs for the SELECTED site (not all sites).
   * Used for spatial filtering of species records when a specific site is chosen.
   */
  const selectedSiteGridRefs = React.useMemo((): Set<string> | null => {
    if (!searchBoundary || (allBoundaries && allBoundaries.length > 0) || !projectBoundary)
      return null // No filtering needed
    const primaryBuffer = getPrimaryBuffer(bufferDistances)
    const result = computeGridData(primaryBuffer, [projectBoundary])
    return result?.validRefs ?? null
  }, [searchBoundary, allBoundaries, projectBoundary, bufferDistances, computeGridData])

  /**
   * Custom spatial filter for species records.
   * Filters NBDC species by grid ref overlap with the selected site.
   */
  const customSpatialFilter = React.useCallback(
    (finding: FindingDisplay): boolean => {
      if (!selectedSiteGridRefs) return true // No site-level filtering
      // FPO and Article 17 species: include (they're supplementary, looked up by center)
      if (finding.source === 'fpo' || finding.source === 'npws') return true
      // NBDC species: check if any of the species' grid squares overlap with the site's grids
      const gridSquares = (finding.metadata?.gridSquares ?? finding.rawData?.gridSquares) as
        | string[]
        | undefined
      if (!gridSquares || gridSquares.length === 0) return true
      const match = gridSquares.some((gs) => selectedSiteGridRefs.has(gs))
      return match
    },
    [selectedSiteGridRefs]
  )

  return {
    computeGridData,
    computeGridOverlay,
    selectedSiteGridRefs,
    customSpatialFilter,
  }
}

export { itmToIng }
