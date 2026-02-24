import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSurveyTemplates,
  upsertSurveyTemplate,
  deleteSurveyTemplate,
  getReportTemplates,
  upsertReportTemplate,
  deleteReportTemplate,
} from '@/lib/supabase/queries/templates'
import type { Database } from '@/types/database'

type SurveyTemplateInsert = Database['public']['Tables']['survey_templates']['Insert']
type ReportTemplateInsert = Database['public']['Tables']['report_templates']['Insert']

export function useSurveyTemplates(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['survey-templates', organizationId],
    queryFn: () => getSurveyTemplates(organizationId!),
    enabled: !!organizationId,
  })
}

export function useReportTemplates(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['report-templates', organizationId],
    queryFn: () => getReportTemplates(organizationId!),
    enabled: !!organizationId,
  })
}

export function useUpsertSurveyTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (template: SurveyTemplateInsert) => upsertSurveyTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-templates', organizationId] })
    },
  })
}

export function useUpsertReportTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (template: ReportTemplateInsert) => upsertReportTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates', organizationId] })
    },
  })
}

export function useDeleteReportTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => deleteReportTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates', organizationId] })
    },
  })
}

export function useDeleteSurveyTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => deleteSurveyTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-templates', organizationId] })
    },
  })
}
