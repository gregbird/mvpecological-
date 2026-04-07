'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  Info,
  FileText,
  Download,
  Send,
  CheckCircle2,
  Printer,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
import { getReportSectionsForType } from '@/lib/config/template-types'
import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface FinalSubmissionStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

// Export options
const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF Document', description: 'Best for printing and sharing' },
  { id: 'docx', name: 'Word Document', description: 'Editable format for further modifications' },
  { id: 'html', name: 'HTML Report', description: 'Web-viewable format' },
]

// Appendices options
const APPENDIX_OPTIONS = [
  { id: 'habitat_map', label: 'Habitat Map' },
  { id: 'habitat_data', label: 'Habitat Data' },
  { id: 'species_list', label: 'Species List' },
  { id: 'aquatic_data', label: 'Aquatic Features' },
  { id: 'photographs', label: 'Site Photographs' },
  { id: 'survey_datasheets', label: 'Survey Datasheets' },
  { id: 'desk_study_data', label: 'Desk Study Data' },
  { id: 'legislation', label: 'Legislation References' },
]

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
    'species_list',
    'photographs',
  ])
  const [coverPageTitle, setCoverPageTitle] = React.useState('')
  const [preparedFor, setPreparedFor] = React.useState('')
  const [isExporting, setIsExporting] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  // React Query hooks
  const { data: report, isLoading: loadingReport } = useLatestReportByType(project.id, reportType)
  // Stats and appendix sources are filtered by site for multi-site projects.
  // Reports themselves remain project-scoped — narrative sections always cover the full project.
  const { data: habitatStats } = useHabitatStats(project.id, selectedSiteId)
  const { data: observationStats } = useObservationStats(project.id, selectedSiteId)
  const { data: savedFindings } = useSavedFindings(project.id, selectedSiteId)
  const { data: surveys } = useSurveys(project.id, selectedSiteId)
  const { data: sites } = useProjectSites(project.id)
  const activeSiteCode = selectedSiteId
    ? (sites?.find((s) => s.id === selectedSiteId)?.site_code ?? undefined)
    : undefined
  const updateReport = useUpdateReport()
  const updateProject = useUpdateProject()
  const completeStep = useCompleteWorkflowStep()

  // Initialize form with project data
  React.useEffect(() => {
    if (project) {
      const typeName = REPORT_TYPES.find((r) => r.id === reportType)?.name || 'Ecological Report'
      setCoverPageTitle(`${typeName} - ${project.name}`)
      setPreparedFor(project.client_id || '')
    }
  }, [project, reportType])

  // Get report content
  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0

  // Toggle appendix selection
  const toggleAppendix = (appendixId: string) => {
    setSelectedAppendices((prev) =>
      prev.includes(appendixId) ? prev.filter((id) => id !== appendixId) : [...prev, appendixId]
    )
  }

  /**
   * Yield control to the browser so React can repaint (spinner, overlay, etc.)
   * before a CPU-heavy synchronous task runs.
   */
  const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 50))

  const abortRef = React.useRef(false)

  const handleCancelExport = () => {
    abortRef.current = true
    setIsExporting(false)
    toast({ title: 'Export cancelled' })
  }

  const buildExportOptions = () => ({
    title: coverPageTitle,
    preparedFor,
    siteCode: project.site_code || project.id,
    siteCodes: (sites || [])
      .map((s) => s.site_code)
      .filter((code): code is string => Boolean(code)),
    activeSiteId: selectedSiteId,
    activeSiteCode,
    version: report?.version || 1,
    date: new Date().toLocaleDateString('en-IE'),
    sections: reportContent?.sections || [],
    appendices: selectedAppendices,
    appendixData:
      savedFindings && savedFindings.length > 0 ? prepareAppendixData(savedFindings) : undefined,
  })

  // Handle print — generates PDF and opens in new tab for browser print dialog
  const handlePrint = async () => {
    abortRef.current = false
    setIsExporting(true)
    await yieldToBrowser()

    try {
      const { generatePeaPdf } = await import('@/lib/export/pdf-generator')
      const doc = await generatePeaPdf(buildExportOptions())
      if (abortRef.current) return
      const url = URL.createObjectURL(doc.output('blob'))
      const win = window.open(url, '_blank')
      if (win) win.focus()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (!abortRef.current) {
        toast({
          title: 'Print failed',
          description: 'Could not generate print preview.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsExporting(false)
    }
  }

  // Handle export
  const handleExport = async () => {
    abortRef.current = false
    setIsExporting(true)
    await yieldToBrowser()

    try {
      const exportOptions = buildExportOptions()
      const siteSuffix = activeSiteCode ? `_${activeSiteCode.replace(/\s+/g, '-')}` : ''
      const baseFilename = `${project.site_code || project.id}_${report?.report_type || 'report'}_v${report?.version || 1}${siteSuffix}`

      if (exportFormat === 'pdf') {
        const { generatePeaPdf } = await import('@/lib/export/pdf-generator')
        const doc = await generatePeaPdf(exportOptions)
        if (abortRef.current) return
        const blob = doc.output('blob')
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${baseFilename}.pdf`
        link.click()
        URL.revokeObjectURL(link.href)
      } else if (exportFormat === 'html') {
        const { generatePeaHtml } = await import('@/lib/export/pdf-generator')
        const html = generatePeaHtml(exportOptions)
        if (abortRef.current) return
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${baseFilename}.html`
        link.click()
        URL.revokeObjectURL(link.href)
      } else if (exportFormat === 'docx') {
        const { generatePeaDocx } = await import('@/lib/export/docx-generator')
        const blob = await generatePeaDocx(exportOptions)
        if (abortRef.current) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${baseFilename}.docx`
        link.click()
        URL.revokeObjectURL(link.href)
      }

      toast({
        title: 'Report exported',
        description: `Report has been exported as ${baseFilename}.${exportFormat}`,
      })
    } catch (error) {
      if (!abortRef.current) {
        toast({
          variant: 'destructive',
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Failed to export report.',
        })
      }
    } finally {
      setIsExporting(false)
    }
  }

  // E4.1 — Shapefile export with attributes
  const handleShapefileExport = async () => {
    setIsExporting(true)
    await yieldToBrowser()
    try {
      const { exportProjectShapefile } = await import('@/lib/gis/shapefile-export')
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Sites already have GeoJSON boundary via RPC.
      // Filter to active site if user narrowed export scope.
      const boundaries = (sites || [])
        .filter((s) => s.boundary && (!selectedSiteId || s.id === selectedSiteId))
        .map((s) => ({
          boundary: s.boundary as GeoJSON.Feature<GeoJSON.Polygon>,
          siteName: s.site_name || undefined,
          siteCode: s.site_code || undefined,
          attributes: (s.attributes as Record<string, unknown>) || undefined,
        }))

      // Habitat boundaries are PostGIS geometry — fetch as GeoJSON via SQL
      let habitatData: {
        geometry: GeoJSON.Polygon
        fossittCode?: string
        fossittName?: string
        areaHa?: number
        condition?: string
      }[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: habitatRows } = await (supabase.rpc as any)('get_habitat_polygons_geojson', {
        p_project_id: project.id,
      })

      if (habitatRows && Array.isArray(habitatRows)) {
        habitatData = (habitatRows as Record<string, unknown>[])
          .filter((r) => r.boundary_geojson)
          .map((r) => ({
            geometry: r.boundary_geojson as unknown as GeoJSON.Polygon,
            fossittCode: (r.fossitt_code as string) || undefined,
            fossittName: (r.fossitt_name as string) || undefined,
            areaHa: (r.area_hectares as number) || undefined,
            condition: (r.condition as string) || undefined,
          }))
      }

      const blob = await exportProjectShapefile({
        boundaries,
        habitats: habitatData,
        projectName: project.name,
      })

      const shapefileSiteSuffix = activeSiteCode ? `_${activeSiteCode.replace(/\s+/g, '-')}` : ''
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${project.site_code || project.id}${shapefileSiteSuffix}_shapefiles.zip`
      link.click()
      URL.revokeObjectURL(link.href)
      toast({ title: 'Shapefiles exported' })
    } catch (err) {
      console.error('Shapefile export error:', err)
      toast({
        variant: 'destructive',
        title: 'Shapefile export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  // E4.2 — Survey CSV export
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
    const rows = surveys.map((s) => [
      s.survey_date,
      s.survey_type,
      s.status,
      sites?.find((site) => site.id === s.site_id)?.site_name || '',
      s.start_time || '',
      s.end_time || '',
      (s.notes || '').replace(/"/g, '""'),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${project.site_code || project.id}_surveys.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast({ title: 'Survey CSV exported' })
  }

  // E4.3 — AI survey summary
  const [generatingSummary, setGeneratingSummary] = React.useState(false)
  const [surveySummary, setSurveySummary] = React.useState<string | null>(
    () => (reportContent as ReportContent & { surveyAiSummary?: string })?.surveyAiSummary ?? null
  )

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

  // Handle final submission
  const handleSubmit = async () => {
    if (!report) return

    setIsSubmitting(true)

    try {
      // Update report status to final
      await updateReport.mutateAsync({
        reportId: report.id,
        updates: {
          status: 'final',
        },
      })

      // Update project status to completed
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          status: 'completed',
        },
      })

      // Complete the workflow step
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Project completed!',
        description: 'The report has been finalized and the project is now complete.',
      })

      onComplete?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error submitting report',
        description: 'Failed to finalize the report.',
      })
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
      {/* Export overlay — prevents interaction + shows cancel */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 shadow-xl dark:bg-gray-900">
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

      {/* Header */}
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

      {/* Multi-site export note */}
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
          {/* Instructions */}
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
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Project Completed</AlertTitle>
              <AlertDescription className="text-green-700">
                This project has been completed and the final report has been submitted.
              </AlertDescription>
            </Alert>
          )}

          {/* Report Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Summary
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
                  <Badge className={report.status === 'final' ? 'bg-green-600' : ''}>
                    {report.status === 'final' ? 'Finalized' : report.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Sections</p>
                  <p className="font-medium">
                    {completedSections} / {getReportSectionsForType(reportType).length}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Habitats Mapped</p>
                  <p className="text-xl font-bold">{habitatStats?.total || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Species Observed</p>
                  <p className="text-xl font-bold">{observationStats?.total || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">Protected Species</p>
                  <p className="text-xl font-bold text-red-600">
                    {observationStats?.protected || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Configuration */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cover Page Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Cover Page Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Title</Label>
                  <Input
                    value={coverPageTitle}
                    onChange={(e) => setCoverPageTitle(e.target.value)}
                    placeholder="Enter report title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prepared For</Label>
                  <Input
                    value={preparedFor}
                    onChange={(e) => setPreparedFor(e.target.value)}
                    placeholder="Client name or organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Reference</Label>
                  <Input value={project.site_code || project.id} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Appendices Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Include Appendices</CardTitle>
                <CardDescription>
                  Select which appendices to include in the final report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {APPENDIX_OPTIONS.map((appendix) => (
                    <div key={appendix.id} className="flex items-center gap-3">
                      <Checkbox
                        id={appendix.id}
                        checked={selectedAppendices.includes(appendix.id)}
                        onCheckedChange={() => toggleAppendix(appendix.id)}
                      />
                      <Label htmlFor={appendix.id} className="cursor-pointer font-normal">
                        {appendix.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>Choose the format for your final report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {EXPORT_FORMATS.map((format) => (
                  <div
                    key={format.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      exportFormat === format.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setExportFormat(format.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          exportFormat === format.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}
                      />
                      <span className="font-medium">{format.name}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{format.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Report
                </Button>
                <Button variant="outline" onClick={handlePrint} disabled={isExporting}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Preview
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Exports */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Exports</CardTitle>
              <CardDescription>
                Export shapefiles, survey data, and generate AI survey summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-medium">Shapefiles</h4>
                  <p className="text-muted-foreground text-sm">
                    Site boundaries and habitats with attributes
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShapefileExport}
                    disabled={isExporting || !sites?.length}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export Shapefiles
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-medium">Survey Data (CSV)</h4>
                  <p className="text-muted-foreground text-sm">
                    All field surveys in spreadsheet format
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSurveyCsvExport}
                    disabled={!surveys?.length}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-medium">AI Survey Summary</h4>
                  <p className="text-muted-foreground text-sm">
                    AI-generated summary of all field surveys
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSurveySummaries}
                    disabled={generatingSummary || !surveys?.length}
                  >
                    {generatingSummary ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {generatingSummary ? 'Generating...' : 'Generate Summary'}
                  </Button>
                </div>
              </div>

              {surveySummary && (
                <div className="mt-4 rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
                  <h4 className="mb-2 font-medium">AI Survey Summary</h4>
                  <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap">
                    {surveySummary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Final Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Report approved</span>
                  {isApproved ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Export configured</span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Project completed</span>
                  {isComplete ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>

              <Progress value={isComplete ? 100 : isApproved ? 80 : 50} />

              {permissions.canApproveReport ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isComplete ? 'Project Completed' : 'Finalize & Submit Project'}
                </Button>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Admin Required</AlertTitle>
                  <AlertDescription>
                    Only administrators can finalize and submit projects.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
