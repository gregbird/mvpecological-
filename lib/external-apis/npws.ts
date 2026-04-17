/**
 * NPWS (National Parks & Wildlife Service) API Client
 * Fetches designated sites data from ArcGIS REST services
 *
 * API Endpoint: https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer
 * Updated: December 2024
 */

const NPWS_BASE_URL =
  'https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer'

// Layer IDs in NPWS FeatureServer (updated endpoint)
const LAYERS = {
  SPA: 0, // Special Protection Areas
  pNHA: 1, // Proposed Natural Heritage Areas
  NHA: 2, // Natural Heritage Areas
  SAC: 3, // Special Areas of Conservation
}

export type DesignatedSiteType = keyof typeof LAYERS

export interface NPWSDesignatedSite {
  OBJECTID: number
  SITECODE: string
  SITENAME: string
  SITE_TYPE?: string
  AREA_HA?: number
  VERSION?: string
  geometry?: GeoJSON.Geometry
}

export interface NPWSQueryParams {
  bbox?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  geometry?: GeoJSON.Geometry
  siteTypes?: DesignatedSiteType[]
  searchRadius?: number // in meters
  centerPoint?: { lat: number; lng: number }
}

/**
 * Query NPWS for designated sites within a bounding box or buffer
 */
export async function queryDesignatedSites(params: NPWSQueryParams): Promise<NPWSDesignatedSite[]> {
  const {
    bbox,
    geometry,
    siteTypes = ['SAC', 'SPA', 'NHA', 'pNHA'],
    searchRadius,
    centerPoint,
  } = params

  const results: NPWSDesignatedSite[] = []

  // Build geometry filter
  let geometryParam = ''
  let geometryType = ''
  let spatialRel = 'esriSpatialRelIntersects'

  if (bbox) {
    geometryParam = `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`
    geometryType = 'esriGeometryEnvelope'
  } else if (centerPoint && searchRadius) {
    // Buffer query around a point
    geometryParam = JSON.stringify({
      x: centerPoint.lng,
      y: centerPoint.lat,
      spatialReference: { wkid: 4326 },
    })
    geometryType = 'esriGeometryPoint'
    spatialRel = 'esriSpatialRelIntersects'
  } else if (geometry) {
    geometryParam = JSON.stringify(geometry)
    geometryType =
      geometry.type === 'Polygon'
        ? 'esriGeometryPolygon'
        : geometry.type === 'Point'
          ? 'esriGeometryPoint'
          : 'esriGeometryEnvelope'
  }

  // Query each layer
  for (const siteType of siteTypes) {
    const layerId = LAYERS[siteType]

    try {
      const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`)

      const queryParams = new URLSearchParams({
        where: '1=1',
        outFields: 'OBJECTID,SITECODE,SITE_NAME,Shape__Area',
        returnGeometry: 'true',
        outSR: '4326',
        f: 'geojson',
      })

      if (geometryParam) {
        queryParams.set('geometry', geometryParam)
        queryParams.set('geometryType', geometryType)
        queryParams.set('spatialRel', spatialRel)
        queryParams.set('inSR', '4326')
      }

      if (searchRadius) {
        queryParams.set('distance', searchRadius.toString())
        queryParams.set('units', 'esriSRUnit_Meter')
      }

      url.search = queryParams.toString()

      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      let response: Response
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
        })
      } catch {
        // Network error, CORS issue, or timeout - silently skip
        console.warn(`NPWS ${siteType}: Network error (API may be unavailable)`)
        continue
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        console.warn(`NPWS query failed for ${siteType}: ${response.statusText}`)
        continue
      }

      const data = await response.json()

      if (data.features) {
        for (const feature of data.features) {
          // Convert Shape__Area (m²) to hectares
          const areaHa = feature.properties.Shape__Area
            ? feature.properties.Shape__Area / 10000
            : undefined
          results.push({
            OBJECTID: feature.properties.OBJECTID,
            SITECODE: feature.properties.SITECODE,
            SITENAME: feature.properties.SITE_NAME, // New API uses SITE_NAME
            SITE_TYPE: siteType,
            AREA_HA: areaHa,
            geometry: feature.geometry,
          })
        }
      }
    } catch (error) {
      console.error(`Error querying NPWS ${siteType}:`, error)
    }
  }

  return results
}

/**
 * Get details for a specific designated site by code
 */
export async function getDesignatedSiteByCode(
  siteCode: string,
  siteType: DesignatedSiteType
): Promise<NPWSDesignatedSite | null> {
  const layerId = LAYERS[siteType]

  try {
    const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`)

    const queryParams = new URLSearchParams({
      where: `SITECODE = '${siteCode}'`,
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
    })

    url.search = queryParams.toString()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response: Response
    try {
      response = await fetch(url.toString(), { signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const areaHa = feature.properties.Shape__Area
        ? feature.properties.Shape__Area / 10000
        : undefined
      return {
        OBJECTID: feature.properties.OBJECTID,
        SITECODE: feature.properties.SITECODE,
        SITENAME: feature.properties.SITE_NAME,
        SITE_TYPE: siteType,
        AREA_HA: areaHa,
        geometry: feature.geometry,
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching site ${siteCode}:`, error)
    return null
  }
}

/**
 * Search designated sites by name
 */
export async function searchDesignatedSitesByName(
  searchTerm: string,
  siteTypes: DesignatedSiteType[] = ['SAC', 'SPA', 'NHA', 'pNHA']
): Promise<NPWSDesignatedSite[]> {
  const results: NPWSDesignatedSite[] = []

  for (const siteType of siteTypes) {
    const layerId = LAYERS[siteType]

    try {
      const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`)

      const queryParams = new URLSearchParams({
        where: `UPPER(SITE_NAME) LIKE '%${searchTerm.toUpperCase()}%'`,
        outFields: 'OBJECTID,SITECODE,SITE_NAME,Shape__Area',
        returnGeometry: 'false',
        f: 'json',
      })

      url.search = queryParams.toString()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      let response: Response
      try {
        response = await fetch(url.toString(), { signal: controller.signal })
      } catch {
        continue
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) continue

      const data = await response.json()

      if (data.features) {
        for (const feature of data.features) {
          const areaHa = feature.attributes.Shape__Area
            ? feature.attributes.Shape__Area / 10000
            : undefined
          results.push({
            OBJECTID: feature.attributes.OBJECTID,
            SITECODE: feature.attributes.SITECODE,
            SITENAME: feature.attributes.SITE_NAME,
            SITE_TYPE: siteType,
            AREA_HA: areaHa,
          })
        }
      }
    } catch (error) {
      console.error(`Error searching NPWS ${siteType}:`, error)
    }
  }

  return results
}

/**
 * Get site type display name
 */
export function getSiteTypeDisplayName(siteType: DesignatedSiteType): string {
  const names: Record<DesignatedSiteType, string> = {
    SAC: 'Special Area of Conservation',
    SPA: 'Special Protection Area',
    NHA: 'Natural Heritage Area',
    pNHA: 'Proposed Natural Heritage Area',
  }
  return names[siteType] || siteType
}

/**
 * Get site type color for map display
 */
export function getSiteTypeColor(siteType: DesignatedSiteType): string {
  const colors: Record<DesignatedSiteType, string> = {
    SAC: '#22c55e', // Green
    SPA: '#3b82f6', // Blue
    NHA: '#8b5cf6', // Purple
    pNHA: '#a855f7', // Light purple
  }
  return colors[siteType]
}
