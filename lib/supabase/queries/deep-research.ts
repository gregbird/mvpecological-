import { createClient } from '@/lib/supabase/client'

export interface DeepResearchHabitat {
  habitatCode: string
  habitatName: string
  status?: string
  trend?: string
  priorityHabitat?: boolean
}

export interface DeepResearchResult {
  id: string
  project_id: string
  finding_id: string | null
  site_code: string
  site_name: string
  site_type: 'SAC' | 'SPA' | 'NHA' | 'pNHA'
  habitats: DeepResearchHabitat[]
  conservation_summary: {
    total?: number
    favourable?: number
    unfavourableInadequate?: number
    unfavourableBad?: number
    improving?: number
    declining?: number
    priorityCount?: number
  }
  threats_pressures: {
    pressures?: string[]
    threats?: string[]
  }
  researched_at: string
  researched_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateDeepResearchInput {
  project_id: string
  finding_id?: string | null
  site_code: string
  site_name: string
  site_type: 'SAC' | 'SPA' | 'NHA' | 'pNHA'
  habitats: DeepResearchHabitat[]
  conservation_summary: DeepResearchResult['conservation_summary']
  threats_pressures: DeepResearchResult['threats_pressures']
  researched_by?: string | null
  notes?: string | null
}

/**
 * Save deep research results to database
 */
export async function saveDeepResearch(
  input: CreateDeepResearchInput
): Promise<DeepResearchResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deep_research_results')
    .insert({
      project_id: input.project_id,
      finding_id: input.finding_id || null,
      site_code: input.site_code,
      site_name: input.site_name,
      site_type: input.site_type,
      habitats: input.habitats as unknown as null,
      conservation_summary: input.conservation_summary as unknown as null,
      threats_pressures: input.threats_pressures as unknown as null,
      researched_by: input.researched_by || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as DeepResearchResult
}

/**
 * Get all deep research results for a project
 */
export async function getProjectDeepResearch(projectId: string): Promise<DeepResearchResult[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deep_research_results')
    .select('*')
    .eq('project_id', projectId)
    .order('researched_at', { ascending: false })

  if (error) throw error
  return (data || []) as unknown as DeepResearchResult[]
}

/**
 * Get deep research for a specific site in a project
 */
export async function getSiteDeepResearch(
  projectId: string,
  siteCode: string
): Promise<DeepResearchResult | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deep_research_results')
    .select('*')
    .eq('project_id', projectId)
    .eq('site_code', siteCode)
    .order('researched_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data as unknown as DeepResearchResult | null
}

/**
 * Check if deep research exists for a site
 */
export async function hasDeepResearch(projectId: string, siteCode: string): Promise<boolean> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('deep_research_results')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('site_code', siteCode)

  if (error) throw error
  return (count || 0) > 0
}

/**
 * Delete deep research result
 */
export async function deleteDeepResearch(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('deep_research_results').delete().eq('id', id)

  if (error) throw error
}
