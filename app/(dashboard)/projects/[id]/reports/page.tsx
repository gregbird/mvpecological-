'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Sparkles, Download, Pencil, FileText, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { REPORT_TYPES, type ReportTypeDefinition } from '@/lib/config/template-types'
import { useReportTemplates } from '@/hooks/queries/use-template-management-hooks'
import { resolveReportSections } from '@/lib/supabase/queries/templates'

const SectionEditor = dynamic(
  () =>
    import('@/components/steps/ai-draft/section-editor').then((mod) => ({
      default: mod.SectionEditor,
    })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-48 animate-pulse rounded-md" /> }
)

type ReportStatus = 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
type ReportType = ReportTypeDefinition['id']

interface ReportSection {
  id: string
  title: string
  content: string
  isEdited: boolean
  aiGenerated: boolean
}

interface Report {
  id: string
  reportType: ReportType
  version: number
  status: ReportStatus
  sections: ReportSection[]
  generatedBy?: string
  reviewedBy?: string
  createdAt: string
  updatedAt: string
}

// Standalone template-preview page; the full report flow lives in Step 6 (AI Draft).
// Uses the org's stored report_templates when available, falling back to defaults.
const mockProject = {
  id: '1',
  name: 'Sample Project',
  site_code: 'SMP-001',
  grid_reference: 'N 00000 00000',
}

const STATUS_STYLES: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'outline' },
  internal_review: { label: 'Internal Review', variant: 'secondary' },
  client_review: { label: 'Client Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  final: { label: 'Final', variant: 'default' },
}

function interpolateTemplate(
  text: string,
  vars: { project_name: string; site_location: string }
): string {
  return text
    .replaceAll('{{project_name}}', vars.project_name)
    .replaceAll('{{site_location}}', vars.site_location)
}

export default function ReportsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { toast } = useToast()
  const { user } = useRole()
  const orgId = user?.organization_id

  const { data: reportTemplates } = useReportTemplates(orgId ?? undefined)

  const [reports, setReports] = React.useState<Report[]>([])
  const [selectedReport, setSelectedReport] = React.useState<Report | null>(null)
  const [showNewReportDialog, setShowNewReportDialog] = React.useState(false)
  const [newReportType, setNewReportType] = React.useState<ReportType>('ecia')
  const [editingSection, setEditingSection] = React.useState<string | null>(null)
  const [editedContent, setEditedContent] = React.useState('')

  // Seed report sections from the org's template for this type, or defaults.
  const handleGenerateReport = () => {
    const template = reportTemplates?.find((t) => t.report_type === newReportType) ?? null
    const sectionDefs = resolveReportSections(newReportType, template)

    if (sectionDefs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No template sections available',
        description: 'Configure sections for this report type in Templates first.',
      })
      return
    }

    const vars = {
      project_name: mockProject.name,
      site_location: mockProject.site_code,
    }

    const newReport: Report = {
      id: `${Date.now()}`,
      reportType: newReportType,
      version: 1,
      status: 'draft',
      sections: sectionDefs.map((s, i) => ({
        id: `${i + 1}`,
        title: s.title,
        content: interpolateTemplate(s.defaultTemplate, vars),
        isEdited: false,
        aiGenerated: false,
      })),
      generatedBy: template?.use_custom ? 'Custom Template' : 'Dulra Standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setReports((prev) => [...prev, newReport])
    setSelectedReport(newReport)
    setShowNewReportDialog(false)

    toast({
      title: 'Draft seeded from template',
      description: `${sectionDefs.length} sections created. Edit as needed.`,
    })
  }

  // Save section edit
  const handleSaveSection = (reportId: string, sectionId: string) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? {
              ...report,
              sections: report.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, content: editedContent, isEdited: true }
                  : section
              ),
              updatedAt: new Date().toISOString(),
            }
          : report
      )
    )

    if (selectedReport?.id === reportId) {
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, content: editedContent, isEdited: true }
                  : section
              ),
            }
          : null
      )
    }

    setEditingSection(null)
    setEditedContent('')

    toast({
      title: 'Section saved',
      description: 'Your changes have been saved.',
    })
  }

  // Update report status
  const handleUpdateStatus = (reportId: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId ? { ...report, status, updatedAt: new Date().toISOString() } : report
      )
    )

    if (selectedReport?.id === reportId) {
      setSelectedReport((prev) => (prev ? { ...prev, status } : null))
    }

    toast({
      title: 'Status updated',
      description: `Report status changed to ${STATUS_STYLES[status].label}.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">{mockProject.name}</span>
              <Badge variant="outline">{mockProject.site_code}</Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowNewReportDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reports List */}
        <div className="space-y-4 lg:col-span-1">
          <h2 className="font-semibold">Report Versions</h2>
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 font-semibold">No reports yet</h3>
                <p className="text-muted-foreground mb-4 text-center text-sm">
                  Seed a draft from your report templates to get started.
                </p>
                <Button onClick={() => setShowNewReportDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-colors ${
                    selectedReport?.id === report.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {REPORT_TYPES.find((t) => t.id === report.reportType)?.name}
                        </CardTitle>
                        <CardDescription>Version {report.version}</CardDescription>
                      </div>
                      <Badge variant={STATUS_STYLES[report.status].variant}>
                        {STATUS_STYLES[report.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span>{report.sections.length} sections</span>
                      <span>
                        Updated{' '}
                        {new Date(report.updatedAt).toLocaleDateString('en-IE', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Report Editor */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {REPORT_TYPES.find((t) => t.id === selectedReport.reportType)?.name}
                    </CardTitle>
                    <CardDescription>
                      Version {selectedReport.version} • {selectedReport.sections.length} sections
                      {selectedReport.generatedBy &&
                        ` • Generated by ${selectedReport.generatedBy}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedReport.status}
                      onValueChange={(value) =>
                        handleUpdateStatus(selectedReport.id, value as ReportStatus)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="internal_review">Internal Review</SelectItem>
                        <SelectItem value="client_review">Client Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-150 pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {selectedReport.sections.map((section) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span>{section.title}</span>
                            {section.aiGenerated && !section.isEdited && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="mr-1 h-3 w-3" />
                                AI
                              </Badge>
                            )}
                            {section.isEdited && (
                              <Badge variant="outline" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            <SectionEditor
                              content={section.content}
                              editable={editingSection === section.id}
                              onContentChange={(md) => setEditedContent(md)}
                            />
                            <div className="flex justify-end gap-2">
                              {editingSection === section.id ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingSection(null)
                                      setEditedContent('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveSection(selectedReport.id, section.id)}
                                  >
                                    Save Changes
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSection(section.id)
                                    setEditedContent(section.content)
                                  }}
                                >
                                  <Pencil className="mr-2 h-3 w-3" />
                                  Edit Section
                                </Button>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24">
                <FileText className="text-muted-foreground mb-4 h-16 w-16" />
                <h3 className="mb-2 text-lg font-semibold">Select a Report</h3>
                <p className="text-muted-foreground max-w-sm text-center">
                  Choose a report from the list to view and edit, or seed a new draft from a
                  template.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Report Dialog */}
      <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Report from Template</DialogTitle>
            <DialogDescription>
              Seeds a report with your organisation&apos;s template sections for this type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select
                value={newReportType}
                onValueChange={(value) => setNewReportType(value as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Template-based draft</AlertTitle>
              <AlertDescription>
                Sections are seeded from the org template when customised, otherwise from Dulra
                defaults. For AI-generated content tied to project data, use the AI Draft step.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport}>
              <Sparkles className="mr-2 h-4 w-4" />
              Seed Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
