'use client'

import * as React from 'react'
import { Loader2, AlertCircle, Info } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { useProjectContext } from '@/contexts/project-context'
import { useLatestReportByType, useUpdateReport } from '@/hooks/queries/use-report-hooks'
import { useActiveReportType } from '@/hooks/use-active-report-type'
import { ReportTypeSelector } from '@/components/steps/report-type-selector'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useCompleteWorkflowStep, useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { SiteSelector } from '@/components/project/site-selector'
import { useResolvedReportSections } from '@/hooks/queries/use-resolved-report-sections'

import { ReportStatusCard } from '@/components/steps/quality-review/report-status-card'
import { DraftReportCard } from '@/components/steps/quality-review/draft-report-card'
import { DataSummaryCard } from '@/components/steps/quality-review/data-summary-card'
import { GeneralNotesCard } from '@/components/steps/quality-review/general-notes-card'
import { ProgressPanel } from '@/components/steps/quality-review/progress-panel'
import { ApprovalWarningsDialog } from '@/components/steps/quality-review/approval-warnings-dialog'
import type {
  ReviewNote,
  ReviewNotesMap,
  ReviewSignature,
} from '@/components/steps/quality-review/types'

import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface QualityReviewStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

export function QualityReviewStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: QualityReviewStepProps) {
  const { toast } = useToast()
  const { permissions, user: currentUser } = useRole()
  const { navigateToStep, workflowSteps } = useProjectContext()
  const {
    activeType: reportType,
    setActiveType: setReportType,
    reportTypes,
  } = useActiveReportType(project.id)
  const [reviewDecision, setReviewDecision] = React.useState<'approved' | 'rejected' | null>(null)
  const [sectionNotes, setSectionNotes] = React.useState<ReviewNotesMap>({})
  const [addingNoteFor, setAddingNoteFor] = React.useState<string | null>(null)
  const [noteText, setNoteText] = React.useState('')
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)
  const [showApproveConfirm, setShowApproveConfirm] = React.useState(false)

  const { data: report, isLoading: loadingReport } = useLatestReportByType(project.id, reportType)
  // Stats are filtered by site for completeness verification.
  // Reports themselves remain project-scoped — site filter only narrows the data summary card.
  const { data: habitatStats } = useHabitatStats(project.id, selectedSiteId)
  const { data: observationStats } = useObservationStats(project.id, selectedSiteId)
  const { data: findingsStats } = useFindingsStats(project.id, selectedSiteId)
  const updateReport = useUpdateReport()
  const completeStep = useCompleteWorkflowStep()
  const updateWorkflowStep = useUpdateWorkflowStep()

  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0
  const { sections: reportSectionDefs } = useResolvedReportSections(
    project.organization_id,
    reportType
  )
  const totalSections = reportSectionDefs.length

  // `reviewNotes` and `reviewSignature` live alongside `sections` inside the
  // same `reports.content` JSONB row.
  const extendedContent = reportContent as
    | (ReportContent & {
        reviewNotes?: ReviewNotesMap
        reviewSignature?: ReviewSignature
      })
    | undefined

  React.useEffect(() => {
    if (extendedContent?.reviewNotes) {
      setSectionNotes(extendedContent.reviewNotes)
    }
    if (extendedContent?.reviewSignature) {
      setReviewDecision(extendedContent.reviewSignature.decision)
    }
  }, [report?.id, report?.updated_at])

  const persistNotes = async (updated: ReviewNotesMap) => {
    if (!report || !reportContent) return
    const updatedContent = { ...reportContent, reviewNotes: updated }
    await updateReport.mutateAsync({
      reportId: report.id,
      updates: { content: updatedContent as unknown as Json },
    })
  }

  const handleStartAdding = (scopeId: string) => {
    setAddingNoteFor(scopeId)
    setNoteText('')
  }

  const handleCancelAdding = () => {
    setAddingNoteFor(null)
    setNoteText('')
  }

  const handleAddNote = async (scopeId: string) => {
    if (!noteText.trim()) return
    if (!report || !reportContent) {
      toast({
        variant: 'destructive',
        title: 'Report not loaded',
        description: 'Please wait for the report to load before adding notes.',
      })
      return
    }
    const note: ReviewNote = {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      author: userId,
      createdAt: new Date().toISOString(),
    }
    const updated = {
      ...sectionNotes,
      [scopeId]: [...(sectionNotes[scopeId] || []), note],
    }
    setSectionNotes(updated)
    setNoteText('')
    setAddingNoteFor(null)
    await persistNotes(updated)
  }

  const handleDeleteNote = async (scopeId: string, noteId: string) => {
    if (!report || !reportContent) {
      toast({
        variant: 'destructive',
        title: 'Report not loaded',
        description: 'Please wait for the report to load before deleting notes.',
      })
      return
    }
    const updated = {
      ...sectionNotes,
      [scopeId]: (sectionNotes[scopeId] || []).filter((n) => n.id !== noteId),
    }
    setSectionNotes(updated)
    await persistNotes(updated)
  }

  // Non-blocking warnings surfaced before final approval
  const getApprovalWarnings = (): string[] => {
    const warnings: string[] = []
    const sections = reportContent?.sections
    if (sections) {
      const emptySections = sections.filter((s) => !s.content || s.content.trim().length < 50)
      if (emptySections.length > 0) {
        warnings.push(
          `${emptySections.length} of ${totalSections} sections have minimal or no content`
        )
      }
    }
    if (!habitatStats?.total || habitatStats.total === 0) {
      warnings.push('No habitat data recorded')
    }
    if (!observationStats?.total || observationStats.total === 0) {
      warnings.push('No species observations recorded')
    }
    if (!findingsStats?.total || findingsStats.total === 0) {
      warnings.push('No desk research findings saved')
    }
    return warnings
  }

  const handleApprove = async () => {
    if (!permissions.canApproveReport) return
    if (!report || !reportContent) return

    try {
      const signatureData = {
        ...reportContent,
        reviewNotes: sectionNotes,
        reviewSignature: {
          reviewerId: userId,
          reviewerName: currentUser?.full_name || currentUser?.email || userId,
          decision: 'approved' as const,
          signedAt: new Date().toISOString(),
        },
      }

      await updateReport.mutateAsync({
        reportId: report.id,
        updates: {
          status: 'approved',
          reviewed_by: userId,
          content: signatureData as unknown as Json,
        },
      })

      setReviewDecision('approved')
      toast({
        title: 'Report approved',
        description: 'The report has been approved for final submission.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error approving report',
        description: 'Failed to approve the report.',
      })
    }
  }

  const handleApproveClick = () => {
    const warnings = getApprovalWarnings()
    if (warnings.length > 0) {
      setShowApproveConfirm(true)
    } else {
      handleApprove()
    }
  }

  const handleReject = async () => {
    if (!permissions.canApproveReport) return
    const hasNotes = Object.values(sectionNotes).some((notes) => notes.length > 0)

    if (!report || !hasNotes) {
      toast({
        variant: 'destructive',
        title: 'Notes required',
        description: 'Please add at least one review note before requesting revisions.',
      })
      return
    }

    try {
      const updatedContent = {
        ...reportContent,
        reviewNotes: sectionNotes,
        reviewSignature: {
          reviewerId: userId,
          reviewerName: currentUser?.full_name || currentUser?.email || userId,
          decision: 'rejected' as const,
          signedAt: new Date().toISOString(),
        },
      }

      await updateReport.mutateAsync({
        reportId: report.id,
        updates: {
          status: 'internal_review',
          content: updatedContent as unknown as Json,
          reviewed_by: userId,
        },
      })

      // Reset Step 6 (AI Draft) back to in_progress so the Complete button becomes active again
      const aiDraftStep = workflowSteps.find((s) => s.step_number === 6)
      if (aiDraftStep) {
        await updateWorkflowStep.mutateAsync({
          stepId: aiDraftStep.id,
          updates: { status: 'in_progress' },
        })
      }

      setReviewDecision('rejected')
      toast({
        title: 'Revision requested',
        description: 'Returning to AI Draft step for revisions.',
      })

      // Navigate back to Step 6 (AI Draft) so the author sees the revision banner
      setTimeout(() => navigateToStep(6), 1200)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error requesting revision',
        description: 'Failed to request revision.',
      })
    }
  }

  const handleComplete = async () => {
    if (reviewDecision !== 'approved') {
      toast({
        variant: 'destructive',
        title: 'Approval required',
        description: 'Please approve the report before completing this step.',
      })
      return
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Quality Review step has been completed. Moving to Final Submission.',
      })

      onComplete?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const canComplete = reviewDecision === 'approved' && !isComplete && permissions.canApproveReport

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 7: Quality Review</h2>
          <p className="text-muted-foreground">Peer review and approval of the draft report</p>
        </div>
        <div className="flex items-center gap-3">
          <SiteSelector
            projectId={project.id}
            stepKey="quality-review"
            onSiteChange={(site) => setSelectedSiteId(site?.id ?? null)}
            showAllOption
          />
          <Badge
            variant={
              isComplete
                ? 'default'
                : workflowStep.status === 'in_progress'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {isComplete
              ? 'Completed'
              : workflowStep.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
          </Badge>
        </div>
      </div>

      {reportTypes.length > 0 && (
        <ReportTypeSelector
          projectId={project.id}
          reportTypes={reportTypes}
          activeReportType={reportType}
          onReportTypeChange={setReportType}
          latestReports={report ? { [reportType]: report } : {}}
          allowAdd={false}
        />
      )}

      {!report && !loadingReport && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Report Found</AlertTitle>
          <AlertDescription>
            Please complete the AI Draft step to generate a report for this report type before
            reviewing.
          </AlertDescription>
        </Alert>
      )}

      {!report ? null : (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Quality Review Process</AlertTitle>
            <AlertDescription>
              Review the draft report and verify data completeness, report quality, regulatory
              compliance, and formatting. Approve the report or request revisions with specific
              comments.
            </AlertDescription>
          </Alert>

          <ReportStatusCard
            report={report}
            completedSections={completedSections}
            totalSections={totalSections}
          />

          <DraftReportCard
            reportSectionDefs={reportSectionDefs}
            reportContent={reportContent}
            sectionNotes={sectionNotes}
            isComplete={isComplete}
            addingNoteFor={addingNoteFor}
            noteText={noteText}
            onNoteTextChange={setNoteText}
            onStartAdding={handleStartAdding}
            onCancelAdding={handleCancelAdding}
            onSaveNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />

          <DataSummaryCard
            selectedSiteId={selectedSiteId}
            habitatTotal={habitatStats?.total || 0}
            habitatTotalArea={habitatStats?.totalArea || 0}
            observationTotal={observationStats?.total || 0}
            protectedSpeciesTotal={observationStats?.protected || 0}
            findingsTotal={findingsStats?.total || 0}
            findingsSourceCount={findingsStats?.bySource.length || 0}
            completedSections={completedSections}
            totalSections={totalSections}
          />

          <GeneralNotesCard
            notes={sectionNotes['_general'] || []}
            isComplete={isComplete}
            addingNoteFor={addingNoteFor}
            noteText={noteText}
            reviewDecision={reviewDecision}
            reviewSignature={extendedContent?.reviewSignature}
            canApproveReport={permissions.canApproveReport}
            onNoteTextChange={setNoteText}
            onStartAdding={handleStartAdding}
            onCancelAdding={handleCancelAdding}
            onSaveNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onApprove={handleApproveClick}
            onReject={handleReject}
          />

          <ProgressPanel
            reviewDecision={reviewDecision}
            isComplete={isComplete}
            canComplete={canComplete}
            isCompleting={completeStep.isPending}
            onComplete={handleComplete}
          />
        </>
      )}

      <ApprovalWarningsDialog
        open={showApproveConfirm}
        warnings={getApprovalWarnings()}
        onOpenChange={setShowApproveConfirm}
        onApproveAnyway={handleApprove}
      />
    </div>
  )
}
