import { createClient } from '@/lib/supabase/client'
import type { Database, DeskResearchFinding } from '@/types/database'

type InsertFinding = Database['public']['Tables']['desk_research_findings']['Insert']
type UpdateFinding = Database['public']['Tables']['desk_research_findings']['Update']

// Get all findings for a project
export async function getProjectFindings(projectId: string): Promise<DeskResearchFinding[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching findings:', error)
    return []
  }

  return (data ?? []) as DeskResearchFinding[]
}

// Get saved findings only
export async function getSavedFindings(projectId: string): Promise<DeskResearchFinding[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_saved', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching saved findings:', error)
    return []
  }

  return (data ?? []) as DeskResearchFinding[]
}

// Get single finding by ID
export async function getFinding(findingId: string): Promise<DeskResearchFinding | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .select('*')
    .eq('id', findingId)
    .single()

  if (error) {
    console.error('Error fetching finding:', error)
    return null
  }

  return data as DeskResearchFinding
}

// Create new finding
export async function createFinding(finding: InsertFinding): Promise<DeskResearchFinding | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .insert(finding as Database['public']['Tables']['desk_research_findings']['Insert'])
    .select()
    .single()

  if (error) {
    console.error('Error creating finding:', error)
    return null
  }

  return data as unknown as DeskResearchFinding
}

// Update finding
export async function updateFinding(
  findingId: string,
  updates: UpdateFinding
): Promise<DeskResearchFinding | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', findingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating finding:', error)
    return null
  }

  return data as unknown as DeskResearchFinding
}

// Delete finding
export async function deleteFinding(findingId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('desk_research_findings').delete().eq('id', findingId)

  if (error) {
    console.error('Error deleting finding:', error)
    return false
  }

  return true
}

// Toggle finding saved status
export async function toggleFindingSaved(
  findingId: string,
  isSaved: boolean
): Promise<DeskResearchFinding | null> {
  return updateFinding(findingId, { is_saved: isSaved })
}

// Update finding notes
export async function updateFindingNotes(
  findingId: string,
  notes: string
): Promise<DeskResearchFinding | null> {
  return updateFinding(findingId, { notes })
}

// Get findings statistics
export async function getFindingsStats(projectId: string): Promise<{
  total: number
  saved: number
  bySource: { source: string; count: number }[]
  byType: { type: string; count: number }[]
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .select('source, data_type, is_saved')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching findings stats:', error)
    return { total: 0, saved: 0, bySource: [], byType: [] }
  }

  const findings = (data ?? []) as Array<{
    source: string
    data_type: string
    is_saved: boolean
  }>

  // Group by source
  const sourceGroups = findings.reduce(
    (acc, f) => {
      if (!acc[f.source]) {
        acc[f.source] = { source: f.source, count: 0 }
      }
      acc[f.source].count++
      return acc
    },
    {} as Record<string, { source: string; count: number }>
  )

  // Group by type
  const typeGroups = findings.reduce(
    (acc, f) => {
      if (!acc[f.data_type]) {
        acc[f.data_type] = { type: f.data_type, count: 0 }
      }
      acc[f.data_type].count++
      return acc
    },
    {} as Record<string, { type: string; count: number }>
  )

  return {
    total: findings.length,
    saved: findings.filter((f) => f.is_saved).length,
    bySource: Object.values(sourceGroups).sort((a, b) => b.count - a.count),
    byType: Object.values(typeGroups).sort((a, b) => b.count - a.count),
  }
}

// Bulk save findings
export async function bulkSaveFindings(findings: InsertFinding[]): Promise<DeskResearchFinding[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('desk_research_findings')
    .insert(findings as Database['public']['Tables']['desk_research_findings']['Insert'][])
    .select()

  if (error) {
    console.error('Error bulk saving findings:', error)
    return []
  }

  return (data ?? []) as unknown as DeskResearchFinding[]
}
