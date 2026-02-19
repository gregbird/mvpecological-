'use client'

import * as React from 'react'
import { Loader2, Check, Info, Sparkles, Save, RefreshCw, Copy, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion } from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import {
  useLatestReport,
  useCreateReport,
  useUpdateReport,
  useCreateReportVersion,
  useReports,
} from '@/hooks/queries/use-report-hooks'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import {
  PEA_REPORT_SECTIONS,
  type ReportContent,
  type ReportSection,
} from '@/lib/supabase/queries/reports'
import { ReportConfigPanel } from '@/components/steps/ai-draft/report-config-panel'
import { DataSummaryPanel } from '@/components/steps/ai-draft/data-summary-panel'
import { SectionAccordionItem } from '@/components/steps/ai-draft/section-accordion-item'
import { VersionHistoryPanel } from '@/components/steps/ai-draft/version-history-panel'
import { VersionCompareDialog } from '@/components/steps/ai-draft/version-compare-dialog'
import { VersionViewDialog } from '@/components/steps/ai-draft/version-view-dialog'
import { RestoreVersionDialog } from '@/components/steps/ai-draft/restore-version-dialog'
import type { Project, Report, WorkflowStep, Json } from '@/types/database'

interface AIDraftStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

export function AIDraftStep({ project, workflowStep, userId, onComplete }: AIDraftStepProps) {
  const { toast } = useToast()
  const [reportType, setReportType] = React.useState('pea')
  const [ecologistOpinion, setEcologistOpinion] = React.useState('')
  const [generatingSection, setGeneratingSection] = React.useState<string | null>(null)
  const [editingSection, setEditingSection] = React.useState<string | null>(null)
  const [sections, setSections] = React.useState<ReportSection[]>([])

  const [compareReport, setCompareReport] = React.useState<Report | null>(null)
  const [viewReport, setViewReport] = React.useState<Report | null>(null)
  const [restoreReport, setRestoreReport] = React.useState<Report | null>(null)

  const { data: existingReport, isLoading: loadingReport } = useLatestReport(project.id)
  const { data: allReports } = useReports(project.id)
  const { data: habitatStats } = useHabitatStats(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()
  const createVersion = useCreateReportVersion()
  const completeStep = useCompleteWorkflowStep()

  React.useEffect(() => {
    if (existingReport?.content) {
      const content = existingReport.content as unknown as ReportContent
      if (content.sections) {
        // Migrate old 11-section reports to new 6-section structure
        const oldIds = content.sections.map((s) => s.id)
        const isLegacy = oldIds.includes('results_sites') || oldIds.includes('evaluation')

        if (isLegacy) {
          const findOld = (id: string) => content.sections.find((s) => s.id === id)
          const mergeContent = (...ids: string[]) =>
            ids
              .map((id) => findOld(id)?.content)
              .filter(Boolean)
              .join('\n\n')

          const migrated: ReportSection[] = PEA_REPORT_SECTIONS.map((tmpl) => {
            switch (tmpl.id) {
              case 'introduction':
              case 'methodology':
              case 'appendices': {
                const old = findOld(tmpl.id)
                return {
                  id: tmpl.id,
                  title: tmpl.title,
                  content: old?.content || '',
                  isEdited: old?.isEdited || false,
                  aiGenerated: old?.aiGenerated || false,
                }
              }
              case 'results':
                return {
                  id: 'results',
                  title: tmpl.title,
                  content: mergeContent(
                    'results_sites',
                    'results_habitats',
                    'results_flora',
                    'results_invasive',
                    'results_fauna'
                  ),
                  isEdited: true,
                  aiGenerated: true,
                }
              case 'constraints': {
                const old = findOld('evaluation')
                return {
                  id: 'constraints',
                  title: tmpl.title,
                  content: old?.content || '',
                  isEdited: old?.isEdited || false,
                  aiGenerated: old?.aiGenerated || false,
                }
              }
              case 'discussion':
                return {
                  id: 'discussion',
                  title: tmpl.title,
                  content: mergeContent('discussion', 'recommendations'),
                  isEdited: true,
                  aiGenerated: true,
                }
              default:
                return {
                  id: tmpl.id,
                  title: tmpl.title,
                  content: '',
                  isEdited: false,
                  aiGenerated: false,
                }
            }
          })
          setSections(migrated)
        } else {
          setSections(content.sections)
        }
      }
    } else {
      const initialSections: ReportSection[] = PEA_REPORT_SECTIONS.map((s) => ({
        id: s.id,
        title: s.title,
        content: '',
        isEdited: false,
        aiGenerated: false,
      }))
      setSections(initialSections)
    }
  }, [existingReport])

  const generateSectionContent = async (sectionId: string) => {
    const section = PEA_REPORT_SECTIONS.find((s) => s.id === sectionId)
    if (!section) return

    setGeneratingSection(sectionId)

    try {
      const response = await fetch('/api/ai/report-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sectionId,
          reportType,
          ecologistOpinion: ecologistOpinion || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate section')
      }

      const data = await response.json()

      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, content: data.content, aiGenerated: true, isEdited: false }
            : s
        )
      )

      toast({
        title: 'Section generated',
        description: `AI draft for "${section.title}" has been generated.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate section content.',
      })
    } finally {
      setGeneratingSection(null)
    }
  }

  const generateAllSections = async (onlyEmpty = false) => {
    for (const section of PEA_REPORT_SECTIONS) {
      if (onlyEmpty && sections.find((s) => s.id === section.id)?.content) {
        continue
      }
      await generateSectionContent(section.id)
    }
  }

  const updateSectionContent = (sectionId: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content, isEdited: true } : s))
    )
  }

  const handleSaveReport = async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: 'gpt-4o',
      },
    }

    try {
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
          project_id: project.id,
          report_type: reportType,
          status: 'draft',
          content: reportContent as unknown as Json,
          generated_by: userId,
        })
      }

      toast({
        title: 'Report saved',
        description: 'Your draft report has been saved.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error saving report',
        description: 'Failed to save the report.',
      })
    }
  }

  const handleComplete = async () => {
    await handleSaveReport()

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'AI Draft step has been completed. Moving to Quality Review.',
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

  const handleSaveAsNewVersion = async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: existingReport
          ? ((existingReport.content as unknown as ReportContent)?.metadata?.generatedAt ??
            new Date().toISOString())
          : new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: 'gpt-4o',
      },
    }

    try {
      await createVersion.mutateAsync({
        projectId: project.id,
        content: reportContent,
        reportType: reportType,
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

  const handleRestoreVersion = async () => {
    if (!restoreReport) return

    const oldContent = restoreReport.content as unknown as ReportContent | null
    if (!oldContent?.sections) return

    try {
      await createVersion.mutateAsync({
        projectId: project.id,
        content: oldContent,
        reportType: restoreReport.report_type,
        generatedBy: userId,
        sourceVersion: restoreReport.version,
      })

      setRestoreReport(null)
      toast({
        title: 'Version restored',
        description: `Content from Version ${restoreReport.version} has been saved as a new version.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error restoring version',
        description: 'Failed to restore the report version.',
      })
    }
  }

  const nextVersion = (allReports?.length ?? 0) + 1

  const isComplete = workflowStep.status === 'approved'
  const hasContent = sections.some((s) => s.content)
  const canComplete = hasContent && !isComplete

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
          <h2 className="text-2xl font-bold">Step 8: AI Draft Generation</h2>
          <p className="text-muted-foreground">
            Generate AI-assisted report draft based on collected data
          </p>
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

      {/* Revision requested banner */}
      {existingReport?.status === 'internal_review' && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            Revisions Requested
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            This report was sent back for revisions by the reviewer. Please update the relevant
            sections and resubmit for quality review.
            {(existingReport.content as unknown as { reviewComments?: string })?.reviewComments && (
              <p className="mt-2 font-medium">
                Reviewer comment:{' '}
                {(existingReport.content as unknown as { reviewComments: string }).reviewComments}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>AI-Assisted Drafting</AlertTitle>
        <AlertDescription>
          Generate report sections using AI based on your collected field data. Add your
          professional opinion to guide the AI and edit generated content as needed. All content
          should be reviewed and verified before submission.
        </AlertDescription>
      </Alert>

      {/* Configuration */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportConfigPanel
          reportType={reportType}
          onReportTypeChange={setReportType}
          ecologistOpinion={ecologistOpinion}
          onEcologistOpinionChange={setEcologistOpinion}
          disabled={!!existingReport}
        />
        <DataSummaryPanel
          habitatTotal={habitatStats?.total || 0}
          observationTotal={observationStats?.total || 0}
          protectedCount={observationStats?.protected || 0}
          findingsTotal={findingsStats?.total || 0}
        />
      </div>

      {/* Version History */}
      {(allReports?.length ?? 0) > 0 && (
        <VersionHistoryPanel
          projectId={project.id}
          currentReportId={existingReport?.id ?? null}
          onViewVersion={(report) => setViewReport(report)}
          onCompareVersion={(report) => setCompareReport(report)}
          onRestoreVersion={(report) => setRestoreReport(report)}
        />
      )}

      {/* Generate All Button */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={handleSaveReport} disabled={!hasContent}>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        {hasContent && (
          <Button
            variant="outline"
            onClick={handleSaveAsNewVersion}
            disabled={createVersion.isPending}
          >
            {createVersion.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Save as New Version
          </Button>
        )}
        {hasContent && (
          <Button
            variant="outline"
            onClick={() => generateAllSections(false)}
            disabled={!!generatingSection}
          >
            {generatingSection ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate All
          </Button>
        )}
        <Button onClick={() => generateAllSections(true)} disabled={!!generatingSection}>
          {generatingSection ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate All Sections
        </Button>
      </div>

      {/* Report Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Report Sections</CardTitle>
          <CardDescription>Generate, edit, and review each section of your report</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {PEA_REPORT_SECTIONS.map((templateSection, index) => (
              <SectionAccordionItem
                key={templateSection.id}
                templateId={templateSection.id}
                templateTitle={templateSection.title}
                index={index}
                section={sections.find((s) => s.id === templateSection.id)}
                isGenerating={generatingSection === templateSection.id}
                isEditing={editingSection === templateSection.id}
                onGenerate={() => generateSectionContent(templateSection.id)}
                onToggleEdit={() =>
                  setEditingSection(
                    editingSection === templateSection.id ? null : templateSection.id
                  )
                }
                onContentChange={(content) => updateSectionContent(templateSection.id, content)}
              />
            ))}
          </Accordion>
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
              <span>Sections generated</span>
              <span className="text-muted-foreground">
                {sections.filter((s) => s.content).length} / {PEA_REPORT_SECTIONS.length}
              </span>
            </div>
            <Progress
              value={(sections.filter((s) => s.content).length / PEA_REPORT_SECTIONS.length) * 100}
            />
          </div>

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

      {/* Version Dialogs */}
      <VersionViewDialog
        open={!!viewReport}
        onOpenChange={(open) => !open && setViewReport(null)}
        report={viewReport}
      />

      <VersionCompareDialog
        open={!!compareReport}
        onOpenChange={(open) => !open && setCompareReport(null)}
        currentReport={existingReport ?? null}
        compareReport={compareReport}
      />

      <RestoreVersionDialog
        open={!!restoreReport}
        onOpenChange={(open) => !open && setRestoreReport(null)}
        report={restoreReport}
        nextVersion={nextVersion}
        isPending={createVersion.isPending}
        onConfirm={handleRestoreVersion}
      />
    </div>
  )
}
