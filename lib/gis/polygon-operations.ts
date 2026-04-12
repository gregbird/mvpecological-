/**
 * Polygon Operations
 *
 * Clipping, merging, and intersection operations using turf.js.
 * Used post-draw to resolve polygon overlaps.
 */

import turfDifference from '@turf/difference'
import turfIntersect from '@turf/intersect'
import turfArea from '@turf/area'
import { featureCollection } from '@turf/helpers'

type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon>

/**
 * Clip polygon A by polygon B — remove the overlapping area from A.
 * Returns the portion of A that does NOT overlap with B.
 */
export function clipPolygon(subject: PolygonFeature, clip: PolygonFeature): PolygonFeature | null {
  try {
    const fc = featureCollection([subject, clip])
    const result = turfDifference(fc)
    if (!result) return null

    if (result.geometry.type === 'Polygon') {
      return {
        type: 'Feature',
        geometry: result.geometry,
        properties: subject.properties,
      }
    }

    // MultiPolygon result — take largest piece
    if (result.geometry.type === 'MultiPolygon') {
      let largestIdx = 0
      let largestArea = 0
      for (let i = 0; i < result.geometry.coordinates.length; i++) {
        const piece: PolygonFeature = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: result.geometry.coordinates[i] },
          properties: {},
        }
        const a = turfArea(piece)
        if (a > largestArea) {
          largestArea = a
          largestIdx = i
        }
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: result.geometry.coordinates[largestIdx],
        },
        properties: subject.properties,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Clip polygon A to the shape of polygon B — keep only the overlapping area.
 * This is the "cookie cutter" operation: B acts as a mask/template.
 * Returns the portion of A that IS inside B.
 */
export function clipToPolygon(
  subject: PolygonFeature,
  mask: PolygonFeature
): PolygonFeature | null {
  try {
    const fc = featureCollection([subject, mask])
    const result = turfIntersect(fc)
    if (!result) return null

    if (result.geometry.type === 'Polygon') {
      return {
        type: 'Feature',
        geometry: result.geometry,
        properties: subject.properties,
      }
    }

    // MultiPolygon result — take largest piece
    if (result.geometry.type === 'MultiPolygon') {
      let largestIdx = 0
      let largestArea = 0
      for (let i = 0; i < result.geometry.coordinates.length; i++) {
        const piece: PolygonFeature = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: result.geometry.coordinates[i] },
          properties: {},
        }
        const a = turfArea(piece)
        if (a > largestArea) {
          largestArea = a
          largestIdx = i
        }
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: result.geometry.coordinates[largestIdx],
        },
        properties: subject.properties,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if two polygons overlap.
 */
export function polygonsOverlap(a: PolygonFeature, b: PolygonFeature): boolean {
  try {
    const fc = featureCollection([a, b])
    const result = turfIntersect(fc)
    return result !== null
  } catch {
    return false
  }
}

/**
 * Get the intersection area of two polygons in square meters.
 */
export function getOverlapArea(a: PolygonFeature, b: PolygonFeature): number {
  try {
    const fc = featureCollection([a, b])
    const result = turfIntersect(fc)
    if (!result) return 0
    return turfArea(result)
  } catch {
    return 0
  }
}
