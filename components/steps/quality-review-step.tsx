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
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
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
import { getReportSectionsForType } from '@/lib/config/template-types'
import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface QualityReviewStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

// Quality checklist items
const QUALITY_CHECKLIST = [
  {
    id: 'data_complete',
    category: 'Data Completeness',
    items: [
      { id: 'habitats_mapped', label: 'All habitats have been mapped and classified' },
      { id: 'species_recorded', label: 'Species observations are complete' },
      { id: 'photos_uploaded', label: 'Supporting photographs have been uploaded' },
      { id: 'locations_verified', label: 'GPS locations have been verified' },
    ],
  },
  {
    id: 'report_quality',
    category: 'Report Quality',
    items: [
      { id: 'all_sections', label: 'All report sections have been completed' },
      { id: 'methodology_clear', label: 'Methodology is clearly described' },
      { id: 'results_accurate', label: 'Results are accurate and consistent with data' },
      { id: 'recommendations_appropriate', label: 'Recommendations are appropriate and justified' },
    ],
  },
  {
    id: 'regulatory',
    category: 'Regulatory Compliance',
    items: [
      { id: 'protected_species', label: 'Protected species have been adequately addressed' },
      { id: 'designated_sites', label: 'Impacts on designated sites have been assessed' },
      { id: 'legislation_referenced', label: 'Relevant legislation has been referenced' },
      { id: 'guidelines_followed', label: 'CIEEM/NPWS guidelines have been followed' },
    ],
  },
  {
    id: 'formatting',
    category: 'Formatting & Presentation',
    items: [
      { id: 'spelling_grammar', label: 'Spelling and grammar have been checked' },
      { id: 'figures_maps', label: 'Figures and maps are correctly referenced' },
      { id: 'references_complete', label: 'All references are complete and formatted' },
      { id: 'appendices_included', label: 'Required appendices are included' },
    ],
  },
]

export function QualityReviewStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: QualityReviewStepProps) {
  const { toast } = useToast()
  const { permissions } = useRole()
  const { navigateToStep, workflowSteps } = useProjectContext()
  const {
    activeType: reportType,
    setActiveType: setReportType,
    reportTypes,
  } = useActiveReportType(project.id)
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({})
  const [reviewComments, setReviewComments] = React.useState('')
  const [reviewDecision, setReviewDecision] = React.useState<'approved' | 'rejected' | null>(null)

  // React Query hooks
  const { data: report, isLoading: loadingReport } = useLatestReportByType(project.id, reportType)
  const { data: habitatStats } = useHabitatStats(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const updateReport = useUpdateReport()
  const completeStep = useCompleteWorkflowStep()
  const updateWorkflowStep = useUpdateWorkflowStep()

  // Get report content
  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0
  const reportSectionDefs = getReportSectionsForType(reportType)
  const totalSections = reportSectionDefs.length

  // Toggle checklist item
  const toggleChecklistItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  // Calculate checklist progress
  const totalItems = QUALITY_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedCount = Object.values(checkedItems).filter(Boolean).length
  const checklistProgress = (checkedCount / totalItems) * 100

  // Auto-check items based on data
  React.useEffect(() => {
    const autoChecks: Record<string, boolean> = {}

    // Check data completeness
    if (habitatStats && habitatStats.total > 0) {
      autoChecks.habitats_mapped = true
    }
    if (observationStats && observationStats.total > 0) {
      autoChecks.species_recorded = true
    }
    if (reportContent?.sections?.every((s) => s.content)) {
      autoChecks.all_sections = true
    }

    setCheckedItems((prev) => ({ ...autoChecks, ...prev }))
  }, [habitatStats, observationStats, reportContent])

  // Handle approval
  const handleApprove = async () => {
    if (!report) return

    try {
      await updateReport.mutateAsync({
        reportId: report.id,
        updates: {
          status: 'approved',
          reviewed_by: userId,
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
    if (!report || !reviewComments.trim()) {
      toast({
        variant: 'destructive',
        title: 'Comments required',
        description: 'Please provide review comments before rejecting.',
      })
      return
    }

    try {
      const updatedContent = {
        ...reportContent,
        reviewComments: reviewComments,
        reviewedAt: new Date().toISOString(),
      }

      await updateReport.mutateAsync({
        reportId: report.id,
        updates: {
          status: 'internal_review',
          content: updatedContent as unknown as Json,
          reviewed_by: userId,
        },
      })

      // Reset Step 8 back to in_progress so the Complete button becomes active again
      const aiDraftStep = workflowSteps.find((s) => s.step_number === 8)
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

      // Navigate back to Step 8 so the author sees the revision banner
      setTimeout(() => navigateToStep(8), 1200)
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
          <h2 className="text-2xl font-bold">Step 9: Quality Review</h2>
          <p className="text-muted-foreground">Peer review and approval of the draft report</p>
        </div>
        <Badge
          variant={
            isComplete ? 'default' : workflowStep.status === 'in_progress' ? 'secondary' : 'outline'
          }
        >
          {isComplete
            ? 'Completed'
            : workflowStep.status === 'in_progress'
              ? 'In Progress'
              : 'Pending'}
        </Badge>
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
              Review the draft report against the quality checklist. Verify data completeness,
              report quality, regulatory compliance, and formatting. Approve the report or request
              revisions with specific comments.
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

          {/* Quality Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quality Checklist</CardTitle>
                <div className="flex items-center gap-2">
                  <Progress value={checklistProgress} className="w-32" />
                  <span className="text-muted-foreground text-sm">
                    {checkedCount}/{totalItems}
                  </span>
                </div>
              </div>
              <CardDescription>
                Review each item to ensure the report meets quality standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {QUALITY_CHECKLIST.map((category) => (
                  <div key={category.id}>
                    <h4 className="mb-3 font-medium">{category.category}</h4>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <Checkbox
                            id={item.id}
                            checked={checkedItems[item.id] || false}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                          />
                          <Label
                            htmlFor={item.id}
                            className="cursor-pointer text-sm leading-tight font-normal"
                          >
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
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

          {/* Review Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Review Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter review comments, notes, or revision requests..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
              />

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

              {reviewDecision && (
                <Alert variant={reviewDecision === 'approved' ? 'default' : 'destructive'}>
                  {reviewDecision === 'approved' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Report Approved</AlertTitle>
                      <AlertDescription>
                        The report has been approved and is ready for final submission.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Revisions Requested</AlertTitle>
                      <AlertDescription>
                        The report has been sent back for revisions. Review comments have been
                        saved.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
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
                  <span>Checklist completed</span>
                  {checklistProgress === 100 ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-muted-foreground">{Math.round(checklistProgress)}%</span>
                  )}
                </div>
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
