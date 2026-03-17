'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReportSurveyLinks,
  setReportSurveyLinks,
  toggleSurveyLink,
} from '@/lib/supabase/queries/report-survey-links'

export function useReportSurveyLinks(projectId: string, reportType: string) {
  return useQuery({
    queryKey: ['report-survey-links', projectId, reportType],
    queryFn: () => getReportSurveyLinks(projectId, reportType),
    enabled: !!projectId && !!reportType,
  })
}

export function useSetReportSurveyLinks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      reportType,
      surveyIds,
    }: {
      projectId: string
      reportType: string
      surveyIds: string[]
    }) => setReportSurveyLinks(projectId, reportType, surveyIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['report-survey-links', variables.projectId, variables.reportType],
      })
    },
  })
}

export function useToggleSurveyLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      reportType,
      surveyId,
    }: {
      projectId: string
      reportType: string
      surveyId: string
    }) => toggleSurveyLink(projectId, reportType, surveyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['report-survey-links', variables.projectId, variables.reportType],
      })
    },
  })
}
