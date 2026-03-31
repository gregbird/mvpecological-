'use client'

import * as React from 'react'
import { Plus, Loader2, Calendar, ChevronDown, ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { getDefaultFieldsForType } from '@/lib/config/survey-field-definitions'
import {
  useSurveys,
  useCreateSurvey,
  useUpdateSurvey,
  useDeleteSurvey,
} from '@/hooks/queries/use-survey-hooks'
import { assignSurveyStaff } from '@/lib/supabase/queries/survey-assignments'
import {
  SurveyCard,
  type Survey as SurveyCardType,
  type SurveyType,
} from '@/components/field-surveys/survey-card'
import { SurveyForm } from '@/components/field-surveys/survey-form'
import { SurveyViewDialog } from '@/components/field-surveys/survey-view-dialog'
import { SurveyAssignmentDialog } from '@/components/field-surveys/survey-assignment-dialog'
import { SurveyConfirmDialog } from '@/components/field-surveys/survey-confirm-dialog'
import { PhotoGallery } from '@/components/field-surveys/photo-gallery'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'
import { groupSurveysByVisit, getNextVisitNumber } from '@/lib/utils/survey-groups'
import type { SurveyWithSurveyor } from '@/lib/supabase/queries/surveys'
import { useRole } from '@/contexts/role-context'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import type { Project, WorkflowStep, Json } from '@/types/database'

interface FieldSurveyStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
}

export function FieldSurveyStep({
  project,
  workflowStep: _workflowStep,
  userId,
}: FieldSurveyStepProps) {
  const { toast } = useToast()
  const { user: roleUser } = useRole()
  const [showSurveyForm, setShowSurveyForm] = React.useState(false)
  const [editingSurvey, setEditingSurvey] = React.useState<SurveyCardType | null>(null)
  const [viewingSurvey, setViewingSurvey] = React.useState<SurveyCardType | null>(null)
  const [assigningSurvey, setAssigningSurvey] = React.useState<SurveyCardType | null>(null)
  const [activeTab, setActiveTab] = React.useState('all')
  const [topTab, setTopTab] = React.useState<'surveys' | 'photos'>('surveys')
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)
  const [highlightedSurveyId, setHighlightedSurveyId] = React.useState<string | null>(null)
  const [releveEditOnOpen, setReleveEditOnOpen] = React.useState(false)
  const [addVisitMode, setAddVisitMode] = React.useState<{
    visitGroupId: string
    surveyType: SurveyType
    visitNumber: number
  } | null>(null)
  const [confirmAction, setConfirmAction] = React.useState<{
    survey: SurveyCardType
    action: 'complete'
  } | null>(null)
  const surveyListRef = React.useRef<HTMLDivElement>(null)

  // React Query hooks
  const { data: surveys = [], isLoading } = useSurveys(project.id)
  const { data: projectSites = [] } = useProjectSites(project.id)
  const isMultiSite = projectSites.length > 1
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()

  // Compute visit group counts for badge display
  const visitGroupCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of surveys) {
      if (s.visit_group_id) {
        counts.set(s.visit_group_id, (counts.get(s.visit_group_id) || 0) + 1)
      }
    }
    return counts
  }, [surveys])

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
        form_data: s.form_data as SurveyCardType['form_data'],
        expectedSurveyCount: (s.weather as Record<string, unknown> | null)?.expectedSurveyCount as
          | number
          | undefined,
        notes: s.notes || undefined,
        surveyor: {
          id: s.surveyor?.id || userId,
          name: s.surveyor?.full_name || 'Unknown',
          avatarUrl: undefined,
        },
        siteId: s.site_id,
        visitGroupId: s.visit_group_id,
        visitNumber: s.visit_number,
        totalVisitsInGroup: s.visit_group_id ? visitGroupCounts.get(s.visit_group_id) : undefined,
      })
    )
  }, [surveys, userId, visitGroupCounts])

  // Filter surveys by selected site (null = all sites)
  const filteredSurveys = React.useMemo(() => {
    if (!selectedSiteId) return surveysAsCards
    return surveysAsCards.filter((s) => s.siteId === selectedSiteId)
  }, [surveysAsCards, selectedSiteId])

  // Group surveys by visit_group_id (filtered by selected site)
  const { groups: surveyGroups, standalone: standaloneSurveys } = React.useMemo(() => {
    const siteFiltered = selectedSiteId
      ? surveys.filter((s) => s.site_id === selectedSiteId)
      : surveys
    return groupSurveysByVisit(siteFiltered as SurveyWithSurveyor[])
  }, [surveys, selectedSiteId])

  // Group surveys by status
  const surveysByStatus = React.useMemo(() => {
    const groups: Record<string, SurveyCardType[]> = {
      in_progress: [],
      completed: [],
    }
    for (const survey of filteredSurveys) {
      groups[survey.status]?.push(survey)
    }
    return groups
  }, [filteredSurveys])

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
        status: 'in_progress',
        weather: (data.weather as unknown as Json) || null,
        notes: data.notes || null,
        site_id: selectedSiteId || null,
        visit_group_id: data.visitGroupId || null,
        visit_number: data.visitNumber || null,
      })

      // Auto-assign surveyor to survey_assignments
      if (newSurvey?.id && data.surveyor?.id) {
        assignSurveyStaff(newSurvey.id, data.surveyor.id, userId).catch(() => {
          // Non-critical: assignment sync is best-effort
        })
      }

      toast({
        title: data.visitGroupId ? 'Visit added' : 'Survey created',
        description: data.visitGroupId
          ? `Visit ${data.visitNumber} has been added to the group.`
          : 'New survey has been scheduled.',
      })

      setShowSurveyForm(false)
      setAddVisitMode(null)
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
      // Build form_data from templateFields grouped by section
      const weatherObj = data.weather as Record<string, unknown> | undefined
      const templateFields = weatherObj?.templateFields as Record<string, unknown> | undefined
      const templateDef = getDefaultFieldsForType(data.surveyType || editingSurvey.surveyType)
      let formData: Record<string, Record<string, unknown>> | undefined
      if (templateFields && templateDef) {
        formData = {}
        for (const section of templateDef.sections) {
          if (section.id === 'weather') continue
          const sectionData: Record<string, unknown> = {}
          for (const field of section.fields) {
            if (templateFields[field.key] != null && templateFields[field.key] !== '') {
              sectionData[field.key] = templateFields[field.key]
            }
          }
          if (Object.keys(sectionData).length > 0) {
            formData[section.id] = sectionData
          }
        }
      }

      await updateSurvey.mutateAsync({
        surveyId: editingSurvey.id,
        updates: {
          survey_type: data.surveyType,
          survey_date: data.surveyDate,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          weather: (data.weather as unknown as Json) || null,
          form_data: formData ? (formData as unknown as Json) : undefined,
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

  // Open confirm dialog before completing
  const handleCompleteSurvey = (survey: SurveyCardType) => {
    setConfirmAction({ survey, action: 'complete' })
  }

  // Actually execute the status change after confirmation
  const executeStatusChange = async () => {
    if (!confirmAction) return
    const { survey } = confirmAction

    try {
      await updateSurvey.mutateAsync({
        surveyId: survey.id,
        updates: { status: 'completed' },
      })

      toast({
        title: 'Survey completed',
        description: 'Survey has been marked as completed.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error completing survey',
        description: 'Failed to complete the survey.',
      })
    } finally {
      setConfirmAction(null)
    }
  }

  // Handle adding a visit to an existing survey or creating a new visit group
  const handleAddVisit = (survey: SurveyCardType) => {
    const groupId = survey.visitGroupId || survey.id // Use survey.id as the group if no group yet
    const nextVisitNumber = getNextVisitNumber(
      surveys as SurveyWithSurveyor[],
      survey.visitGroupId || ''
    )

    // If this survey doesn't have a group yet, assign one first
    if (!survey.visitGroupId) {
      // Set the current survey as visit 1 in the new group (using its own id as group id)
      updateSurvey.mutate(
        {
          surveyId: survey.id,
          updates: {
            visit_group_id: survey.id,
            visit_number: 1,
          },
        },
        {
          onSuccess: () => {
            setAddVisitMode({
              visitGroupId: survey.id,
              surveyType: survey.surveyType,
              visitNumber: 2,
            })
            setEditingSurvey(null)
            setShowSurveyForm(true)
          },
        }
      )
    } else {
      setAddVisitMode({
        visitGroupId: groupId,
        surveyType: survey.surveyType,
        visitNumber: nextVisitNumber,
      })
      setEditingSurvey(null)
      setShowSurveyForm(true)
    }
  }

  // Can this user assign staff? (admin or PM only)
  const canAssignStaff = roleUser?.role === 'admin' || roleUser?.role === 'project_manager'

  // Handle viewing a survey (read-only)
  const handleViewSurvey = (survey: SurveyCardType) => {
    setViewingSurvey(survey)
  }

  // Handle opening edit form
  const handleOpenEditForm = (survey: SurveyCardType) => {
    if (survey.surveyType === 'releve_survey') {
      // Relevé surveys use their own dedicated form inside the view dialog
      setViewingSurvey(survey)
      setReleveEditOnOpen(true)
    } else {
      setEditingSurvey(survey)
      setShowSurveyForm(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Site Selector */}
      <div className="flex items-center justify-end">
        <SiteSelector
          projectId={project.id}
          stepKey="field-research"
          onSiteChange={(site) => setSelectedSiteId(site?.id ?? null)}
          showAllOption
        />
      </div>

      {/* Top-Level Tabs: Surveys vs Photos */}
      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as 'surveys' | 'photos')}>
        <TabsList>
          <TabsTrigger value="surveys">
            <Calendar className="mr-1.5 h-4 w-4" />
            Surveys
          </TabsTrigger>
          <TabsTrigger value="photos">
            <ImageIcon className="mr-1.5 h-4 w-4" />
            Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-4">
          <PhotoGallery projectId={project.id} />
        </TabsContent>

        <TabsContent value="surveys" className="mt-4 space-y-6">
          {/* Survey List */}
          {filteredSurveys.length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertTitle>No Surveys Scheduled</AlertTitle>
              <AlertDescription>
                Click "Schedule Survey" to plan your first field survey. Based on the desk
                assessment, you may need habitat mapping, species-specific surveys, or general
                walkover surveys.
              </AlertDescription>
              <div className="mt-3">
                <Button
                  size="sm"
                  disabled={isMultiSite && !selectedSiteId}
                  onClick={() => {
                    setEditingSurvey(null)
                    setShowSurveyForm(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Survey
                </Button>
                {isMultiSite && !selectedSiteId && (
                  <p className="mt-1 text-xs text-red-500">
                    Select a site first to schedule a survey.
                  </p>
                )}
              </div>
            </Alert>
          ) : (
            <Card ref={surveyListRef}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Survey Schedule</CardTitle>
                  <CardDescription>
                    Manage and track all field surveys for this project
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <Button
                    size="sm"
                    disabled={isMultiSite && !selectedSiteId}
                    onClick={() => {
                      setEditingSurvey(null)
                      setShowSurveyForm(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Survey
                  </Button>
                  {isMultiSite && !selectedSiteId && (
                    <p className="mt-1 text-xs text-red-500">Select a site first.</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">All ({filteredSurveys.length})</TabsTrigger>
                    <TabsTrigger value="in_progress">
                      In Progress ({surveysByStatus.in_progress.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      Completed ({surveysByStatus.completed.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-100">
                      <div className="space-y-4 pr-4">
                        {/* Visit Groups */}
                        {surveyGroups.map((group) => {
                          const groupCards = filteredSurveys.filter(
                            (s) => s.visitGroupId === group.visitGroupId
                          )
                          const typeLabel =
                            FIELD_SURVEY_TYPE_LABELS[group.surveyType] || group.surveyType
                          return (
                            <Collapsible key={group.visitGroupId} defaultOpen>
                              <div className="bg-card rounded-lg border">
                                <CollapsibleTrigger asChild>
                                  <div className="flex cursor-pointer items-center justify-between p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">{typeLabel}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {group.completedVisits}/{group.totalVisits} visits
                                      </Badge>
                                      {group.canComplete && (
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                          All Complete
                                        </Badge>
                                      )}
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="grid gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {groupCards.map((survey) => (
                                      <SurveyCard
                                        key={survey.id}
                                        survey={survey}
                                        onView={handleViewSurvey}
                                        onEdit={handleOpenEditForm}
                                        onDelete={handleDeleteSurvey}
                                        onComplete={handleCompleteSurvey}
                                        onAssignStaff={
                                          canAssignStaff ? setAssigningSurvey : undefined
                                        }
                                        isHighlighted={survey.id === highlightedSurveyId}
                                      />
                                    ))}
                                  </div>
                                  {/* Add Visit button — group level (hidden only if all completed) */}
                                  {!groupCards.every((s) => s.status === 'completed') && (
                                    <div className="border-t px-3 py-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                        onClick={() => handleAddVisit(groupCards[0])}
                                      >
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                        Add Visit
                                      </Button>
                                    </div>
                                  )}
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          )
                        })}

                        {/* Standalone surveys (no visit group) */}
                        {standaloneSurveys.length > 0 && (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredSurveys
                              .filter((s) => !s.visitGroupId)
                              .map((survey) => (
                                <SurveyCard
                                  key={survey.id}
                                  survey={survey}
                                  onView={handleViewSurvey}
                                  onEdit={handleOpenEditForm}
                                  onDelete={handleDeleteSurvey}
                                  onComplete={handleCompleteSurvey}
                                  onAssignStaff={canAssignStaff ? setAssigningSurvey : undefined}
                                  onAddVisit={handleAddVisit}
                                  isHighlighted={survey.id === highlightedSurveyId}
                                />
                              ))}
                          </div>
                        )}
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
                          <div className="grid gap-4 pr-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[...statusSurveys]
                              .sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
                              .map((survey) => (
                                <SurveyCard
                                  key={survey.id}
                                  survey={survey}
                                  onView={handleViewSurvey}
                                  onEdit={handleOpenEditForm}
                                  onDelete={handleDeleteSurvey}
                                  onComplete={handleCompleteSurvey}
                                  onAssignStaff={canAssignStaff ? setAssigningSurvey : undefined}
                                  onAddVisit={handleAddVisit}
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

          {/* Survey count */}
          <div className="text-muted-foreground text-center text-xs">
            {surveysAsCards.length} survey{surveysAsCards.length !== 1 ? 's' : ''} scheduled
          </div>

          {/* Survey Form Dialog */}
          <SurveyForm
            open={showSurveyForm}
            onOpenChange={(open) => {
              setShowSurveyForm(open)
              if (!open) {
                setEditingSurvey(null)
                setAddVisitMode(null)
              }
            }}
            onSubmit={editingSurvey ? handleEditSurvey : handleCreateSurvey}
            initialData={
              editingSurvey
                ? {
                    id: editingSurvey.id,
                    surveyType: editingSurvey.surveyType,
                    surveyDate: editingSurvey.surveyDate,
                    startTime: editingSurvey.startTime,
                    endTime: editingSurvey.endTime,
                    surveyor: editingSurvey.surveyor,
                    expectedSurveyCount: editingSurvey.expectedSurveyCount,
                    weather: editingSurvey.weather,
                    form_data: editingSurvey.form_data,
                    notes: editingSurvey.notes,
                  }
                : undefined
            }
            projectId={project.id}
            organizationId={project.organization_id ?? undefined}
            addVisitMode={addVisitMode ?? undefined}
          />

          {/* Survey View Dialog */}
          {viewingSurvey && (
            <SurveyViewDialog
              open={!!viewingSurvey}
              onOpenChange={(open) => {
                if (!open) {
                  setViewingSurvey(null)
                  setReleveEditOnOpen(false)
                }
              }}
              survey={viewingSurvey}
              projectId={project.id}
              projectName={project.name}
              initialEditMode={releveEditOnOpen}
              onEdit={(survey) => {
                setViewingSurvey(null)
                setReleveEditOnOpen(false)
                handleOpenEditForm(survey)
              }}
              onNavigateVisit={(survey) => setViewingSurvey(survey)}
            />
          )}

          {/* Survey Assignment Dialog */}
          {assigningSurvey && (
            <SurveyAssignmentDialog
              open={!!assigningSurvey}
              onOpenChange={(open) => !open && setAssigningSurvey(null)}
              surveyId={assigningSurvey.id}
              surveyLabel={
                FIELD_SURVEY_TYPE_LABELS[assigningSurvey.surveyType] || assigningSurvey.surveyType
              }
              organizationId={project.organization_id}
              assignedBy={userId}
              leadSurveyorId={assigningSurvey.surveyor.id}
            />
          )}
          {/* Survey Confirm Dialog (Complete/Approve) */}
          {confirmAction && (
            <SurveyConfirmDialog
              open={!!confirmAction}
              onOpenChange={(open) => !open && setConfirmAction(null)}
              surveyId={confirmAction.survey.id}
              action={confirmAction.action}
              onConfirm={executeStatusChange}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
