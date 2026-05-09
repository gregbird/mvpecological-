'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAutosave } from '@/hooks/use-autosave'
import {
  useCreateReport,
  useUpdateReport,
  useCreateReportVersion,
} from '@/hooks/queries/use-report-hooks'
import { SYNTHESIS_MODEL } from '@/lib/ai/openai-models'
import type { Report, Json } from '@/types/database'
import type { ReportContent, ReportSection } from '@/lib/supabase/queries/reports'

interface UseReportSaveArgs {
  projectId: string
  reportType: string
  userId: string
  sections: ReportSection[]
  existingReport: Report | null | undefined
  allReports: Report[] | undefined
}

/**
 * Encapsulates all the persistence flows for the AI draft step:
 *
 *   - `saveReport` — used internally by autosave + manual save. Updates the
 *     latest report row (preserving approved/final status) or creates one.
 *   - `handleSaveReport` — manual Save button handler with toast feedback.
 *   - `handleSaveAsNewVersion` — promote current state to a new versioned row.
 *   - `handleRestoreVersion` — clone a prior version's content into a new row.
 *   - `autosave` — 30s debounced background save with status indicator.
 */
export function useReportSave({
  projectId,
  reportType,
  userId,
  sections,
  existingReport,
  allReports,
}: UseReportSaveArgs) {
  const { toast } = useToast()
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()
  const createVersion = useCreateReportVersion()

  const saveReport = React.useCallback(async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: SYNTHESIS_MODEL,
      },
    }

    if (existingReport) {
      const preservedStatus =
        existingReport.status === 'approved' || existingReport.status === 'final'
          ? existingReport.status
          : 'draft'
      await updateReport.mutateAsync({
        reportId: existingReport.id,
        updates: {
          content: reportContent as unknown as Json,
          status: preservedStatus,
        },
      })
    } else {
      await createReport.mutateAsync({
        project_id: projectId,
        report_type: reportType,
        status: 'draft',
        content: reportContent as unknown as Json,
        generated_by: userId,
      })
    }
  }, [sections, existingReport, updateReport, createReport, projectId, reportType, userId])

  const autosave = useAutosave({
    onSave: saveReport,
    enabled: sections.some((s) => s.content),
  })

  const handleSaveReport = async (): Promise<boolean> => {
    try {
      await autosave.saveNow()
      toast({ title: 'Report saved', description: 'Your draft report has been saved.' })
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error saving report',
        description: 'Failed to save the report.',
      })
      return false
    }
  }

  const handleSaveAsNewVersion = async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: existingReport
          ? ((existingReport.content as unknown as ReportContent)?.metadata?.generatedAt ??
            new Date().toISOString())
          : new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: SYNTHESIS_MODEL,
      },
    }

    try {
      await createVersion.mutateAsync({
        projectId,
        content: reportContent,
        reportType,
        generatedBy: userId,
      })
      toast({
        title: 'New version saved',
        description: `Version ${(allReports?.length ?? 0) + 1} has been created.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error saving version',
        description: 'Failed to create a new report version.',
      })
    }
  }

  const handleRestoreVersion = async (restoreReport: Report): Promise<boolean> => {
    const oldContent = restoreReport.content as unknown as ReportContent | null
    if (!oldContent?.sections) return false

    try {
      await createVersion.mutateAsync({
        projectId,
        content: oldContent,
        reportType: restoreReport.report_type,
        generatedBy: userId,
        sourceVersion: restoreReport.version,
      })
      toast({
        title: 'Version restored',
        description: `Content from Version ${restoreReport.version} has been saved as a new version.`,
      })
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error restoring version',
        description: 'Failed to restore the report version.',
      })
      return false
    }
  }

  return {
    autosave,
    saveReport,
    handleSaveReport,
    handleSaveAsNewVersion,
    handleRestoreVersion,
    isSaving: updateReport.isPending || createReport.isPending,
    isCreatingVersion: createVersion.isPending,
  }
}
