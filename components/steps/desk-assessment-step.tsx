'use client'

import * as React from 'react'
import { FileText, Loader2, Check, AlertCircle, Info, Star, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  useSavedFindings,
  useUpdateFinding,
  useCompleteWorkflowStep,
  useFindingsStats,
} from '@/hooks/use-project-data'
import type { Project, WorkflowStep, DeskResearchFinding } from '@/types/database'

interface DeskAssessmentStepProps {
  project: Project
  workflowStep: WorkflowStep
  onComplete?: () => void
}

type Relevance = 'high' | 'medium' | 'low' | 'none'

const RELEVANCE_COLORS: Record<Relevance, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  none: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
}

const SOURCE_LABELS: Record<string, string> = {
  npws: 'NPWS Designated Sites',
  gbif: 'GBIF Species Records',
  nbdc: 'NBDC Records',
  epa: 'EPA Data',
  catchments: 'Catchments.ie',
  manual: 'Manual Entries',
}

const TYPE_LABELS: Record<string, string> = {
  designated_site: 'Designated Sites',
  species_record: 'Species Records',
  water_quality: 'Water Quality',
  catchment: 'Catchments',
  other: 'Other',
}

interface FindingWithRelevance extends DeskResearchFinding {
  relevance?: Relevance
}

export function DeskAssessmentStep({ project, workflowStep, onComplete }: DeskAssessmentStepProps) {
  const { toast } = useToast()
  const [selectedFinding, setSelectedFinding] = React.useState<FindingWithRelevance | null>(null)
  const [notes, setNotes] = React.useState('')
  const [relevance, setRelevance] = React.useState<Relevance>('medium')
  const [activeTab, setActiveTab] = React.useState('all')
  const [assessmentSummary, setAssessmentSummary] = React.useState('')

  // React Query hooks
  const { data: savedFindings = [], isLoading } = useSavedFindings(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const updateFinding = useUpdateFinding()
  const completeStep = useCompleteWorkflowStep()

  // Parse relevance from notes (stored as JSON in notes field)
  const findingsWithRelevance = React.useMemo(() => {
    return savedFindings.map((f): FindingWithRelevance => {
      let relevance: Relevance = 'medium'
      let parsedNotes = f.notes || ''

      // Try to parse structured notes
      if (f.notes?.startsWith('{')) {
        try {
          const parsed = JSON.parse(f.notes)
          relevance = parsed.relevance || 'medium'
          parsedNotes = parsed.notes || ''
        } catch {
          // Keep original notes if parsing fails
        }
      }

      return {
        ...f,
        relevance,
        notes: parsedNotes,
      }
    })
  }, [savedFindings])

  // Group findings by type
  const findingsByType = React.useMemo(() => {
    const groups: Record<string, FindingWithRelevance[]> = {}
    for (const finding of findingsWithRelevance) {
      const type = finding.data_type
      if (!groups[type]) groups[type] = []
      groups[type].push(finding)
    }
    return groups
  }, [findingsWithRelevance])

  // Group findings by source
  const findingsBySource = React.useMemo(() => {
    const groups: Record<string, FindingWithRelevance[]> = {}
    for (const finding of findingsWithRelevance) {
      const source = finding.source
      if (!groups[source]) groups[source] = []
      groups[source].push(finding)
    }
    return groups
  }, [findingsWithRelevance])

  // Count assessed findings
  const assessedCount = findingsWithRelevance.filter(
    (f) => f.notes || (f.relevance && f.relevance !== 'medium')
  ).length

  // Open assessment dialog
  const handleAssessFinding = (finding: FindingWithRelevance) => {
    setSelectedFinding(finding)
    setNotes(finding.notes || '')
    setRelevance(finding.relevance || 'medium')
  }

  // Save assessment
  const handleSaveAssessment = async () => {
    if (!selectedFinding) return

    try {
      // Store relevance and notes as JSON in notes field
      const structuredNotes = JSON.stringify({
        relevance,
        notes,
        assessedAt: new Date().toISOString(),
      })

      await updateFinding.mutateAsync({
        findingId: selectedFinding.id,
        updates: { notes: structuredNotes },
      })

      toast({
        title: 'Assessment saved',
        description: 'Finding assessment has been updated.',
      })

      setSelectedFinding(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving assessment',
        description: 'Failed to save the assessment.',
      })
    }
  }

  // Complete workflow step
  const handleComplete = async () => {
    if (savedFindings.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'No findings to assess. Please complete Data Gathering first.',
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
        description: 'Desk Assessment step has been completed. Moving to Field Survey.',
      })

      onComplete?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const canComplete = savedFindings.length > 0 && !isComplete

  if (isLoading) {
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
          <h2 className="text-2xl font-bold">Step 3: Desk Assessment</h2>
          <p className="text-muted-foreground">
            Review and assess the relevance of gathered data for your project
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
        <AlertTitle>Assessment Guide</AlertTitle>
        <AlertDescription>
          Review each finding and assign a relevance level (High, Medium, Low, or None). Add notes
          to explain why certain findings are particularly relevant or not applicable to the
          project. This assessment will inform the field survey planning and final reporting.
        </AlertDescription>
      </Alert>

      {savedFindings.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Findings Available</AlertTitle>
          <AlertDescription>
            Please complete Step 2 (Data Gathering) and save some findings before proceeding with
            the assessment.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{savedFindings.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assessed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assessedCount}</div>
                <p className="text-muted-foreground text-xs">
                  {Math.round((assessedCount / savedFindings.length) * 100)}% complete
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Relevance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {findingsWithRelevance.filter((f) => f.relevance === 'high').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(findingsBySource).length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Findings List */}
          <Card>
            <CardHeader>
              <CardTitle>Findings Assessment</CardTitle>
              <CardDescription>
                Click on a finding to add notes and set its relevance level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All ({savedFindings.length})</TabsTrigger>
                  {Object.entries(findingsByType).map(([type, findings]) => (
                    <TabsTrigger key={type} value={type}>
                      {TYPE_LABELS[type] || type} ({findings.length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <ScrollArea className="h-125">
                    <div className="space-y-2 pr-4">
                      {findingsWithRelevance.map((finding) => (
                        <FindingAssessmentCard
                          key={finding.id}
                          finding={finding}
                          onAssess={handleAssessFinding}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {Object.entries(findingsByType).map(([type, findings]) => (
                  <TabsContent key={type} value={type} className="mt-4">
                    <ScrollArea className="h-125">
                      <div className="space-y-2 pr-4">
                        {findings.map((finding) => (
                          <FindingAssessmentCard
                            key={finding.id}
                            finding={finding}
                            onAssess={handleAssessFinding}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Assessment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Summary</CardTitle>
              <CardDescription>
                Provide an overall summary of the desk research findings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your overall assessment of the desk research findings..."
                value={assessmentSummary}
                onChange={(e) => setAssessmentSummary(e.target.value)}
                rows={4}
              />
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
                  <span>Findings available</span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Findings assessed</span>
                  {assessedCount > 0 ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        {assessedCount}/{savedFindings.length}
                      </span>
                    </span>
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>

              <Progress
                value={
                  isComplete ? 100 : Math.round((assessedCount / savedFindings.length) * 100) || 25
                }
              />

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

      {/* Assessment Dialog */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assess Finding</DialogTitle>
            <DialogDescription>{selectedFinding?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Relevance Level</Label>
              <Select value={relevance} onValueChange={(v) => setRelevance(v as Relevance)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-red-500" />
                      High - Critical for project
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Medium - Relevant to consider
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-green-500" />
                      Low - Minor relevance
                    </span>
                  </SelectItem>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-400" />
                      None - Not applicable
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assessment Notes</Label>
              <Textarea
                placeholder="Add notes about this finding's relevance to the project..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFinding(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssessment} disabled={updateFinding.isPending}>
              {updateFinding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Finding card for assessment
function FindingAssessmentCard({
  finding,
  onAssess,
}: {
  finding: FindingWithRelevance
  onAssess: (finding: FindingWithRelevance) => void
}) {
  const hasAssessment = finding.notes || (finding.relevance && finding.relevance !== 'medium')

  return (
    <div
      className="hover:bg-muted/50 flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors"
      onClick={() => onAssess(finding)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {finding.source.toUpperCase()}
          </Badge>
          {finding.relevance && (
            <Badge className={RELEVANCE_COLORS[finding.relevance]} variant="secondary">
              {finding.relevance.charAt(0).toUpperCase() + finding.relevance.slice(1)}
            </Badge>
          )}
        </div>
        <h4 className="mt-1 font-medium">{finding.title}</h4>
        {finding.content && (
          <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{finding.content}</p>
        )}
        {finding.notes && (
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
            <MessageSquare className="h-3 w-3" />
            Has notes
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm">
        {hasAssessment ? 'Edit' : 'Assess'}
      </Button>
    </div>
  )
}
