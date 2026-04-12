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
 * Generate intermediate vertices along a polygon's edge between two points,
 * choosing the shorter of the two possible paths around the closed ring.
 *
 * A polygon ring is closed, so between any two points there are always two
 * paths (clockwise and counter-clockwise). The previous implementation used
 * lineSlice which always followed the ring's coordinate order, sometimes
 * picking the long way around and producing merged/incorrect polygons.
 *
 * @param polygon - The polygon whose edge to trace
 * @param startPoint - Start coordinate on the edge [lng, lat]
 * @param endPoint - End coordinate on the edge [lng, lat]
 * @returns Array of coordinates along the shorter path, including start and end
 */
export function traceEdge(polygon: GeoJSON.Polygon, startPoint: Coord, endPoint: Coord): Coord[] {
  try {
    const line = polygonToLine(polygon)
    const startSnap = nearestPointOnLine(line, point(startPoint))
    const endSnap = nearestPointOnLine(line, point(endPoint))
    if (!startSnap || !endSnap) return [startPoint, endPoint]

    const sIdx = startSnap.properties?.index ?? 0
    const eIdx = endSnap.properties?.index ?? 0
    const sCoord = startSnap.geometry.coordinates as Coord
    const eCoord = endSnap.geometry.coordinates as Coord

    // Both points on the same segment — no intermediate vertices
    if (sIdx === eIdx) return [sCoord, eCoord]

    // Ring without closing duplicate
    const ring = (polygon.coordinates[0] as Coord[]).slice(0, -1)
    const n = ring.length

    // Degenerate polygon — not enough vertices for tracing
    if (n < 3) return [sCoord, eCoord]

    // Build both directions around the ring and pick the shorter one
    const forward = buildRingPath(sCoord, sIdx, eCoord, eIdx, ring, n, 1)
    const backward = buildRingPath(sCoord, sIdx, eCoord, eIdx, ring, n, -1)

    return ringPathLength(forward) <= ringPathLength(backward) ? forward : backward
  } catch {
    return [startPoint, endPoint]
  }
}

/**
 * Walk around a polygon ring from start to end in the given direction.
 * direction = 1 follows ring coordinate order, -1 goes against it.
 */
function buildRingPath(
  sCoord: Coord,
  sIdx: number,
  eCoord: Coord,
  eIdx: number,
  ring: Coord[],
  n: number,
  direction: 1 | -1
): Coord[] {
  const path: Coord[] = [sCoord]
  // The vertex just past the end snap point's segment
  const endVertex = (eIdx + 1) % n

  if (direction === 1) {
    // Forward: first vertex after the start snap point is ring[sIdx + 1]
    let i = (sIdx + 1) % n
    let safety = 0
    while (i !== endVertex && safety < n) {
      path.push(ring[i])
      i = (i + 1) % n
      safety++
    }
  } else {
    // Backward: first vertex before the start snap point is ring[sIdx]
    let i = sIdx
    let safety = 0
    while (safety <= n) {
      path.push(ring[i])
      if (i === endVertex) break
      i = (i - 1 + n) % n
      safety++
    }
  }

  path.push(eCoord)
  return path
}

/** Sum of great-circle distances between consecutive coordinates */
function ringPathLength(coords: Coord[]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += distance(point(coords[i - 1]), point(coords[i]))
  }
  return total
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
