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

// Finding type colors (used for map markers by data type)
export const FINDING_TYPE_COLORS: Record<string, string> = {
  designated_site: '#22c55e', // Green for protected sites
  species_record: '#3b82f6', // Blue for species
  water_quality: '#06b6d4', // Cyan for water
  catchment: '#8b5cf6', // Purple for catchments
  other: '#6b7280', // Gray for other
}
