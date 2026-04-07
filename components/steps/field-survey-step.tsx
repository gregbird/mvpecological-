'use client'

import * as React from 'react'
import { Plus, Loader2, Calendar, ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import { type Survey as SurveyCardType } from '@/components/field-surveys/survey-card'
import { SurveyForm } from '@/components/field-surveys/survey-form'
import { SurveyViewDialog } from '@/components/field-surveys/survey-view-dialog'
import { SurveyAssignmentDialog } from '@/components/field-surveys/survey-assignment-dialog'
import { SurveyConfirmDialog } from '@/components/field-surveys/survey-confirm-dialog'
import { PhotoGallery } from '@/components/field-surveys/photo-gallery'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'
import { groupSurveysByVisit } from '@/lib/utils/survey-groups'
import type { SurveyWithSurveyor } from '@/lib/supabase/queries/surveys'
import { useRole } from '@/contexts/role-context'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useVisitManagement } from '@/hooks/use-visit-management'
import { SurveyList } from './field-survey/survey-list'
import type { Project, WorkflowStep } from '@/types/database'

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
  const { user: roleUser } = useRole()
  const [viewingSurvey, setViewingSurvey] = React.useState<SurveyCardType | null>(null)
  const [assigningSurvey, setAssigningSurvey] = React.useState<SurveyCardType | null>(null)
  const [activeTab, setActiveTab] = React.useState('all')
  const [topTab, setTopTab] = React.useState<'surveys' | 'photos'>('surveys')
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)
  const [highlightedSurveyId, setHighlightedSurveyId] = React.useState<string | null>(null)
  const [releveEditOnOpen, setReleveEditOnOpen] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<{
    survey: SurveyCardType
    action: 'complete'
  } | null>(null)
  const surveyListRef = React.useRef<HTMLDivElement>(null)

  // React Query hooks — surveys filtered by selected site for multi-site projects
  const { data: surveys = [], isLoading } = useSurveys(project.id, selectedSiteId)
  const { data: projectSites = [] } = useProjectSites(project.id)
  const isMultiSite = projectSites.length > 1

  // Visit management hook
  const visit = useVisitManagement({
    projectId: project.id,
    userId,
    selectedSiteId,
    surveys: surveys as SurveyWithSurveyor[],
    onSurveyCreated: (id) => {
      setActiveTab('all')
      setHighlightedSurveyId(id)
      setTimeout(() => {
        surveyListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      setTimeout(() => setHighlightedSurveyId(null), 3000)
    },
  })

  // Compute visit group counts for badge display (uses already-site-filtered surveys)
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
  const filteredSurveys = React.useMemo(() => {
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

  // Group surveys by visit_group_id (input is already site-scoped)
  const { groups: surveyGroups, standalone: standaloneSurveys } = React.useMemo(() => {
    return groupSurveysByVisit(surveys as SurveyWithSurveyor[])
  }, [surveys])

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

  const canAssignStaff = roleUser?.role === 'admin' || roleUser?.role === 'project_manager'

  const handleViewSurvey = (survey: SurveyCardType) => setViewingSurvey(survey)

  const handleOpenEditForm = (survey: SurveyCardType) => {
    if (survey.surveyType === 'releve_survey') {
      setViewingSurvey(survey)
      setReleveEditOnOpen(true)
    } else {
      visit.setEditingSurvey(survey)
      visit.setShowSurveyForm(true)
    }
  }

  const handleCompleteSurvey = (survey: SurveyCardType) => {
    setConfirmAction({ survey, action: 'complete' })
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
          <PhotoGallery projectId={project.id} siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="surveys" className="mt-4 space-y-6">
          {filteredSurveys.length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertTitle>No Surveys Scheduled</AlertTitle>
              <AlertDescription>
                Click &quot;Schedule Survey&quot; to plan your first field survey. Based on the desk
                assessment, you may need habitat mapping, species-specific surveys, or general
                walkover surveys.
              </AlertDescription>
              <div className="mt-3">
                <Button
                  size="sm"
                  disabled={isMultiSite && !selectedSiteId}
                  onClick={() => {
                    visit.setEditingSurvey(null)
                    visit.setShowSurveyForm(true)
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
                      visit.setEditingSurvey(null)
                      visit.setShowSurveyForm(true)
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
                <SurveyList
                  filteredSurveys={filteredSurveys}
                  surveyGroups={surveyGroups}
                  standaloneSurveys={standaloneSurveys}
                  surveysByStatus={surveysByStatus}
                  activeTab={activeTab}
                  onActiveTabChange={setActiveTab}
                  highlightedSurveyId={highlightedSurveyId}
                  canAssignStaff={canAssignStaff}
                  onView={handleViewSurvey}
                  onEdit={handleOpenEditForm}
                  onDelete={visit.handleDeleteSurvey}
                  onComplete={handleCompleteSurvey}
                  onAssignStaff={setAssigningSurvey}
                  onAddVisit={visit.handleAddVisit}
                />
              </CardContent>
            </Card>
          )}

          <div className="text-muted-foreground text-center text-xs">
            {filteredSurveys.length} survey{filteredSurveys.length !== 1 ? 's' : ''} scheduled
          </div>

          {/* Survey Form Dialog */}
          <SurveyForm
            open={visit.showSurveyForm}
            onOpenChange={(open) => {
              visit.setShowSurveyForm(open)
              if (!open) {
                visit.setEditingSurvey(null)
                visit.setAddVisitMode(null)
              }
            }}
            onSubmit={visit.editingSurvey ? visit.handleEditSurvey : visit.handleCreateSurvey}
            initialData={
              visit.editingSurvey
                ? {
                    id: visit.editingSurvey.id,
                    surveyType: visit.editingSurvey.surveyType,
                    surveyDate: visit.editingSurvey.surveyDate,
                    startTime: visit.editingSurvey.startTime,
                    endTime: visit.editingSurvey.endTime,
                    surveyor: visit.editingSurvey.surveyor,
                    expectedSurveyCount: visit.editingSurvey.expectedSurveyCount,
                    weather: visit.editingSurvey.weather,
                    form_data: visit.editingSurvey.form_data,
                    notes: visit.editingSurvey.notes,
                  }
                : undefined
            }
            projectId={project.id}
            organizationId={project.organization_id ?? undefined}
            addVisitMode={visit.addVisitMode ?? undefined}
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

          {/* Survey Confirm Dialog */}
          {confirmAction && (
            <SurveyConfirmDialog
              open={!!confirmAction}
              onOpenChange={(open) => !open && setConfirmAction(null)}
              surveyId={confirmAction.survey.id}
              action={confirmAction.action}
              onConfirm={() => {
                visit.executeStatusChange(confirmAction.survey)
                setConfirmAction(null)
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
