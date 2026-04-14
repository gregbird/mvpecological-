'use client'

import * as React from 'react'
import { getHeritageColor } from '@/lib/config/map-constants'

/**
 * NLC PMTiles vector tile layer for Leaflet.
 *
 * Renders the full Ireland NLC 2018 land cover dataset (~10M polygons)
 * as pre-tiled vector data served from Supabase Storage. Each habitat
 * polygon is coloured using the Heritage Council FOSSITT palette
 * (via LEVEL_2_ID → FOSSITT mapping).
 *
 * Zoom range: 6-12 (matches tippecanoe output)
 * Source: /data/nlc/nlc.pmtiles → Supabase Storage
 */

const PMTILES_URL =
  process.env.NEXT_PUBLIC_NLC_PMTILES_URL ||
  'https://zekaljruvbjezxlumuup.supabase.co/storage/v1/object/public/nlc-tiles/nlc.pmtiles'

// Map NLC LEVEL_2_ID → FOSSITT code (mirrors lib/data/nlc-to-fossitt.ts)
const NLC_ID_TO_FOSSITT: Record<string, string> = {
  '110': 'BL3', // Buildings
  '120': 'BL2', // Other Artificial Surfaces
  '130': 'BL2', // Ways
  '210': 'ED2', // Bare Soil and Disturbed Ground
  '220': 'ER1', // Exposed Rock and Sediments
  '230': 'CD1', // Coastal Sediments
  '240': 'CW1', // Mudflats
  '250': 'ED3', // Burnt Areas
  '310': 'BC1', // Cultivated Land
  '410': 'WD3', // Coniferous Forest
  '420': 'WN1', // Broadleaved Forest and Woodland
  '430': 'WD2', // Mixed Forest
  '440': 'WS1', // Scrub
  '450': 'HD1', // Bracken
  '460': 'WL1', // Hedgerows
  '470': 'WL2', // Treelines
  '510': 'GA1', // Improved Grassland
  '520': 'GA2', // Amenity Grassland
  '530': 'GS1', // Dry Grassland
  '540': 'GS4', // Wet Grassland
  '550': 'CM1', // Salt Marsh
  '560': 'GM1', // Swamp
  '570': 'WD4', // Transitional Forest
  '610': 'PB1', // Raised Bog
  '620': 'PB2', // Blanket Bog
  '630': 'PB4', // Cutover Bog
  '640': 'PB3', // Bare Peat
  '650': 'PF1', // Fens
  '710': 'HH1', // Dry Heath
  '720': 'HH3', // Wet Heath
  '730': 'WD5', // Transitional Waterbodies (wooded)
  '810': 'FW1', // Rivers and Streams
  '820': 'FL1', // Lakes and Ponds
  '830': 'FL7', // Artificial Waterbodies
  '840': 'MW1', // Marine Water
  '850': 'MW3', // Transitional Waterbodies
}

interface NlcTileLayerProps {
  /** Whether this layer is visible */
  visible?: boolean
  /** Opacity (0-1) */
  opacity?: number
}

/**
 * Adds the NLC vector tile layer to the containing Leaflet map.
 * Must be rendered as a child of <MapContainer> (react-leaflet).
 */
export function NlcTileLayer({ visible = true, opacity = 0.65 }: NlcTileLayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = React.useRef<any>(null)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet')
  const map = useMap()

  React.useEffect(() => {
    if (!map || !visible) return

    let cancelled = false

    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const protomaps = require('protomaps-leaflet')

      // Build a paint rule for each FOSSITT group so the map coloring
      // stays consistent with saved habitat findings.
      const paintRules = [
        {
          dataLayer: 'nlc',
          symbolizer: new protomaps.PolygonSymbolizer({
            fill: (_z: number, f: { props: Record<string, unknown> }) => {
              const nlcId = String(f.props.LEVEL_2_ID || '')
              const fossittCode = NLC_ID_TO_FOSSITT[nlcId] || ''
              return getHeritageColor(fossittCode)
            },
            opacity,
          }),
        },
      ]

      const layer = protomaps.leafletLayer({
        url: PMTILES_URL,
        paintRules,
        attribution: 'NLC 2018 &copy; Tailte Éireann',
      })

      if (cancelled) return
      layer.addTo(map)
      layerRef.current = layer
    })()

    return () => {
      cancelled = true
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, visible, opacity])

  return null
}
