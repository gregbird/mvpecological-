import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database'

type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row']
type SurveyTemplateInsert = Database['public']['Tables']['survey_templates']['Insert']
type ReportTemplate = Database['public']['Tables']['report_templates']['Row']
type ReportTemplateInsert = Database['public']['Tables']['report_templates']['Insert']

// --- Survey Templates ---

export async function getSurveyTemplates(organizationId: string): Promise<SurveyTemplate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('survey_type')

  if (error) throw error
  return data ?? []
}

export async function upsertSurveyTemplate(
  template: SurveyTemplateInsert
): Promise<SurveyTemplate> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_templates')
    .upsert(template, { onConflict: 'organization_id,survey_type' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSurveyTemplateByType(
  organizationId: string,
  surveyType: string
): Promise<SurveyTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('survey_type', surveyType)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

// --- Report Templates ---

export async function getReportTemplates(organizationId: string): Promise<ReportTemplate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('report_type')

  if (error) throw error
  return data ?? []
}

export async function getReportTemplateByType(
  organizationId: string,
  reportType: string
): Promise<ReportTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('report_type', reportType)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function upsertReportTemplate(
  template: ReportTemplateInsert
): Promise<ReportTemplate> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .upsert(template, { onConflict: 'organization_id,report_type' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteReportTemplate(templateId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('report_templates').delete().eq('id', templateId)
  if (error) throw error
}

export async function deleteSurveyTemplate(templateId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('survey_templates').delete().eq('id', templateId)
  if (error) throw error
}

// Helper to convert ReportSectionDefinition[] to Json for storage
export interface TemplateSectionData {
  id: string
  title: string
  template: string
}

export function sectionsToJson(sections: TemplateSectionData[]): Json {
  return sections as unknown as Json
}

export function jsonToSections(json: Json | null): TemplateSectionData[] {
  if (!json || !Array.isArray(json)) return []
  return json as unknown as TemplateSectionData[]
}
