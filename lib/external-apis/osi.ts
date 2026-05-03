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
  /**
   * Override the simplification floor in degrees. Use this when fetching a
   * tight viewport at high zoom — the default extent-based clamp gives ~0.5m
   * but you may want ~0.3m to match Esri viewer parity at z18+.
   */
  minTolerance?: number
  /**
   * When true (default), the largest parcel per habitat type gets
   * `is_label_anchor: true` so the renderer shows exactly one FOSSITT
   * label per habitat. Pass false for overlay/detail layers that should
   * not contribute labels (e.g. viewport detail on top of project layer).
   */
  markLabelAnchors?: boolean
  /**
   * When true, fill colour comes from `NLC_NATIVE_LEVEL2_COLORS` (37
   * distinct shades, Tailte Éireann's own palette) instead of the
   * Heritage Council palette. Used by the high-zoom viewport detail layer
   * so closely-zoomed parcels are easier to distinguish (e.g. buildings
   * are bright red, ways are gray, hedgerows are plum). Default false.
   */
  useNativeColors?: boolean
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

import arcgisPbfDecode from 'arcgis-pbf-parser'
import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'
import { getHeritageColor } from '@/lib/config/map-constants'

// Note: client-side dissolve was removed in favour of preserving every
// server-returned parcel as its own feature. Esri viewer parity requires
// individual field boundaries to stay visible. Saving still produces one
// finding per habitat type because getHabitatGeometry() wraps matching
// parcels in a GeometryCollection at save time. polygon-clipping is no
// longer imported here; it remains a dep in case save-time merging is
// added later.

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
 * Tailte Éireann's own NLC 2018 renderer palette — one distinct colour per
 * Level 2 habitat type (37 entries). Source: the FeatureServer's drawingInfo
 * (`uniqueValueInfos` keyed by `LEVEL_2_VALUE`). Used by the high-zoom
 * viewport detail layer because at close inspection the Heritage Council
 * palette (which uses a single colour per broad category) makes too many
 * habitats visually identical. Heritage stays the default for the project
 * overview and report PDFs.
 */
export const NLC_NATIVE_LEVEL2_COLORS: Record<string, string> = {
  'Amenity Grassland': '#a2f14f',
  'Artificial Waterbodies': '#004da8',
  'Bare Peat': '#846044',
  'Bare Soil and Disturbed Ground': '#4a2d00',
  'Blanket Bog': '#a87000',
  Bracken: '#f4c7da',
  'Broadleaved Forest and Woodland': '#6bad00',
  Buildings: '#ff2d35',
  'Burnt Areas': '#e6a700',
  'Coastal Sediments': '#f9f382',
  'Coniferous Forest': '#265000',
  'Cultivated Land': '#ffffac',
  'Cutover Bog': '#d49676',
  'Dry Grassland': '#def3cc',
  'Dry Heath': '#c190d0',
  'Exposed Rock and Sediments': '#819498',
  Fens: '#cdf57a',
  Hedgerows: '#81516b',
  'Improved Grassland': '#7ccc59',
  'Lakes and Ponds': '#0099ff',
  'Marine Water': '#bdf2ff',
  'Mixed Forest': '#507c00',
  Mudflats: '#d0c29e',
  'Other Artificial Surfaces': '#dcdcdc',
  'Raised Bog': '#732600',
  'Rivers and Streams': '#73b2ff',
  'Salt Marsh': '#afb400',
  'Sand Dunes': '#ecff2e',
  Scrub: '#a0d023',
  Swamp: '#cdaa66',
  'Transitional Forest': '#7a8f21',
  'Transitional Waterbodies': '#73dfff',
  Treelines: '#e8e762',
  Ways: '#808a8c',
  'Wet Grassland': '#38a800',
  'Wet Heath': '#7d00a2',
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
  const { bbox, minTolerance, markLabelAnchors = true, useNativeColors = false } = params
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Tile-mode query params mirror what the ArcGIS JS API sends in its own viewer:
  //   - quantizationParameters: server snaps vertices to a regular grid so the
  //     TIN triangle edges quantize-collapse to clean, shared boundaries
  //   - resultType='tile': asks the server to apply tile-style generalization
  //     (LOD-aware densification and simplification) instead of returning raw
  //     features verbatim
  //   - maxAllowableOffset: matches the quantization tolerance, set fine enough
  //     to preserve buildings/hedgerows without flooding the wire
  // Tolerance is in degrees because we query in EPSG:4326. We clamp it between
  // ~0.5m (tight zoom, dense built-up areas need sub-meter detail to keep
  // hedgerows and small buildings visible) and ~50m (continent-wide bboxes
  // shouldn't drown the client). 0.0000045 deg ≈ 0.5m at lat 53°.
  const extent = Math.max(bbox.maxLng - bbox.minLng, bbox.maxLat - bbox.minLat)
  const serverSimplify = Math.min(Math.max(extent * 0.001, minTolerance ?? 0.0000045), 0.00045)

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
  // Safety cap. Each parcel becomes one output feature (no client dissolve
  // anymore — Esri viewer parity requires keeping individual field
  // boundaries visible) so this cap also limits how many features Leaflet
  // has to render. 100k is generous enough for any realistic Irish project
  // bbox; PBF + canvas renderer handle it without UI lag.
  const MAX_FEATURES = 100000

  // We keep each server-returned parcel as its own output feature. Adjacent
  // parcels of the same habitat type stay distinct so field boundaries are
  // visible (matches Esri viewer rendering). Saving merges them on demand
  // via getHabitatGeometry → GeometryCollection per habitat type.
  const collected: GeoJSON.Feature[] = []
  // Track the largest parcel per habitat type so the renderer can label
  // exactly one polygon per habitat, avoiding "GA1, GA1, GA1..." duplicates.
  const labelAnchorByNlcId = new Map<string, { area: number; index: number }>()
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
        // Order by area DESC so the largest parcels arrive first. If we hit
        // MAX_FEATURES, the trailing tiny parcels are clipped — those are
        // the least visually impactful losses.
        orderByFields: 'AREA DESC',
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
      // Decode is wrapped because a corrupted/truncated body (CDN hiccup,
      // HTML 200 error response) will throw mid-stream — we want to keep
      // whatever pages already landed cleanly rather than discard everything.
      let decoded: { featureCollection: GeoJSON.FeatureCollection; exceededTransferLimit: boolean }
      try {
        const buffer = await response.arrayBuffer()
        decoded = arcgisPbfDecode(new Uint8Array(buffer))
      } catch (err) {
        console.warn('NLC PBF decode failed, returning prior pages:', err)
        break
      }
      const fc = decoded.featureCollection
      if (!fc.features || fc.features.length === 0) break

      for (const feature of fc.features) {
        const props = feature.properties ?? {}
        const nlcId = String(props.LEVEL_2_ID || 'unknown')
        const level1 = String(props.LEVEL_1_VALUE || '')
        const nlcLabel = String(props.LEVEL_2_VALUE || '')
        const fossitt = mapNlcToFossitt(nlcId)
        const fossittCode = fossitt?.fossittCode || ''
        const areaSqm = Number(props.AREA || 0)
        const areaHectares = Math.round((areaSqm / 10000) * 100) / 100

        // Native palette keyed by LEVEL_2_VALUE, Heritage palette keyed by
        // FOSSITT code. Fall back to Level-1 palette if neither resolves.
        let color: string | undefined
        if (useNativeColors) color = NLC_NATIVE_LEVEL2_COLORS[nlcLabel]
        else if (fossittCode) color = getHeritageColor(fossittCode)
        if (!color) color = NLC_LEVEL1_COLORS[level1] || '#808080'

        const outIndex = collected.length
        collected.push({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            color,
            nlc_id: nlcId,
            nlc_label: nlcLabel,
            nlc_level1: level1,
            fossitt_code: fossittCode || nlcId,
            fossitt_name: fossitt?.fossittName || nlcLabel,
            area_hectares: areaHectares,
            // is_label_anchor flipped after the loop — see below.
            is_label_anchor: false,
          },
        })

        const currentAnchor = labelAnchorByNlcId.get(nlcId)
        if (!currentAnchor || areaSqm > currentAnchor.area) {
          labelAnchorByNlcId.set(nlcId, { area: areaSqm, index: outIndex })
        }
      }

      totalFetched += fc.features.length

      // PBF response carries a definitive flag — use it instead of the
      // pageSize heuristic, which can be wrong when the server returns
      // exactly PAGE_SIZE features on the final page.
      if (!decoded.exceededTransferLimit) break
      offset += PAGE_SIZE
    }

    if (collected.length === 0) return empty

    if (totalFetched >= MAX_FEATURES) {
      console.warn(
        `NLC polygon fetch hit MAX_FEATURES cap (${MAX_FEATURES}). Smallest trailing parcels may be missing.`
      )
    }

    // Mark exactly one feature per habitat type as the label anchor so the
    // renderer doesn't stack duplicate FOSSITT labels on every parcel.
    // Skipped when this is an overlay/detail fetch (markLabelAnchors=false)
    // so it doesn't fight with the project layer's labels.
    if (markLabelAnchors) {
      for (const { index } of labelAnchorByNlcId.values()) {
        const feat = collected[index]
        if (feat?.properties) feat.properties.is_label_anchor = true
      }
    }

    return { type: 'FeatureCollection', features: collected }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('NLC polygon query timeout')
    } else {
      console.warn('NLC polygon query network error:', error)
    }
    // Return whatever we've successfully fetched so far. Mark anchors for
    // partial results too so the renderer behaves consistently.
    if (collected.length === 0) return empty
    if (markLabelAnchors) {
      for (const { index } of labelAnchorByNlcId.values()) {
        const feat = collected[index]
        if (feat?.properties) feat.properties.is_label_anchor = true
      }
    }
    return { type: 'FeatureCollection', features: collected }
  }
}
