/**
 * EPA (Environmental Protection Agency) Ireland API Client
 * Fetches water quality, rivers, lakes, and catchment data
 */

const EPA_WFS_URL = 'https://gis.epa.ie/geoserver/ows'
const EPA_ARCGIS_URL = 'https://gis.epa.ie/arcgis/rest/services'

export interface EPARiver {
  OBJECTID: number
  RiverCode: string
  RiverName: string
  CatchmentId?: string
  CatchmentName?: string
  Length_km?: number
  WFD_Status?: string
  WFD_RiskStatus?: string
  CatchmentsUrl?: string // Direct link to catchments.ie data page
  LocalAuthority?: string
  RiverType?: string
  BasinName?: string
  geometry?: GeoJSON.Geometry
}

export interface EPALake {
  OBJECTID: number
  LakeCode: string
  LakeName: string
  CatchmentId?: string
  CatchmentName?: string
  Area_ha?: number
  Area_km2?: number
  WFD_Status?: string
  WFD_RiskStatus?: string
  MaxDepth_m?: number
  CatchmentsUrl?: string // Direct link to catchments.ie data page
  LocalAuthority?: string
  BasinName?: string
  geometry?: GeoJSON.Geometry
}

export interface EPACatchment {
  OBJECTID: number
  CatchmentId: string
  CatchmentName: string
  Area_km2?: number
  RiverBasinDistrict?: string
  geometry?: GeoJSON.Geometry
}

export interface EPAWaterQuality {
  StationId: string
  StationName: string
  WaterBodyType: 'river' | 'lake' | 'transitional' | 'coastal' | 'groundwater'
  LatestStatus?: 'High' | 'Good' | 'Moderate' | 'Poor' | 'Bad'
  StatusYear?: number
  Q_Value?: number
  Latitude?: number
  Longitude?: number
  geometry?: GeoJSON.Geometry
}

export interface EPASearchParams {
  bbox?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
  limit?: number
}

/**
 * Query EPA WFS service for features
 * Note: WFS bbox format is minX,minY,maxX,maxY (lng,lat order)
 */
async function queryEPAWFS(
  typeName: string,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  limit = 100
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(EPA_WFS_URL)

  url.searchParams.set('service', 'WFS')
  url.searchParams.set('version', '2.0.0')
  url.searchParams.set('request', 'GetFeature')
  url.searchParams.set('typeName', typeName)
  url.searchParams.set('outputFormat', 'application/json')
  url.searchParams.set('srsName', 'EPSG:4326')
  // WFS bbox format: minX,minY,maxX,maxY (lng,lat order)
  url.searchParams.set(
    'bbox',
    `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat},EPSG:4326`
  )
  url.searchParams.set('count', limit.toString())

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`EPA WFS error for ${typeName}: ${response.statusText}`)
      return { type: 'FeatureCollection', features: [] }
    }

    const data = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`EPA WFS timeout for ${typeName}`)
    } else {
      console.error(`EPA WFS error for ${typeName}:`, error)
    }
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * Query EPA ArcGIS REST service for features
 */
async function _queryEPAArcGIS(
  servicePath: string,
  layerId: number,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  outFields = '*'
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(`${EPA_ARCGIS_URL}/${servicePath}/MapServer/${layerId}/query`)

  url.searchParams.set('where', '1=1')
  url.searchParams.set('geometry', `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`)
  url.searchParams.set('geometryType', 'esriGeometryEnvelope')
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
  url.searchParams.set('inSR', '4326')
  url.searchParams.set('outSR', '4326')
  url.searchParams.set('outFields', outFields)
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('f', 'geojson')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`EPA ArcGIS error: ${response.statusText}`)
      return { type: 'FeatureCollection', features: [] }
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('EPA ArcGIS timeout')
    } else {
      console.error('EPA ArcGIS error:', error)
    }
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * Search for rivers within a bounding box
 */
export async function searchRivers(params: EPASearchParams): Promise<EPARiver[]> {
  if (!params.bbox) return []

  try {
    // Use correct layer name: EPA:WFD_RiverWaterBodiesActive
    const data = await queryEPAWFS(
      'EPA:WFD_RiverWaterBodiesActive',
      params.bbox,
      params.limit || 50
    )

    return data.features.map(
      (feature): EPARiver => ({
        OBJECTID: feature.properties?.OBJECTID || feature.properties?.objectid || 0,
        // Use EU_CD for Catchments.ie API compatibility (format: IE_XX_YY_ZZZ)
        RiverCode: feature.properties?.EU_CD || feature.properties?.MS_CD || '',
        RiverName: feature.properties?.NAME || 'Unknown River',
        CatchmentId: feature.properties?.SUB_CD,
        CatchmentName: feature.properties?.BASIN_CD,
        Length_km: feature.properties?.LENGTHKM,
        WFD_Status: feature.properties?.STATUS,
        WFD_RiskStatus: feature.properties?.RISK,
        CatchmentsUrl: feature.properties?.URL, // catchments.ie direct link
        LocalAuthority: feature.properties?.LocalAuthority,
        RiverType: feature.properties?.TYPE,
        BasinName: feature.properties?.DIST_CD,
        geometry: feature.geometry,
      })
    )
  } catch (error) {
    console.error('Error searching rivers:', error)
    return []
  }
}

/**
 * Search for lakes within a bounding box
 */
export async function searchLakes(params: EPASearchParams): Promise<EPALake[]> {
  if (!params.bbox) return []

  try {
    // Use correct layer name: EPA:WFD_LakeWaterBodiesActive
    const data = await queryEPAWFS('EPA:WFD_LakeWaterBodiesActive', params.bbox, params.limit || 50)

    return data.features.map(
      (feature): EPALake => ({
        OBJECTID: feature.properties?.OBJECTID || feature.properties?.objectid || 0,
        // Use EU_CD for Catchments.ie API compatibility (format: IE_XX_YY_ZZZ)
        LakeCode: feature.properties?.EU_CD || feature.properties?.MS_CD || '',
        LakeName: feature.properties?.NAME || 'Unknown Lake',
        CatchmentId: feature.properties?.SEG_CD,
        CatchmentName: feature.properties?.HydrometricArea,
        Area_ha: feature.properties?.AreaHectare,
        Area_km2: feature.properties?.AreaKm2,
        WFD_Status: feature.properties?.STATUS,
        WFD_RiskStatus: feature.properties?.RISK,
        MaxDepth_m: feature.properties?.MAX_DEPTH,
        CatchmentsUrl: feature.properties?.URL, // catchments.ie direct link
        LocalAuthority: feature.properties?.LocalAuthority,
        BasinName: feature.properties?.DIST_CD,
        geometry: feature.geometry,
      })
    )
  } catch (error) {
    console.error('Error searching lakes:', error)
    return []
  }
}

/**
 * Search for catchments within a bounding box
 */
export async function searchCatchments(params: EPASearchParams): Promise<EPACatchment[]> {
  if (!params.bbox) return []

  try {
    // Use correct layer name: EPA:WFD_Catchments
    const data = await queryEPAWFS('EPA:WFD_Catchments', params.bbox, params.limit || 20)

    return data.features.map(
      (feature): EPACatchment => ({
        OBJECTID: feature.properties?.OBJECTID || feature.properties?.objectid || 0,
        CatchmentId: feature.properties?.Catchment_Id || '',
        CatchmentName: feature.properties?.Name || 'Unknown Catchment',
        Area_km2: feature.properties?.Area_km2,
        RiverBasinDistrict: feature.properties?.District_Code,
        geometry: feature.geometry,
      })
    )
  } catch (error) {
    console.error('Error searching catchments:', error)
    return []
  }
}

/**
 * Search for water quality monitoring stations within a bounding box
 */
export async function searchWaterQuality(params: EPASearchParams): Promise<EPAWaterQuality[]> {
  if (!params.bbox) return []

  try {
    const data = await queryEPAWFS('EPA:WFD_WaterQualityStations', params.bbox, params.limit || 50)

    return data.features.map((feature): EPAWaterQuality => {
      const coords = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : undefined

      return {
        StationId: feature.properties?.STATION_ID || feature.properties?.ID || '',
        StationName:
          feature.properties?.STATION_NAME || feature.properties?.NAME || 'Unknown Station',
        WaterBodyType: feature.properties?.WATERBODY_TYPE || 'river',
        LatestStatus: feature.properties?.LATEST_STATUS || feature.properties?.STATUS,
        StatusYear: feature.properties?.STATUS_YEAR,
        Q_Value: feature.properties?.Q_VALUE,
        Latitude: coords ? coords[1] : feature.properties?.LATITUDE,
        Longitude: coords ? coords[0] : feature.properties?.LONGITUDE,
        geometry: feature.geometry,
      }
    })
  } catch (error) {
    console.error('Error searching water quality:', error)
    return []
  }
}

/**
 * Get all aquatic features (rivers, lakes, water quality) in one call
 */
export async function searchAllAquaticFeatures(params: EPASearchParams): Promise<{
  rivers: EPARiver[]
  lakes: EPALake[]
  catchments: EPACatchment[]
  waterQuality: EPAWaterQuality[]
}> {
  if (!params.bbox) {
    return { rivers: [], lakes: [], catchments: [], waterQuality: [] }
  }

  // Run all queries in parallel
  const [rivers, lakes, catchments, waterQuality] = await Promise.all([
    searchRivers(params),
    searchLakes(params),
    searchCatchments(params),
    searchWaterQuality(params),
  ])

  return { rivers, lakes, catchments, waterQuality }
}

/**
 * Get WFD status color for display
 */
export function getWFDStatusColor(status?: string): string {
  if (!status) return '#9ca3af' // gray

  const colors: Record<string, string> = {
    High: '#22c55e', // green
    Good: '#84cc16', // lime
    Moderate: '#eab308', // yellow
    Poor: '#f97316', // orange
    Bad: '#ef4444', // red
  }

  return colors[status] || '#9ca3af'
}

/**
 * Get WFD status display name
 */
export function getWFDStatusDisplayName(status?: string): string {
  if (!status) return 'Not Assessed'
  return status
}

/**
 * Get water body type display name
 */
export function getWaterBodyTypeDisplayName(
  type: 'river' | 'lake' | 'transitional' | 'coastal' | 'groundwater'
): string {
  const names: Record<string, string> = {
    river: 'River',
    lake: 'Lake',
    transitional: 'Transitional Water',
    coastal: 'Coastal Water',
    groundwater: 'Groundwater',
  }
  return names[type] || type
}

/**
 * Convert EPA features to GeoJSON
 */
export function riversToGeoJSON(rivers: EPARiver[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rivers
      .filter((r) => r.geometry)
      .map((river) => ({
        type: 'Feature' as const,
        geometry: river.geometry!,
        properties: {
          type: 'river',
          name: river.RiverName,
          code: river.RiverCode,
          catchment: river.CatchmentName,
          wfdStatus: river.WFD_Status,
          lengthKm: river.Length_km,
        },
      })),
  }
}

// --- RIVNETROUTES (River Network Segments) ---

export interface EPARiverSegment {
  Segment_Code: string
  River_Waterbody_Code: string
  EPA_Name: string
  ORDER_: number
  Segment_Length: number // meters
  geometry: GeoJSON.MultiLineString
}

/**
 * Query EPA WFS service with a CQL_FILTER instead of bbox.
 * Used for attribute-based queries like fetching all segments for a water body.
 */
async function queryEPAWFSWithFilter(
  typeName: string,
  cqlFilter: string,
  limit = 500
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(EPA_WFS_URL)

  url.searchParams.set('service', 'WFS')
  url.searchParams.set('version', '2.0.0')
  url.searchParams.set('request', 'GetFeature')
  url.searchParams.set('typeName', typeName)
  url.searchParams.set('outputFormat', 'application/json')
  url.searchParams.set('srsName', 'EPSG:4326')
  url.searchParams.set('CQL_FILTER', cqlFilter)
  url.searchParams.set('count', limit.toString())

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`EPA WFS CQL error for ${typeName}: ${response.statusText}`)
      return { type: 'FeatureCollection', features: [] }
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`EPA WFS CQL timeout for ${typeName}`)
    } else {
      console.error(`EPA WFS CQL error for ${typeName}:`, error)
    }
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * Fetch all RIVNETROUTES segments for a given river water body code.
 * The WATER_RIVNETROUTES layer has ~116K segments with Segment_Length in meters.
 * Uses CQL_FILTER on WATER_BOD_1 (the river water body code field).
 */
export async function fetchRiverNetworkSegments(waterBodyCode: string): Promise<EPARiverSegment[]> {
  if (!waterBodyCode) return []

  try {
    // WATER_RIVNETROUTES uses River_Waterbody_Code for the water body code
    const cqlFilter = `River_Waterbody_Code='${waterBodyCode}'`
    const data = await queryEPAWFSWithFilter('EPA:WATER_RIVNETROUTES', cqlFilter, 500)

    return data.features
      .filter((f) => f.geometry)
      .map(
        (feature): EPARiverSegment => ({
          Segment_Code: (feature.properties?.Segment_Code as string) || '',
          River_Waterbody_Code: (feature.properties?.River_Waterbody_Code as string) || '',
          EPA_Name: (feature.properties?.EPA_Name as string) || '',
          ORDER_: (feature.properties?.ORDER_ as number) || 0,
          Segment_Length: (feature.properties?.Segment_Length as number) || 0,
          geometry: feature.geometry as GeoJSON.MultiLineString,
        })
      )
  } catch (error) {
    console.error('Error fetching RIVNETROUTES segments:', error)
    return []
  }
}

export function lakesToGeoJSON(lakes: EPALake[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lakes
      .filter((l) => l.geometry)
      .map((lake) => ({
        type: 'Feature' as const,
        geometry: lake.geometry!,
        properties: {
          type: 'lake',
          name: lake.LakeName,
          code: lake.LakeCode,
          catchment: lake.CatchmentName,
          wfdStatus: lake.WFD_Status,
          areaHa: lake.Area_ha,
        },
      })),
  }
}
