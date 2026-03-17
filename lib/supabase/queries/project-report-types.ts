import { createClient } from '@/lib/supabase/client'

// Get all report types for a project (from junction table)
export async function getProjectReportTypes(projectId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_report_types')
    .select('report_type, display_order')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching project report types:', error)
    return []
  }

  return (data ?? []).map((d) => d.report_type)
}

// Get report types with fallback to legacy projects.survey_type
export async function getEffectiveReportTypes(projectId: string): Promise<string[]> {
  const types = await getProjectReportTypes(projectId)
  if (types.length > 0) return types

  // Fallback to legacy single type
  const supabase = createClient()
  const { data } = await supabase
    .from('projects')
    .select('survey_type')
    .eq('id', projectId)
    .single()

  return data?.survey_type ? [data.survey_type] : []
}

// Set report types for a project (replace all)
export async function setProjectReportTypes(
  projectId: string,
  reportTypes: string[]
): Promise<void> {
  const supabase = createClient()

  // Delete existing
  const { error: deleteError } = await supabase
    .from('project_report_types')
    .delete()
    .eq('project_id', projectId)

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to clear project report types')
  }

  if (reportTypes.length === 0) return

  // Insert new
  const rows = reportTypes.map((type, index) => ({
    project_id: projectId,
    report_type: type,
    display_order: index,
  }))

  const { error: insertError } = await supabase.from('project_report_types').insert(rows)

  if (insertError) {
    throw new Error(insertError.message || 'Failed to set project report types')
  }
}

// Add a single report type to a project
export async function addProjectReportType(projectId: string, reportType: string): Promise<void> {
  const supabase = createClient()

  // Get current max display_order
  const { data: existing } = await supabase
    .from('project_report_types')
    .select('display_order')
    .eq('project_id', projectId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = existing ? existing.display_order + 1 : 0

  const { error } = await supabase.from('project_report_types').insert({
    project_id: projectId,
    report_type: reportType,
    display_order: nextOrder,
  })

  if (error) {
    throw new Error(error.message || 'Failed to add project report type')
  }
}

// Remove a single report type from a project
export async function removeProjectReportType(
  projectId: string,
  reportType: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_report_types')
    .delete()
    .eq('project_id', projectId)
    .eq('report_type', reportType)

  if (error) {
    throw new Error(error.message || 'Failed to remove project report type')
  }
}
