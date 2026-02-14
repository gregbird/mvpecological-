'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Sparkles, Download, Pencil, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
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
import { generateFullReportDraft } from '@/lib/ai/report-generator'

type ReportStatus = 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
type ReportType = 'ecia' | 'nia' | 'aa_screening' | 'aa' | 'bat_report' | 'bird_report' | 'other'

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

// Mock project data
const mockProject = {
  id: '1',
  name: 'Ballymore Wind Farm EcIA',
  site_code: 'BWF-2024-001',
  grid_reference: 'N 23456 12345',
}

// Mock report data
const mockReports: Report[] = [
  {
    id: '1',
    reportType: 'ecia',
    version: 1,
    status: 'draft',
    sections: [
      {
        id: '1',
        title: 'Introduction',
        content: 'This Ecological Impact Assessment (EcIA) has been prepared...',
        isEdited: false,
        aiGenerated: true,
      },
      {
        id: '2',
        title: 'Methodology',
        content: 'The assessment methodology follows CIEEM guidelines...',
        isEdited: true,
        aiGenerated: true,
      },
    ],
    generatedBy: 'AI Draft',
    createdAt: '2024-04-15T10:30:00Z',
    updatedAt: '2024-04-15T14:45:00Z',
  },
]

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'ecia', label: 'Ecological Impact Assessment (EcIA)' },
  { value: 'nia', label: 'Natura Impact Assessment (NIA)' },
  { value: 'aa_screening', label: 'Appropriate Assessment Screening' },
  { value: 'aa', label: 'Appropriate Assessment (Stage 2)' },
  { value: 'bat_report', label: 'Bat Survey Report' },
  { value: 'bird_report', label: 'Bird Survey Report' },
  { value: 'other', label: 'Other Technical Report' },
]

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

export default function ReportsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { toast } = useToast()

  const [reports, setReports] = React.useState<Report[]>(mockReports)
  const [selectedReport, setSelectedReport] = React.useState<Report | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationProgress, setGenerationProgress] = React.useState(0)
  const [currentSection, setCurrentSection] = React.useState('')
  const [showNewReportDialog, setShowNewReportDialog] = React.useState(false)
  const [newReportType, setNewReportType] = React.useState<ReportType>('ecia')
  const [editingSection, setEditingSection] = React.useState<string | null>(null)
  const [editedContent, setEditedContent] = React.useState('')

  // Generate AI report draft
  const handleGenerateReport = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setCurrentSection('Starting...')

    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const sections = await generateFullReportDraft(
        {
          projectName: mockProject.name,
          siteCode: mockProject.site_code,
          gridReference: mockProject.grid_reference,
          habitats: [
            { code: 'GS2', name: 'Dry meadows and grassy verges', condition: 'Good', area: 15.2 },
            { code: 'WS1', name: 'Scrub', condition: 'Moderate', area: 3.5 },
            {
              code: 'GA1',
              name: 'Improved agricultural grassland',
              condition: 'Moderate',
              area: 45.0,
            },
          ],
          species: [
            {
              scientificName: 'Lutra lutra',
              commonName: 'European Otter',
              isProtected: true,
              recordCount: 2,
            },
            {
              scientificName: 'Falco tinnunculus',
              commonName: 'Kestrel',
              isProtected: false,
              recordCount: 5,
            },
          ],
          designatedSites: [
            { name: 'River Shannon Callows', code: 'SAC000216', type: 'SAC', distance: 2.5 },
            { name: 'Middle Shannon Callows', code: 'SPA004096', type: 'SPA', distance: 2.8 },
          ],
          surveys: [
            { type: 'Walkover', date: '2024-03-15', surveyor: "Dr. Sarah O'Brien" },
            { type: 'Habitat Mapping', date: '2024-04-02', surveyor: 'Michael Murphy' },
          ],
        },
        apiKey,
        (section, progress) => {
          setCurrentSection(section)
          setGenerationProgress(progress)
        }
      )

      const newReport: Report = {
        id: `${Date.now()}`,
        reportType: newReportType,
        version: 1,
        status: 'draft',
        sections: sections.map((s, i) => ({
          id: `${i + 1}`,
          title: s.title,
          content: s.content,
          isEdited: false,
          aiGenerated: true,
        })),
        generatedBy: 'AI (GPT-4)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setReports((prev) => [...prev, newReport])
      setSelectedReport(newReport)
      setShowNewReportDialog(false)

      toast({
        title: 'Report generated',
        description: 'AI draft has been created. Review and edit as needed.',
      })
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate report',
      })
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
      setCurrentSection('')
    }
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
                  Generate an AI draft to get started with your ecological report.
                </p>
                <Button onClick={() => setShowNewReportDialog(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Draft
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
                          {REPORT_TYPES.find((t) => t.value === report.reportType)?.label}
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
                      {REPORT_TYPES.find((t) => t.value === selectedReport.reportType)?.label}
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
                          {editingSection === section.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="min-h-75 font-mono text-sm"
                              />
                              <div className="flex justify-end gap-2">
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
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                {section.content.split('\n\n').map((paragraph, i) => (
                                  <p key={i}>{paragraph}</p>
                                ))}
                              </div>
                              <div className="flex justify-end">
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
                              </div>
                            </div>
                          )}
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
                  Choose a report from the list to view and edit, or create a new AI-generated
                  draft.
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
            <DialogTitle>Generate New Report</DialogTitle>
            <DialogDescription>
              Create an AI-powered draft report based on your project data.
            </DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="text-primary h-5 w-5 animate-spin" />
                <span className="text-sm">Generating {currentSection}...</span>
              </div>
              <Progress value={generationProgress} />
              <p className="text-muted-foreground text-xs">
                AI is analyzing project data and generating report sections. This may take a few
                moments.
              </p>
            </div>
          ) : (
            <>
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
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>AI-Powered Generation</AlertTitle>
                  <AlertDescription>
                    The report will be generated using GPT-4 based on your project&apos;s desk
                    research findings, habitat data, and species records. You can edit all sections
                    after generation.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateReport}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Draft
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
