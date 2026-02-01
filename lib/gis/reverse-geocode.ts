/**
 * Reverse Geocoding for Ireland
 *
 * Fetches townland, county, and administrative area information
 * using OSM Nominatim API (free, no API key required)
 */

export interface IrishLocationInfo {
  townland?: string
  electoral_division?: string
  civil_parish?: string
  barony?: string
  county?: string
  province?: string
  country: string
  displayName: string
  raw?: Record<string, string>
}

export interface ReverseGeocodeResult {
  success: boolean
  location?: IrishLocationInfo
  error?: string
}

// OSM Nominatim API (free, rate limited to 1 req/sec)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

// Irish county name normalization
const COUNTY_ALIASES: Record<string, string> = {
  'Co. Dublin': 'Dublin',
  'County Dublin': 'Dublin',
  'Co. Cork': 'Cork',
  'County Cork': 'Cork',
  'Co. Galway': 'Galway',
  'County Galway': 'Galway',
  'Co. Kerry': 'Kerry',
  'County Kerry': 'Kerry',
  'Co. Mayo': 'Mayo',
  'County Mayo': 'Mayo',
  'Co. Clare': 'Clare',
  'County Clare': 'Clare',
  'Co. Limerick': 'Limerick',
  'County Limerick': 'Limerick',
  'Co. Tipperary': 'Tipperary',
  'County Tipperary': 'Tipperary',
  'Co. Waterford': 'Waterford',
  'County Waterford': 'Waterford',
  'Co. Wexford': 'Wexford',
  'County Wexford': 'Wexford',
  'Co. Wicklow': 'Wicklow',
  'County Wicklow': 'Wicklow',
  'Co. Kilkenny': 'Kilkenny',
  'County Kilkenny': 'Kilkenny',
  'Co. Carlow': 'Carlow',
  'County Carlow': 'Carlow',
  'Co. Laois': 'Laois',
  'County Laois': 'Laois',
  'Co. Offaly': 'Offaly',
  'County Offaly': 'Offaly',
  'Co. Westmeath': 'Westmeath',
  'County Westmeath': 'Westmeath',
  'Co. Longford': 'Longford',
  'County Longford': 'Longford',
  'Co. Roscommon': 'Roscommon',
  'County Roscommon': 'Roscommon',
  'Co. Leitrim': 'Leitrim',
  'County Leitrim': 'Leitrim',
  'Co. Sligo': 'Sligo',
  'County Sligo': 'Sligo',
  'Co. Donegal': 'Donegal',
  'County Donegal': 'Donegal',
  'Co. Monaghan': 'Monaghan',
  'County Monaghan': 'Monaghan',
  'Co. Cavan': 'Cavan',
  'County Cavan': 'Cavan',
  'Co. Louth': 'Louth',
  'County Louth': 'Louth',
  'Co. Meath': 'Meath',
  'County Meath': 'Meath',
  'Co. Kildare': 'Kildare',
  'County Kildare': 'Kildare',
}

// Province mapping
const COUNTY_TO_PROVINCE: Record<string, string> = {
  // Leinster
  Dublin: 'Leinster',
  Wicklow: 'Leinster',
  Wexford: 'Leinster',
  Carlow: 'Leinster',
  Kilkenny: 'Leinster',
  Laois: 'Leinster',
  Offaly: 'Leinster',
  Westmeath: 'Leinster',
  Longford: 'Leinster',
  Meath: 'Leinster',
  Louth: 'Leinster',
  Kildare: 'Leinster',
  // Munster
  Cork: 'Munster',
  Kerry: 'Munster',
  Limerick: 'Munster',
  Clare: 'Munster',
  Tipperary: 'Munster',
  Waterford: 'Munster',
  // Connacht
  Galway: 'Connacht',
  Mayo: 'Connacht',
  Sligo: 'Connacht',
  Leitrim: 'Connacht',
  Roscommon: 'Connacht',
  // Ulster (Republic)
  Donegal: 'Ulster',
  Cavan: 'Ulster',
  Monaghan: 'Ulster',
}

/**
 * Normalize county name to standard format
 */
function normalizeCounty(county: string): string {
  // Check aliases first
  if (COUNTY_ALIASES[county]) {
    return COUNTY_ALIASES[county]
  }

  // Remove "Co." or "County" prefix
  const normalized = county
    .replace(/^Co\.\s*/i, '')
    .replace(/^County\s*/i, '')
    .trim()

  return normalized
}

/**
 * Reverse geocode a coordinate to get Irish location info
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const url = new URL(NOMINATIM_URL)
    url.searchParams.set('lat', lat.toString())
    url.searchParams.set('lon', lng.toString())
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('extratags', '1')
    url.searchParams.set('namedetails', '1')
    url.searchParams.set('zoom', '18') // Maximum detail level

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Dulra-Ecological-Platform/1.0',
        'Accept-Language': 'en',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Geocoding failed: ${response.statusText}`,
      }
    }

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: data.error,
      }
    }

    const address = data.address || {}

    // Extract Irish administrative divisions
    // Nominatim returns various levels depending on location
    const townland =
      address.hamlet ||
      address.village ||
      address.locality ||
      address.isolated_dwelling ||
      address.farm ||
      address.neighbourhood

    const electoralDivision = address.city_district || address.suburb

    // County can be in different fields
    let county = address.county || address.state_district || address.state

    if (county) {
      county = normalizeCounty(county)
    }

    // Get province from county
    const province = county ? COUNTY_TO_PROVINCE[county] : undefined

    // Build location info
    const location: IrishLocationInfo = {
      townland: townland,
      electoral_division: electoralDivision,
      county: county,
      province: province,
      country: address.country || 'Ireland',
      displayName: data.display_name,
      raw: address,
    }

    return {
      success: true,
      location,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get location info for the center of a boundary polygon
 */
export async function getLocationFromBoundary(
  boundary: GeoJSON.Feature<GeoJSON.Polygon>
): Promise<ReverseGeocodeResult> {
  // Safety check for valid geometry
  if (!boundary?.geometry?.coordinates?.[0]) {
    return {
      success: false,
      error: 'Invalid boundary geometry',
    }
  }

  const coords = boundary.geometry.coordinates[0]

  // Calculate centroid
  let sumLat = 0
  let sumLng = 0

  for (const coord of coords) {
    sumLng += coord[0]
    sumLat += coord[1]
  }

  const centerLat = sumLat / coords.length
  const centerLng = sumLng / coords.length

  return reverseGeocode(centerLat, centerLng)
}

/**
 * Format location for display
 */
export function formatLocation(location: IrishLocationInfo): string {
  const parts: string[] = []

  if (location.townland) {
    parts.push(location.townland)
  }

  if (location.county) {
    parts.push(`Co. ${location.county}`)
  }

  if (parts.length === 0) {
    return location.displayName || 'Unknown location'
  }

  return parts.join(', ')
}

/**
 * Format location as short string (townland only or county)
 */
export function formatLocationShort(location: IrishLocationInfo): string {
  if (location.townland) {
    return location.townland
  }
  if (location.county) {
    return `Co. ${location.county}`
  }
  return 'Unknown'
}
