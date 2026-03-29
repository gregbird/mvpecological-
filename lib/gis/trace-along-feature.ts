/**
 * Trace Along Feature
 *
 * Allows drawing a new polygon that follows the edge of an existing feature.
 * When a new vertex is placed near an existing feature's edge, intermediate
 * vertices are inserted along that edge to create a shared boundary.
 *
 * Used during polygon drawing to ensure adjacent polygons share exact boundaries
 * (no gaps or overlaps).
 */

import nearestPointOnLine from '@turf/nearest-point-on-line'
import lineSlice from '@turf/line-slice'
import distance from '@turf/distance'
import { lineString, point } from '@turf/helpers'

type Coord = [number, number]

/**
 * Extract the outer ring of a polygon as a LineString for tracing operations.
 */
function polygonToLine(polygon: GeoJSON.Polygon): GeoJSON.Feature<GeoJSON.LineString> {
  return lineString(polygon.coordinates[0] as Coord[])
}

/**
 * Given a click point near an existing polygon's edge, find the nearest point
 * on that edge. Returns null if the click is too far from any edge.
 *
 * @param clickPoint - The clicked coordinate [lng, lat]
 * @param polygon - The existing polygon to snap to
 * @param maxDistanceKm - Maximum distance in km to consider "near" (default 0.05 = 50m)
 */
export function findNearestEdgePoint(
  clickPoint: Coord,
  polygon: GeoJSON.Polygon,
  maxDistanceKm = 0.05
): { point: Coord; index: number } | null {
  const line = polygonToLine(polygon)
  const pt = point(clickPoint)
  const nearest = nearestPointOnLine(line, pt)

  if (!nearest) return null

  const dist = distance(pt, nearest, { units: 'kilometers' })
  if (dist > maxDistanceKm) return null

  return {
    point: nearest.geometry.coordinates as Coord,
    index: nearest.properties?.index ?? 0,
  }
}

/**
 * Generate intermediate vertices along a polygon's edge between two points.
 * This is the core tracing operation — it "traces" the polygon boundary
 * between startPoint and endPoint, returning all vertices along that path.
 *
 * @param polygon - The polygon whose edge to trace
 * @param startPoint - Start coordinate on the edge [lng, lat]
 * @param endPoint - End coordinate on the edge [lng, lat]
 * @returns Array of coordinates along the edge, including start and end
 */
export function traceEdge(polygon: GeoJSON.Polygon, startPoint: Coord, endPoint: Coord): Coord[] {
  try {
    const line = polygonToLine(polygon)
    const start = point(startPoint)
    const end = point(endPoint)

    const sliced = lineSlice(start, end, line)
    if (!sliced) return [startPoint, endPoint]

    return sliced.geometry.coordinates as Coord[]
  } catch {
    return [startPoint, endPoint]
  }
}

/**
 * Check if a point is near any of the given polygons' edges.
 * Returns the nearest polygon index and edge point, or null if none are close enough.
 *
 * @param clickPoint - The clicked coordinate [lng, lat]
 * @param polygons - Array of polygons to check against
 * @param maxDistanceKm - Maximum snap distance in km
 */
export function findNearestPolygonEdge(
  clickPoint: Coord,
  polygons: GeoJSON.Feature<GeoJSON.Polygon>[],
  maxDistanceKm = 0.05
): { polygonIndex: number; point: Coord; edgeIndex: number } | null {
  let bestResult: { polygonIndex: number; point: Coord; edgeIndex: number; dist: number } | null =
    null

  for (let i = 0; i < polygons.length; i++) {
    const line = polygonToLine(polygons[i].geometry)
    const pt = point(clickPoint)
    const nearest = nearestPointOnLine(line, pt)

    if (!nearest) continue

    const dist = distance(pt, nearest, { units: 'kilometers' })
    if (dist <= maxDistanceKm && (!bestResult || dist < bestResult.dist)) {
      bestResult = {
        polygonIndex: i,
        point: nearest.geometry.coordinates as Coord,
        edgeIndex: nearest.properties?.index ?? 0,
        dist,
      }
    }
  }

  if (!bestResult) return null

  return {
    polygonIndex: bestResult.polygonIndex,
    point: bestResult.point,
    edgeIndex: bestResult.edgeIndex,
  }
}
