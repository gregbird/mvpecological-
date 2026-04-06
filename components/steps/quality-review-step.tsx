'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  Info,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
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
import { getReportSectionsForType } from '@/lib/config/template-types'
import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

const SectionEditor = dynamic(
  () =>
    import('@/components/steps/ai-draft/section-editor').then((mod) => ({
      default: mod.SectionEditor,
    })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-32 animate-pulse rounded-md" /> }
)

interface ReviewNote {
  id: string
  text: string
  author: string
  createdAt: string
}

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
  const [sectionNotes, setSectionNotes] = React.useState<Record<string, ReviewNote[]>>({})
  const [addingNoteFor, setAddingNoteFor] = React.useState<string | null>(null)
  const [noteText, setNoteText] = React.useState('')
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  // React Query hooks
  const { data: report, isLoading: loadingReport } = useLatestReportByType(project.id, reportType)
  // Stats are filtered by site for completeness verification.
  // Reports themselves remain project-scoped — site filter only narrows the data summary card.
  const { data: habitatStats } = useHabitatStats(project.id, selectedSiteId)
  const { data: observationStats } = useObservationStats(project.id, selectedSiteId)
  const { data: findingsStats } = useFindingsStats(project.id, selectedSiteId)
  const updateReport = useUpdateReport()
  const completeStep = useCompleteWorkflowStep()
  const updateWorkflowStep = useUpdateWorkflowStep()

  // Get report content
  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0
  const reportSectionDefs = getReportSectionsForType(reportType)
  const totalSections = reportSectionDefs.length

  // Load existing review notes and signature from report content
  const extendedContent = reportContent as
    | (ReportContent & {
        reviewNotes?: Record<string, ReviewNote[]>
        reviewSignature?: {
          reviewerId: string
          reviewerName: string
          decision: 'approved' | 'rejected'
          signedAt: string
        }
      })
    | undefined

  React.useEffect(() => {
    if (extendedContent?.reviewNotes) {
      setSectionNotes(extendedContent.reviewNotes)
    }
    if (extendedContent?.reviewSignature) {
      setReviewDecision(extendedContent.reviewSignature.decision)
    }
  }, [extendedContent])

  // Save section notes to report content
  const persistNotes = async (updated: Record<string, ReviewNote[]>) => {
    if (!report || !reportContent) return
    const updatedContent = { ...reportContent, reviewNotes: updated }
    await updateReport.mutateAsync({
      reportId: report.id,
      updates: { content: updatedContent as unknown as Json },
    })
  }

  const handleAddNote = async (sectionId: string) => {
    if (!noteText.trim()) return
    const note: ReviewNote = {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      author: userId,
      createdAt: new Date().toISOString(),
    }
    const updated = {
      ...sectionNotes,
      [sectionId]: [...(sectionNotes[sectionId] || []), note],
    }
    setSectionNotes(updated)
    setNoteText('')
    setAddingNoteFor(null)
    await persistNotes(updated)
  }

  const handleDeleteNote = async (sectionId: string, noteId: string) => {
    const updated = {
      ...sectionNotes,
      [sectionId]: (sectionNotes[sectionId] || []).filter((n) => n.id !== noteId),
    }
    setSectionNotes(updated)
    await persistNotes(updated)
  }

  // Handle approval
  const handleApprove = async () => {
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

  // Handle rejection
  const handleReject = async () => {
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

  // Complete workflow step
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
  const canComplete = reviewDecision === 'approved' && !isComplete

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Report Type Tabs */}
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
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Quality Review Process</AlertTitle>
            <AlertDescription>
              Review the draft report and verify data completeness, report quality, regulatory
              compliance, and formatting. Approve the report or request revisions with specific
              comments.
            </AlertDescription>
          </Alert>

          {/* Report Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">Report Type</p>
                  <p className="font-medium capitalize">{report.report_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Version</p>
                  <p className="font-medium">{report.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge
                    variant={
                      report.status === 'approved'
                        ? 'default'
                        : report.status === 'internal_review'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {report.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Sections Complete</p>
                  <p className="font-medium">
                    {completedSections} / {totalSections}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content — read-only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Draft Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {reportSectionDefs.map((def) => {
                  const section = reportContent?.sections?.find((s) => s.id === def.id)
                  return (
                    <div key={def.id} className="border-b pb-6 last:border-b-0">
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{def.title}</h3>
                        {section?.content && (
                          <Badge
                            variant={
                              section.isEdited
                                ? 'secondary'
                                : section.aiGenerated
                                  ? 'default'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {section.isEdited
                              ? 'Edited'
                              : section.aiGenerated
                                ? 'AI Generated'
                                : 'Template'}
                          </Badge>
                        )}
                      </div>
                      {section?.content ? (
                        <div
                          className={
                            section.aiGenerated
                              ? 'rounded-md border border-pink-200 bg-pink-50/60 p-3 dark:border-pink-900 dark:bg-pink-950/20'
                              : ''
                          }
                        >
                          <SectionEditor
                            content={section.content}
                            editable={false}
                            onContentChange={() => {}}
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          No content generated for this section.
                        </p>
                      )}

                      {/* Section review notes */}
                      <div className="mt-3 space-y-2">
                        {(sectionNotes[def.id] || []).map((note) => (
                          <div
                            key={note.id}
                            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
                          >
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <div className="flex-1">
                              <p className="text-sm">{note.text}</p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {!isComplete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(def.id, note.id)}
                                className="text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {addingNoteFor === def.id ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a review note for this section..."
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddNote(def.id)}
                                disabled={!noteText.trim()}
                              >
                                Save Note
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddingNoteFor(null)
                                  setNoteText('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          !isComplete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => {
                                setAddingNoteFor(def.id)
                                setNoteText('')
                              }}
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              Add Note
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
              {selectedSiteId && (
                <p className="text-muted-foreground text-xs">
                  Site filter affects completeness stats only. The report itself covers the entire
                  project.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Habitats Mapped</p>
                  <p className="text-2xl font-bold">{habitatStats?.total || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {(habitatStats?.totalArea || 0).toFixed(2)} ha total
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Species Observed</p>
                  <p className="text-2xl font-bold">{observationStats?.total || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {observationStats?.protected || 0} protected
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Desk Findings</p>
                  <p className="text-2xl font-bold">{findingsStats?.total || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {findingsStats?.bySource.length || 0} sources
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Report Sections</p>
                  <p className="text-2xl font-bold">{completedSections}</p>
                  <p className="text-muted-foreground text-xs">of {totalSections} total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General Review Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                General Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(sectionNotes['_general'] || []).map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm">{note.text}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!isComplete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNote('_general', note.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {!isComplete &&
                (addingNoteFor === '_general' ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a general review note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddNote('_general')}
                        disabled={!noteText.trim()}
                      >
                        Save Note
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingNoteFor(null)
                          setNoteText('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddingNoteFor('_general')
                      setNoteText('')
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add General Note
                  </Button>
                ))}

              {permissions.canApproveReport ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleReject}
                    disabled={isComplete || reviewDecision === 'approved'}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Request Revisions
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={isComplete || reviewDecision === 'rejected'}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve Report
                  </Button>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Approval Required</AlertTitle>
                  <AlertDescription>
                    Only administrators can approve or reject reports. Please wait for an admin to
                    review.
                  </AlertDescription>
                </Alert>
              )}

              {/* Review signature */}
              {(reviewDecision || extendedContent?.reviewSignature) && (
                <div
                  className={`rounded-lg border-2 p-4 ${
                    (extendedContent?.reviewSignature?.decision ?? reviewDecision) === 'approved'
                      ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                      : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {(extendedContent?.reviewSignature?.decision ?? reviewDecision) ===
                    'approved' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {(extendedContent?.reviewSignature?.decision ?? reviewDecision) === 'approved'
                        ? 'Report Approved'
                        : 'Revisions Requested'}
                    </span>
                  </div>
                  {extendedContent?.reviewSignature && (
                    <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Reviewed by:</span>{' '}
                        {extendedContent.reviewSignature.reviewerName}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(extendedContent.reviewSignature.signedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Step Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Review decision</span>
                  {reviewDecision === 'approved' ? (
                    <Badge className="bg-green-600">Approved</Badge>
                  ) : reviewDecision === 'rejected' ? (
                    <Badge variant="destructive">Revisions Requested</Badge>
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>

              <Progress value={isComplete ? 100 : reviewDecision === 'approved' ? 90 : 50} />

              <Button
                onClick={handleComplete}
                disabled={!canComplete || completeStep.isPending}
                className="w-full"
              >
                {completeStep.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isComplete ? 'Completed' : 'Complete Step & Continue'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
