import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'

// Tailte Éireann ArcGIS REST API endpoint for townlands
const TOWNLANDS_API_URL =
  'https://services-eu1.arcgis.com/FH5XCsx8rYXqnjF5/ArcGIS/rest/services/Townlands_NationalStatutoryBoundaries_Ungeneralised_2024/FeatureServer/0/query'

// Maximum number of features to return per request
const MAX_FEATURES = 500

// Timeout for API requests (ms)
const API_TIMEOUT = 15000

interface TownlandProperties {
  ENG_NAME_VALUE: string | null
  GLE_NAME_VALUE: string | null
  Shape__Area: number | null
  GUID: string
}

/**
 * GET /api/boundaries/townlands
 *
 * Query townland boundaries within a bounding box.
 * Due to the large size of the dataset (~51,000 townlands), this endpoint
 * requires a bbox parameter to filter results.
 *
 * Query Parameters:
 * - bbox: Bounding box in format "minLng,minLat,maxLng,maxLat" (WGS84)
 * - limit: Maximum number of features to return (default: 500, max: 1000)
 */
export async function GET(request: NextRequest) {
  const { user: _authUser, error: authError } = await requireAuth()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const bbox = searchParams.get('bbox')
  const limitParam = searchParams.get('limit')

  // Validate bbox parameter
  if (!bbox) {
    return NextResponse.json(
      {
        error: 'Missing required parameter: bbox',
        usage: 'GET /api/boundaries/townlands?bbox=minLng,minLat,maxLng,maxLat',
        example: '/api/boundaries/townlands?bbox=-7.5,53.0,-7.0,53.5',
      },
      { status: 400 }
    )
  }

  // Parse bbox
  const bboxParts = bbox.split(',').map(Number)
  if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
    return NextResponse.json(
      {
        error: 'Invalid bbox format. Expected: minLng,minLat,maxLng,maxLat',
        received: bbox,
      },
      { status: 400 }
    )
  }

  const [minLng, minLat, maxLng, maxLat] = bboxParts

  // Validate coordinates are within Ireland bounds
  const IRELAND_BOUNDS = {
    minLat: 51.4,
    maxLat: 55.5,
    minLng: -10.5,
    maxLng: -5.5,
  }

  if (
    minLat < IRELAND_BOUNDS.minLat ||
    maxLat > IRELAND_BOUNDS.maxLat ||
    minLng < IRELAND_BOUNDS.minLng ||
    maxLng > IRELAND_BOUNDS.maxLng
  ) {
    return NextResponse.json(
      {
        error: 'Bbox is outside Ireland bounds',
        irelandBounds: IRELAND_BOUNDS,
        received: { minLng, minLat, maxLng, maxLat },
      },
      { status: 400 }
    )
  }

  // Parse and validate limit
  let limit = MAX_FEATURES
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10)
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 1000) // Cap at 1000
    }
  }

  try {
    // Build ArcGIS query URL
    // The ArcGIS API uses ITM (EPSG:2157) as native CRS, but we can query with WGS84
    // and request output in WGS84 using inSR and outSR parameters
    const queryParams = new URLSearchParams({
      where: '1=1',
      geometry: JSON.stringify({
        xmin: minLng,
        ymin: minLat,
        xmax: maxLng,
        ymax: maxLat,
        spatialReference: { wkid: 4326 },
      }),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326', // Input bbox is in WGS84
      outFields: 'ENG_NAME_VALUE,GLE_NAME_VALUE,Shape__Area,GUID',
      returnGeometry: 'true',
      outSR: '4326', // Return coordinates in WGS84
      f: 'geojson',
      resultRecordCount: limit.toString(),
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    const response = await fetch(`${TOWNLANDS_API_URL}?${queryParams}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('Townlands API error:', response.status, await response.text())
      return NextResponse.json(
        { error: 'Failed to fetch townland data from Tailte Éireann API' },
        { status: 502 }
      )
    }

    const data = await response.json()

    // Transform feature properties to a cleaner format
    if (data.features) {
      data.features = data.features.map(
        (feature: GeoJSON.Feature<GeoJSON.Geometry, TownlandProperties>) => ({
          ...feature,
          properties: {
            name: feature.properties.ENG_NAME_VALUE || 'Unknown',
            nameIrish: feature.properties.GLE_NAME_VALUE,
            areaSquareMeters: feature.properties.Shape__Area,
            areaHectares: feature.properties.Shape__Area
              ? (feature.properties.Shape__Area / 10000).toFixed(2)
              : null,
            guid: feature.properties.GUID,
          },
        })
      )
    }

    // Add metadata
    const result = {
      type: 'FeatureCollection',
      features: data.features || [],
      metadata: {
        source: 'Tailte Éireann',
        dataset: 'Townlands - National Statutory Boundaries 2024',
        license: 'CC-BY 4.0',
        attribution: '© Tailte Éireann',
        bbox: [minLng, minLat, maxLng, maxLat],
        featureCount: data.features?.length || 0,
        limitApplied: limit,
      },
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - area may be too large' },
        { status: 504 }
      )
    }

    console.error('Townlands API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
