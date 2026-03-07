'use client'

import * as React from 'react'

// ---------------------------------------------------------------------------
// BirdWatch Ireland I-WEBS (Irish Wetland Bird Survey) overlay
// Fetches features from 3 ArcGIS FeatureServer endpoints and renders them
// on a Leaflet map using GeoJSON. Follows the same pattern as npws-layer-overlay.
// ---------------------------------------------------------------------------

const IWEBS_ENDPOINTS = {
  iwebs_boundaries: {
    url: 'https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/IWeBS_Boundaries_2017/FeatureServer/0',
    outFields: 'SUBSITE_CO,Site,SiteCode',
    nameField: 'Site',
    codeField: 'SiteCode',
    color: '#0ea5e9', // sky-500
    fillOpacity: 0.12,
    weight: 2,
    type: 'polygon' as const,
    label: 'I-WEBS Boundary',
  },
  iwebs_sites: {
    url: 'https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/Map_Data_Coverage_Jul22/FeatureServer/0',
    outFields: 'SiteCode,Sitename,SiteGrid,MostRecentYear,Colour',
    nameField: 'Sitename',
    codeField: 'SiteCode',
    color: '#2563eb', // blue-600
    fillOpacity: 1,
    weight: 0,
    type: 'point' as const,
    label: 'I-WEBS Site',
  },
  iwebs_subsites: {
    url: 'https://services5.arcgis.com/rmbpRCdMkd6BizHt/arcgis/rest/services/Season_26_IWeBS_Subsites/FeatureServer/0',
    outFields: 'SiteID,Site_Name,Subsite_Code,Subsite_Name,Grid_Ref',
    nameField: 'Subsite_Name',
    codeField: 'Subsite_Code',
    color: '#7c3aed', // violet-600
    fillOpacity: 1,
    weight: 0,
    type: 'point' as const,
    label: 'I-WEBS Sub-site',
  },
} as const

type IWebsLayerId = keyof typeof IWEBS_ENDPOINTS

/** Which I-WEBS layer IDs are currently enabled */
export const IWEBS_LAYER_IDS: IWebsLayerId[] = ['iwebs_boundaries', 'iwebs_sites', 'iwebs_subsites']

// ---------------------------------------------------------------------------
// ArcGIS query helper — returns GeoJSON FeatureCollection for a bbox
// ---------------------------------------------------------------------------
async function queryIWebsFeatures(
  endpoint: (typeof IWEBS_ENDPOINTS)[IWebsLayerId],
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: endpoint.outFields,
    geometry: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '500',
  })

  const res = await fetch(`${endpoint.url}/query?${params.toString()}`)
  if (!res.ok) throw new Error(`I-WEBS query failed: ${res.status}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// React hook — fetch + render I-WEBS layers on a Leaflet map
// ---------------------------------------------------------------------------
export function useIWebsLayers(
  map: L.Map | null,
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null | undefined,
  visibleLayers: string[],
  searchRadius = 15
) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [featureCounts, setFeatureCounts] = React.useState<Record<string, number>>({})
  const dataRef = React.useRef<Record<string, GeoJSON.FeatureCollection>>({})
  const leafletLayersRef = React.useRef<L.Layer[]>([])
  const prevKeyRef = React.useRef('')

  // Which I-WEBS layers are active?
  const activeLayers = React.useMemo(
    () => IWEBS_LAYER_IDS.filter((id) => visibleLayers.includes(id)),
    [visibleLayers]
  )

  // Compute bbox from boundary + buffer
  const bbox = React.useMemo(() => {
    if (!boundary?.geometry?.coordinates?.[0]) return null
    const coords = boundary.geometry.coordinates[0]
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity
    for (const c of coords) {
      minLng = Math.min(minLng, c[0])
      maxLng = Math.max(maxLng, c[0])
      minLat = Math.min(minLat, c[1])
      maxLat = Math.max(maxLat, c[1])
    }
    const buf = searchRadius / 111
    return { minX: minLng - buf, minY: minLat - buf, maxX: maxLng + buf, maxY: maxLat + buf }
  }, [boundary, searchRadius])

  // Fetch data when bbox or active layers change
  React.useEffect(() => {
    if (!bbox || activeLayers.length === 0) {
      dataRef.current = {}
      setFeatureCounts({})
      return
    }

    const key = `${activeLayers.join(',')}-${bbox.minX.toFixed(4)}`
    if (key === prevKeyRef.current) return
    prevKeyRef.current = key

    let cancelled = false
    setIsLoading(true)

    const fetchAll = async () => {
      const results: Record<string, GeoJSON.FeatureCollection> = {}
      const counts: Record<string, number> = {}

      await Promise.all(
        activeLayers.map(async (layerId) => {
          try {
            const fc = await queryIWebsFeatures(IWEBS_ENDPOINTS[layerId], bbox)
            results[layerId] = fc
            counts[layerId] = fc.features.length
          } catch (err) {
            console.error(`[I-WEBS] Failed to fetch ${layerId}:`, err)
            results[layerId] = { type: 'FeatureCollection', features: [] }
            counts[layerId] = 0
          }
        })
      )

      if (!cancelled) {
        dataRef.current = results
        setFeatureCounts(counts)
        setIsLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [bbox, activeLayers])

  // Render on map
  React.useEffect(() => {
    if (!map || !map.getPane('overlayPane')) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')

    // Clean previous
    for (const layer of leafletLayersRef.current) {
      try {
        map.removeLayer(layer)
      } catch {
        // ignore
      }
    }
    leafletLayersRef.current = []

    // Render each active layer
    for (const layerId of activeLayers) {
      const fc = dataRef.current[layerId]
      if (!fc?.features?.length) continue

      const config = IWEBS_ENDPOINTS[layerId]

      const geoJsonLayer = L.geoJSON(fc, {
        // Polygon style
        style:
          config.type === 'polygon'
            ? () => ({
                color: config.color,
                weight: config.weight,
                fillColor: config.color,
                fillOpacity: config.fillOpacity,
                dashArray: '4, 4',
              })
            : undefined,
        // Point style — circle markers
        pointToLayer:
          config.type === 'point'
            ? (_feature: GeoJSON.Feature, latlng: L.LatLng) =>
                L.circleMarker(latlng, {
                  radius: 6,
                  fillColor: config.color,
                  color: '#fff',
                  weight: 1.5,
                  fillOpacity: 0.85,
                })
            : undefined,
        // Popup
        onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
          const props = feature.properties || {}
          const name = props[config.nameField] || 'Unknown'
          const code = props[config.codeField] || ''

          let extraRows = ''
          if (layerId === 'iwebs_sites' && props.MostRecentYear) {
            extraRows += `<tr><td style="color:#666;">Last surveyed:</td><td style="font-weight:500;">${props.MostRecentYear}</td></tr>`
          }
          if (layerId === 'iwebs_sites' && props.SiteGrid) {
            extraRows += `<tr><td style="color:#666;">Grid ref:</td><td style="font-weight:500;">${props.SiteGrid}</td></tr>`
          }
          if (layerId === 'iwebs_subsites' && props.Grid_Ref) {
            extraRows += `<tr><td style="color:#666;">Grid ref:</td><td style="font-weight:500;">${props.Grid_Ref}</td></tr>`
          }
          if (layerId === 'iwebs_subsites' && props.Site_Name) {
            extraRows += `<tr><td style="color:#666;">Parent site:</td><td style="font-weight:500;">${props.Site_Name}</td></tr>`
          }

          layer.bindPopup(`
            <div style="min-width:200px;">
              <div style="font-weight:600;margin-bottom:4px;">${name}</div>
              <div style="font-size:12px;color:#666;margin-bottom:8px;">${config.label}</div>
              <table style="font-size:12px;width:100%;">
                <tr><td style="color:#666;">Code:</td><td style="font-weight:500;">${code}</td></tr>
                ${extraRows}
              </table>
              <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;">
                <a href="https://birdwatchireland.ie/our-work/surveys-research/research-surveys/irish-wetland-bird-survey/"
                   target="_blank" rel="noopener noreferrer"
                   style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#2563eb;text-decoration:none;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  About I-WEBS
                </a>
              </div>
            </div>
          `)

          layer.bindTooltip(name, { permanent: false, direction: 'top' })
        },
      })

      geoJsonLayer.addTo(map)
      leafletLayersRef.current.push(geoJsonLayer)
    }

    return () => {
      for (const layer of leafletLayersRef.current) {
        try {
          map.removeLayer(layer)
        } catch {
          // ignore
        }
      }
      leafletLayersRef.current = []
    }
  }, [map, activeLayers, featureCounts]) // featureCounts changes when data is loaded

  return { isLoading, featureCounts }
}
