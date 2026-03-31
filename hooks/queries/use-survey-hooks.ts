'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectSurveys,
  getSurvey,
  getSurveyGroup,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  getSurveyStats,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

export function useSurveys(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['surveys', projectId, siteId ?? null],
    queryFn: () => getProjectSurveys(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useSurvey(surveyId: string) {
  return useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,
  })
}

export function useSurveyStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['survey-stats', projectId, siteId ?? null],
    queryFn: () => getSurveyStats(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useSurveyGroup(visitGroupId: string | null) {
  return useQuery({
    queryKey: ['survey-group', visitGroupId],
    queryFn: () => getSurveyGroup(visitGroupId!),
    enabled: !!visitGroupId,
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (survey: InsertTables<'surveys'>) => createSurvey(survey),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['surveys'] })
        queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
        queryClient.invalidateQueries({ queryKey: ['survey-group'] })
      }
    },
  })
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, updates }: { surveyId: string; updates: UpdateTables<'surveys'> }) =>
      updateSurvey(surveyId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['survey', variables.surveyId] })
        queryClient.invalidateQueries({ queryKey: ['surveys'] })
        queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
        queryClient.invalidateQueries({ queryKey: ['survey-group'] })
      }
    },
  })
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (surveyId: string) => deleteSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
      queryClient.invalidateQueries({ queryKey: ['survey-group'] })
    },
  })
}
