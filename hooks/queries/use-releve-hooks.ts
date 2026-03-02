import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReleveSurveys,
  getReleveSurveyWithSpecies,
  getReleveSurveyBySurveyId,
  getReleveSpeciesByProject,
  upsertReleveSurvey,
  deleteReleveSurvey,
  getReleveTemplates,
  createReleveTemplate,
  deleteReleveTemplate,
  type ReleveSurveyRow,
  type ReleveSpeciesRow,
} from '@/lib/supabase/queries/releve-surveys'

export function useReleveSurveys(projectId: string) {
  return useQuery({
    queryKey: ['releve-surveys', projectId],
    queryFn: () => getReleveSurveys(projectId),
    enabled: !!projectId,
  })
}

export function useReleveSurveyWithSpecies(releveId: string | null) {
  return useQuery({
    queryKey: ['releve-survey', releveId],
    queryFn: () => getReleveSurveyWithSpecies(releveId!),
    enabled: !!releveId,
  })
}

export function useReleveSurveyBySurveyId(surveyId: string | null) {
  return useQuery({
    queryKey: ['releve-survey-by-survey', surveyId],
    queryFn: () => getReleveSurveyBySurveyId(surveyId!),
    enabled: !!surveyId,
  })
}

export function useReleveSpeciesByProject(projectId: string) {
  return useQuery({
    queryKey: ['releve-species-by-project', projectId],
    queryFn: () => getReleveSpeciesByProject(projectId),
    enabled: !!projectId,
  })
}

export function useUpsertReleveSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      data,
      species,
    }: {
      data: Omit<ReleveSurveyRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
      species: Omit<ReleveSpeciesRow, 'id' | 'releve_id' | 'created_at' | 'updated_at'>[]
    }) => upsertReleveSurvey(data, species),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['releve-surveys', result.project_id] })
      queryClient.invalidateQueries({ queryKey: ['releve-survey', result.id] })
      if (result.survey_id) {
        queryClient.invalidateQueries({
          queryKey: ['releve-survey-by-survey', result.survey_id],
        })
      }
    },
  })
}

export function useDeleteReleveSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteReleveSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releve-surveys'] })
      queryClient.invalidateQueries({ queryKey: ['releve-survey'] })
    },
  })
}

// --- Template hooks ---

export function useReleveTemplates() {
  return useQuery({
    queryKey: ['releve-templates'],
    queryFn: getReleveTemplates,
  })
}

export function useCreateReleveTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReleveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releve-templates'] })
    },
  })
}

export function useDeleteReleveTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteReleveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releve-templates'] })
    },
  })
}
