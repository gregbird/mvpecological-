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
      console.warn('NLC query timeout')
    } else {
      console.warn('NLC query network error:', error)
    }
    return []
  }
}

import * as turf from '@turf/turf'
import polygonClipping, { type Geom } from 'polygon-clipping'
import arcgisPbfDecode from 'arcgis-pbf-parser'
import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'
import { getHeritageColor } from '@/lib/config/map-constants'

/**
 * Dissolve TIN triangles using mfogel/polygon-clipping.
 *
 * Replaces the old turf.union divide-and-conquer loop because:
 *   - polygon-clipping accepts ALL rings in a single call (no batching needed)
 *   - its rounded-snap pre-processing collapses near-duplicate vertices from
 *     adjacent triangles, eliminating T-junctions and slivers that turf.union
 *     leaves behind
 *   - ~2x faster than turf.union for the same input
 *
 * After the union, we run a very gentle turf.simplify to clean any final
 * artifacts. With server-side quantization in place this barely changes the
 * geometry but catches edge cases.
 *
 * Falls back to raw MultiPolygon on error.
 */
function dissolveCoords(
  coords: GeoJSON.Position[][][],
  simplifyTolerance: number
): GeoJSON.Geometry {
  const raw: GeoJSON.Geometry = { type: 'MultiPolygon', coordinates: coords }
  if (coords.length === 0) return raw
  if (coords.length === 1) return { type: 'Polygon', coordinates: coords[0] }

  try {
    // polygon-clipping wants Geom = Pair<number, number>[][][] (MultiPolygon
    // shape). Each input ring is a single Polygon, so wrap each as a singleton
    // MultiPolygon and let union flatten them all in one pass.
    const inputs = coords.map((rings) => [rings] as Geom)
    const merged = polygonClipping.union(inputs[0], ...inputs.slice(1))

    const dissolvedGeom: GeoJSON.Geometry =
      merged.length === 1
        ? { type: 'Polygon', coordinates: merged[0] as GeoJSON.Position[][] }
        : { type: 'MultiPolygon', coordinates: merged as GeoJSON.Position[][][] }

    // After clean union, only a featherweight simplify is needed — this exists
    // mainly to remove any colinear vertices left over from quantization.
    if (simplifyTolerance <= 0) return dissolvedGeom
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: dissolvedGeom,
    }
    const simplified = turf.simplify(feature, {
      tolerance: simplifyTolerance,
      highQuality: true,
    })
    return simplified.geometry
  } catch {
    return raw
  }
}

/** Color per NLC Level 1 category — fallback when FOSSITT code unavailable */
export const NLC_LEVEL1_COLORS: Record<string, string> = {
  'ARTIFICIAL SURFACES': '#DC2626',
  'CULTIVATED LAND': '#808080',
  'FOREST, WOODLAND AND SCRUB': '#228B22',
  'GRASSLAND, SALTMARSH and SWAMP': '#FFD700',
  PEATLAND: '#9B59B6',
  'HEATH and BRACKEN': '#8B4513',
  WATERBODIES: '#87CEEB',
  'EXPOSED SURFACES': '#DC2626',
}

/**
 * Fetch NLC 2018 polygons with geometry for map display.
 *
 * NLC is a Triangulated Irregular Network (TIN) — every habitat polygon is
 * shipped as hundreds of tiny triangles. We dissolve them per LEVEL_2_ID
 * (habitat type) so the final feature collection only has ~28 features
 * regardless of input size.
 *
 * Pagination details:
 *  - ArcGIS caps each request at 2000 features (server-side limit)
 *  - We page until exhaustion or until we hit MAX_FEATURES
 *  - Page rows are dissolved into the running grouped map IMMEDIATELY so
 *    memory stays bounded even when we fetch tens of thousands of triangles
 *  - `orderByFields: 'LEVEL_2_ID'` ensures features come back in habitat
 *    order, so a hard MAX_FEATURES cap loses entire trailing categories
 *    rather than partial polygons of every category — but we set the cap
 *    high enough that this only matters as a safety valve.
 */
export async function fetchNlcPolygons(
  params: NlcSearchParams
): Promise<GeoJSON.FeatureCollection> {
  const { bbox } = params
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Tile-mode query params mirror what the ArcGIS JS API sends in its own viewer:
  //   - quantizationParameters: server snaps vertices to a regular grid so the
  //     TIN triangle edges quantize-collapse to clean, shared boundaries
  //   - resultType='tile': asks the server to apply tile-style generalization
  //     (LOD-aware densification and simplification) instead of returning raw
  //     features verbatim
  //   - maxAllowableOffset: matches the quantization tolerance, set fine enough
  //     to preserve buildings/roads without flooding the wire
  // Tolerance is in degrees because we query in EPSG:4326. We clamp it between
  // ~2m (small bboxes get fine detail — buildings, hedgerows preserved) and
  // ~50m (continent-wide bboxes shouldn't drown the client). 0.000018 deg ≈ 2m
  // at lat 53°. Esri's own viewer uses ~2m offset in ITM and shows no quality
  // loss at typical zoom — we match that.
  const extent = Math.max(bbox.maxLng - bbox.minLng, bbox.maxLat - bbox.minLat)
  const serverSimplify = Math.min(Math.max(extent * 0.001, 0.000018), 0.00045)
  // After server quantization, the leftover seams between unioned triangles
  // are tiny — keep client simplify gentle so we smooth seams without
  // collapsing real geometry.
  const clientSimplify = serverSimplify * 0.3

  const quantizationParameters = JSON.stringify({
    mode: 'view',
    originPosition: 'upperLeft',
    tolerance: serverSimplify,
    extent: {
      xmin: bbox.minLng,
      ymin: bbox.minLat,
      xmax: bbox.maxLng,
      ymax: bbox.maxLat,
      spatialReference: { wkid: 4326 },
    },
  })

  // resultType=tile unlocks tileMaxRecordCount (4000) instead of the default
  // maxRecordCount (1000-2000). Larger pages mean fewer round-trips for
  // dense bboxes.
  const PAGE_SIZE = 4000
  // Safety cap: large multi-site searches over Co. Louth-sized bboxes can
  // return 30k+ TIN triangles. 5000 (the previous cap) silently dropped
  // entire habitat categories like Lakes and Ponds, Scrub, Immature
  // woodland — they fell off the end of the ObjectID ordering. 50k is
  // generous enough for any realistic Irish project bbox while still
  // bounding worst-case latency.
  const MAX_FEATURES = 50000

  // Running dissolve map — keyed by NLC LEVEL_2_ID so memory stays bounded
  // regardless of how many TIN triangles we paginate through.
  const grouped = new Map<
    string,
    { coords: GeoJSON.Position[][][]; props: Record<string, unknown>; totalArea: number }
  >()
  let totalFetched = 0

  const geometryJson = JSON.stringify({
    xmin: bbox.minLng,
    ymin: bbox.minLat,
    xmax: bbox.maxLng,
    ymax: bbox.maxLat,
    spatialReference: { wkid: 4326 },
  })

  try {
    let offset = 0
    while (offset < MAX_FEATURES) {
      const body = new URLSearchParams({
        f: 'pbf',
        where: '1=1',
        returnGeometry: 'true',
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        inSR: '4326',
        outSR: '4326',
        outFields: 'LEVEL_2_ID,LEVEL_2_VALUE,LEVEL_1_VALUE,AREA',
        // Order by habitat category so paged dissolve happens in coherent
        // batches and a hard cap clips trailing categories cleanly.
        orderByFields: 'LEVEL_2_ID',
        maxAllowableOffset: serverSimplify.toString(),
        quantizationParameters,
        resultType: 'tile',
        cacheHint: 'true',
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

      // PBF responses are ~35x smaller than GeoJSON for the same query and
      // the server auto-quantizes when pbf is requested. arcgisPbfDecode
      // returns a normal GeoJSON FeatureCollection plus exceededTransferLimit,
      // which is more reliable than the old "page < PAGE_SIZE → done" check.
      const buffer = await response.arrayBuffer()
      const decoded = arcgisPbfDecode(new Uint8Array(buffer))
      const fc = decoded.featureCollection
      if (!fc.features || fc.features.length === 0) break

      // Dissolve this page into the running grouped map immediately so the
      // raw triangles can be garbage-collected before the next page lands.
      for (const feature of fc.features) {
        const props = feature.properties ?? {}
        const nlcId = String(props.LEVEL_2_ID || 'unknown')
        const geom = feature.geometry

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
          grouped.set(nlcId, {
            coords: [...polyCoords],
            props,
            totalArea: Number(props.AREA || 0),
          })
        }
      }

      totalFetched += fc.features.length

      // PBF response carries a definitive flag — use it instead of the
      // pageSize heuristic, which can be wrong when the server returns
      // exactly PAGE_SIZE features on the final page.
      if (!decoded.exceededTransferLimit) break
      offset += PAGE_SIZE
    }

    if (grouped.size === 0) return empty

    if (totalFetched >= MAX_FEATURES) {
      console.warn(
        `NLC polygon fetch hit MAX_FEATURES cap (${MAX_FEATURES}). Trailing habitat categories may be missing.`
      )
    }

    // Build merged features — one per habitat type
    const mergedFeatures: GeoJSON.Feature[] = []
    for (const [nlcId, { coords, props, totalArea }] of grouped) {
      const level1 = String(props.LEVEL_1_VALUE || '')
      const nlcLabel = String(props.LEVEL_2_VALUE || '')
      const fossitt = mapNlcToFossitt(nlcId)
      const fossittCode = fossitt?.fossittCode || ''

      mergedFeatures.push({
        type: 'Feature',
        geometry: dissolveCoords(coords, clientSimplify),
        properties: {
          color: fossittCode
            ? getHeritageColor(fossittCode)
            : NLC_LEVEL1_COLORS[level1] || '#808080',
          nlc_id: nlcId,
          nlc_label: nlcLabel,
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
      console.warn('NLC polygon query timeout')
    } else {
      console.warn('NLC polygon query network error:', error)
    }
    // Return whatever we've successfully dissolved so far
    if (grouped.size === 0) return empty
    const partialFeatures: GeoJSON.Feature[] = []
    for (const [nlcId, { coords, props, totalArea }] of grouped) {
      const level1 = String(props.LEVEL_1_VALUE || '')
      const nlcLabel = String(props.LEVEL_2_VALUE || '')
      const fossitt = mapNlcToFossitt(nlcId)
      const fossittCode = fossitt?.fossittCode || ''
      partialFeatures.push({
        type: 'Feature',
        geometry: dissolveCoords(coords, clientSimplify),
        properties: {
          color: fossittCode
            ? getHeritageColor(fossittCode)
            : NLC_LEVEL1_COLORS[level1] || '#808080',
          nlc_id: nlcId,
          nlc_label: nlcLabel,
          nlc_level1: level1,
          fossitt_code: fossittCode || nlcId,
          fossitt_name: fossitt?.fossittName || String(props.LEVEL_2_VALUE || ''),
          area_hectares: Math.round((totalArea / 10000) * 100) / 100,
        },
      })
    }
    return { type: 'FeatureCollection', features: partialFeatures }
  }
}
