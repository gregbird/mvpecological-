'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSurveyAssignments,
  assignSurveyStaff,
  removeSurveyAssignment,
} from '@/lib/supabase/queries/survey-assignments'

export function useSurveyAssignments(surveyId: string) {
  return useQuery({
    queryKey: ['survey-assignments', surveyId],
    queryFn: () => getSurveyAssignments(surveyId),
    enabled: !!surveyId,
  })
}

export function useAssignSurveyStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      surveyId,
      userId,
      assignedBy,
    }: {
      surveyId: string
      userId: string
      assignedBy: string
    }) => assignSurveyStaff(surveyId, userId, assignedBy),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['survey-assignments', variables.surveyId],
      })
    },
  })
}

export function useRemoveSurveyAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, userId }: { surveyId: string; userId: string }) =>
      removeSurveyAssignment(surveyId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['survey-assignments', variables.surveyId],
      })
    },
  })
}
