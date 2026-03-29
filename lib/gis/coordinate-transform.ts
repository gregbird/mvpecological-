/**
 * Coordinate Reference System Transformation
 *
 * Transforms coordinates between Irish coordinate systems and WGS84.
 * Supports ITM (EPSG:2157) and Irish Grid (EPSG:29903).
 */

import proj4 from 'proj4'

// Define Irish projection systems
// ITM (Irish Transverse Mercator) — EPSG:2157
proj4.defs(
  'EPSG:2157',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
)

// Irish Grid (TM75) — EPSG:29903
proj4.defs(
  'EPSG:29903',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +a=6377340.189 +rf=299.3249646 +towgs84=482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15 +units=m +no_defs'
)

type Coord = [number, number]

/**
 * Transform a single [x, y] coordinate pair from source CRS to WGS84
 */
export function transformPoint(point: Coord, fromEPSG: number): Coord {
  if (fromEPSG === 4326) return point
  const result = proj4(`EPSG:${fromEPSG}`, 'EPSG:4326', point)
  return [result[0], result[1]]
}

/**
 * Transform a GeoJSON Polygon's coordinates from source CRS to WGS84
 */
function transformPolygonCoords(
  coordinates: GeoJSON.Position[][],
  fromEPSG: number
): GeoJSON.Position[][] {
  return coordinates.map((ring) =>
    ring.map((coord) => {
      const [lng, lat] = transformPoint([coord[0], coord[1]], fromEPSG)
      return [lng, lat]
    })
  )
}

/**
 * Transform a GeoJSON MultiPolygon's coordinates from source CRS to WGS84
 */
function transformMultiPolygonCoords(
  coordinates: GeoJSON.Position[][][],
  fromEPSG: number
): GeoJSON.Position[][][] {
  return coordinates.map((polygon) => transformPolygonCoords(polygon, fromEPSG))
}

/**
 * Transform a GeoJSON Feature's geometry from source CRS to WGS84.
 * Supports Polygon and MultiPolygon geometries.
 */
export function transformFeatureToWGS84<T extends GeoJSON.Polygon | GeoJSON.MultiPolygon>(
  feature: GeoJSON.Feature<T>,
  fromEPSG: number
): GeoJSON.Feature<T> {
  if (fromEPSG === 4326) return feature

  const geometry = feature.geometry

  if (geometry.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        type: 'Polygon',
        coordinates: transformPolygonCoords(geometry.coordinates, fromEPSG),
      } as T,
    }
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: transformMultiPolygonCoords(geometry.coordinates, fromEPSG),
      } as T,
    }
  }

  return feature
}

/**
 * Transform an entire FeatureCollection's geometries from source CRS to WGS84.
 * Only transforms Polygon and MultiPolygon features; skips others.
 */
export function transformCollectionToWGS84(
  collection: GeoJSON.FeatureCollection,
  fromEPSG: number
): GeoJSON.FeatureCollection {
  if (fromEPSG === 4326) return collection

  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (
        feature.geometry &&
        (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
      ) {
        return transformFeatureToWGS84(
          feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
          fromEPSG
        )
      }
      return feature
    }),
  }
}
