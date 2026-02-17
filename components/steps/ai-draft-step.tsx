'use client'

import * as React from 'react'
import { Loader2, Check, Info, Sparkles, Edit, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { useLatestReport, useCreateReport, useUpdateReport } from '@/hooks/queries/use-report-hooks'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import {
  REPORT_TYPES,
  PEA_REPORT_SECTIONS,
  type ReportContent,
  type ReportSection,
} from '@/lib/supabase/queries/reports'
import type { Project, WorkflowStep, Json } from '@/types/database'

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

  // React Query hooks
  const { data: existingReport, isLoading: loadingReport } = useLatestReport(project.id)
  const { data: habitatStats } = useHabitatStats(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()
  const completeStep = useCompleteWorkflowStep()

  // Initialize sections from existing report or template
  React.useEffect(() => {
    if (existingReport?.content) {
      const content = existingReport.content as unknown as ReportContent
      if (content.sections) {
        setSections(content.sections)
      }
    } else {
      // Initialize with empty sections from template
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

  // Generate AI content for a report section via server-side API
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

  // Generate all sections
  const generateAllSections = async () => {
    for (const section of PEA_REPORT_SECTIONS) {
      if (!sections.find((s) => s.id === section.id)?.content) {
        await generateSectionContent(section.id)
      }
    }
  }

  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content, isEdited: true } : s))
    )
  }

  // Save report
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
        await updateReport.mutateAsync({
          reportId: existingReport.id,
          updates: {
            content: reportContent as unknown as Json,
            status: 'draft',
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
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Error saving report',
        description: 'Failed to save the report.',
      })
    }
  }

  // Complete workflow step
  const handleComplete = async () => {
    // Save report first
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
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

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
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType} disabled={!!existingReport}>
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

            <div className="space-y-2">
              <Label>Ecologist's Opinion</Label>
              <Textarea
                placeholder="Enter your professional assessment and key points to include in the report..."
                value={ecologistOpinion}
                onChange={(e) => setEcologistOpinion(e.target.value)}
                rows={4}
              />
              <p className="text-muted-foreground text-xs">
                Your professional opinion will be incorporated into the Evaluation and Discussion
                sections.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Habitats Mapped</span>
                <Badge variant="outline">{habitatStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Species Observed</span>
                <Badge variant="outline">{observationStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Protected Species</span>
                <Badge variant={observationStats?.protected ? 'destructive' : 'outline'}>
                  {observationStats?.protected || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Desk Findings</span>
                <Badge variant="outline">{findingsStats?.total || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate All Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSaveReport} disabled={!hasContent}>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button onClick={generateAllSections} disabled={!!generatingSection}>
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
            {PEA_REPORT_SECTIONS.map((templateSection, index) => {
              const section = sections.find((s) => s.id === templateSection.id)
              const isGenerating = generatingSection === templateSection.id
              const isEditing = editingSection === templateSection.id

              return (
                <AccordionItem key={templateSection.id} value={templateSection.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm">{index + 1}.</span>
                      <span>{templateSection.title}</span>
                      {section?.content && (
                        <Badge
                          variant={section.isEdited ? 'secondary' : 'outline'}
                          className="ml-2"
                        >
                          {section.isEdited ? 'Edited' : 'AI Generated'}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateSectionContent(templateSection.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          {section?.content ? 'Regenerate' : 'Generate'}
                        </Button>
                        {section?.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(isEditing ? null : templateSection.id)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {isEditing ? 'Done Editing' : 'Edit'}
                          </Button>
                        )}
                      </div>

                      {/* Content */}
                      {isGenerating ? (
                        <div className="bg-muted/50 flex h-32 items-center justify-center rounded-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-muted-foreground text-sm">
                              Generating content...
                            </span>
                          </div>
                        </div>
                      ) : section?.content ? (
                        isEditing ? (
                          <Textarea
                            value={section.content}
                            onChange={(e) =>
                              updateSectionContent(templateSection.id, e.target.value)
                            }
                            rows={12}
                            className="font-mono text-sm"
                          />
                        ) : (
                          <ScrollArea className="bg-muted/30 h-64 rounded-lg p-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                              {section.content}
                            </div>
                          </ScrollArea>
                        )
                      ) : (
                        <div className="bg-muted/30 text-muted-foreground rounded-lg p-4 text-center text-sm">
                          Click "Generate" to create AI-assisted content for this section.
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
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
    </div>
  )
}
