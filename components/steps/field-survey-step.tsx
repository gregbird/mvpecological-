'use client'

import * as React from 'react'
import { Plus, Loader2, Check, AlertCircle, Info, Calendar, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  useSurveys,
  useSurveyStats,
  useCreateSurvey,
  useUpdateSurvey,
  useDeleteSurvey,
  useCompleteWorkflowStep,
} from '@/hooks/use-project-data'
import { SurveyCard, type Survey as SurveyCardType } from '@/components/field-surveys/survey-card'
import { SurveyForm } from '@/components/field-surveys/survey-form'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface FieldSurveyStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

const SURVEY_TYPE_LABELS: Record<string, string> = {
  walkover: 'Walkover Survey',
  habitat_mapping: 'Habitat Mapping',
  bat_survey: 'Bat Survey',
  bird_survey: 'Bird Survey',
  mammal_survey: 'Mammal Survey',
  aquatic_survey: 'Aquatic Survey',
  botanical_survey: 'Botanical Survey',
  invertebrate_survey: 'Invertebrate Survey',
  other: 'Other Survey',
}

export function FieldSurveyStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: FieldSurveyStepProps) {
  const { toast } = useToast()
  const [showSurveyForm, setShowSurveyForm] = React.useState(false)
  const [editingSurvey, setEditingSurvey] = React.useState<SurveyCardType | null>(null)
  const [activeTab, setActiveTab] = React.useState('all')

  // React Query hooks
  const { data: surveys = [], isLoading } = useSurveys(project.id)
  const { data: surveyStats } = useSurveyStats(project.id)
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()
  const completeStep = useCompleteWorkflowStep()

  // Convert database surveys to card format
  const surveysAsCards = React.useMemo(() => {
    return surveys.map(
      (s): SurveyCardType => ({
        id: s.id,
        surveyType: s.survey_type as SurveyCardType['surveyType'],
        surveyDate: s.survey_date,
        startTime: s.start_time || undefined,
        endTime: s.end_time || undefined,
        status: s.status as SurveyCardType['status'],
        weather: s.weather as SurveyCardType['weather'],
        notes: s.notes || undefined,
        surveyor: {
          id: s.surveyor?.id || userId,
          name: s.surveyor?.full_name || 'Unknown',
          avatarUrl: undefined,
        },
      })
    )
  }, [surveys, userId])

  // Group surveys by status
  const surveysByStatus = React.useMemo(() => {
    const groups: Record<string, SurveyCardType[]> = {
      planned: [],
      in_progress: [],
      completed: [],
      approved: [],
    }
    for (const survey of surveysAsCards) {
      groups[survey.status]?.push(survey)
    }
    return groups
  }, [surveysAsCards])

  // Handle creating a new survey
  const handleCreateSurvey = async (data: Partial<SurveyCardType>) => {
    try {
      await createSurvey.mutateAsync({
        project_id: project.id,
        survey_type: data.surveyType!,
        survey_date: data.surveyDate!,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        surveyor_id: userId,
        status: 'planned',
        weather: (data.weather as unknown as Json) || null,
        notes: data.notes || null,
      })

      toast({
        title: 'Survey created',
        description: 'New survey has been scheduled.',
      })

      setShowSurveyForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating survey',
        description: 'Failed to create the survey.',
      })
    }
  }

  // Handle editing a survey
  const handleEditSurvey = async (data: Partial<SurveyCardType>) => {
    if (!editingSurvey) return

    try {
      await updateSurvey.mutateAsync({
        surveyId: editingSurvey.id,
        updates: {
          survey_type: data.surveyType,
          survey_date: data.surveyDate,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          weather: (data.weather as unknown as Json) || null,
          notes: data.notes || null,
        },
      })

      toast({
        title: 'Survey updated',
        description: 'Survey has been updated successfully.',
      })

      setEditingSurvey(null)
      setShowSurveyForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating survey',
        description: 'Failed to update the survey.',
      })
    }
  }

  // Handle deleting a survey
  const handleDeleteSurvey = async (survey: SurveyCardType) => {
    try {
      await deleteSurvey.mutateAsync(survey.id)

      toast({
        title: 'Survey deleted',
        description: 'Survey has been removed.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting survey',
        description: 'Failed to delete the survey.',
      })
    }
  }

  // Handle approving a survey
  const handleApproveSurvey = async (survey: SurveyCardType) => {
    try {
      await updateSurvey.mutateAsync({
        surveyId: survey.id,
        updates: { status: 'approved' },
      })

      toast({
        title: 'Survey approved',
        description: 'Survey has been approved.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error approving survey',
        description: 'Failed to approve the survey.',
      })
    }
  }

  // Handle viewing/editing a survey
  const handleViewSurvey = (survey: SurveyCardType) => {
    setEditingSurvey(survey)
    setShowSurveyForm(true)
  }

  // Complete workflow step
  const handleComplete = async () => {
    if (surveysAsCards.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'Please schedule at least one survey before completing this step.',
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
        description: 'Field Survey step has been completed. Moving to Habitat Mapping.',
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
  const hasPlannedSurveys = (surveyStats?.planned || 0) > 0
  const canComplete = surveysAsCards.length > 0 && !isComplete

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
          <h2 className="text-2xl font-bold">Step 4: Field Survey Planning</h2>
          <p className="text-muted-foreground">
            Schedule and manage field surveys for ecological assessment
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
        <AlertTitle>Survey Planning</AlertTitle>
        <AlertDescription>
          Based on the desk assessment findings, plan the required field surveys. Schedule surveys
          for different ecological aspects such as habitat mapping, bat surveys, bird surveys, etc.
          Each survey will capture species observations and habitat data.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveyStats?.total || surveysAsCards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {surveyStats?.planned || surveysByStatus.planned.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {surveyStats?.in_progress || surveysByStatus.in_progress.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {surveyStats?.completed || surveysByStatus.completed.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {surveyStats?.approved || surveysByStatus.approved.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingSurvey(null)
            setShowSurveyForm(true)
          }}
          disabled={isComplete}
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule Survey
        </Button>
      </div>

      {/* Survey List */}
      {surveysAsCards.length === 0 ? (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>No Surveys Scheduled</AlertTitle>
          <AlertDescription>
            Click "Schedule Survey" to plan your first field survey. Based on the desk assessment,
            you may need habitat mapping, species-specific surveys, or general walkover surveys.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Survey Schedule</CardTitle>
            <CardDescription>Manage and track all field surveys for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({surveysAsCards.length})</TabsTrigger>
                <TabsTrigger value="planned">
                  Planned ({surveysByStatus.planned.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({surveysByStatus.in_progress.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({surveysByStatus.completed.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({surveysByStatus.approved.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-4 pr-4 md:grid-cols-2">
                    {surveysAsCards.map((survey) => (
                      <SurveyCard
                        key={survey.id}
                        survey={survey}
                        onView={handleViewSurvey}
                        onEdit={handleViewSurvey}
                        onDelete={handleDeleteSurvey}
                        onApprove={handleApproveSurvey}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {Object.entries(surveysByStatus).map(([status, statusSurveys]) => (
                <TabsContent key={status} value={status} className="mt-4">
                  <ScrollArea className="h-[400px]">
                    {statusSurveys.length === 0 ? (
                      <div className="text-muted-foreground py-8 text-center text-sm">
                        No {status.replace('_', ' ')} surveys
                      </div>
                    ) : (
                      <div className="grid gap-4 pr-4 md:grid-cols-2">
                        {statusSurveys.map((survey) => (
                          <SurveyCard
                            key={survey.id}
                            survey={survey}
                            onView={handleViewSurvey}
                            onEdit={handleViewSurvey}
                            onDelete={handleDeleteSurvey}
                            onApprove={handleApproveSurvey}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Progress Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Surveys scheduled</span>
              {surveysAsCards.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{surveysAsCards.length} surveys</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Planned surveys</span>
              {hasPlannedSurveys ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">
                    {surveyStats?.planned || surveysByStatus.planned.length} planned
                  </span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </div>

          <Progress value={isComplete ? 100 : surveysAsCards.length > 0 ? 75 : 25} />

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

      {/* Survey Form Dialog */}
      <SurveyForm
        open={showSurveyForm}
        onOpenChange={(open) => {
          setShowSurveyForm(open)
          if (!open) setEditingSurvey(null)
        }}
        onSubmit={editingSurvey ? handleEditSurvey : handleCreateSurvey}
        initialData={
          editingSurvey
            ? {
                surveyType: editingSurvey.surveyType,
                surveyDate: editingSurvey.surveyDate,
                startTime: editingSurvey.startTime,
                endTime: editingSurvey.endTime,
                surveyor: editingSurvey.surveyor,
                weather: editingSurvey.weather,
                notes: editingSurvey.notes,
              }
            : undefined
        }
        projectId={project.id}
      />
    </div>
  )
}
