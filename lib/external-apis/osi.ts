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
import { HERITAGE_COUNCIL_COLORS } from '@/lib/config/map-constants'

/** Color per NLC Level 1 category — Heritage Council standard (Appendix 6) */
export const NLC_LEVEL1_COLORS: Record<string, string> = {
  'ARTIFICIAL SURFACES': HERITAGE_COUNCIL_COLORS.E, // Red (Exposed Rock / Disturbed Ground)
  'CULTIVATED LAND': HERITAGE_COUNCIL_COLORS.B, // Grey
  'FOREST, WOODLAND AND SCRUB': HERITAGE_COUNCIL_COLORS.W, // Green
  'GRASSLAND, SALTMARSH and SWAMP': HERITAGE_COUNCIL_COLORS.G, // Yellow
  PEATLAND: HERITAGE_COUNCIL_COLORS.P, // Violet/Purple
  'HEATH and BRACKEN': HERITAGE_COUNCIL_COLORS.H, // Brown
  WATERBODIES: HERITAGE_COUNCIL_COLORS.F, // Sky blue
  'EXPOSED SURFACES': HERITAGE_COUNCIL_COLORS.E, // Red
}

/**
 * Fetch NLC 2018 polygons with geometry for map display.
 * Uses outSR=4326 and maxAllowableOffset for geometry simplification.
 * Paginates with resultOffset to retrieve all polygons (ArcGIS returns max 2000 per request).
 * Returns GeoJSON FeatureCollection for Leaflet rendering.
 */
export async function fetchNlcPolygons(
  params: NlcSearchParams
): Promise<GeoJSON.FeatureCollection> {
  const { bbox } = params
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Simplification tolerance scales with bbox — larger area = more aggressive simplification
  // to keep polygon count and geometry size manageable
  const extent = Math.max(bbox.maxLng - bbox.minLng, bbox.maxLat - bbox.minLat)
  const simplifyTolerance = extent * 0.01

  const PAGE_SIZE = 1000
  const MAX_FEATURES = 5000
  const allFeatures: GeoJSON.Feature[] = []
  let offset = 0

  const geometryJson = JSON.stringify({
    xmin: bbox.minLng,
    ymin: bbox.minLat,
    xmax: bbox.maxLng,
    ymax: bbox.maxLat,
    spatialReference: { wkid: 4326 },
  })

  try {
    while (offset < MAX_FEATURES) {
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
        resultRecordCount: PAGE_SIZE.toString(),
        resultOffset: offset.toString(),
        geometry: geometryJson,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)

      const response = await fetch(`${NLC_FEATURE_SERVER}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`NLC polygon query error: ${response.status}`)
        break
      }

      const data = await response.json()

      if (data.error) {
        console.error('NLC polygon query API error:', data.error)
        break
      }

      const fc = data as GeoJSON.FeatureCollection
      if (!fc.features || fc.features.length === 0) break

      allFeatures.push(...fc.features)

      // If we got fewer than PAGE_SIZE, we've reached the end
      if (fc.features.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    if (allFeatures.length === 0) return empty

    // Dissolve: merge all triangle features with the same LEVEL_2_ID into a single
    // MultiPolygon feature per habitat type. NLC returns a TIN (triangulated mesh),
    // so without this step we'd have thousands of tiny triangles killing Leaflet.
    const grouped = new Map<
      string,
      { coords: GeoJSON.Position[][][]; props: Record<string, unknown>; totalArea: number }
    >()

    for (const feature of allFeatures) {
      const props = feature.properties ?? {}
      const nlcId = String(props.LEVEL_2_ID || 'unknown')
      const geom = feature.geometry

      // Extract polygon coordinate rings
      let polyCoords: GeoJSON.Position[][][] = []
      if (geom.type === 'Polygon') {
        polyCoords = [(geom as GeoJSON.Polygon).coordinates]
      } else if (geom.type === 'MultiPolygon') {
        polyCoords = (geom as GeoJSON.MultiPolygon).coordinates
      }

      const existing = grouped.get(nlcId)
      if (existing) {
        existing.coords.push(...polyCoords)
        existing.totalArea += Number(props.AREA || 0)
      } else {
        grouped.set(nlcId, { coords: [...polyCoords], props, totalArea: Number(props.AREA || 0) })
      }
    }

    // Build merged features — one per habitat type
    const mergedFeatures: GeoJSON.Feature[] = []
    for (const [nlcId, { coords, props, totalArea }] of grouped) {
      const level1 = String(props.LEVEL_1_VALUE || '')
      const fossitt = mapNlcToFossitt(nlcId)
      const fossittCode = fossitt?.fossittCode || ''
      const fossittColor = fossittCode
        ? HERITAGE_COUNCIL_COLORS[fossittCode[0] as keyof typeof HERITAGE_COUNCIL_COLORS]
        : undefined

      mergedFeatures.push({
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: coords },
        properties: {
          color: fossittColor || NLC_LEVEL1_COLORS[level1] || '#808080',
          nlc_id: nlcId,
          nlc_label: String(props.LEVEL_2_VALUE || ''),
          nlc_level1: level1,
          fossitt_code: fossittCode || nlcId,
          fossitt_name: fossitt?.fossittName || String(props.LEVEL_2_VALUE || ''),
          area_hectares: Math.round((totalArea / 10000) * 100) / 100,
        },
      })
    }

    return { type: 'FeatureCollection', features: mergedFeatures }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('NLC polygon query timeout')
    } else {
      console.error('NLC polygon query error:', error)
    }
    // Return whatever we've collected so far
    if (allFeatures.length > 0) {
      return { type: 'FeatureCollection', features: allFeatures }
    }
    return empty
  }
}
