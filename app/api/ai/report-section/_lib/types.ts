// Shared data shapes used by the AI section generator's data fetch +
// context builder. Kept narrow — fields here are exactly what we pull from
// Supabase, no joined/derived data.

import type { SpatialZone } from '@/lib/utils/spatial-classifier'

export type PlacementOption = 'main' | 'appendix' | 'both' | 'exclude'
export type PlacementCategory =
  | 'releveSurveys'
  | 'findings'
  | 'habitats'
  | 'targetNotes'
  | 'surveys'

export interface ProjectData {
  name: string
  site_code: string | null
  grid_reference: string | null
  county: string | null
  townland: string | null
  province: string | null
  boundary: unknown
  buffer_distances: unknown
}

export interface HabitatData {
  id: string
  fossitt_code: string
  fossitt_name: string
  area_hectares: number | null
  condition: string | null
  notes: string | null
  threats: string | null
  eu_annex_code: string | null
  evaluation: string | null
  listed_species: string | null
}

export interface ObservationData {
  survey_id: string
  species_name_scientific: string
  species_name_common: string | null
  taxon_group: string | null
  count: number | null
  abundance_dafor: string | null
  evidence_type: string | null
  is_protected: boolean
  confidence_level: string
  behavior_notes: string | null
}

export interface FindingData {
  id: string
  title: string
  source: string
  data_type: string
  raw_data: Record<string, unknown> | null
  distance_from_boundary_km: number | null
  is_protected: boolean | null
  notes: string | null
  location: GeoJSON.Geometry | null
}

export interface SurveyData {
  id: string
  survey_date: string
  survey_type: string
  weather: Record<string, unknown> | null
  status: string
  notes: string | null
  start_time: string | null
  end_time: string | null
}

export interface TargetNoteData {
  id: string
  category: string
  title: string
  description: string | null
  priority: string | null
  is_verified: boolean | null
}

export interface DeepResearchData {
  site_code: string
  site_name: string
  site_type: string
  habitats: unknown
  conservation_summary: unknown
  threats_pressures: unknown
  ai_analysis: string | null
}

export interface AquaticResearchData {
  water_body_code: string
  water_body_name: string
  water_body_type: string
  current_status: string | null
  risk_level: string | null
  status_history: unknown
  trends: unknown
  failures: unknown
  linked_sac_code: string | null
  linked_sac_name: string | null
  ai_analysis: string | null
}

export interface ReleveData {
  id: string
  survey_id: string
  releve_code: string
  survey_date: string | null
  recorder: string | null
  accuracy_m: number | null
  survey_x_coord: number | null
  survey_y_coord: number | null
  habitat_type: string | null
  soil_type: string | null
  soil_stability: string | null
  aspect: string | null
  slope_degrees: number | null
  releve_area_sqm: number | null
  total_vegetation_cover_pct: number | null
  cover_graminea_pct: number | null
  cover_forbs_pct: number | null
  cover_mosses_liverworts_pct: number | null
  cover_trees_pct: number | null
  cover_shrubs_pct: number | null
  cover_litter_pct: number | null
  cover_bare_soil_pct: number | null
  cover_bare_rock_pct: number | null
  cover_open_water_pct: number | null
  max_height_trees_m: number | null
  max_height_shrubs_cm: number | null
  max_height_bryophytes_cm: number | null
  max_height_graminea_cm: number | null
  max_height_forbs_cm: number | null
  median_height_graminea_cm: number | null
  median_height_forbs_cm: number | null
  other_species_proximity: string | null
  fauna_observations: string | null
  releve_comment: string | null
}

export interface ReleveSpeciesData {
  releve_id: string
  species_name_latin: string
  species_name_english: string | null
  species_cover_domin: number | null
  species_cover_pct: number | null
}

export interface SiteContext {
  siteCode: string
  siteName: string | null
  county: string | null
  townland: string | null
  province: string | null
}

export interface ReportContextInput {
  project: ProjectData
  habitats: HabitatData[]
  observations: ObservationData[]
  /** All findings reportable in this section (inside + buffer). Used for source attribution. */
  findings: FindingData[]
  /** Findings grouped by spatial zone — drives separate INSIDE / BUFFER blocks in the prompt. */
  findingsByZone: Record<SpatialZone, FindingData[]>
  surveys: SurveyData[]
  targetNotes: TargetNoteData[]
  deepResearch: DeepResearchData[]
  aquaticResearch: AquaticResearchData[]
  deskInsights?: string
  releveSurveys: ReleveData[]
  releveSpecies: ReleveSpeciesData[]
  /** Multi-site scope — when set, project header includes site-specific location */
  siteContext?: SiteContext | null
  /** Buffer radius (km) used for zone classification — referenced in section labels. */
  bufferRadiusKm: number
  /** Project boundary area in hectares — calculated server-side via PostGIS
   *  ST_Area(boundary::geography). Used by AI to describe the actual
   *  development site area (NOT the sum of habitat polygon areas, which is
   *  often much larger because polygons can extend across and beyond the
   *  assessment buffer). */
  boundaryAreaHa?: number
  /** Study area in hectares = boundary buffered by `bufferRadiusKm`.
   *  Used by AI as the assessment extent. */
  studyAreaHa?: number
}
