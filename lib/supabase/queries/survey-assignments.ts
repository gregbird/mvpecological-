import { createClient } from '@/lib/supabase/client'

interface SurveyAssignment {
  id: string
  survey_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: string
  profile?: {
    id: string
    full_name: string | null
  }
}

// Get all assignments for a survey
export async function getSurveyAssignments(surveyId: string): Promise<SurveyAssignment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_assignments')
    .select('*, profile:profiles!survey_assignments_user_id_fkey(id, full_name)')
    .eq('survey_id', surveyId)

  if (error) {
    console.error('Error fetching survey assignments:', error)
    return []
  }

  return (data ?? []) as unknown as SurveyAssignment[]
}

// Assign a user to a survey
export async function assignSurveyStaff(
  surveyId: string,
  userId: string,
  assignedBy: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('survey_assignments').insert({
    survey_id: surveyId,
    user_id: userId,
    assigned_by: assignedBy,
  })

  if (error) {
    throw new Error(error.message || 'Failed to assign staff to survey')
  }
}

// Remove a user assignment from a survey
export async function removeSurveyAssignment(surveyId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('survey_assignments')
    .delete()
    .eq('survey_id', surveyId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to remove survey assignment')
  }
}

// Get all surveys assigned to a user in a project
export async function getUserSurveyAssignments(
  userId: string,
  projectId: string
): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_assignments')
    .select('survey_id, surveys!inner(project_id)')
    .eq('user_id', userId)
    .eq('surveys.project_id', projectId)

  if (error) {
    console.error('Error fetching user survey assignments:', error)
    return []
  }

  return (data ?? []).map((d) => d.survey_id)
}
