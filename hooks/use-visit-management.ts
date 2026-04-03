import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { getDefaultFieldsForType } from '@/lib/config/survey-field-definitions'
import { useCreateSurvey, useUpdateSurvey, useDeleteSurvey } from '@/hooks/queries/use-survey-hooks'
import { assignSurveyStaff } from '@/lib/supabase/queries/survey-assignments'
import { getNextVisitNumber } from '@/lib/utils/survey-groups'
import type { Survey as SurveyCardType, SurveyType } from '@/components/field-surveys/survey-card'
import type { SurveyWithSurveyor } from '@/lib/supabase/queries/surveys'
import type { Json } from '@/types/database'

export interface AddVisitMode {
  visitGroupId: string
  surveyType: SurveyType
  visitNumber: number
}

interface UseVisitManagementOptions {
  projectId: string
  userId: string
  selectedSiteId: string | null
  surveys: SurveyWithSurveyor[]
  onSurveyCreated?: (surveyId: string) => void
}

export function useVisitManagement({
  projectId,
  userId,
  selectedSiteId,
  surveys,
  onSurveyCreated,
}: UseVisitManagementOptions) {
  const { toast } = useToast()
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()

  const [showSurveyForm, setShowSurveyForm] = React.useState(false)
  const [editingSurvey, setEditingSurvey] = React.useState<SurveyCardType | null>(null)
  const [addVisitMode, setAddVisitMode] = React.useState<AddVisitMode | null>(null)

  // Handle creating a new survey
  const handleCreateSurvey = React.useCallback(
    async (data: Partial<SurveyCardType>) => {
      try {
        const newSurvey = await createSurvey.mutateAsync({
          project_id: projectId,
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

        if (newSurvey?.id) {
          onSurveyCreated?.(newSurvey.id)
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error creating survey',
          description: 'Failed to create the survey.',
        })
      }
    },
    [projectId, userId, selectedSiteId, createSurvey, toast, onSurveyCreated]
  )

  // Handle editing a survey
  const handleEditSurvey = React.useCallback(
    async (data: Partial<SurveyCardType>) => {
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
    },
    [editingSurvey, updateSurvey, toast]
  )

  // Handle deleting a survey
  const handleDeleteSurvey = React.useCallback(
    async (survey: SurveyCardType) => {
      try {
        await deleteSurvey.mutateAsync(survey.id)
        toast({ title: 'Survey deleted', description: 'Survey has been removed.' })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error deleting survey',
          description: 'Failed to delete the survey.',
        })
      }
    },
    [deleteSurvey, toast]
  )

  // Handle completing a survey
  const executeStatusChange = React.useCallback(
    async (survey: SurveyCardType) => {
      try {
        await updateSurvey.mutateAsync({
          surveyId: survey.id,
          updates: { status: 'completed' },
        })
        toast({ title: 'Survey completed', description: 'Survey has been marked as completed.' })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error completing survey',
          description: 'Failed to complete the survey.',
        })
      }
    },
    [updateSurvey, toast]
  )

  // Handle adding a visit to an existing survey or creating a new visit group
  const handleAddVisit = React.useCallback(
    (survey: SurveyCardType) => {
      const groupId = survey.visitGroupId || survey.id
      const nextVisitNumber = getNextVisitNumber(surveys, survey.visitGroupId || '')

      if (!survey.visitGroupId) {
        updateSurvey.mutate(
          {
            surveyId: survey.id,
            updates: { visit_group_id: survey.id, visit_number: 1 },
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
    },
    [surveys, updateSurvey]
  )

  return {
    showSurveyForm,
    setShowSurveyForm,
    editingSurvey,
    setEditingSurvey,
    addVisitMode,
    setAddVisitMode,
    handleCreateSurvey,
    handleEditSurvey,
    handleDeleteSurvey,
    executeStatusChange,
    handleAddVisit,
  }
}
