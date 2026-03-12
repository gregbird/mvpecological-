import * as turf from '@turf/turf'

/**
 * Calculate distance from a GeoJSON geometry to a project boundary polygon.
 * Returns 0 if the geometry intersects/is inside the boundary.
 * Handles Point, Polygon, MultiPolygon, LineString, MultiLineString, GeometryCollection.
 */
export function calculateDistanceFromBoundary(
  location: GeoJSON.Geometry | undefined,
  projectBoundary: GeoJSON.Feature<GeoJSON.Polygon> | undefined
): number | undefined {
  if (!location || !projectBoundary) return undefined

  try {
    // For polygon/multipolygon geometries, check for intersection first
    if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
      const feature = turf.feature(location as GeoJSON.Polygon | GeoJSON.MultiPolygon)
      if (turf.booleanIntersects(feature, projectBoundary)) {
        return 0
      }
      // Use the polygon's boundary as a line to find closest edge-to-edge distance
      const asLine = turf.polygonToLine(feature) as GeoJSON.Feature<
        GeoJSON.LineString | GeoJSON.MultiLineString
      >
      return lineDistanceToPolygon(asLine, projectBoundary)
    }

    // For line geometries, find the nearest point on the line to the boundary
    if (location.type === 'LineString' || location.type === 'MultiLineString') {
      const lineFeature = turf.feature(location as GeoJSON.LineString | GeoJSON.MultiLineString)
      if (turf.booleanIntersects(lineFeature, projectBoundary)) {
        return 0
      }
      return lineDistanceToPolygon(lineFeature, projectBoundary)
    }

    // For point geometries
    if (location.type === 'Point') {
      const point = turf.point(location.coordinates)
      if (turf.booleanPointInPolygon(point, projectBoundary)) {
        return 0
      }
      return distanceToPolygonEdge(point, projectBoundary)
    }

    // For GeometryCollection, use the first point geometry
    if (location.type === 'GeometryCollection') {
      const firstGeom = location.geometries[0]
      if (firstGeom?.type === 'Point') {
        const point = turf.point(firstGeom.coordinates)
        if (turf.booleanPointInPolygon(point, projectBoundary)) {
          return 0
        }
        return distanceToPolygonEdge(point, projectBoundary)
      }
      return undefined
    }

    return undefined
  } catch (error) {
    console.warn('Error calculating distance:', error)
    return undefined
  }
}

/**
 * Find the minimum distance from any point on a line to a polygon boundary.
 * Uses the polygon's boundary as a line and finds the nearest point on
 * the input line to that boundary line.
 */
function lineDistanceToPolygon(
  line: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>,
  polygon: GeoJSON.Feature<GeoJSON.Polygon>
): number {
  const boundaryLine = turf.polygonToLine(polygon) as GeoJSON.Feature<GeoJSON.LineString>

  // Get all coordinates from the line (handles both LineString and MultiLineString)
  const coords = turf.coordAll(line)

  let minDist = Infinity
  for (const coord of coords) {
    const pt = turf.point(coord)
    const nearest = turf.nearestPointOnLine(boundaryLine, pt)
    const dist = turf.distance(pt, nearest, { units: 'kilometers' })
    if (dist < minDist) minDist = dist
  }

  return Math.round(minDist * 100) / 100
}

function distanceToPolygonEdge(
  point: GeoJSON.Feature<GeoJSON.Point>,
  polygon: GeoJSON.Feature<GeoJSON.Polygon>
): number {
  const nearestPoint = turf.nearestPointOnLine(
    turf.polygonToLine(polygon) as GeoJSON.Feature<GeoJSON.LineString>,
    point
  )
  const distance = turf.distance(point, nearestPoint, { units: 'kilometers' })
  return Math.round(distance * 100) / 100
}
