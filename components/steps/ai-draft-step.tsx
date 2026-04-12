'use client'

import * as React from 'react'
import { Loader2, AlertTriangle, Bot, FileText } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  useCreateReport,
  useUpdateReport,
  useCreateReportVersion,
  useLatestReportByType,
  useReportsByType,
} from '@/hooks/queries/use-report-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useAutosave } from '@/hooks/use-autosave'
import { useActiveReportType } from '@/hooks/use-active-report-type'
import { useTemplateData } from '@/hooks/queries/use-template-data'
import {
  PEA_REPORT_SECTIONS,
  getReportSectionsForType,
  type ReportContent,
  type ReportSection,
} from '@/lib/supabase/queries/reports'
import { renderReportTemplate } from '@/lib/templates/template-renderer'
import { getReportTemplateByType, jsonToSections } from '@/lib/supabase/queries/templates'
import { DulraAgentTab } from '@/components/steps/ai-draft/dulra-agent-tab'
import { AIDraftTab } from '@/components/steps/ai-draft/ai-draft-tab'
import { VersionCompareDialog } from '@/components/steps/ai-draft/version-compare-dialog'
import { VersionViewDialog } from '@/components/steps/ai-draft/version-view-dialog'
import { RestoreVersionDialog } from '@/components/steps/ai-draft/restore-version-dialog'
import { ReportTypeSelector } from '@/components/steps/report-type-selector'
import { SurveyLinkPanel } from '@/components/steps/ai-draft/survey-link-panel'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import type { Project, Report, WorkflowStep, Json } from '@/types/database'

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
  } = useActiveReportType(project.id)
  const [activeTab, setActiveTab] = React.useState('agent')
  const [generatingSection, setGeneratingSection] = React.useState<string | null>(null)
  const [sections, setSections] = React.useState<ReportSection[]>([])
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  // Project sites — used for site-scoped section generation and status banner
  const { data: projectSites } = useProjectSites(project.id)
  const activeSiteCode = selectedSiteId
    ? (projectSites?.find((s) => s.id === selectedSiteId)?.site_code ?? undefined)
    : undefined

  // Dynamic report section definitions based on report type
  const reportSectionDefs = React.useMemo(() => getReportSectionsForType(reportType), [reportType])

  const [compareReport, setCompareReport] = React.useState<Report | null>(null)
  const [viewReport, setViewReport] = React.useState<Report | null>(null)
  const [restoreReport, setRestoreReport] = React.useState<Report | null>(null)

  const { data: existingReport, isLoading: loadingReport } = useLatestReportByType(
    project.id,
    reportType
  )
  const { data: allReports } = useReportsByType(project.id, reportType)
  const { templateData } = useTemplateData(project)
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()
  const createVersion = useCreateReportVersion()
  const completeStep = useCompleteWorkflowStep()

  // For report selector status badges — collect latest report per type
  const latestReportPerType = React.useMemo(() => {
    if (!allReports) return {}
    // allReports is for current type only, we need all project reports for the selector
    // The selector only uses the latestReports for badge display, so per-type queries suffice
    return existingReport ? { [reportType]: existingReport } : {}
  }, [existingReport, reportType, allReports])

  // Initialize sections from existing report, org template, or defaults
  React.useEffect(() => {
    const existingMatchesType =
      existingReport?.report_type === reportType ||
      // Also accept if the existing report has no report_type (legacy)
      !existingReport?.report_type

    if (existingReport?.content && existingMatchesType) {
      const content = existingReport.content as unknown as ReportContent
      if (content.sections) {
        // Migrate old 11-section PEA reports to new 6-section structure
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
                  ecologistOpinion: old?.ecologistOpinion,
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
                  ecologistOpinion: old?.ecologistOpinion,
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
    } else if (templateData) {
      // Render template with placeholder substitution for all report types
      // Check org custom template first, then use Dulra Standard defaults
      const initSections = async () => {
        let customSections: { id: string; title: string; template: string }[] | undefined
        if (project.organization_id) {
          try {
            const orgTemplate = await getReportTemplateByType(project.organization_id, reportType)
            if (orgTemplate?.use_custom && orgTemplate.sections) {
              const parsed = jsonToSections(orgTemplate.sections)
              if (parsed.length > 0) {
                customSections = parsed
              }
            }
          } catch {
            // Fall through to defaults
          }
        }
        const rendered = renderReportTemplate(reportType, templateData, customSections)
        if (rendered.length > 0) {
          setSections(rendered)
        } else {
          // Fallback: empty sections from type definitions
          setSections(
            reportSectionDefs.map((s) => ({
              id: s.id,
              title: s.title,
              content: '',
              isEdited: false,
              aiGenerated: false,
            }))
          )
        }
      }
      initSections()
    } else {
      // No template data yet — show empty sections
      setSections(
        reportSectionDefs.map((s) => ({
          id: s.id,
          title: s.title,
          content: '',
          isEdited: false,
          aiGenerated: false,
        }))
      )
    }
  }, [existingReport, templateData, reportType, reportSectionDefs, project.organization_id])

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
    // Snapshot IDs to generate before the loop starts to avoid stale closure reads
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

  // Core save logic — used by both manual save and autosave
  const saveReport = React.useCallback(async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: 'gpt-4o-mini',
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
        project_id: project.id,
        report_type: reportType,
        status: 'draft',
        content: reportContent as unknown as Json,
        generated_by: userId,
      })
    }
  }, [sections, existingReport, updateReport, createReport, project.id, reportType, userId])

  // Autosave: saves 30s after last edit, warns on page close
  const autosave = useAutosave({
    onSave: saveReport,
    enabled: sections.some((s) => s.content),
  })

  // Manual save with toast notification — returns success boolean for callers
  const handleSaveReport = async (): Promise<boolean> => {
    try {
      await autosave.saveNow()
      toast({
        title: 'Report saved',
        description: 'Your draft report has been saved.',
      })
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

  const handleSaveAsNewVersion = async () => {
    const reportContent: ReportContent = {
      sections,
      metadata: {
        generatedAt: existingReport
          ? ((existingReport.content as unknown as ReportContent)?.metadata?.generatedAt ??
            new Date().toISOString())
          : new Date().toISOString(),
        editedAt: new Date().toISOString(),
        aiModel: 'gpt-4o-mini',
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <h2 className="text-2xl font-bold">Step 6: AI Draft Generation</h2>
          <p className="text-muted-foreground">
            Generate AI-assisted report draft based on collected data
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          >
            {isComplete
              ? 'Completed'
              : workflowStep.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
          </Badge>
        </div>
      </div>

      {/* Multi-site generation warning */}
      {selectedSiteId && (
        <Alert className="mx-1 mb-3 border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30">
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

      {/* Report Type Tabs */}
      {reportTypes.length > 0 && (
        <ReportTypeSelector
          projectId={project.id}
          reportTypes={reportTypes}
          activeReportType={reportType}
          onReportTypeChange={setReportType}
          latestReports={latestReportPerType}
        />
      )}

      {/* Survey Data Sources */}
      <div className="px-1 pb-1">
        <SurveyLinkPanel projectId={project.id} reportType={reportType} />
      </div>

      {/* Revision requested banner */}
      {existingReport?.status === 'internal_review' && (
        <Alert className="mx-1 mb-3 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-1 w-fit">
          <TabsTrigger value="agent" className="gap-1.5">
            <Bot className="h-4 w-4" />
            Dulra Agent
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-1.5">
            <FileText className="h-4 w-4" />
            AI Draft
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-3 min-h-0 flex-1">
          <div className="border-muted h-full rounded-lg border">
            <DulraAgentTab projectId={project.id} onInsertIntoDraft={handleInsertIntoDraft} />
          </div>
        </TabsContent>

        <TabsContent value="draft" className="mt-3 min-h-0 flex-1">
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
              isSaving={updateReport.isPending || createReport.isPending}
              isCreatingVersion={createVersion.isPending}
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

      {/* Version Dialogs */}
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
        isPending={createVersion.isPending}
        onConfirm={handleRestoreVersion}
      />
    </div>
  )
}
