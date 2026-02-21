import { createClient } from '@/lib/supabase/client'

export interface ReleveSurveyRow {
  id: string
  project_id: string
  survey_id: string | null
  site_name: string | null
  survey_date: string
  releve_code: string
  releve_area_sqm: number | null
  recorder: string
  accuracy_m: number | null
  survey_x_coord: number | null
  survey_y_coord: number | null
  habitat_type: string | null
  soil_type: string | null
  soil_stability: string | null
  aspect: string | null
  slope_degrees: number | null
  max_height_trees_m: number | null
  max_height_shrubs_cm: number | null
  max_height_bryophytes_cm: number | null
  max_height_graminea_cm: number | null
  max_height_forbs_cm: number | null
  median_height_graminea_cm: number | null
  median_height_forbs_cm: number | null
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
  other_species_proximity: string | null
  fauna_observations: string | null
  releve_comment: string | null
  custom_fields: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ReleveSpeciesRow {
  id: string
  releve_id: string
  species_name_latin: string
  species_name_english: string | null
  species_cover_domin: number | null
  species_cover_pct: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Get all relevé surveys for a project */
export async function getReleveSurveys(projectId: string): Promise<ReleveSurveyRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('releve_surveys')
    .select('*')
    .eq('project_id', projectId)
    .order('survey_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ReleveSurveyRow[]
}

/** Get a single relevé survey with species */
export async function getReleveSurveyWithSpecies(
  releveId: string
): Promise<{ survey: ReleveSurveyRow; species: ReleveSpeciesRow[] }> {
  const supabase = createClient()

  const [surveyResult, speciesResult] = await Promise.all([
    supabase.from('releve_surveys').select('*').eq('id', releveId).single(),
    supabase
      .from('releve_species')
      .select('*')
      .eq('releve_id', releveId)
      .order('species_name_latin'),
  ])

  if (surveyResult.error) throw surveyResult.error
  if (speciesResult.error) throw speciesResult.error

  return {
    survey: surveyResult.data as unknown as ReleveSurveyRow,
    species: (speciesResult.data ?? []) as unknown as ReleveSpeciesRow[],
  }
}

/** Get relevé survey linked to a specific survey */
export async function getReleveSurveyBySurveyId(
  surveyId: string
): Promise<{ survey: ReleveSurveyRow; species: ReleveSpeciesRow[] } | null> {
  const supabase = createClient()

  const { data: survey } = await supabase
    .from('releve_surveys')
    .select('*')
    .eq('survey_id', surveyId)
    .maybeSingle()

  if (!survey) return null

  const { data: species } = await supabase
    .from('releve_species')
    .select('*')
    .eq('releve_id', survey.id)
    .order('species_name_latin')

  return {
    survey: survey as unknown as ReleveSurveyRow,
    species: (species ?? []) as unknown as ReleveSpeciesRow[],
  }
}

/** Create or update a relevé survey with species records */
export async function upsertReleveSurvey(
  data: Omit<ReleveSurveyRow, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  species: Omit<ReleveSpeciesRow, 'id' | 'releve_id' | 'created_at' | 'updated_at'>[]
): Promise<ReleveSurveyRow> {
  const supabase = createClient()

  // Build location point if coordinates exist
  const surveyData: Record<string, unknown> = { ...data }
  if (data.survey_x_coord && data.survey_y_coord) {
    surveyData.location = `SRID=4326;POINT(${data.survey_x_coord} ${data.survey_y_coord})`
  }

  let releveId: string

  if (data.id) {
    const { data: updated, error } = await supabase
      .from('releve_surveys')
      .update(surveyData as never)
      .eq('id', data.id)
      .select()
      .single()
    if (error) throw error
    releveId = updated.id
  } else {
    const { data: inserted, error } = await supabase
      .from('releve_surveys')
      .insert(surveyData as never)
      .select()
      .single()
    if (error) throw error
    releveId = inserted.id
  }

  // Replace species: delete all then insert new
  await supabase.from('releve_species').delete().eq('releve_id', releveId)

  if (species.length > 0) {
    const speciesRows = species.map((s) => ({ ...s, releve_id: releveId }))
    const { error: speciesError } = await supabase
      .from('releve_species')
      .insert(speciesRows as never)
    if (speciesError) throw speciesError
  }

  const { data: result, error: fetchError } = await supabase
    .from('releve_surveys')
    .select('*')
    .eq('id', releveId)
    .single()
  if (fetchError) throw fetchError
  return result as unknown as ReleveSurveyRow
}

/** Delete a relevé survey (cascade deletes species) */
export async function deleteReleveSurvey(releveId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('releve_surveys').delete().eq('id', releveId)
  if (error) throw error
}

// --- Template types & queries ---

export interface ReleveSurveyTemplateRow {
  id: string
  name: string
  description: string | null
  custom_fields: unknown[]
  created_by: string
  created_at: string
  updated_at: string
}

/** Get all relevé survey templates */
export async function getReleveTemplates(): Promise<ReleveSurveyTemplateRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('releve_survey_templates').select('*').order('name')
  if (error) throw error
  return (data ?? []) as unknown as ReleveSurveyTemplateRow[]
}

/** Create a new relevé survey template */
export async function createReleveTemplate(input: {
  name: string
  description: string | null
  custom_fields: unknown[]
}): Promise<ReleveSurveyTemplateRow> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('releve_survey_templates')
    .insert({ ...input, created_by: user?.id } as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ReleveSurveyTemplateRow
}

/** Delete a relevé survey template */
export async function deleteReleveTemplate(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('releve_survey_templates').delete().eq('id', id)
  if (error) throw error
}
