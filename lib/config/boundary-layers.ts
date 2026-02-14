import { LucideIcon, Map } from 'lucide-react'

export interface BoundaryLayer {
  id: string
  label: string
  description: string
  dataUrl: string // Path to GeoJSON file
  type: 'static' | 'dynamic' // static = load once, dynamic = load on demand
  defaultVisible: boolean
  color: string
  fillColor: string
  fillOpacity: number
  weight: number
  minZoom?: number // Only show at this zoom level and above
  attribution: string
  sourceUrl: string // Link to data source for metadata
  lastUpdated?: string
}

export interface BoundaryGroup {
  id: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  layers: BoundaryLayer[]
}

// Attribution text for Tailte Éireann data
export const TAILTE_EIREANN_ATTRIBUTION =
  '© <a href="https://www.tailte.ie/" target="_blank">Tailte Éireann</a> (CC-BY 4.0)'

// Attribution text for OSM-derived townland data
export const TOWNLANDS_ATTRIBUTION =
  '© <a href="https://www.townlands.ie/" target="_blank">Townlands.ie</a> (ODbL)'

export const BOUNDARY_GROUPS: BoundaryGroup[] = [
  {
    id: 'administrative',
    label: 'Administrative Boundaries',
    description: 'Irish administrative and historical boundaries',
    icon: Map,
    color: 'orange',
    layers: [
      {
        id: 'counties',
        label: 'Counties',
        description:
          'County boundaries of Ireland (26 counties in Republic + administrative areas)',
        dataUrl: '/data/counties-ireland.geojson',
        type: 'static',
        defaultVisible: false,
        color: '#f97316', // Orange
        fillColor: '#f97316',
        fillOpacity: 0.05,
        weight: 2,
        attribution: TAILTE_EIREANN_ATTRIBUTION,
        sourceUrl: 'https://data.gov.ie/dataset/counties-national-statutory-boundaries-20191',
        lastUpdated: '2019',
      },
      {
        id: 'townlands',
        label: 'Townlands',
        description:
          'Traditional Irish townland boundaries (~51,000 townlands). Loaded on demand for performance.',
        dataUrl: '/api/boundaries/townlands', // Dynamic API endpoint
        type: 'dynamic',
        defaultVisible: false,
        color: '#a855f7', // Purple
        fillColor: '#a855f7',
        fillOpacity: 0.02,
        weight: 1,
        minZoom: 12, // Only show at high zoom levels
        attribution: TOWNLANDS_ATTRIBUTION,
        sourceUrl: 'https://www.townlands.ie/page/download/',
      },
    ],
  },
]

// Helper functions
export function getBoundaryGroupById(groupId: string): BoundaryGroup | undefined {
  return BOUNDARY_GROUPS.find((group) => group.id === groupId)
}

export function getBoundaryLayerById(layerId: string): BoundaryLayer | undefined {
  for (const group of BOUNDARY_GROUPS) {
    const layer = group.layers.find((l) => l.id === layerId)
    if (layer) return layer
  }
  return undefined
}

export function getDefaultVisibleBoundaryLayers(): string[] {
  const visible: string[] = []
  for (const group of BOUNDARY_GROUPS) {
    for (const layer of group.layers) {
      if (layer.defaultVisible) {
        visible.push(layer.id)
      }
    }
  }
  return visible
}

// Province colors for styling
export const PROVINCE_COLORS: Record<string, string> = {
  Leinster: '#3b82f6', // Blue
  Munster: '#22c55e', // Green
  Connacht: '#f59e0b', // Amber
  Ulster: '#ef4444', // Red (for the 3 Ulster counties in Republic)
}

// Get color based on province
export function getCountyColor(province: string): string {
  return PROVINCE_COLORS[province] || '#6b7280'
}

// Layer metadata for info modals
export interface LayerMetadata {
  id: string
  name: string
  source: string
  sourceUrl: string
  description: string
  methodology: string
  lastUpdated: string
  coverage: string
  license: string
  attribution: string
}

export const BOUNDARY_LAYER_METADATA: Record<string, LayerMetadata> = {
  counties: {
    id: 'counties',
    name: 'Ireland County Boundaries',
    source: 'Tailte Éireann (formerly Ordnance Survey Ireland)',
    sourceUrl: 'https://data.gov.ie/dataset/counties-national-statutory-boundaries-20191',
    description:
      'National statutory county boundaries of Ireland, including the 26 counties of the Republic and Dublin administrative areas.',
    methodology:
      'Derived from the National Statutory Boundaries 2019 dataset, transformed from ITM (EPSG:2157) to WGS84 and simplified for web display.',
    lastUpdated: '2019',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC-BY 4.0)',
    attribution: '© Tailte Éireann',
  },
  townlands: {
    id: 'townlands',
    name: 'Irish Townland Boundaries',
    source: 'Townlands.ie (OpenStreetMap derived)',
    sourceUrl: 'https://www.townlands.ie/page/download/',
    description:
      'Traditional Irish townland boundaries, the smallest administrative division in Ireland. Approximately 51,000 townlands cover the island.',
    methodology:
      'Crowdsourced data from OpenStreetMap, processed and made available by Townlands.ie project.',
    lastUpdated: 'Continuously updated',
    coverage: 'All Ireland (Republic and Northern Ireland)',
    license: 'Open Database License (ODbL)',
    attribution: '© OpenStreetMap contributors via Townlands.ie',
  },
}

// Group color utility (matching dataset-layers.ts pattern)
export function getBoundaryGroupColorClasses(groupId: string): {
  bg: string
  text: string
  border: string
  bgLight: string
} {
  switch (groupId) {
    case 'administrative':
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        bgLight: 'bg-orange-50 dark:bg-orange-950/30',
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
