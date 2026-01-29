export * from './database'

// Extended types with relations
export interface ProjectWithDetails {
  id: string
  name: string
  site_code: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  current_phase: 'desk_research' | 'field_research' | 'reporting'
  health_status: 'on_track' | 'at_risk' | 'overdue'
  expected_start_date: string | null
  expected_end_date: string | null
  progress: number // Calculated from workflow steps
  client?: {
    id: string
    name: string
  }
  members?: {
    id: string
    full_name: string
    avatar_url: string | null
    role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
  }[]
  workflow_steps?: {
    id: string
    step_number: number
    name: string
    phase: 'desk_research' | 'field_research' | 'reporting'
    status: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
  }[]
}

// Workflow step definitions (16 steps)
export const WORKFLOW_STEPS = [
  // Desk Research Phase (1-5)
  { number: 1, name: 'Project Setup', phase: 'desk_research' as const },
  { number: 2, name: 'Site Boundary Definition', phase: 'desk_research' as const },
  { number: 3, name: 'Designated Sites Search', phase: 'desk_research' as const },
  { number: 4, name: 'Species Records Search', phase: 'desk_research' as const },
  { number: 5, name: 'Desk Research Report', phase: 'desk_research' as const },
  // Field Research Phase (6-11)
  { number: 6, name: 'Survey Planning', phase: 'field_research' as const },
  { number: 7, name: 'Habitat Survey', phase: 'field_research' as const },
  { number: 8, name: 'Species Survey', phase: 'field_research' as const },
  { number: 9, name: 'Photo Documentation', phase: 'field_research' as const },
  { number: 10, name: 'Data Entry & Validation', phase: 'field_research' as const },
  { number: 11, name: 'Field Data Review', phase: 'field_research' as const },
  // Reporting Phase (12-16)
  { number: 12, name: 'Report Drafting', phase: 'reporting' as const },
  { number: 13, name: 'Internal Review', phase: 'reporting' as const },
  { number: 14, name: 'Revisions', phase: 'reporting' as const },
  { number: 15, name: 'Client Review', phase: 'reporting' as const },
  { number: 16, name: 'Final Submission', phase: 'reporting' as const },
] as const

// Phase colors for UI
export const PHASE_COLORS = {
  desk_research: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800',
  },
  field_research: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-100',
    border: 'border-green-200 dark:border-green-800',
  },
  reporting: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-800 dark:text-purple-100',
    border: 'border-purple-200 dark:border-purple-800',
  },
} as const

// Health status colors
export const HEALTH_STATUS_COLORS = {
  on_track: {
    bg: 'bg-green-500',
    text: 'text-green-700 dark:text-green-300',
    label: 'On Track',
  },
  at_risk: {
    bg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'At Risk',
  },
  overdue: {
    bg: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    label: 'Overdue',
  },
} as const

// Workflow step status colors
export const STEP_STATUS_COLORS = {
  pending: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'text-gray-400',
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  needs_review: {
    bg: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500',
  },
  approved: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500',
  },
  blocked: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-500',
  },
} as const

// Fossitt habitat classification (simplified)
export interface FossittHabitat {
  code: string
  name: string
  category: string
  color: string
}

// External API response types
export interface NPWSDesignatedSite {
  OBJECTID: number
  SITECODE: string
  SITENAME: string
  SITE_TYPE: string // SPA, SAC, NHA, pNHA
  AREA_HA: number
  geometry: GeoJSON.Geometry
}

export interface GBIFOccurrence {
  key: number
  scientificName: string
  vernacularName?: string
  decimalLatitude: number
  decimalLongitude: number
  eventDate: string
  basisOfRecord: string
  datasetName: string
}

export interface NBDCSpecies {
  latinName: string
  commonName: string
  taxonGroup: string
  protectedStatus?: string
  recordCount: number
}

// GeoJSON types
export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]
}

export interface GeoJSONMultiPoint {
  type: 'MultiPoint'
  coordinates: [number, number][]
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString'
  coordinates: [number, number][][]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: [number, number][][][]
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon
  | GeoJSONMultiPoint
  | GeoJSONMultiLineString
  | GeoJSONMultiPolygon

export interface GeoJSONFeature<
  G extends GeoJSONGeometry = GeoJSONGeometry,
  P = Record<string, unknown>,
> {
  type: 'Feature'
  geometry: G
  properties: P
}

export interface GeoJSONFeatureCollection<
  G extends GeoJSONGeometry = GeoJSONGeometry,
  P = Record<string, unknown>,
> {
  type: 'FeatureCollection'
  features: GeoJSONFeature<G, P>[]
}
