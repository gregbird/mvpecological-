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
import { useLatestReport, useUpdateReport } from '@/hooks/queries/use-report-hooks'
import { useUpdateProject } from '@/hooks/queries/use-project-hooks'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { PEA_REPORT_SECTIONS, type ReportContent } from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep } from '@/types/database'

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
  { id: 'species_list', label: 'Species List' },
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

  // React Query hooks
  const { data: report, isLoading: loadingReport } = useLatestReport(project.id)
  const { data: habitatStats } = useHabitatStats(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const updateReport = useUpdateReport()
  const updateProject = useUpdateProject()
  const completeStep = useCompleteWorkflowStep()

  // Initialize form with project data
  React.useEffect(() => {
    if (project) {
      setCoverPageTitle(`Preliminary Ecological Appraisal - ${project.name}`)
      setPreparedFor(project.client_id || '')
    }
  }, [project])

  // Get report content
  const reportContent = report?.content as unknown as ReportContent | undefined
  const completedSections = reportContent?.sections?.filter((s) => s.content).length || 0

  // Toggle appendix selection
  const toggleAppendix = (appendixId: string) => {
    setSelectedAppendices((prev) =>
      prev.includes(appendixId) ? prev.filter((id) => id !== appendixId) : [...prev, appendixId]
    )
  }

  // Handle export
  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In production, this would call a PDF generation service
    const filename = `${project.site_code || project.id}_${report?.report_type || 'report'}_v${report?.version || 1}.${exportFormat}`

    // Create mock download
    const content = `
PRELIMINARY ECOLOGICAL APPRAISAL
${coverPageTitle}

Prepared for: ${preparedFor || 'Client'}
Date: ${new Date().toLocaleDateString()}
Version: ${report?.version || 1}

${reportContent?.sections?.map((s) => `\n\n${s.title}\n${s.content}`).join('') || ''}

Appendices: ${selectedAppendices.map((a) => APPENDIX_OPTIONS.find((o) => o.id === a)?.label).join(', ')}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename.replace(`.${exportFormat}`, '.txt') // Mock as .txt for demo
    link.click()

    setIsExporting(false)

    toast({
      title: 'Report exported',
      description: `Report has been exported as ${filename}`,
    })
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

  if (!report) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Report Found</AlertTitle>
        <AlertDescription>
          Please complete the previous steps to generate and approve a report before final
          submission.
        </AlertDescription>
      </Alert>
    )
  }

  if (!isApproved && !isComplete) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Report Not Approved</AlertTitle>
        <AlertDescription>
          The report must be approved in the Quality Review step before it can be finalized and
          submitted.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 10: Final Submission</h2>
          <p className="text-muted-foreground">Export and finalize the project report</p>
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

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Final Submission</AlertTitle>
        <AlertDescription>
          Configure the export settings, select appendices to include, and finalize the project.
          Once submitted, the project will be marked as complete and the report will be finalized.
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
                {completedSections} / {PEA_REPORT_SECTIONS.length}
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
              <p className="text-xl font-bold text-red-600">{observationStats?.protected || 0}</p>
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
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print Preview
            </Button>
          </div>
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
    </div>
  )
}
