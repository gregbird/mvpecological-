/**
 * GIS Validation Utilities
 *
 * Faz 1.2: Ireland Bounds Validation
 * Faz 1.3: CRS Detection
 */

// Ireland bounding box (WGS84)
export const IRELAND_BOUNDS = {
  minLat: 51.4,
  maxLat: 55.5,
  minLng: -10.5,
  maxLng: -5.5,
} as const

// Common EPSG codes used in Ireland
export const EPSG_CODES = {
  WGS84: 4326,
  ITM: 2157, // Irish Transverse Mercator
  IG: 29903, // Irish Grid (TM75)
} as const

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface CoordinateBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Extract bounding box from GeoJSON geometry
 */
export function getBoundingBox(geometry: GeoJSON.Geometry): CoordinateBounds | null {
  const coords: number[][] = []

  function extractCoords(geom: GeoJSON.Geometry) {
    if (geom.type === 'Point') {
      coords.push(geom.coordinates as number[])
    } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
      coords.push(...(geom.coordinates as number[][]))
    } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
      ;(geom.coordinates as number[][][]).forEach((ring) => coords.push(...ring))
    } else if (geom.type === 'MultiPolygon') {
      ;(geom.coordinates as number[][][][]).forEach((poly) =>
        poly.forEach((ring) => coords.push(...ring))
      )
    } else if (geom.type === 'GeometryCollection') {
      geom.geometries.forEach(extractCoords)
    }
  }

  extractCoords(geometry)

  if (coords.length === 0) return null

  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  }
}

/**
 * Check if coordinates are within Ireland bounds
 */
export function isWithinIreland(bounds: CoordinateBounds): boolean {
  return (
    bounds.minLat >= IRELAND_BOUNDS.minLat &&
    bounds.maxLat <= IRELAND_BOUNDS.maxLat &&
    bounds.minLng >= IRELAND_BOUNDS.minLng &&
    bounds.maxLng <= IRELAND_BOUNDS.maxLng
  )
}

/**
 * Detect coordinate reference system based on coordinate values
 * Returns likely EPSG code
 */
export function detectCRS(bounds: CoordinateBounds): number {
  // WGS84 (EPSG:4326) - typical lat/lng values
  if (
    bounds.minLat >= -90 &&
    bounds.maxLat <= 90 &&
    bounds.minLng >= -180 &&
    bounds.maxLng <= 180
  ) {
    // Check if values look like Irish coordinates
    if (bounds.minLat >= 51 && bounds.maxLat <= 56 && bounds.minLng >= -11 && bounds.maxLng <= -5) {
      return EPSG_CODES.WGS84
    }
  }

  // ITM (EPSG:2157) - Irish Transverse Mercator
  // Typical ITM values: Easting 400000-800000, Northing 500000-1000000
  if (
    bounds.minLng >= 400000 &&
    bounds.maxLng <= 800000 &&
    bounds.minLat >= 500000 &&
    bounds.maxLat <= 1000000
  ) {
    return EPSG_CODES.ITM
  }

  // Irish Grid (EPSG:29903) - older system
  // Typical IG values: Easting 0-400000, Northing 0-500000
  if (
    bounds.minLng >= 0 &&
    bounds.maxLng <= 400000 &&
    bounds.minLat >= 0 &&
    bounds.maxLat <= 500000
  ) {
    return EPSG_CODES.IG
  }

  // Default to WGS84
  return EPSG_CODES.WGS84
}

/**
 * Validate GeoJSON Feature for Ireland project boundary
 */
export function validateBoundary(feature: GeoJSON.Feature<GeoJSON.Geometry>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check geometry type
  if (!feature.geometry) {
    errors.push('Feature has no geometry')
    return { valid: false, errors, warnings }
  }

  const geometryType = feature.geometry.type
  if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
    errors.push(`Invalid geometry type: ${geometryType}. Expected Polygon or MultiPolygon`)
    return { valid: false, errors, warnings }
  }

  // Now we know it's a Polygon or MultiPolygon
  const geometry = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon

  // Get bounding box
  const bounds = getBoundingBox(feature.geometry)
  if (!bounds) {
    errors.push('Could not extract coordinates from geometry')
    return { valid: false, errors, warnings }
  }

  // Detect CRS
  const detectedCRS = detectCRS(bounds)

  if (detectedCRS !== EPSG_CODES.WGS84) {
    warnings.push(
      `Coordinates appear to be in EPSG:${detectedCRS} format. They should be transformed to WGS84 before use.`
    )
  }

  // Check Ireland bounds
  if (!isWithinIreland(bounds)) {
    // Check if it's close to Ireland (within 1 degree buffer)
    const bufferedBounds = {
      minLat: IRELAND_BOUNDS.minLat - 1,
      maxLat: IRELAND_BOUNDS.maxLat + 1,
      minLng: IRELAND_BOUNDS.minLng - 1,
      maxLng: IRELAND_BOUNDS.maxLng + 1,
    }

    const isCloseToIreland =
      bounds.minLat >= bufferedBounds.minLat &&
      bounds.maxLat <= bufferedBounds.maxLat &&
      bounds.minLng >= bufferedBounds.minLng &&
      bounds.maxLng <= bufferedBounds.maxLng

    if (isCloseToIreland) {
      warnings.push(
        'Boundary extends slightly outside Ireland. Please verify the coordinates are correct.'
      )
    } else {
      errors.push(
        `Coordinates are outside Ireland. Expected lat: ${IRELAND_BOUNDS.minLat}° to ${IRELAND_BOUNDS.maxLat}°, lng: ${IRELAND_BOUNDS.minLng}° to ${IRELAND_BOUNDS.maxLng}°`
      )
      return { valid: false, errors, warnings }
    }
  }

  // Check polygon validity (minimum 3 points + closing point)
  const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0]

  if (coords.length < 4) {
    errors.push('Polygon must have at least 3 vertices')
    return { valid: false, errors, warnings }
  }

  // Check if polygon is closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    warnings.push('Polygon is not closed. The first and last coordinates should match.')
  }

  // Check for very small areas (less than 0.0001 hectares = 1 sq meter)
  // This is a rough check based on bounding box
  const latDiff = bounds.maxLat - bounds.minLat
  const lngDiff = bounds.maxLng - bounds.minLng
  if (latDiff < 0.00001 && lngDiff < 0.00001) {
    warnings.push('Boundary area appears very small. Please verify the coordinates.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Format coordinate for display
 */
export function formatCoordinate(coord: number, type: 'lat' | 'lng'): string {
  const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W'
  return `${Math.abs(coord).toFixed(6)}° ${direction}`
}

/**
 * Get human-readable CRS name
 */
export function getCRSName(epsg: number): string {
  switch (epsg) {
    case EPSG_CODES.WGS84:
      return 'WGS84 (EPSG:4326)'
    case EPSG_CODES.ITM:
      return 'Irish Transverse Mercator (EPSG:2157)'
    case EPSG_CODES.IG:
      return 'Irish Grid (EPSG:29903)'
    default:
      return `EPSG:${epsg}`
  }
}
