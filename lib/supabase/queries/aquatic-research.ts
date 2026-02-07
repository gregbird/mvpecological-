import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

export interface AquaticResearchStatusHistory {
  period: string
  status: string
  details: string[]
}

export interface AquaticResearchTrend {
  ParameterName: string
  TrendDesc: string
}

export interface AquaticResearchFailure {
  Name: string
  FailureType?: string
  ParameterName?: string
}

export interface AquaticResearchConnectivity {
  Code: string
  Name: string
  Type: string
  Direction: 'Input' | 'Output'
}

export interface AquaticResearchHabitat {
  code: string
  name: string
  description?: string
}

export interface AquaticResearchSpecies {
  code: string
  name: string
  commonName: string
}

export interface AquaticResearchResult {
  id: string
  project_id: string
  finding_id: string | null
  water_body_code: string
  water_body_name: string
  water_body_type: string
  current_status: string | null
  risk_level: string | null
  status_history: AquaticResearchStatusHistory[]
  trends: AquaticResearchTrend[]
  failures: AquaticResearchFailure[]
  connectivity: AquaticResearchConnectivity[]
  catchment_name: string | null
  sub_catchment_name: string | null
  river_basin_district: string | null
  linked_sac_code: string | null
  linked_sac_name: string | null
  linked_sac_match_score: number | null
  linked_sac_habitats: AquaticResearchHabitat[]
  linked_sac_species: AquaticResearchSpecies[]
  ai_analysis: string | null
  researched_at: string | null
  researched_by: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateAquaticResearchInput {
  project_id: string
  finding_id?: string | null
  water_body_code: string
  water_body_name: string
  water_body_type: string
  current_status?: string | null
  risk_level?: string | null
  status_history?: AquaticResearchStatusHistory[]
  trends?: AquaticResearchTrend[]
  failures?: AquaticResearchFailure[]
  connectivity?: AquaticResearchConnectivity[]
  catchment_name?: string | null
  sub_catchment_name?: string | null
  river_basin_district?: string | null
  linked_sac_code?: string | null
  linked_sac_name?: string | null
  linked_sac_match_score?: number | null
  linked_sac_habitats?: AquaticResearchHabitat[]
  linked_sac_species?: AquaticResearchSpecies[]
  ai_analysis?: string | null
  researched_by?: string | null
  notes?: string | null
}

/**
 * Save aquatic research results to database
 */
export async function saveAquaticResearch(
  input: CreateAquaticResearchInput
): Promise<AquaticResearchResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('aquatic_research_results')
    .upsert(
      {
        project_id: input.project_id,
        finding_id: input.finding_id || null,
        water_body_code: input.water_body_code,
        water_body_name: input.water_body_name,
        water_body_type: input.water_body_type,
        current_status: input.current_status || null,
        risk_level: input.risk_level || null,
        status_history: (input.status_history || []) as unknown as Json,
        trends: (input.trends || []) as unknown as Json,
        failures: (input.failures || []) as unknown as Json,
        connectivity: (input.connectivity || []) as unknown as Json,
        catchment_name: input.catchment_name || null,
        sub_catchment_name: input.sub_catchment_name || null,
        river_basin_district: input.river_basin_district || null,
        linked_sac_code: input.linked_sac_code || null,
        linked_sac_name: input.linked_sac_name || null,
        linked_sac_match_score: input.linked_sac_match_score || null,
        linked_sac_habitats: (input.linked_sac_habitats || []) as unknown as Json,
        linked_sac_species: (input.linked_sac_species || []) as unknown as Json,
        ai_analysis: input.ai_analysis || null,
        researched_by: input.researched_by || null,
        notes: input.notes || null,
        researched_at: new Date().toISOString(),
      },
      {
        onConflict: 'project_id,water_body_code',
      }
    )
    .select()
    .single()

  if (error) throw error
  return parseAquaticResearchResult(data)
}

/**
 * Get all aquatic research results for a project
 */
export async function getProjectAquaticResearch(
  projectId: string
): Promise<AquaticResearchResult[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('aquatic_research_results')
    .select('*')
    .eq('project_id', projectId)
    .order('researched_at', { ascending: false })

  if (error) throw error
  return (data || []).map(parseAquaticResearchResult)
}

/**
 * Get aquatic research for a specific water body in a project
 */
export async function getWaterBodyResearch(
  projectId: string,
  waterBodyCode: string
): Promise<AquaticResearchResult | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('aquatic_research_results')
    .select('*')
    .eq('project_id', projectId)
    .eq('water_body_code', waterBodyCode)
    .order('researched_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data ? parseAquaticResearchResult(data) : null
}

/**
 * Check if aquatic research exists for a water body
 */
export async function hasAquaticResearch(
  projectId: string,
  waterBodyCode: string
): Promise<boolean> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('aquatic_research_results')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('water_body_code', waterBodyCode)

  if (error) throw error
  return (count || 0) > 0
}

/**
 * Delete aquatic research result
 */
export async function deleteAquaticResearch(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('aquatic_research_results').delete().eq('id', id)

  if (error) throw error
}

/**
 * Parse database row to typed result
 */
function parseAquaticResearchResult(row: Record<string, unknown>): AquaticResearchResult {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    finding_id: row.finding_id as string | null,
    water_body_code: row.water_body_code as string,
    water_body_name: row.water_body_name as string,
    water_body_type: row.water_body_type as string,
    current_status: row.current_status as string | null,
    risk_level: row.risk_level as string | null,
    status_history: (row.status_history as AquaticResearchStatusHistory[]) || [],
    trends: (row.trends as AquaticResearchTrend[]) || [],
    failures: (row.failures as AquaticResearchFailure[]) || [],
    connectivity: (row.connectivity as AquaticResearchConnectivity[]) || [],
    catchment_name: row.catchment_name as string | null,
    sub_catchment_name: row.sub_catchment_name as string | null,
    river_basin_district: row.river_basin_district as string | null,
    linked_sac_code: row.linked_sac_code as string | null,
    linked_sac_name: row.linked_sac_name as string | null,
    linked_sac_match_score: row.linked_sac_match_score as number | null,
    linked_sac_habitats: (row.linked_sac_habitats as AquaticResearchHabitat[]) || [],
    linked_sac_species: (row.linked_sac_species as AquaticResearchSpecies[]) || [],
    ai_analysis: row.ai_analysis as string | null,
    researched_at: row.researched_at as string | null,
    researched_by: row.researched_by as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string | null,
    updated_at: row.updated_at as string | null,
  }
}
