import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database'
import { DEFAULT_SECTIONS_BY_TYPE, type ReportSectionDefinition } from '@/lib/config/template-types'

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
    .maybeSingle()

  if (error) throw error
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
    .maybeSingle()

  if (error) throw error
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

// Helper to convert ReportSectionDefinition[] to Json for storage.
// `aiPrompt` is optional — defaults are merged from DEFAULT_SECTIONS_BY_TYPE
// when a section's id matches a known default; user-added sections store their
// own aiPrompt (or fall back to a generic generate prompt if blank).
export interface TemplateSectionData {
  id: string
  title: string
  template: string
  aiPrompt?: string
}

export function sectionsToJson(sections: TemplateSectionData[]): Json {
  return sections as unknown as Json
}

const templateSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  template: z.string(),
  aiPrompt: z.string().optional(),
})

export function jsonToSections(json: Json | null): TemplateSectionData[] {
  if (!json || !Array.isArray(json)) return []
  const parsed = z.array(templateSectionSchema).safeParse(json)
  return parsed.success ? parsed.data : []
}

// Slugify a section title into a stable id. Falls back to a uuid-like suffix
// when the title yields no usable slug (e.g. all punctuation).
export function slugifySectionId(title: string, existingIds: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'section'
  if (!existingIds.includes(base)) return base
  let i = 2
  while (existingIds.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}

/**
 * Resolves the effective section definitions for a report type.
 *
 * Precedence:
 * 1. Stored template with `use_custom=true` — uses its sections; aiPrompt
 *    is merged back from defaults (by section id) since the template editor
 *    only persists `title` + `template`.
 * 2. Otherwise — `DEFAULT_SECTIONS_BY_TYPE[reportType]` or an empty array
 *    for unknown types.
 */
export function resolveReportSections(
  reportType: string,
  template: Pick<ReportTemplate, 'use_custom' | 'sections'> | null | undefined
): ReportSectionDefinition[] {
  const defaults = DEFAULT_SECTIONS_BY_TYPE[reportType] ?? []

  if (template?.use_custom) {
    const stored = jsonToSections(template.sections)
    if (stored.length > 0) {
      const promptByDefaultId = new Map(defaults.map((s) => [s.id, s.aiPrompt]))
      return stored.map((s) => ({
        id: s.id,
        title: s.title,
        // Precedence: stored aiPrompt → default by matching id → empty
        aiPrompt: s.aiPrompt?.trim() || promptByDefaultId.get(s.id) || '',
        defaultTemplate: s.template,
      }))
    }
  }

  return defaults
}
