import { createClient } from '@/lib/supabase/client'

// Get linked survey IDs for a specific report type in a project
export async function getReportSurveyLinks(
  projectId: string,
  reportType: string
): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('report_survey_links')
    .select('survey_id')
    .eq('project_id', projectId)
    .eq('report_type', reportType)

  if (error) {
    console.error('Error fetching report survey links:', error)
    return []
  }

  return (data ?? []).map((d) => d.survey_id)
}

// Set survey links for a report type (replace all)
export async function setReportSurveyLinks(
  projectId: string,
  reportType: string,
  surveyIds: string[]
): Promise<void> {
  const supabase = createClient()

  // Delete existing links for this report type
  const { error: deleteError } = await supabase
    .from('report_survey_links')
    .delete()
    .eq('project_id', projectId)
    .eq('report_type', reportType)

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to clear report survey links')
  }

  if (surveyIds.length === 0) return

  // Insert new links
  const rows = surveyIds.map((surveyId) => ({
    project_id: projectId,
    report_type: reportType,
    survey_id: surveyId,
  }))

  const { error: insertError } = await supabase.from('report_survey_links').insert(rows)

  if (insertError) {
    throw new Error(insertError.message || 'Failed to set report survey links')
  }
}

// Toggle a single survey link for a report type
export async function toggleSurveyLink(
  projectId: string,
  reportType: string,
  surveyId: string
): Promise<boolean> {
  const supabase = createClient()

  // Check if link exists
  const { data: existing } = await supabase
    .from('report_survey_links')
    .select('id')
    .eq('project_id', projectId)
    .eq('report_type', reportType)
    .eq('survey_id', surveyId)
    .maybeSingle()

  if (existing) {
    // Remove link
    const { error } = await supabase.from('report_survey_links').delete().eq('id', existing.id)

    if (error) throw new Error(error.message || 'Failed to remove survey link')
    return false // unlinked
  } else {
    // Add link
    const { error } = await supabase.from('report_survey_links').insert({
      project_id: projectId,
      report_type: reportType,
      survey_id: surveyId,
    })

    if (error) throw new Error(error.message || 'Failed to add survey link')
    return true // linked
  }
}
