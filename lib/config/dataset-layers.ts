import { LucideIcon, Shield, Droplets } from 'lucide-react'

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
const DAFM_BASE_URL = 'https://gis.agriculture.gov.ie/geoserver'

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
        defaultVisible: false,
        color: '#8b5cf6',
      },
      {
        id: 'pnha',
        label: 'pNHA',
        description: 'Proposed Natural Heritage Areas - Proposed sites of conservation interest',
        url: `${NPWS_BASE_URL}/1`, // Layer 1: pNHA
        type: 'arcgis',
        defaultVisible: false,
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
  // DAFM datasets removed - no public WMS endpoint available
  // Data available via https://opendata.agriculture.gov.ie/ but requires download
  // Boundaries (Counties, Townlands) are available via the Base Map dropdown, not here
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
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        bgLight: 'bg-gray-50 dark:bg-gray-950/30',
      }
  }
}
