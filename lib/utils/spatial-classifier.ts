import * as turf from '@turf/turf'

/**
 * Spatial classification of a feature relative to a project boundary +
 * surrounding buffer zone. Used to group findings/observations into:
 *   - "inside"  → fully within the project boundary
 *   - "buffer"  → outside the boundary but within the buffer ring
 *   - "outside" → beyond the buffer (typically excluded from the report)
 *
 * This module is server-safe (no React) so it can be reused by API routes.
 */

export type SpatialZone = 'inside' | 'buffer' | 'outside'

export interface SpatialClassification {
  zone: SpatialZone
  /** Approximate distance to the boundary in km (0 if inside, positive otherwise). */
  distanceKm: number
}

interface BuiltClassifier {
  classify: (geometry: GeoJSON.Geometry | null | undefined) => SpatialClassification
  bufferRadiusKm: number
}

/**
 * Build a reusable classifier from a project boundary + buffer radius.
 * The boundary may be a Feature, Geometry, or already a buffered polygon.
 * Returns a `classify(geometry)` function that maps to inside/buffer/outside.
 */
export function buildSpatialClassifier(
  boundary: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null,
  bufferRadiusKm: number
): BuiltClassifier {
  if (!boundary || bufferRadiusKm <= 0) {
    // No boundary → nothing to classify; treat everything as "inside" so the
    // legacy behaviour (single ungrouped block) is preserved. Warn so the
    // AI draft isn't silently presenting offsite findings as on-site.
    console.warn(
      '[spatial-classifier] No boundary provided (or buffer <= 0). ' +
        'Zone classification disabled — all findings will be treated as inside the project boundary. ' +
        'Expect buffer-zone grouping in the AI prompt to be empty.'
    )
    return {
      classify: () => ({ zone: 'inside', distanceKm: 0 }),
      bufferRadiusKm,
    }
  }

  let bufferPolygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = null
  try {
    bufferPolygon = turf.buffer(boundary, bufferRadiusKm, {
      units: 'kilometers',
    }) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null
  } catch (err) {
    console.error('[spatial-classifier] buffer failed:', err)
  }

  const boundaryBbox = safeBbox(boundary)
  const bufferBbox = bufferPolygon ? safeBbox(bufferPolygon) : null
  // Cache boundary ring LineStrings once — reused on every distance
  // calculation instead of rebuilding per-classify call. Large SACs can have
  // thousands of vertices; reallocating those is wasted work.
  const boundaryLines = polygonRings(boundary)

  const inBoundary = (geom: GeoJSON.Geometry): boolean => {
    try {
      if (geom.type === 'Point') {
        return turf.booleanPointInPolygon(geom as GeoJSON.Point, boundary)
      }
      if (geom.type === 'GeometryCollection') {
        return geom.geometries.some(inBoundary)
      }
      if (boundaryBbox && !bboxOverlaps(geom, boundaryBbox)) return false
      return turf.booleanIntersects(geom, boundary)
    } catch {
      return false
    }
  }

  const inBuffer = (geom: GeoJSON.Geometry): boolean => {
    if (!bufferPolygon) return false
    try {
      if (geom.type === 'Point') {
        return turf.booleanPointInPolygon(geom as GeoJSON.Point, bufferPolygon)
      }
      if (geom.type === 'GeometryCollection') {
        return geom.geometries.some(inBuffer)
      }
      if (bufferBbox && !bboxOverlaps(geom, bufferBbox)) return false
      return turf.booleanIntersects(geom, bufferPolygon)
    } catch {
      return false
    }
  }

  const distanceToBoundaryKm = (geom: GeoJSON.Geometry): number => {
    try {
      const point = geometryToCentroid(geom)
      if (!point || boundaryLines.length === 0) return Number.POSITIVE_INFINITY
      let min = Number.POSITIVE_INFINITY
      for (const line of boundaryLines) {
        const d = turf.pointToLineDistance(point, line, { units: 'kilometers' })
        if (d < min) min = d
      }
      return min
    } catch {
      return Number.POSITIVE_INFINITY
    }
  }

  return {
    classify: (geometry) => {
      if (!geometry) return { zone: 'outside', distanceKm: Number.POSITIVE_INFINITY }
      if (inBoundary(geometry)) return { zone: 'inside', distanceKm: 0 }
      if (inBuffer(geometry)) {
        return { zone: 'buffer', distanceKm: distanceToBoundaryKm(geometry) }
      }
      return { zone: 'outside', distanceKm: distanceToBoundaryKm(geometry) }
    },
    bufferRadiusKm,
  }
}

function safeBbox(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): [number, number, number, number] | null {
  try {
    return turf.bbox(feature) as [number, number, number, number]
  } catch {
    return null
  }
}

function bboxOverlaps(geom: GeoJSON.Geometry, target: [number, number, number, number]): boolean {
  try {
    const bb = turf.bbox(geom) as [number, number, number, number]
    return bb[0] <= target[2] && bb[2] >= target[0] && bb[1] <= target[3] && bb[3] >= target[1]
  } catch {
    return true
  }
}

function geometryToCentroid(geom: GeoJSON.Geometry): GeoJSON.Feature<GeoJSON.Point> | null {
  try {
    if (geom.type === 'Point') {
      return turf.feature(geom) as GeoJSON.Feature<GeoJSON.Point>
    }
    return turf.centroid(geom as GeoJSON.GeometryObject) as GeoJSON.Feature<GeoJSON.Point>
  } catch {
    return null
  }
}

function polygonRings(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): GeoJSON.Feature<GeoJSON.LineString>[] {
  const lines: GeoJSON.Feature<GeoJSON.LineString>[] = []
  const polygons: GeoJSON.Position[][][] =
    feature.geometry.type === 'MultiPolygon'
      ? (feature.geometry.coordinates as GeoJSON.Position[][][])
      : [feature.geometry.coordinates as GeoJSON.Position[][]]
  for (const poly of polygons) {
    for (const ring of poly) {
      if (ring.length >= 2) {
        lines.push(turf.lineString(ring) as GeoJSON.Feature<GeoJSON.LineString>)
      }
    }
  }
  return lines
}
