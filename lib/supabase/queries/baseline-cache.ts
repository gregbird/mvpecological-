import { createClient } from '@/lib/supabase/client'
import type { BaselineReportCache, Json } from '@/types/database'

export interface SaveBaselineCacheInput {
  project_id: string
  boundary_hash: string
  habitats: Json
  feature_collection: Json | null
  total_area_ha: number
}

/**
 * Get cached baseline habitat data for a project.
 * Returns null on cache miss (no row or hash mismatch).
 */
export async function getBaselineCache(
  projectId: string,
  boundaryHash: string
): Promise<BaselineReportCache | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('baseline_report_cache')
    .select('*')
    .eq('project_id', projectId)
    .eq('boundary_hash', boundaryHash)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as BaselineReportCache) ?? null
}

/**
 * Upsert baseline habitat cache for a project.
 */
export async function saveBaselineCache(
  input: SaveBaselineCacheInput
): Promise<BaselineReportCache> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('baseline_report_cache')
    .upsert(
      {
        project_id: input.project_id,
        boundary_hash: input.boundary_hash,
        habitats: input.habitats,
        feature_collection: input.feature_collection,
        total_area_ha: input.total_area_ha,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as BaselineReportCache
}
