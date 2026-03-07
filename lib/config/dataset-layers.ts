import { LucideIcon, Shield, Droplets, Mountain, Layers } from 'lucide-react'

export interface DatasetLayer {
  id: string
  label: string
  description: string
  url: string
  type: 'wms' | 'wfs' | 'arcgis' | 'geojson'
  defaultVisible: boolean
  color?: string
  wmsLayer?: string // WMS layer name for WMS services
}

export interface DatasetGroup {
  id: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  layers: DatasetLayer[]
}

// NPWS ArcGIS REST API base URL (updated December 2024)
const NPWS_BASE_URL =
  'https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer'

// EPA WMS base URL
const EPA_BASE_URL = 'https://gis.epa.ie/geoserver'

// DAFM WMS base URL
// GSI (Geological Survey Ireland) — data mirrored on EPA GeoServer for reliability
const GSI_EPA_WMS_URL = 'https://gis.epa.ie/geoserver/EPA/wms'

// Teagasc (Irish Soil Information System) WMS base URL
// Teagasc soil data served via EPA GeoServer (gis.teagasc.ie is down)
const TEAGASC_WMS_URL = 'https://gis.epa.ie/geoserver/EPA/wms'

export const DATASET_GROUPS: DatasetGroup[] = [
  {
    id: 'npws',
    label: 'NPWS Sites',
    description: 'National Parks & Wildlife Service designated sites',
    icon: Shield,
    color: 'emerald',
    layers: [
      {
        id: 'sac',
        label: 'SAC',
        description: 'Special Areas of Conservation - EU Habitats Directive designated sites',
        url: `${NPWS_BASE_URL}/3`, // Layer 3: SAC
        type: 'arcgis',
        defaultVisible: true,
        color: '#10b981',
      },
      {
        id: 'spa',
        label: 'SPA',
        description: 'Special Protection Areas - EU Birds Directive designated sites',
        url: `${NPWS_BASE_URL}/0`, // Layer 0: SPA
        type: 'arcgis',
        defaultVisible: true,
        color: '#3b82f6',
      },
      {
        id: 'nha',
        label: 'NHA',
        description: 'Natural Heritage Areas - Nationally designated nature conservation sites',
        url: `${NPWS_BASE_URL}/2`, // Layer 2: NHA
        type: 'arcgis',
        defaultVisible: true,
        color: '#8b5cf6',
      },
      {
        id: 'pnha',
        label: 'pNHA',
        description: 'Proposed Natural Heritage Areas - Proposed sites of conservation interest',
        url: `${NPWS_BASE_URL}/1`, // Layer 1: pNHA
        type: 'arcgis',
        defaultVisible: true,
        color: '#a855f7',
      },
    ],
  },
  {
    id: 'epa',
    label: 'EPA Datasets',
    description: 'Environmental Protection Agency water and catchment data',
    icon: Droplets,
    color: 'blue',
    layers: [
      {
        id: 'rivers',
        label: 'Rivers',
        description: 'WFD River Water Bodies (filtered to buffer zone)',
        url: `${EPA_BASE_URL}/ows`,
        type: 'wfs',
        defaultVisible: false,
        color: '#0284c7',
        wmsLayer: 'EPA:WFD_RiverWaterBodiesActive',
      },
      {
        id: 'lakes',
        label: 'Lakes',
        description: 'WFD Lake Water Bodies (filtered to buffer zone)',
        url: `${EPA_BASE_URL}/ows`,
        type: 'wfs',
        defaultVisible: false,
        color: '#0369a1',
        wmsLayer: 'EPA:WFD_LakeWaterBodiesActive',
      },
      {
        id: 'catchments',
        label: 'Catchments',
        description: 'WFD Catchment boundaries (filtered to buffer zone)',
        url: `${EPA_BASE_URL}/ows`,
        type: 'wfs',
        defaultVisible: false,
        color: '#38bdf8',
        wmsLayer: 'EPA:WFD_Catchments',
      },
      {
        id: 'wfd_river_status',
        label: 'River WFD Status',
        description: 'Rivers colored by WFD quality status (High/Good/Moderate/Poor/Bad)',
        url: `${EPA_BASE_URL}/ows`,
        type: 'wfs',
        defaultVisible: false,
        color: '#7dd3fc',
        wmsLayer: 'EPA:WFD_RiverWaterBodiesActive',
      },
    ],
  },
  {
    id: 'geology',
    label: 'Geology & Soils',
    description: 'Geological Survey Ireland and Teagasc soil data',
    icon: Layers,
    color: 'amber',
    layers: [
      {
        id: 'soil_types',
        label: 'Soil Types',
        description: 'National soils classification (Teagasc) — works at all zoom levels',
        url: TEAGASC_WMS_URL,
        type: 'wms',
        defaultVisible: false,
        color: '#d97706',
        wmsLayer: 'EPA:SOILS_NationalSoils',
      },
      {
        id: 'soil_drainage',
        label: 'Soil Drainage',
        description: 'Soil wet/dry classification (well-drained to poorly-drained)',
        url: TEAGASC_WMS_URL,
        type: 'wms',
        defaultVisible: false,
        color: '#92400e',
        wmsLayer: 'EPA:SOILS_WETDRY',
      },
      {
        id: 'bedrock_geology',
        label: 'Bedrock Geology',
        description: 'Bedrock geological formations and rock types (100K)',
        url: GSI_EPA_WMS_URL,
        type: 'wms',
        defaultVisible: false,
        color: '#78716c',
        wmsLayer: 'EPA:GSI_Bedrock_100k',
      },
      {
        id: 'quaternary_geology',
        label: 'Subsoils / Quaternary',
        description: 'Superficial deposits (glacial till, alluvium, peat)',
        url: GSI_EPA_WMS_URL,
        type: 'wms',
        defaultVisible: false,
        color: '#a8a29e',
        wmsLayer: 'EPA:Soil_subsoils_ie',
      },
    ],
  },
  {
    id: 'terrain',
    label: 'Terrain & Elevation',
    description: 'Topographic and elevation data',
    icon: Mountain,
    color: 'slate',
    layers: [
      {
        id: 'elevation_contours',
        label: 'Elevation Contours',
        description: 'Topographic contour lines at 10m intervals',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer',
        type: 'arcgis',
        defaultVisible: false,
        color: '#64748b',
      },
      {
        id: 'hillshade',
        label: 'Hillshade',
        description: 'Shaded relief showing terrain and landforms',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer',
        type: 'arcgis',
        defaultVisible: false,
        color: '#475569',
      },
      {
        id: 'landslide_susceptibility',
        label: 'Landslide Susceptibility',
        description: 'GSI landslide susceptibility classification (may be slow)',
        url: 'https://gsi.geodata.gov.ie/server/services/Geohazards/IE_GSI_Landslide_Susceptibility_Classification_50K_IE26_ITM/MapServer/WMSServer',
        type: 'wms',
        defaultVisible: false,
        color: '#334155',
        wmsLayer: 'IE_GSI_Landslide_Susceptibility_Classification_50K_IE26_ITM',
      },
    ],
  },
]

// Helper functions
export function getDatasetGroupById(groupId: string): DatasetGroup | undefined {
  return DATASET_GROUPS.find((group) => group.id === groupId)
}

export function getLayerById(layerId: string): DatasetLayer | undefined {
  for (const group of DATASET_GROUPS) {
    const layer = group.layers.find((l) => l.id === layerId)
    if (layer) return layer
  }
  return undefined
}

export function getDefaultVisibleLayers(): string[] {
  const visible: string[] = []
  for (const group of DATASET_GROUPS) {
    for (const layer of group.layers) {
      if (layer.defaultVisible) {
        visible.push(layer.id)
      }
    }
  }
  return visible
}

// Group color utility
export function getGroupColorClasses(groupId: string): {
  bg: string
  text: string
  border: string
  bgLight: string
} {
  switch (groupId) {
    case 'npws':
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
      }
    case 'epa':
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        bgLight: 'bg-blue-50 dark:bg-blue-950/30',
      }
    case 'dafm':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      }
    case 'geology':
      return {
        bg: 'bg-amber-600',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      }
    case 'terrain':
      return {
        bg: 'bg-slate-500',
        text: 'text-slate-700 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
        bgLight: 'bg-slate-50 dark:bg-slate-950/30',
      }
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        bgLight: 'bg-gray-50 dark:bg-gray-950/30',
      }
  }
}
