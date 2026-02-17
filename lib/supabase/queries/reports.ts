import { createClient } from '@/lib/supabase/client'
import type { Database, Report, Json } from '@/types/database'

type InsertReport = Database['public']['Tables']['reports']['Insert']
type UpdateReport = Database['public']['Tables']['reports']['Update']

// Report content structure
export interface ReportSection {
  id: string
  title: string
  content: string
  isEdited: boolean
  aiGenerated: boolean
  ecologistOpinion?: string
}

export interface ReportContent {
  sections: ReportSection[]
  metadata?: {
    generatedAt?: string
    editedAt?: string
    aiModel?: string
    sectionMetadata?: Record<string, { generatedAt: string; tokensUsed: number; model: string }>
  }
}

// Get all reports for a project
export async function getProjectReports(projectId: string): Promise<Report[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })

  if (error) {
    console.error('Error fetching reports:', error)
    return []
  }

  return (data ?? []) as Report[]
}

// Get latest report for a project
export async function getLatestReport(projectId: string): Promise<Report | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching latest report:', error)
    return null
  }

  return data as Report
}

// Get single report by ID
export async function getReport(reportId: string): Promise<Report | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('reports').select('*').eq('id', reportId).single()

  if (error) {
    console.error('Error fetching report:', error)
    return null
  }

  return data as Report
}

// Create new report
export async function createReport(report: InsertReport): Promise<Report | null> {
  const supabase = createClient()
  // Get current max version for this project
  const { data: existing } = await supabase
    .from('reports')
    .select('version')
    .eq('project_id', report.project_id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const existingVersion = existing as { version: number } | null
  const nextVersion = existingVersion ? existingVersion.version + 1 : 1

  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...report,
      version: nextVersion,
    } as Database['public']['Tables']['reports']['Insert'])
    .select()
    .single()

  if (error) {
    console.error('Error creating report:', error)
    return null
  }

  return data as unknown as Report
}

// Update report
export async function updateReport(
  reportId: string,
  updates: UpdateReport
): Promise<Report | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    console.error('Error updating report:', error)
    return null
  }

  return data as unknown as Report
}

// Update report content
export async function updateReportContent(
  reportId: string,
  content: ReportContent
): Promise<Report | null> {
  return updateReport(reportId, { content: content as unknown as Json })
}

// Update report status
export async function updateReportStatus(
  reportId: string,
  status: Report['status'],
  reviewerId?: string
): Promise<Report | null> {
  const updates: UpdateReport = { status }
  if (reviewerId) {
    updates.reviewed_by = reviewerId
  }
  return updateReport(reportId, updates)
}

// Delete report
export async function deleteReport(reportId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('reports').delete().eq('id', reportId)

  if (error) {
    console.error('Error deleting report:', error)
    return false
  }

  return true
}

// Report types
export const REPORT_TYPES = [
  { id: 'ecia', name: 'Ecological Impact Assessment (EcIA)' },
  { id: 'nia', name: 'Natura Impact Assessment (NIA)' },
  { id: 'aa_screening', name: 'Appropriate Assessment Screening' },
  { id: 'aa_stage2', name: 'Appropriate Assessment (Stage 2)' },
  { id: 'pea', name: 'Preliminary Ecological Appraisal (PEA)' },
  { id: 'bat_survey', name: 'Bat Survey Report' },
  { id: 'bird_survey', name: 'Bird Survey Report' },
  { id: 'habitat_survey', name: 'Habitat Survey Report' },
  { id: 'protected_species', name: 'Protected Species Report' },
  { id: 'other', name: 'Other Technical Report' },
]

// Report sections template (PEA example from PRD)
export const PEA_REPORT_SECTIONS = [
  {
    id: 'introduction',
    title: 'I. Introduction',
    aiPrompt: 'project description and site location',
  },
  {
    id: 'methodology',
    title: 'II. Methodology',
    aiPrompt: 'desk study sources and field survey methods',
  },
  {
    id: 'results_sites',
    title: 'III. Results - Designated Sites',
    aiPrompt: 'designated sites analysis',
  },
  { id: 'results_habitats', title: 'III. Results - Habitats', aiPrompt: 'habitat descriptions' },
  { id: 'results_fauna', title: 'III. Results - Fauna', aiPrompt: 'fauna observations' },
  { id: 'results_flora', title: 'III. Results - Flora', aiPrompt: 'flora observations' },
  {
    id: 'results_invasive',
    title: 'III. Results - Invasive Species',
    aiPrompt: 'invasive species',
  },
  { id: 'evaluation', title: 'IV. Evaluation', aiPrompt: 'ecological significance' },
  { id: 'discussion', title: 'V. Discussion', aiPrompt: 'discussion of findings' },
  { id: 'recommendations', title: 'VI. Recommendations', aiPrompt: 'further surveys and actions' },
  { id: 'appendices', title: 'VII. Appendices', aiPrompt: 'habitat map and species lists' },
]
