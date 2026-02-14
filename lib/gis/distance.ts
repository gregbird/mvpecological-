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
      const centroid = turf.centroid(feature)
      return distanceToPolygonEdge(centroid, projectBoundary)
    }

    // For line geometries, use centroid
    if (location.type === 'LineString' || location.type === 'MultiLineString') {
      const centroid = turf.centroid(
        location as unknown as GeoJSON.LineString | GeoJSON.MultiLineString
      )
      if (turf.booleanPointInPolygon(centroid, projectBoundary)) {
        return 0
      }
      return distanceToPolygonEdge(centroid, projectBoundary)
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
