import { createClient } from '@/lib/supabase/client'
import type { Database, Survey } from '@/types/database'

type InsertSurvey = Database['public']['Tables']['surveys']['Insert']
type UpdateSurvey = Database['public']['Tables']['surveys']['Update']

// Survey with surveyor profile
export interface SurveyWithSurveyor extends Survey {
  surveyor?: { id: string; full_name: string; email: string } | null
}

// Get all surveys for a project
export async function getProjectSurveys(projectId: string): Promise<SurveyWithSurveyor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(
      `
      *,
      surveyor:profiles!surveys_surveyor_id_fkey(id, full_name, email)
    `
    )
    .eq('project_id', projectId)
    .order('survey_date', { ascending: false })

  if (error) {
    console.error('Error fetching surveys:', error)
    return []
  }

  return (data ?? []) as unknown as SurveyWithSurveyor[]
}

// Get single survey by ID
export async function getSurvey(surveyId: string): Promise<SurveyWithSurveyor | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select(
      `
      *,
      surveyor:profiles!surveys_surveyor_id_fkey(id, full_name, email)
    `
    )
    .eq('id', surveyId)
    .single()

  if (error) {
    console.error('Error fetching survey:', error)
    return null
  }

  return data as unknown as SurveyWithSurveyor
}

// Create new survey
export async function createSurvey(survey: InsertSurvey): Promise<Survey | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .insert(survey as Database['public']['Tables']['surveys']['Insert'])
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create survey')
  }

  return data as unknown as Survey
}

// Update survey
export async function updateSurvey(
  surveyId: string,
  updates: UpdateSurvey
): Promise<Survey | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', surveyId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update survey')
  }

  return data as unknown as Survey
}

// Delete survey
export async function deleteSurvey(surveyId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('surveys').delete().eq('id', surveyId)

  if (error) {
    throw new Error(error.message || 'Failed to delete survey')
  }

  return true
}

// Update survey status
export async function updateSurveyStatus(
  surveyId: string,
  status: Survey['status']
): Promise<Survey | null> {
  return updateSurvey(surveyId, { status })
}

// Get survey counts by status
export async function getSurveyStats(projectId: string): Promise<{
  total: number
  planned: number
  in_progress: number
  completed: number
  approved: number
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('status')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching survey stats:', error)
    return { total: 0, planned: 0, in_progress: 0, completed: 0, approved: 0 }
  }

  const surveys = (data ?? []) as Array<{ status: string }>
  return {
    total: surveys.length,
    planned: surveys.filter((s) => s.status === 'planned').length,
    in_progress: surveys.filter((s) => s.status === 'in_progress').length,
    completed: surveys.filter((s) => s.status === 'completed').length,
    approved: surveys.filter((s) => s.status === 'approved').length,
  }
}

// Weather data type
export interface WeatherData {
  temperature?: number
  windSpeed?: number
  windDirection?: string
  cloudCover?: number
  precipitation?: string
  visibility?: string
}

// Update survey weather
export async function updateSurveyWeather(
  surveyId: string,
  weather: WeatherData
): Promise<Survey | null> {
  return updateSurvey(surveyId, { weather: weather as unknown as Survey['weather'] })
}
