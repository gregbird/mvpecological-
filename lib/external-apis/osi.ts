/**
 * OSI (Ordnance Survey Ireland) National Land Cover 2018 API Client
 *
 * Queries the ArcGIS FeatureServer for land cover data within a bounding box.
 * Uses server-side aggregation (outStatistics + groupBy) for fast results.
 *
 * Endpoint: https://services-eu1.arcgis.com/FH5XCsx8rYXqnjF5/arcgis/rest/services/MapGenieNationalLandCover2018ITM/FeatureServer/0
 */

const NLC_FEATURE_SERVER =
  'https://services-eu1.arcgis.com/FH5XCsx8rYXqnjF5/arcgis/rest/services/MapGenieNationalLandCover2018ITM/FeatureServer/0'

export interface AggregatedHabitat {
  /** NLC Level 2 ID */
  nlcId: string
  /** NLC Level 2 label */
  nlcLabel: string
  /** NLC Level 1 label */
  nlcLevel1: string
  /** Total area in hectares (sum of all matching polygons) */
  areaHectares: number
  /** Number of polygons */
  polygonCount: number
}

export interface NlcSearchParams {
  bbox: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

/**
 * Search NLC 2018 with server-side aggregation.
 * Uses outStatistics to GROUP BY habitat type and SUM area on the server,
 * returning one row per habitat type instead of thousands of individual polygons.
 */
export async function searchNlcLandCover(params: NlcSearchParams): Promise<AggregatedHabitat[]> {
  const { bbox } = params

  const outStatistics = JSON.stringify([
    {
      statisticType: 'sum',
      onStatisticField: 'AREA',
      outStatisticFieldName: 'totalArea',
    },
    {
      statisticType: 'count',
      onStatisticField: 'OBJECTID',
      outStatisticFieldName: 'polygonCount',
    },
  ])

  const body = new URLSearchParams({
    f: 'json',
    where: '1=1',
    returnGeometry: 'false',
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outStatistics,
    groupByFieldsForStatistics: 'LEVEL_2_ID,LEVEL_2_VALUE,LEVEL_1_VALUE',
    geometry: JSON.stringify({
      xmin: bbox.minLng,
      ymin: bbox.minLat,
      xmax: bbox.maxLng,
      ymax: bbox.maxLat,
      spatialReference: { wkid: 4326 },
    }),
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${NLC_FEATURE_SERVER}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`NLC query error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.error('NLC query API error:', data.error)
      return []
    }

    const features = data.features as Array<{ attributes: Record<string, unknown> }> | undefined
    if (!features || features.length === 0) return []

    return features
      .map((f) => {
        const attrs = f.attributes
        const areaSqm = Number(attrs.totalArea) || 0
        return {
          nlcId: String(attrs.LEVEL_2_ID || ''),
          nlcLabel: String(attrs.LEVEL_2_VALUE || ''),
          nlcLevel1: String(attrs.LEVEL_1_VALUE || ''),
          areaHectares: Math.round((areaSqm / 10000) * 100) / 100,
          polygonCount: Number(attrs.polygonCount) || 0,
        }
      })
      .sort((a, b) => b.areaHectares - a.areaHectares)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('NLC query timeout')
    } else {
      console.error('NLC query error:', error)
    }
    return []
  }
}

import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'

/** Color per NLC Level 1 category for map display */
export const NLC_LEVEL1_COLORS: Record<string, string> = {
  'ARTIFICIAL SURFACES': '#e74c3c',
  'CULTIVATED LAND': '#f39c12',
  'FOREST, WOODLAND AND SCRUB': '#27ae60',
  'GRASSLAND, SALTMARSH and SWAMP': '#84cc16',
  PEATLAND: '#8e44ad',
  'HEATH and BRACKEN': '#a0522d',
  WATERBODIES: '#2980b9',
  'EXPOSED SURFACES': '#95a5a6',
}

/**
 * Fetch NLC 2018 polygons with geometry for map display.
 * Uses outSR=4326 and maxAllowableOffset for geometry simplification.
 * Returns GeoJSON FeatureCollection for Leaflet rendering.
 */
export async function fetchNlcPolygons(
  params: NlcSearchParams
): Promise<GeoJSON.FeatureCollection> {
  const { bbox } = params
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Estimate simplification tolerance from bbox size (~0.5% of extent)
  const extent = Math.max(bbox.maxLng - bbox.minLng, bbox.maxLat - bbox.minLat)
  const simplifyTolerance = extent * 0.005

  const body = new URLSearchParams({
    f: 'geojson',
    where: '1=1',
    returnGeometry: 'true',
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: 'LEVEL_2_ID,LEVEL_2_VALUE,LEVEL_1_VALUE,AREA',
    maxAllowableOffset: simplifyTolerance.toString(),
    resultRecordCount: '2000',
    geometry: JSON.stringify({
      xmin: bbox.minLng,
      ymin: bbox.minLat,
      xmax: bbox.maxLng,
      ymax: bbox.maxLat,
      spatialReference: { wkid: 4326 },
    }),
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const response = await fetch(`${NLC_FEATURE_SERVER}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`NLC polygon query error: ${response.status}`)
      return empty
    }

    const data = await response.json()

    if (data.error) {
      console.error('NLC polygon query API error:', data.error)
      return empty
    }

    // f=geojson returns a FeatureCollection directly
    const fc = data as GeoJSON.FeatureCollection
    if (!fc.features || fc.features.length === 0) return empty

    // Enrich properties with Fossitt mapping and color for map styling
    for (const feature of fc.features) {
      const props = feature.properties ?? {}
      const level1 = String(props.LEVEL_1_VALUE || '')
      const nlcId = String(props.LEVEL_2_ID || '')
      const fossitt = mapNlcToFossitt(nlcId)
      feature.properties = {
        ...props,
        color: NLC_LEVEL1_COLORS[level1] || '#22c55e',
        nlc_id: nlcId,
        nlc_label: String(props.LEVEL_2_VALUE || ''),
        nlc_level1: level1,
        fossitt_code: fossitt?.fossittCode || nlcId,
        fossitt_name: fossitt?.fossittName || String(props.LEVEL_2_VALUE || ''),
        area_hectares: Math.round((Number(props.AREA || 0) / 10000) * 100) / 100,
      }
    }

    return fc
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('NLC polygon query timeout')
    } else {
      console.error('NLC polygon query error:', error)
    }
    return empty
  }
}
