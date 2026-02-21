'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  Info,
  Map,
  Database,
  Sparkles,
  ClipboardList,
  TreePine,
  StickyNote,
  MapPinned,
  Camera,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useSurveyStats } from '@/hooks/queries/use-survey-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'

import { GisSummaryTab } from '@/components/steps/data-analysis/gis-summary-tab'
import { DataGatheringTab } from '@/components/steps/data-analysis/data-gathering-tab'
import { DeskAssessmentTab } from '@/components/steps/data-analysis/desk-assessment-tab'
import { FieldSurveyTab } from '@/components/steps/data-analysis/field-survey-tab'
import { HabitatTab } from '@/components/steps/data-analysis/habitat-tab'
import { TargetNotesTab } from '@/components/steps/data-analysis/target-notes-tab'
import { MapsTab } from '@/components/steps/data-analysis/maps-tab'
import { PhotographsTab } from '@/components/steps/data-analysis/photographs-tab'

import type { Project, WorkflowStep } from '@/types/database'

interface DataAnalysisStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId?: string
  onComplete?: () => void
}

const TABS = [
  { id: 'gis', label: 'GIS Mapping', icon: Map },
  { id: 'data-gathering', label: 'Data Gathering', icon: Database },
  { id: 'desk-assessment', label: 'Desk Assessment', icon: Sparkles },
  { id: 'field-survey', label: 'Field Survey', icon: ClipboardList },
  { id: 'habitats', label: 'Habitats', icon: TreePine },
  { id: 'target-notes', label: 'Target Notes', icon: StickyNote },
  { id: 'maps', label: 'Maps', icon: MapPinned },
  { id: 'photographs', label: 'Photographs', icon: Camera },
] as const

type TabId = (typeof TABS)[number]['id']

export function DataAnalysisStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: DataAnalysisStepProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState<TabId>('gis')

  // Stats hooks for summary cards
  const { data: habitatStats, isLoading: loadingHabitats } = useHabitatStats(project.id)
  const { data: observationStats, isLoading: loadingObservations } = useObservationStats(project.id)
  const { data: findingsStats, isLoading: loadingFindings } = useFindingsStats(project.id)
  const { data: surveyStats, isLoading: loadingSurveys } = useSurveyStats(project.id)
  const completeStep = useCompleteWorkflowStep()

  const isLoading = loadingHabitats || loadingObservations || loadingFindings || loadingSurveys

  const handleComplete = async () => {
    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Data Analysis step has been completed. Moving to AI Draft.',
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

  const isComplete = workflowStep.status === 'approved'
  const hasData = (habitatStats?.total || 0) > 0 || (observationStats?.total || 0) > 0
  const canComplete = !isComplete

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header */}
      <div className="shrink-0 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Step 7: Data Analysis</h2>
            <p className="text-muted-foreground">
              Review and analyze all project data across phases
            </p>
          </div>
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

      {/* Instructions */}
      <Alert className="shrink-0">
        <Info className="h-4 w-4" />
        <AlertTitle>Data Analysis</AlertTitle>
        <AlertDescription>
          Review the summary statistics and visualizations of your field data. Export data as CSV
          for further analysis if needed. This analysis will inform the AI-generated report draft.
        </AlertDescription>
      </Alert>

      {!hasData && (
        <Alert variant="destructive" className="shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Complete the previous steps (Habitat Mapping and Target Notes) to have data for
            analysis.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Surveys Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveyStats?.completed || 0}</div>
            <p className="text-muted-foreground text-xs">of {surveyStats?.total || 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Habitats Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{habitatStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              {(habitatStats?.totalArea || 0).toFixed(2)} ha total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Species Observed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{observationStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              {observationStats?.protected || 0} protected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Desk Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findingsStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              from {findingsStats?.bySource.length || 0} sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="shrink-0 border-b">
        <nav className="-mb-px flex space-x-1 overflow-x-auto px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'gis' && <GisSummaryTab project={project} />}
        {activeTab === 'data-gathering' && (
          <DataGatheringTab projectId={project.id} userId={userId || ''} project={project} />
        )}
        {activeTab === 'desk-assessment' && <DeskAssessmentTab projectId={project.id} />}
        {activeTab === 'field-survey' && <FieldSurveyTab projectId={project.id} />}
        {activeTab === 'habitats' && (
          <HabitatTab projectId={project.id} siteCode={project.site_code} project={project} />
        )}
        {activeTab === 'target-notes' && (
          <TargetNotesTab projectId={project.id} project={project} />
        )}
        {activeTab === 'maps' && (
          <MapsTab projectId={project.id} userId={userId || ''} project={project} />
        )}
        {activeTab === 'photographs' && <PhotographsTab projectId={project.id} />}
      </div>

      {/* Progress Panel */}
      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Data collected</span>
              {hasData ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Analysis reviewed</span>
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <Progress value={isComplete ? 100 : hasData ? 75 : 25} />

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
