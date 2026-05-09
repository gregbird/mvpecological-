import type { SupabaseClient } from '@supabase/supabase-js'
import { normaliseBoundary } from './normalise-boundary'
import type {
  AquaticResearchData,
  DeepResearchData,
  FindingData,
  HabitatData,
  ObservationData,
  ProjectData,
  ReleveData,
  ReleveSpeciesData,
  SiteContext,
  SurveyData,
  TargetNoteData,
} from './types'

interface FetchResult {
  project: ProjectData
  scopeBoundary: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null
  scopeBufferKm: number
  siteContext: SiteContext | null
  habitats: HabitatData[]
  allObservations: ObservationData[]
  allFindings: FindingData[]
  allSurveys: SurveyData[]
  allTargetNotes: TargetNoteData[]
  deepResearch: DeepResearchData[]
  aquaticResearch: AquaticResearchData[]
  allReleveSurveys: ReleveData[]
  allReleveSpecies: ReleveSpeciesData[]
  linkedSurveyIds: string[]
  deskInsights: string | undefined
  dataAnalysisStepMetadata: Record<string, unknown>
}

/**
 * Fetch every Supabase row needed to render a section. Handles:
 *   - Multi-site filtering via site_id (or via finding_id / survey_id for tables
 *     that lack site_id — deep_research_results, aquatic_research_results,
 *     releve_surveys, species_observations).
 *   - Parallel `Promise.all` of all main queries to keep latency low.
 *   - Step 3 desk insights resolution (per-site, falling back to project-wide).
 *   - Step 5 placement preferences metadata (raw — caller filters).
 */
export async function fetchProjectData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  projectId: string,
  reportType: string,
  siteId: string | null | undefined
): Promise<FetchResult> {
  // Multi-site context resolution
  let siteContext: SiteContext | null = null
  let scopeBoundary: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = null
  let scopeBufferKm = 2
  if (siteId) {
    const { data: siteRow } = await supabase
      .from('project_sites')
      .select('site_code, site_name, county, townland, province, boundary, buffer_distances')
      .eq('id', siteId)
      .maybeSingle()
    if (siteRow) {
      siteContext = {
        siteCode: siteRow.site_code,
        siteName: siteRow.site_name,
        county: siteRow.county,
        townland: siteRow.townland,
        province: siteRow.province,
      }
      scopeBoundary = normaliseBoundary(siteRow.boundary)
      if (Array.isArray(siteRow.buffer_distances) && siteRow.buffer_distances.length > 0) {
        scopeBufferKm = Number(siteRow.buffer_distances[0]) || 2
      }
    }
  }

  // Linked surveys for this report type (if any)
  const { data: linkedSurveyRows } = await supabase
    .from('report_survey_links')
    .select('survey_id')
    .eq('project_id', projectId)
    .eq('report_type', reportType)
  const linkedSurveyIds = linkedSurveyRows?.map((r) => r.survey_id) ?? []

  // Pre-compute site-filtered survey IDs (for observations + relevé filtering)
  let siteFilteredSurveyIds: string[] | null = null
  if (siteId) {
    const { data: siteSurveys } = await supabase
      .from('surveys')
      .select('id')
      .eq('project_id', projectId)
      .eq('site_id', siteId)
    siteFilteredSurveyIds = (siteSurveys || []).map((s) => s.id)
  }

  // Pre-compute site-filtered finding IDs (for deep/aquatic research)
  let siteFilteredFindingIds: string[] | null = null
  if (siteId) {
    const { data: siteFindings } = await supabase
      .from('desk_research_findings')
      .select('id')
      .eq('project_id', projectId)
      .eq('site_id', siteId)
    siteFilteredFindingIds = (siteFindings || []).map((f) => f.id)
  }

  const researchNarrowsToEmpty =
    siteId !== null &&
    siteId !== undefined &&
    siteFilteredFindingIds !== null &&
    siteFilteredFindingIds.length === 0
  const releveNarrowsToEmpty =
    siteId !== null &&
    siteId !== undefined &&
    siteFilteredSurveyIds !== null &&
    siteFilteredSurveyIds.length === 0

  // Build site-scoped query builders lazily
  let habitatsQuery = supabase
    .from('habitat_polygons')
    .select(
      'id, fossitt_code, fossitt_name, area_hectares, condition, notes, threats, eu_annex_code, evaluation, listed_species'
    )
    .eq('project_id', projectId)
    .eq('include_in_report', true)
  if (siteId) habitatsQuery = habitatsQuery.eq('site_id', siteId)

  const observationSurveyIds =
    siteId && siteFilteredSurveyIds
      ? siteFilteredSurveyIds
      : (await supabase.from('surveys').select('id').eq('project_id', projectId)).data?.map(
          (s) => s.id
        ) || []
  const observationsQuery =
    observationSurveyIds.length > 0
      ? supabase
          .from('species_observations')
          .select(
            'species_name_scientific, species_name_common, taxon_group, count, abundance_dafor, evidence_type, is_protected, confidence_level, behavior_notes, survey_id'
          )
          .in('survey_id', observationSurveyIds)
          .eq('include_in_report', true)
      : null

  let findingsQuery = supabase
    .from('desk_research_findings')
    .select(
      'id, title, source, data_type, raw_data, distance_from_boundary_km, is_protected, notes, location'
    )
    .eq('project_id', projectId)
    .eq('is_saved', true)
    .eq('include_in_report', true)
  if (siteId) findingsQuery = findingsQuery.eq('site_id', siteId)

  let surveysQuery = supabase
    .from('surveys')
    .select('id, survey_date, survey_type, weather, status, notes, start_time, end_time')
    .eq('project_id', projectId)
  if (siteId) surveysQuery = surveysQuery.eq('site_id', siteId)

  let targetNotesQuery = supabase
    .from('target_notes')
    .select('id, category, title, description, priority, is_verified')
    .eq('project_id', projectId)
    .eq('include_in_report', true)
  if (siteId) targetNotesQuery = targetNotesQuery.eq('site_id', siteId)

  let deepResearchQuery = supabase
    .from('deep_research_results')
    .select(
      'site_code, site_name, site_type, habitats, conservation_summary, threats_pressures, ai_analysis'
    )
    .eq('project_id', projectId)
  if (siteId && siteFilteredFindingIds && siteFilteredFindingIds.length > 0) {
    deepResearchQuery = deepResearchQuery.in('finding_id', siteFilteredFindingIds)
  }

  let aquaticResearchQuery = supabase
    .from('aquatic_research_results')
    .select(
      'water_body_code, water_body_name, water_body_type, current_status, risk_level, status_history, trends, failures, linked_sac_code, linked_sac_name, ai_analysis'
    )
    .eq('project_id', projectId)
  if (siteId && siteFilteredFindingIds && siteFilteredFindingIds.length > 0) {
    aquaticResearchQuery = aquaticResearchQuery.in('finding_id', siteFilteredFindingIds)
  }

  let releveSurveysQuery = supabase
    .from('releve_surveys')
    .select(
      'releve_code, survey_date, recorder, accuracy_m, survey_x_coord, survey_y_coord, habitat_type, soil_type, soil_stability, aspect, slope_degrees, releve_area_sqm, total_vegetation_cover_pct, cover_graminea_pct, cover_forbs_pct, cover_mosses_liverworts_pct, cover_trees_pct, cover_shrubs_pct, cover_litter_pct, cover_bare_soil_pct, cover_bare_rock_pct, cover_open_water_pct, max_height_trees_m, max_height_shrubs_cm, max_height_bryophytes_cm, max_height_graminea_cm, max_height_forbs_cm, median_height_graminea_cm, median_height_forbs_cm, other_species_proximity, fauna_observations, releve_comment, id, survey_id'
    )
    .eq('project_id', projectId)
  if (siteId && siteFilteredSurveyIds && siteFilteredSurveyIds.length > 0) {
    releveSurveysQuery = releveSurveysQuery.in('survey_id', siteFilteredSurveyIds)
  }

  // Fetch every primary table in parallel
  const [
    projectResult,
    habitatsResult,
    observationsResult,
    findingsResult,
    surveysResult,
    targetNotesResult,
    deepResearchResult,
    aquaticResearchResult,
    workflowResult,
    releveSurveysResult,
    dataAnalysisStepResult,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'name, site_code, grid_reference, county, townland, province, boundary, buffer_distances'
      )
      .eq('id', projectId)
      .single(),
    habitatsQuery,
    observationsQuery ?? Promise.resolve({ data: [], error: null }),
    findingsQuery,
    surveysQuery,
    targetNotesQuery,
    researchNarrowsToEmpty ? Promise.resolve({ data: [], error: null }) : deepResearchQuery,
    researchNarrowsToEmpty ? Promise.resolve({ data: [], error: null }) : aquaticResearchQuery,
    supabase
      .from('workflow_steps')
      .select('metadata')
      .eq('project_id', projectId)
      .eq('step_number', 3)
      .single(),
    releveNarrowsToEmpty ? Promise.resolve({ data: [], error: null }) : releveSurveysQuery,
    supabase
      .from('workflow_steps')
      .select('metadata')
      .eq('project_id', projectId)
      .eq('step_number', 5)
      .maybeSingle(),
  ])

  if (projectResult.error) {
    throw new Error('Project not found')
  }

  const project = projectResult.data as ProjectData

  // Fall back to project-level boundary/buffer when no specific site is scoped
  if (!scopeBoundary) {
    scopeBoundary = normaliseBoundary(project.boundary)
    if (Array.isArray(project.buffer_distances) && project.buffer_distances.length > 0) {
      scopeBufferKm = Number(project.buffer_distances[0]) || 2
    }
  }

  // Resolve desk insights — prefer per-site, fall back to project-wide
  const rawMetadata = (workflowResult.data?.metadata as Record<string, unknown>) || {}
  const aiInsightsBySite = rawMetadata.aiInsightsBySite as
    | Record<string, { content: string; updatedAt: string }>
    | undefined
  const deskInsights: string | undefined =
    (siteId && aiInsightsBySite?.[siteId]?.content) ||
    (rawMetadata.aiInsights as string | undefined) ||
    undefined

  // Fetch relevé species after we know the relevé IDs
  const allReleveSurveys = (releveSurveysResult.data || []) as ReleveData[]
  const allReleveIds = allReleveSurveys.map((r) => r.id)
  let allReleveSpecies: ReleveSpeciesData[] = []
  if (allReleveIds.length > 0) {
    const { data: speciesData } = await supabase
      .from('releve_species')
      .select(
        'releve_id, species_name_latin, species_name_english, species_cover_domin, species_cover_pct'
      )
      .in('releve_id', allReleveIds)
      .order('species_name_latin')
    allReleveSpecies = (speciesData || []) as ReleveSpeciesData[]
  }

  return {
    project,
    scopeBoundary,
    scopeBufferKm,
    siteContext,
    habitats: (habitatsResult.data || []) as HabitatData[],
    allObservations: (observationsResult.data || []) as ObservationData[],
    allFindings: (findingsResult.data || []) as FindingData[],
    allSurveys: (surveysResult.data || []) as SurveyData[],
    allTargetNotes: (targetNotesResult.data || []) as TargetNoteData[],
    deepResearch: (deepResearchResult.data || []) as unknown as DeepResearchData[],
    aquaticResearch: (aquaticResearchResult.data || []) as unknown as AquaticResearchData[],
    allReleveSurveys,
    allReleveSpecies,
    linkedSurveyIds,
    deskInsights,
    dataAnalysisStepMetadata:
      (dataAnalysisStepResult.data?.metadata as Record<string, unknown> | null) || {},
  }
}
