// Shared map constants used by project-map.tsx and project-map-with-draw.tsx

// Ireland center coordinates (Leaflet uses [lat, lng])
export const IRELAND_CENTER: [number, number] = [53.1424, -7.6921]
export const DEFAULT_ZOOM = 7

export type MapStyle =
  | 'streets'
  | 'satellite'
  | 'hybrid'
  | 'topo'
  | 'soil_types'
  | 'soil_drainage'
  | 'bedrock'
  | 'subsoils'
  | 'aquifer'
  | 'river_wfd_status'
  | 'lake_wfd_status'
  | 'groundwater_wfd_status'
  | 'wfd_catchments'
  | 'wfd_subcatchments'
  | 'river_basin_district'

export interface TileLayerConfig {
  url: string
  attribution: string
  label: string
  /** If set, render as WMSTileLayer instead of regular TileLayer */
  wms?: { layers: string; format: string; transparent: boolean; tiled: boolean }
  maxZoom?: number
  /** Minimum zoom level required for the layer to render (server-side ScaleHint limit) */
  minZoom?: number
}

// Tile layer URLs (all free, no API key required)
export const TILE_LAYERS: Record<MapStyle, TileLayerConfig> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Streets (OSM)',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: 'Satellite (ESRI)',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Labels &copy; OpenStreetMap contributors',
    label: 'Hybrid (Satellite + Labels)',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Topographic',
  },
  soil_types: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Soil data &copy; Teagasc / EPA Ireland',
    label: 'Soil Types (Teagasc)',
    wms: {
      layers: 'EPA:SOILS_NationalSoils',
      format: 'image/png',
      transparent: false,
      tiled: true,
    },
  },
  soil_drainage: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Soil data &copy; Teagasc / EPA Ireland',
    label: 'Soil Drainage (Teagasc)',
    wms: {
      layers: 'EPA:SOILS_WETDRY',
      format: 'image/png',
      transparent: false,
      tiled: true,
    },
  },
  bedrock: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Geology data &copy; GSI / EPA Ireland',
    label: 'Bedrock Geology (GSI)',
    wms: {
      layers: 'EPA:GSI_Bedrock_100k',
      format: 'image/png',
      transparent: false,
      tiled: true,
    },
  },
  subsoils: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Geology data &copy; GSI / EPA Ireland',
    label: 'Subsoils / Quaternary (zoom in)',
    wms: {
      layers: 'EPA:Soil_subsoils_ie',
      format: 'image/png',
      transparent: false,
      tiled: true,
    },
    minZoom: 10,
  },
  aquifer: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Groundwater data &copy; GSI / EPA Ireland',
    label: 'Bedrock Aquifer (GSI)',
    wms: {
      layers: 'EPA:GEOL_GSI_Aquifer',
      format: 'image/png',
      transparent: false,
      tiled: true,
    },
    minZoom: 8,
  },
  river_wfd_status: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Water quality data &copy; EPA Ireland',
    label: 'River WFD Status (EPA)',
    wms: {
      layers: 'EPA:RWB_WFD_LatestStatus',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
  lake_wfd_status: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Water quality data &copy; EPA Ireland',
    label: 'Lake WFD Status (EPA)',
    wms: {
      layers: 'EPA:WFD_LWBStatus_20192024',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
  groundwater_wfd_status: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'Groundwater data &copy; EPA Ireland',
    label: 'Groundwater WFD Status (EPA)',
    wms: {
      layers: 'EPA:GWB_WFD_LatestStatus',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
  wfd_catchments: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'WFD data &copy; EPA Ireland',
    label: 'WFD Catchments (EPA)',
    wms: {
      layers: 'EPA:WFD_Catchments',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
  wfd_subcatchments: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'WFD data &copy; EPA Ireland',
    label: 'WFD Sub-Catchments (EPA)',
    wms: {
      layers: 'EPA:WFD_SubCatchments',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
  river_basin_district: {
    url: 'https://gis.epa.ie/geoserver/EPA/wms',
    attribution: 'WFD data &copy; EPA Ireland',
    label: 'River Basin Districts (WFD)',
    wms: {
      layers: 'EPA:WFD_RIVERBASINDISTRICT',
      format: 'image/png',
      transparent: true,
      tiled: true,
    },
  },
}

/**
 * Heritage Council Standard Habitat Colour Coding (Appendix 6)
 * Source: Heritage Council — Habitat Survey Guidelines (Draft No.2, April 2005)
 *
 * FOSSITT Level 2 keys for specific groups, Level 1 keys as fallback.
 * Usage: getHabitatColor(fossittCode) — tries Level 2 prefix first, then Level 1.
 */
export const HERITAGE_COUNCIL_COLORS: Record<string, string> = {
  // ── Freshwater ──────────────────────────────────────────────
  F: '#87CEEB', // Freshwater (fallback) — Sky blue
  FL: '#87CEEB', // Lakes and ponds — Sky blue
  FW: '#4B0082', // Watercourses — Indigo
  FP: '#87CEEB', // Springs — Sky blue
  FS: '#4B0082', // Swamps — Indigo

  // ── Grassland & Marsh ───────────────────────────────────────
  G: '#FFD700', // Grassland (fallback) — Yellow
  GA: '#FFD700', // Improved grassland — Yellow
  GS: '#FFD700', // Semi-natural grassland — Yellow
  GM: '#FFD700', // Marsh — Yellow

  // ── Heath & Dense Bracken ───────────────────────────────────
  H: '#8B4513', // Heath (fallback) — Brown
  HH: '#8B4513', // Heaths — Brown
  HD: '#8B4513', // Dense bracken — Brown

  // ── Peatlands ───────────────────────────────────────────────
  P: '#9B59B6', // Peatlands (fallback) — Violet
  PB: '#9B59B6', // Bogs — Violet
  PF: '#9B59B6', // Fens — Violet

  // ── Woodland & Scrub ────────────────────────────────────────
  W: '#228B22', // Woodland (fallback) — Green
  WN: '#228B22', // Semi-natural woodland — Green
  WD: '#32CD32', // Highly modified woodland — Bright green
  WS: '#228B22', // Scrub & transitional — Green
  WL1: '#228B22', // Hedgerows — Green
  WL2: '#8B4513', // Treelines — Brown

  // ── Exposed Rock & Disturbed Ground ─────────────────────────
  E: '#DC2626', // Exposed (fallback) — Red
  ER: '#DC2626', // Exposed rock — Scarlet red
  EU: '#DC2626', // Underground habitats — Red
  ED: '#DC2626', // Disturbed ground — Red

  // ── Cultivated & Built Land ─────────────────────────────────
  B: '#808080', // Built land (fallback) — Grey 50%
  BC: '#808080', // Cultivated land — Grey
  BL: '#808080', // Built land — Grey

  // ── Coastland ───────────────────────────────────────────────
  C: '#FF8C00', // Coastland (fallback) — Orange
  CS: '#FF8C00', // Rocky coast — Orange
  CW: '#FF8C00', // Tidal rivers — Orange
  CM: '#FF8C00', // Saltmarsh — Orange
  CB: '#D2B48C', // Shingle & gravel — Tan
  CD: '#D2B48C', // Dunes — Tan
  CC: '#FF8C00', // Sea walls & artificial — Orange

  // ── Littoral ────────────────────────────────────────────────
  LR: '#FFB6C1', // Littoral rock — Pink
  LS: '#DAA520', // Littoral sediments — Gold

  // ── Sublittoral ─────────────────────────────────────────────
  SR: '#FFB6C1', // Sublittoral rock — Pink
  SS: '#DAA520', // Sublittoral sediments — Gold

  // ── Marine ──────────────────────────────────────────────────
  M: '#B57EDC', // Marine (fallback) — Lavender
  MW: '#B57EDC', // Marine water — Lavender
}

/**
 * Get Heritage Council colour for a FOSSITT code.
 * Tries Level 2 prefix first (e.g. "WD" from "WD3"), then Level 1 (e.g. "W").
 * Returns fallback green if no match.
 */
export function getHeritageColor(fossittCode: string): string {
  if (!fossittCode) return '#22c55e'
  // Try exact match first (for WL1, WL2 special cases)
  if (HERITAGE_COUNCIL_COLORS[fossittCode]) return HERITAGE_COUNCIL_COLORS[fossittCode]
  // Try Level 2 prefix (first 2 chars)
  const l2 = fossittCode.slice(0, 2)
  if (HERITAGE_COUNCIL_COLORS[l2]) return HERITAGE_COUNCIL_COLORS[l2]
  // Try Level 1 prefix (first char)
  const l1 = fossittCode[0]
  if (HERITAGE_COUNCIL_COLORS[l1]) return HERITAGE_COUNCIL_COLORS[l1]
  return '#22c55e'
}

// Finding type colors (used for map markers by data type)
export const FINDING_TYPE_COLORS: Record<string, string> = {
  designated_site: '#22c55e', // Green for protected sites
  species_record: '#3b82f6', // Blue for species
  water_quality: '#06b6d4', // Cyan for water
  catchment: '#8b5cf6', // Purple for catchments
  other: '#6b7280', // Gray for other
}

// Buffer zone colors shared across GIS mapping, preview, and project info
export const BUFFER_COLORS: Record<number, { fill: string; stroke: string; name: string }> = {
  0.5: { fill: '#ef4444', stroke: '#dc2626', name: 'Red' },
  1: { fill: '#f97316', stroke: '#ea580c', name: 'Orange' },
  2: { fill: '#eab308', stroke: '#ca8a04', name: 'Yellow' },
  5: { fill: '#22c55e', stroke: '#16a34a', name: 'Green' },
  10: { fill: '#3b82f6', stroke: '#2563eb', name: 'Blue' },
  15: { fill: '#8b5cf6', stroke: '#7c3aed', name: 'Purple' },
}

export function getBufferColor(distance: number): { fill: string; stroke: string; name: string } {
  if (BUFFER_COLORS[distance]) return BUFFER_COLORS[distance]
  const hue = (distance * 37) % 360
  return {
    fill: `hsl(${hue}, 70%, 50%)`,
    stroke: `hsl(${hue}, 70%, 40%)`,
    name: `Custom ${distance}km`,
  }
}
