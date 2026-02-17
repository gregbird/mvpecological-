'use client'

import * as React from 'react'
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Info,
  Calendar,
  Bug,
  Waves,
  Shield,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import {
  useSurveys,
  useSurveyStats,
  useCreateSurvey,
  useUpdateSurvey,
  useDeleteSurvey,
} from '@/hooks/queries/use-survey-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { SurveyCard, type Survey as SurveyCardType } from '@/components/field-surveys/survey-card'
import { SurveyForm } from '@/components/field-surveys/survey-form'
import { SurveyViewDialog } from '@/components/field-surveys/survey-view-dialog'
import { SurveyTargetsBox } from '@/components/field-surveys/survey-targets-box'
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
  releve_survey: 'Relevé Survey',
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
  const [viewingSurvey, setViewingSurvey] = React.useState<SurveyCardType | null>(null)
  const [activeTab, setActiveTab] = React.useState('all')
  const [showFindings, setShowFindings] = React.useState(true)
  const [highlightedSurveyId, setHighlightedSurveyId] = React.useState<string | null>(null)
  const surveyListRef = React.useRef<HTMLDivElement>(null)

  // React Query hooks
  const { data: surveys = [], isLoading } = useSurveys(project.id)
  const { data: surveyStats } = useSurveyStats(project.id)
  const { data: savedFindings = [], isLoading: findingsLoading } = useSavedFindings(project.id)
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()
  const completeStep = useCompleteWorkflowStep()

  // Helper to extract data from raw_data JSON
  const getRawData = React.useCallback((finding: (typeof savedFindings)[0]) => {
    const raw = finding.raw_data as Record<string, unknown> | null
    return {
      scientificName: (raw?.scientificName || raw?.scientific_name) as string | undefined,
      commonName: (raw?.commonName || raw?.common_name || raw?.vernacularName) as
        | string
        | undefined,
      taxonGroup: (raw?.taxonGroup || raw?.taxon_group || raw?.class) as string | undefined,
      siteName: (raw?.SITE_NAME || raw?.siteName || raw?.site_name) as string | undefined,
      siteCode: (raw?.SITECODE || raw?.siteCode || raw?.site_code) as string | undefined,
    }
  }, [])

  // Process findings to extract survey recommendations
  const surveyRecommendations = React.useMemo(() => {
    const designatedSites = savedFindings.filter((f) => f.data_type === 'designated_site')
    const speciesRecords = savedFindings.filter((f) => f.data_type === 'species_record')
    const aquaticFeatures = savedFindings.filter(
      (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
    )

    // Extract protected species that need surveys
    const protectedSpecies = speciesRecords.filter((f) => f.is_protected)

    // Determine recommended survey types based on findings
    const recommendedSurveys: {
      type: string
      reason: string
      priority: 'high' | 'medium' | 'low'
    }[] = []

    // Always recommend walkover
    recommendedSurveys.push({
      type: 'walkover',
      reason: 'Initial site assessment required',
      priority: 'high',
    })

    // Habitat mapping if designated sites nearby
    if (designatedSites.length > 0) {
      recommendedSurveys.push({
        type: 'habitat_mapping',
        reason: `${designatedSites.length} designated sites within buffer zone`,
        priority: 'high',
      })
    }

    // Check for bat-related species
    const hasBats = protectedSpecies.some((s) => {
      const raw = getRawData(s)
      return (
        raw.scientificName?.toLowerCase().includes('pipistrellus') ||
        raw.scientificName?.toLowerCase().includes('myotis') ||
        raw.scientificName?.toLowerCase().includes('plecotus') ||
        raw.commonName?.toLowerCase().includes('bat')
      )
    })
    if (hasBats) {
      recommendedSurveys.push({
        type: 'bat_survey',
        reason: 'Protected bat species recorded in area',
        priority: 'high',
      })
    }

    // Check for bird species
    const hasBirds = protectedSpecies.some((s) => {
      const raw = getRawData(s)
      return raw.taxonGroup?.toLowerCase() === 'birds' || raw.taxonGroup?.toLowerCase() === 'aves'
    })
    if (hasBirds) {
      recommendedSurveys.push({
        type: 'bird_survey',
        reason: 'Protected bird species recorded in area',
        priority: 'medium',
      })
    }

    // Check for mammals (badger, otter, etc.)
    const hasMammals = protectedSpecies.some((s) => {
      const raw = getRawData(s)
      return (
        raw.scientificName?.toLowerCase().includes('meles') ||
        raw.scientificName?.toLowerCase().includes('lutra') ||
        raw.commonName?.toLowerCase().includes('badger') ||
        raw.commonName?.toLowerCase().includes('otter')
      )
    })
    if (hasMammals) {
      recommendedSurveys.push({
        type: 'mammal_survey',
        reason: 'Protected mammal species (badger/otter) in area',
        priority: 'high',
      })
    }

    // Aquatic survey if water features
    if (aquaticFeatures.length > 0) {
      recommendedSurveys.push({
        type: 'aquatic_survey',
        reason: `${aquaticFeatures.length} water features identified`,
        priority: 'medium',
      })
    }

    return {
      designatedSites,
      protectedSpecies,
      aquaticFeatures,
      recommendedSurveys,
    }
  }, [savedFindings])

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
        expectedSurveyCount: (s.weather as Record<string, unknown> | null)?.expectedSurveyCount as number | undefined,
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
      const newSurvey = await createSurvey.mutateAsync({
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
      setActiveTab('all')

      // Highlight and scroll to newly created survey
      if (newSurvey?.id) {
        setHighlightedSurveyId(newSurvey.id)
        setTimeout(() => {
          surveyListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedSurveyId(null), 3000)
      }
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error approving survey',
        description: 'Failed to approve the survey.',
      })
    }
  }

  // Handle viewing a survey (read-only)
  const handleViewSurvey = (survey: SurveyCardType) => {
    setViewingSurvey(survey)
  }

  // Handle opening edit form
  const handleOpenEditForm = (survey: SurveyCardType) => {
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
    } catch {
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

      {/* Desk Research Findings Summary */}
      <Collapsible open={showFindings} onOpenChange={setShowFindings}>
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Survey Targets from Desk Research</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {savedFindings.length > 0 && (
                    <Badge variant="secondary">{savedFindings.length} findings</Badge>
                  )}
                  {showFindings ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <CardDescription>
                Based on desk research, the following ecological features require field verification
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {findingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : savedFindings.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No saved findings from desk research. Complete the Data Gathering step first to
                    get survey recommendations.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Designated Sites */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span>Designated Sites</span>
                      <Badge variant="outline" className="ml-auto">
                        {surveyRecommendations.designatedSites.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-32 rounded border p-2">
                      {surveyRecommendations.designatedSites.length === 0 ? (
                        <p className="text-muted-foreground text-xs">No sites found</p>
                      ) : (
                        <ul className="space-y-1">
                          {surveyRecommendations.designatedSites.slice(0, 5).map((site) => {
                            const raw = getRawData(site)
                            return (
                              <li key={site.id} className="text-xs">
                                <span className="font-medium">{raw.siteName || site.title}</span>
                                {raw.siteCode && (
                                  <span className="text-muted-foreground ml-1">
                                    ({raw.siteCode})
                                  </span>
                                )}
                              </li>
                            )
                          })}
                          {surveyRecommendations.designatedSites.length > 5 && (
                            <li className="text-muted-foreground text-xs">
                              +{surveyRecommendations.designatedSites.length - 5} more
                            </li>
                          )}
                        </ul>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Protected Species */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Bug className="h-4 w-4 text-amber-600" />
                      <span>Protected Species</span>
                      <Badge variant="outline" className="ml-auto">
                        {surveyRecommendations.protectedSpecies.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-32 rounded border p-2">
                      {surveyRecommendations.protectedSpecies.length === 0 ? (
                        <p className="text-muted-foreground text-xs">No protected species</p>
                      ) : (
                        <ul className="space-y-1">
                          {surveyRecommendations.protectedSpecies.slice(0, 5).map((species) => {
                            const raw = getRawData(species)
                            return (
                              <li key={species.id} className="text-xs">
                                <span className="font-medium italic">
                                  {raw.scientificName || raw.commonName || species.title}
                                </span>
                                {raw.taxonGroup && (
                                  <Badge variant="secondary" className="ml-1 text-[10px]">
                                    {raw.taxonGroup}
                                  </Badge>
                                )}
                              </li>
                            )
                          })}
                          {surveyRecommendations.protectedSpecies.length > 5 && (
                            <li className="text-muted-foreground text-xs">
                              +{surveyRecommendations.protectedSpecies.length - 5} more
                            </li>
                          )}
                        </ul>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Aquatic Features */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Waves className="h-4 w-4 text-blue-600" />
                      <span>Aquatic Features</span>
                      <Badge variant="outline" className="ml-auto">
                        {surveyRecommendations.aquaticFeatures.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-32 rounded border p-2">
                      {surveyRecommendations.aquaticFeatures.length === 0 ? (
                        <p className="text-muted-foreground text-xs">No water features</p>
                      ) : (
                        <ul className="space-y-1">
                          {surveyRecommendations.aquaticFeatures.slice(0, 5).map((feature) => {
                            const raw = getRawData(feature)
                            return (
                              <li key={feature.id} className="text-xs">
                                <span className="font-medium">
                                  {feature.title || raw.siteName || 'Aquatic Feature'}
                                </span>
                              </li>
                            )
                          })}
                          {surveyRecommendations.aquaticFeatures.length > 5 && (
                            <li className="text-muted-foreground text-xs">
                              +{surveyRecommendations.aquaticFeatures.length - 5} more
                            </li>
                          )}
                        </ul>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Recommended Surveys */}
              {surveyRecommendations.recommendedSurveys.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">Recommended Surveys</h4>
                  <div className="flex flex-wrap gap-2">
                    {surveyRecommendations.recommendedSurveys.map((rec) => (
                      <Badge
                        key={rec.type}
                        variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingSurvey(null)
                          setShowSurveyForm(true)
                        }}
                      >
                        {rec.priority === 'high' && '⚠️ '}
                        {SURVEY_TYPE_LABELS[rec.type] || rec.type}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Click on a badge to create a survey of that type
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Survey Targets (Habitats) */}
      <SurveyTargetsBox findings={savedFindings} isLoading={findingsLoading} />

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Survey Planning</AlertTitle>
        <AlertDescription>
          Based on the desk assessment findings above, plan the required field surveys. Schedule
          surveys for different ecological aspects such as habitat mapping, bat surveys, bird
          surveys, etc. Each survey will capture species observations and habitat data.
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
        <Card ref={surveyListRef}>
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
                <ScrollArea className="h-100">
                  <div className="grid gap-4 pr-4 md:grid-cols-2">
                    {surveysAsCards.map((survey) => (
                      <SurveyCard
                        key={survey.id}
                        survey={survey}
                        onView={handleViewSurvey}
                        onEdit={handleOpenEditForm}
                        onDelete={handleDeleteSurvey}
                        onApprove={handleApproveSurvey}
                        isHighlighted={survey.id === highlightedSurveyId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {Object.entries(surveysByStatus).map(([status, statusSurveys]) => (
                <TabsContent key={status} value={status} className="mt-4">
                  <ScrollArea className="h-100">
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
                            onEdit={handleOpenEditForm}
                            onDelete={handleDeleteSurvey}
                            onApprove={handleApproveSurvey}
                            isHighlighted={survey.id === highlightedSurveyId}
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

      {/* Survey View Dialog */}
      {viewingSurvey && (
        <SurveyViewDialog
          open={!!viewingSurvey}
          onOpenChange={(open) => {
            if (!open) setViewingSurvey(null)
          }}
          survey={viewingSurvey}
        />
      )}
    </div>
  )
}
