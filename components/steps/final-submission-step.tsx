'use client'

import * as React from 'react'
import { Loader2, AlertCircle, Info, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { useLatestReportByType, useUpdateReport } from '@/hooks/queries/use-report-hooks'
import { useActiveReportType } from '@/hooks/use-active-report-type'
import { ReportTypeSelector } from '@/components/steps/report-type-selector'
import { REPORT_TYPES } from '@/lib/config/template-types'
import { useUpdateProject } from '@/hooks/queries/use-project-hooks'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { SiteSelector } from '@/components/project/site-selector'
import { prepareAppendixData } from '@/lib/export/appendix-data'
import { useResolvedReportSections } from '@/hooks/queries/use-resolved-report-sections'
import { useBranding } from '@/hooks/queries/use-branding'
import { useExportWorker } from '@/hooks/use-export-worker'

import { CoverPageCard } from '@/components/steps/final-submission/cover-page-card'
import { AppendicesCard } from '@/components/steps/final-submission/appendices-card'
import { ExportFormatCard } from '@/components/steps/final-submission/export-format-card'
import { AdditionalExportsCard } from '@/components/steps/final-submission/additional-exports-card'
import { ReportSummaryCard } from '@/components/steps/final-submission/report-summary-card'
import { SubmissionPanel } from '@/components/steps/final-submission/submission-panel'
import { useShapefileExport } from '@/components/steps/final-submission/use-shapefile-export'
import { usePdfExport } from '@/components/steps/final-submission/use-pdf-export'

import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface FinalSubmissionStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

export function FinalSubmissionStep({
  project,
  workflowStep,
  userId: _userId,
  onComplete,
}: FinalSubmissionStepProps) {
  const { toast } = useToast()
  const { permissions } = useRole()
  const {
    activeType: reportType,
    setActiveType: setReportType,
    reportTypes,
  } = useActiveReportType(project.id)
  const [exportFormat, setExportFormat] = React.useState('pdf')
  const [selectedAppendices, setSelectedAppendices] = React.useState<string[]>([
    'habitat_map',
    'designated_sites',
    'species_list',
    'aquatic_data',
    'photographs',
  ])
  const [coverPageTitle, setCoverPageTitle] = React.useState('')
  const [preparedFor, setPreparedFor] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  const { data: report, isLoading: loadingReport } = useLatestReportByType(project.id, reportType)
  // Stats and appendix sources are filtered by site for multi-site projects.
  // Reports themselves remain project-scoped — narrative sections always cover the full project.
  const { data: habitatStats } = useHabitatStats(project.id, selectedSiteId)
  const { data: observationStats } = useObservationStats(project.id, selectedSiteId)
  const { data: savedFindings } = useSavedFindings(project.id, selectedSiteId)
  const { data: surveys } = useSurveys(project.id, selectedSiteId)
  const { data: sites } = useProjectSites(project.id)
  const { data: branding } = useBranding(project.organization_id)
  const activeSiteCode = selectedSiteId
    ? (sites?.find((s) => s.id === selectedSiteId)?.site_code ?? undefined)
    : undefined
  const updateReport = useUpdateReport()
  const updateProject = useUpdateProject()
  const completeStep = useCompleteWorkflowStep()
  const { runExport, cancelExport } = useExportWorker()

  React.useEffect(() => {
    if (project) {
      const typeName = REPORT_TYPES.find((r) => r.id === reportType)?.name || 'Ecological Report'
      setCoverPageTitle(`${typeName} - ${project.name}`)
      // TODO: client_id is a UUID — resolve to client/org display name once a client name column or join is available
      setPreparedFor(project.client_id || '')
    }
  }, [project, reportType])

  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0
  const { sections: reportSectionDefs } = useResolvedReportSections(
    project.organization_id,
    reportType
  )

  const toggleAppendix = (appendixId: string) => {
    setSelectedAppendices((prev) =>
      prev.includes(appendixId) ? prev.filter((id) => id !== appendixId) : [...prev, appendixId]
    )
  }

  /** Yield to the browser so React can repaint before a CPU-heavy task runs. */
  const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 50))

  const buildExportOptions = () => ({
    title: coverPageTitle,
    preparedFor,
    siteCode: project.site_code || project.id,
    siteCodes: (sites || [])
      .map((s) => s.site_code)
      .filter((code): code is string => Boolean(code)),
    activeSiteId: selectedSiteId,
    activeSiteCode,
    reportType,
    version: report?.version || 1,
    date: new Date().toLocaleDateString('en-IE'),
    sections: reportContent?.sections || [],
    appendices: selectedAppendices,
    appendixData:
      savedFindings && savedFindings.length > 0 ? prepareAppendixData(savedFindings) : undefined,
    projectName: project.name,
    branding: branding
      ? {
          logoDataUrl: branding.logoDataUrl ?? null,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          fontFamily: branding.fontFamily,
          coverPage: branding.coverPage,
          header: branding.header,
          footer: branding.footer,
        }
      : undefined,
  })

  const baseFilename = () => {
    const siteSuffix = activeSiteCode ? `_${activeSiteCode.replace(/\s+/g, '-')}` : ''
    return `${project.site_code || project.id}_${report?.report_type || 'report'}_v${report?.version || 1}${siteSuffix}`
  }

  const {
    isExporting,
    setIsExporting,
    handlePrint,
    handleExport,
    handleCancel: handleCancelExport,
  } = usePdfExport({
    exportFormat,
    buildExportOptions,
    runExport,
    cancelExport,
    baseFilename,
    yieldToBrowser,
  })

  const handleShapefileExport = useShapefileExport({
    project,
    sites,
    selectedSiteId,
    activeSiteCode,
    setIsExporting,
    yieldToBrowser,
  })

  const handleSurveyCsvExport = () => {
    if (!surveys || surveys.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No surveys',
        description: 'No survey data to export.',
      })
      return
    }

    const headers = ['Survey Date', 'Type', 'Status', 'Site', 'Start Time', 'End Time', 'Notes']
    const escapeCSV = (val: string) => val.replace(/"/g, '""')
    const rows = surveys.map((s) => [
      escapeCSV(s.survey_date || ''),
      escapeCSV(s.survey_type || ''),
      escapeCSV(s.status || ''),
      escapeCSV(sites?.find((site) => site.id === s.site_id)?.site_name || ''),
      escapeCSV(s.start_time || ''),
      escapeCSV(s.end_time || ''),
      escapeCSV(s.notes || ''),
    ])

    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${project.site_code || project.id}_surveys.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast({ title: 'Survey CSV exported' })
  }

  const [generatingSummary, setGeneratingSummary] = React.useState(false)
  const [surveySummary, setSurveySummary] = React.useState<string | null>(null)

  React.useEffect(() => {
    const saved = (reportContent as ReportContent & { surveyAiSummary?: string })?.surveyAiSummary
    if (saved) setSurveySummary(saved)
  }, [reportContent])

  const handleGenerateSurveySummaries = async () => {
    if (!surveys || surveys.length === 0) {
      toast({ variant: 'destructive', title: 'No surveys to summarise' })
      return
    }

    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/ai/data-analysis-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          tabContext: 'field-survey',
          siteId: selectedSiteId,
          tier: 'final',
        }),
      })

      if (!res.ok) throw new Error('AI summary request failed')
      const { summary } = await res.json()

      // Save to report content
      if (report && reportContent) {
        const updatedContent = { ...reportContent, surveyAiSummary: summary }
        await updateReport.mutateAsync({
          reportId: report.id,
          updates: { content: updatedContent as unknown as Json },
        })
      }

      setSurveySummary(summary)
      toast({ title: 'Survey summary generated' })
    } catch {
      toast({ variant: 'destructive', title: 'Summary generation failed' })
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleSubmit = async () => {
    if (!report) return
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      try {
        await updateReport.mutateAsync({
          reportId: report.id,
          updates: { status: 'final' },
        })
      } catch {
        toast({ variant: 'destructive', title: 'Failed to update report status' })
        return
      }

      try {
        await updateProject.mutateAsync({
          projectId: project.id,
          updates: { status: 'completed' },
        })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to update project. Report status was updated — please try again.',
        })
        return
      }

      try {
        await completeStep.mutateAsync({
          projectId: project.id,
          stepNumber: workflowStep.step_number,
        })
      } catch {
        toast({
          variant: 'destructive',
          title:
            'Failed to complete workflow step. Project and report were updated — please refresh.',
        })
        return
      }

      toast({
        title: 'Project completed!',
        description: 'The report has been finalized and the project is now complete.',
      })

      onComplete?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const isApproved = report?.status === 'approved' || report?.status === 'final'
  const canSubmit = isApproved && !isComplete

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const showReportContent = !!report && (isApproved || isComplete)

  return (
    <div className="space-y-6">
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card flex flex-col items-center gap-4 rounded-xl p-8 shadow-xl">
            <Loader2 className="h-10 w-10 animate-spin text-green-600" />
            <p className="text-lg font-medium">Generating {exportFormat.toUpperCase()} report...</p>
            <p className="text-muted-foreground text-sm">
              This may take a few seconds for large reports.
            </p>
            <Button variant="outline" size="sm" onClick={handleCancelExport}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 8: Final Submission</h2>
          <p className="text-muted-foreground">Export and finalize the project report</p>
        </div>
        <div className="flex items-center gap-3">
          <SiteSelector
            projectId={project.id}
            stepKey="final-submission"
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

      {selectedSiteId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Single-site export active</AlertTitle>
          <AlertDescription>
            Stats and appendix data are filtered to <strong>{activeSiteCode}</strong>. The report
            narrative sections still cover the full project — generate site-specific content in Step
            6 (AI Draft) before exporting if you need fully site-scoped narrative.
          </AlertDescription>
        </Alert>
      )}

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
            Please complete the previous steps to generate and approve a report for this report
            type.
          </AlertDescription>
        </Alert>
      )}

      {report && !isApproved && !isComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Report Not Approved</AlertTitle>
          <AlertDescription>
            The report must be approved in the Quality Review step before it can be finalized.
          </AlertDescription>
        </Alert>
      )}

      {!showReportContent ? null : (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Final Submission</AlertTitle>
            <AlertDescription>
              Configure the export settings, select appendices to include, and finalize the project.
              Once submitted, the project will be marked as complete and the report will be
              finalized.
            </AlertDescription>
          </Alert>

          {isComplete && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">
                Project Completed
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                This project has been completed and the final report has been submitted.
              </AlertDescription>
            </Alert>
          )}

          <ReportSummaryCard
            report={report!}
            completedSections={completedSections}
            totalSections={reportSectionDefs.length}
            habitatTotal={habitatStats?.total || 0}
            observationTotal={observationStats?.total || 0}
            protectedSpeciesTotal={observationStats?.protected || 0}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CoverPageCard
              coverPageTitle={coverPageTitle}
              preparedFor={preparedFor}
              projectReference={project.site_code || project.id}
              onTitleChange={setCoverPageTitle}
              onPreparedForChange={setPreparedFor}
            />
            <AppendicesCard selected={selectedAppendices} onToggle={toggleAppendix} />
          </div>

          <ExportFormatCard
            selectedFormat={exportFormat}
            isExporting={isExporting}
            onSelect={setExportFormat}
            onExport={handleExport}
            onPrint={handlePrint}
          />

          <AdditionalExportsCard
            isExporting={isExporting}
            hasSites={!!sites?.length}
            hasSurveys={!!surveys?.length}
            generatingSummary={generatingSummary}
            surveySummary={surveySummary}
            onShapefileExport={handleShapefileExport}
            onSurveyCsvExport={handleSurveyCsvExport}
            onGenerateSummary={handleGenerateSurveySummaries}
          />

          <SubmissionPanel
            isApproved={isApproved}
            isComplete={isComplete}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            canApproveReport={permissions.canApproveReport}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}
