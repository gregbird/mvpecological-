'use client'

import * as React from 'react'
import { Loader2, AlertTriangle, Bot, FileText } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useLatestReportByType, useReportsByType } from '@/hooks/queries/use-report-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useActiveReportType } from '@/hooks/use-active-report-type'
import { useTemplateData } from '@/hooks/queries/use-template-data'
import { useResolvedReportSections } from '@/hooks/queries/use-resolved-report-sections'
import type { ReportSection } from '@/lib/supabase/queries/reports'
import { DulraAgentTab } from '@/components/steps/ai-draft/dulra-agent-tab'
import { AIDraftTab } from '@/components/steps/ai-draft/ai-draft-tab'
import { VersionCompareDialog } from '@/components/steps/ai-draft/version-compare-dialog'
import { VersionViewDialog } from '@/components/steps/ai-draft/version-view-dialog'
import { RestoreVersionDialog } from '@/components/steps/ai-draft/restore-version-dialog'
import { ReportTypeSelector } from '@/components/steps/report-type-selector'
import { SurveyLinkPanel } from '@/components/steps/ai-draft/survey-link-panel'
import { SiteSelector } from '@/components/project/site-selector'
import { useHabitats } from '@/hooks/queries/use-habitat-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useSectionInit } from '@/components/steps/ai-draft-hooks/use-section-init'
import { useReportSave } from '@/components/steps/ai-draft-hooks/use-report-save'
import type { Project, Report, WorkflowStep } from '@/types/database'

interface AIDraftStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

export function AIDraftStep({ project, workflowStep, userId, onComplete }: AIDraftStepProps) {
  const { toast } = useToast()
  const {
    activeType: reportType,
    setActiveType: setReportType,
    reportTypes,
    isLoading: loadingReportTypes,
  } = useActiveReportType(project.id)
  const [activeTab, setActiveTab] = React.useState('agent')
  const [generatingSection, setGeneratingSection] = React.useState<string | null>(null)
  const [sections, setSections] = React.useState<ReportSection[]>([])
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  // Dynamic report section definitions — resolved against the org's custom
  // template (sections may be added, removed, renamed, or reordered).
  const { sections: reportSectionDefs } = useResolvedReportSections(
    project.organization_id,
    reportType
  )

  // Habitat warning — drives the "no habitat data" banner so the ecologist
  // knows the habitat subsection will silently be skipped in the generated
  // section (route.ts has a `placedHabitats.length > 0` guard).
  const { data: habitats = [] } = useHabitats(project.id, selectedSiteId ?? undefined)
  const habitatCount = habitats.length
  const reportHasHabitatSection = React.useMemo(
    () =>
      reportSectionDefs.some(
        (s) => s.id === 'results_habitats' || s.id === 'habitats' || s.id === 'baseline_habitats'
      ),
    [reportSectionDefs]
  )

  const [compareReport, setCompareReport] = React.useState<Report | null>(null)
  const [viewReport, setViewReport] = React.useState<Report | null>(null)
  const [restoreReport, setRestoreReport] = React.useState<Report | null>(null)

  const { data: existingReport, isLoading: loadingReport } = useLatestReportByType(
    project.id,
    reportType
  )
  const { data: allReports } = useReportsByType(project.id, reportType)
  const { templateData } = useTemplateData(project)
  const completeStep = useCompleteWorkflowStep()

  // Latest report per type for the report selector status badges. Only the
  // current type's latest is fetched — that's enough for badge display.
  const latestReportPerType = React.useMemo(() => {
    return existingReport ? { [reportType]: existingReport } : {}
  }, [existingReport, reportType])

  // Initialise sections from existing report → org template → defaults
  useSectionInit({
    existingReport,
    templateData,
    reportType,
    reportSectionDefs,
    organizationId: project.organization_id,
    setSections,
  })

  // Persistence — autosave + manual save + version creation
  const {
    autosave,
    handleSaveReport,
    handleSaveAsNewVersion,
    handleRestoreVersion: doRestoreVersion,
    isSaving,
    isCreatingVersion,
  } = useReportSave({
    projectId: project.id,
    reportType,
    userId,
    sections,
    existingReport,
    allReports,
  })

  const generateSectionContent = async (sectionId: string) => {
    const section = reportSectionDefs.find((s) => s.id === sectionId)
    if (!section) return

    setGeneratingSection(sectionId)
    try {
      const sectionOpinion = sections.find((s) => s.id === sectionId)?.ecologistOpinion

      const response = await fetch('/api/ai/report-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sectionId,
          reportType,
          organizationId: project.organization_id || undefined,
          ecologistOpinion: sectionOpinion || undefined,
          siteId: selectedSiteId,
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
    // Snapshot IDs before the loop to avoid stale closure reads
    const sectionIdsToGenerate = onlyEmpty
      ? reportSectionDefs
          .filter((def) => {
            const s = sections.find((sec) => sec.id === def.id)
            return !s?.content && !s?.aiGenerated && !s?.isEdited
          })
          .map((def) => def.id)
      : reportSectionDefs.map((def) => def.id)

    for (const sectionId of sectionIdsToGenerate) {
      await generateSectionContent(sectionId)
    }
  }

  const updateSectionContent = (sectionId: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content, isEdited: true } : s))
    )
    autosave.markDirty()
  }

  const updateSectionOpinion = (sectionId: string, opinion: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ecologistOpinion: opinion } : s))
    )
    autosave.markDirty()
  }

  const handleComplete = async () => {
    const saved = await handleSaveReport()
    if (!saved) return

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

  const handleRestoreVersion = async () => {
    if (!restoreReport) return
    const ok = await doRestoreVersion(restoreReport)
    if (ok) setRestoreReport(null)
  }

  const handleInsertIntoDraft = React.useCallback(
    (content: string) => {
      // Find first empty section or append to discussion
      const emptySection = sections.find((s) => !s.content)
      const targetId =
        emptySection?.id || reportSectionDefs[reportSectionDefs.length - 1]?.id || 'discussion'

      setSections((prev) =>
        prev.map((s) => {
          if (s.id === targetId) {
            const newContent = s.content ? `${s.content}\n\n${content}` : content
            return { ...s, content: newContent, isEdited: true }
          }
          return s
        })
      )

      toast({
        title: 'Inserted into draft',
        description: `Content added to ${reportSectionDefs.find((d) => d.id === targetId)?.title || 'report section'} section.`,
      })

      setActiveTab('draft')
    },
    [sections, toast, reportSectionDefs]
  )

  const { data: projectSites } = useProjectSites(project.id)
  const activeSiteCode = selectedSiteId
    ? (projectSites?.find((s) => s.id === selectedSiteId)?.site_code ?? undefined)
    : undefined

  const nextVersion = (allReports?.length ?? 0) + 1
  const isComplete = workflowStep.status === 'approved'
  const hasContent = sections.some((s) => s.content)
  const canComplete = hasContent && !isComplete

  // Wait for both the active report type and the latest report to resolve.
  // Without this gate, the first render can flow through with a stale or
  // empty `reportType`, which lets `useSectionInit` hydrate sections using
  // whichever template happens to be active in that frame.
  if (loadingReportTypes || !reportType || loadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — compact single-line */}
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h2 className="text-lg font-semibold">Step 6: AI Draft</h2>
        <div className="flex items-center gap-2">
          <SiteSelector
            projectId={project.id}
            stepKey="ai-draft"
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
            className="shrink-0"
          >
            {isComplete
              ? 'Completed'
              : workflowStep.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
          </Badge>
        </div>
      </div>

      {/* No habitat data warning */}
      {reportHasHabitatSection && habitatCount === 0 && (
        <Alert className="mx-1 mb-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            No habitat data mapped
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            The habitat subsection will be skipped in the generated draft because no habitat
            polygons are saved for this {selectedSiteId ? 'site' : 'project'}. Map habitats in Step
            4 (Habitat Mapping) before generating the habitats section.
          </AlertDescription>
        </Alert>
      )}

      {/* Multi-site generation warning */}
      {selectedSiteId && (
        <Alert className="mx-1 mb-2 border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">
            Site-scoped generation: {activeSiteCode}
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            AI section generation is now filtered to <strong>{activeSiteCode}</strong>. Generating a
            section will replace its current content with site-specific text. Use{' '}
            <strong>Save as new version</strong> before switching sites if you want to keep the
            current draft. Reports are stored at the project level — only one active draft exists
            per report type.
          </AlertDescription>
        </Alert>
      )}

      {reportTypes.length > 0 && (
        <ReportTypeSelector
          projectId={project.id}
          reportTypes={reportTypes}
          activeReportType={reportType}
          onReportTypeChange={setReportType}
          latestReports={latestReportPerType}
        />
      )}

      <div className="px-1">
        <SurveyLinkPanel projectId={project.id} reportType={reportType} />
      </div>

      {existingReport?.status === 'internal_review' && (
        <Alert className="mx-1 mb-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-1 mt-1 w-fit">
          <TabsTrigger value="agent" className="gap-1.5">
            <Bot className="h-4 w-4" />
            Dulra Agent
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-1.5">
            <FileText className="h-4 w-4" />
            AI Draft
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-2 min-h-0 flex-1">
          <div className="border-muted h-full rounded-lg border">
            <DulraAgentTab projectId={project.id} onInsertIntoDraft={handleInsertIntoDraft} />
          </div>
        </TabsContent>

        <TabsContent value="draft" className="mt-2 min-h-0 flex-1">
          <div className="border-muted h-full rounded-lg border">
            <AIDraftTab
              project={project}
              reportType={reportType}
              sectionDefs={reportSectionDefs}
              sections={sections}
              generatingSection={generatingSection}
              hasContent={hasContent}
              canComplete={canComplete}
              isComplete={isComplete}
              isSaving={isSaving}
              isCreatingVersion={isCreatingVersion}
              isCompleting={completeStep.isPending}
              autosaveStatus={autosave.status}
              lastSavedAt={autosave.lastSavedAt}
              existingReport={existingReport ?? null}
              allReports={allReports ?? []}
              onGenerate={generateSectionContent}
              onGenerateAll={generateAllSections}
              onContentChange={updateSectionContent}
              onOpinionChange={updateSectionOpinion}
              onSave={handleSaveReport}
              onSaveAsVersion={handleSaveAsNewVersion}
              onComplete={handleComplete}
              onViewVersion={(report) => setViewReport(report)}
              onCompareVersion={(report) => setCompareReport(report)}
              onRestoreVersion={(report) => setRestoreReport(report)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <VersionViewDialog
        sectionDefs={reportSectionDefs}
        open={!!viewReport}
        onOpenChange={(open) => !open && setViewReport(null)}
        report={viewReport}
      />

      <VersionCompareDialog
        sectionDefs={reportSectionDefs}
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
        isPending={isCreatingVersion}
        onConfirm={handleRestoreVersion}
      />
    </div>
  )
}
