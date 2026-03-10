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
    sourceVersion?: number
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
    .maybeSingle()

  if (error) {
    console.error('Error fetching latest report:', error)
    return null
  }

  return data as Report
}

// Get single report by ID
export async function getReport(reportId: string): Promise<Report | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

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
    .maybeSingle()

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
    throw new Error(error.message || 'Failed to create report')
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
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to update report')
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

// Create a new report version (inserts a new row with incremented version)
export async function createReportVersion(
  projectId: string,
  content: ReportContent,
  reportType: string,
  generatedBy: string,
  sourceVersion?: number,
  versionName?: string
): Promise<Report | null> {
  const contentWithMeta: ReportContent = {
    ...content,
    metadata: {
      ...content.metadata,
      editedAt: new Date().toISOString(),
      ...(sourceVersion !== undefined && { sourceVersion }),
    },
  }
  return createReport({
    project_id: projectId,
    report_type: reportType,
    status: 'draft',
    content: contentWithMeta as unknown as Json,
    generated_by: generatedBy,
    ...(versionName && { version_name: versionName }),
  })
}

// Update report version name
export async function updateReportVersionName(
  reportId: string,
  versionName: string
): Promise<Report | null> {
  return updateReport(reportId, { version_name: versionName })
}

// Get a specific report version for a project
export async function getReportByVersion(
  projectId: string,
  version: number
): Promise<Report | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('project_id', projectId)
    .eq('version', version)
    .maybeSingle()

  if (error) {
    console.error('Error fetching report by version:', error)
    return null
  }

  return data as Report
}

// Delete report
export async function deleteReport(reportId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('reports').delete().eq('id', reportId)

  if (error) {
    throw new Error(error.message || 'Failed to delete report')
  }

  return true
}

// Re-export report config from centralized location for backward compatibility
export {
  REPORT_TYPES,
  PEA_REPORT_SECTIONS,
  getReportSectionsForType,
} from '@/lib/config/template-types'
