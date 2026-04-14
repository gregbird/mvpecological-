'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSurveyObservations,
  getProjectObservations,
  createObservation,
  updateObservation,
  deleteObservation,
  verifyObservation,
  getObservationStats,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

export function useObservations(surveyId: string) {
  return useQuery({
    queryKey: ['observations', surveyId],
    queryFn: () => getSurveyObservations(surveyId),
    enabled: !!surveyId,
  })
}

export function useProjectObservations(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['project-observations', projectId, siteId ?? null],
    queryFn: () => getProjectObservations(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useObservationStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['observation-stats', projectId, siteId ?? null],
    queryFn: () => getObservationStats(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useCreateObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (observation: InsertTables<'species_observations'>) =>
      createObservation(observation),
    onSuccess: (data, variables) => {
      if (data) {
        // Survey-scoped observations list can be scoped exactly.
        queryClient.invalidateQueries({ queryKey: ['observations', variables.survey_id] })
        // project_id is not on the species_observations insert type — fall
        // back to an unscoped invalidation for the project-level views.
        queryClient.invalidateQueries({ queryKey: ['project-observations'] })
        queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
      }
    },
  })
}

export function useUpdateObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      observationId,
      updates,
    }: {
      observationId: string
      updates: UpdateTables<'species_observations'>
      // projectId scopes invalidation when the caller has it; optional for
      // survey-scoped edits that don't need it.
      projectId?: string
    }) => updateObservation(observationId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['project-observations', variables.projectId],
        })
        queryClient.invalidateQueries({
          queryKey: ['observation-stats', variables.projectId],
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['project-observations'] })
        queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
      }
    },
  })
}

export function useDeleteObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ observationId }: { observationId: string; projectId?: string }) =>
      deleteObservation(observationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['project-observations', variables.projectId],
        })
        queryClient.invalidateQueries({
          queryKey: ['observation-stats', variables.projectId],
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['project-observations'] })
        queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
      }
    },
  })
}

export function useVerifyObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      observationId,
      verifierId,
    }: {
      observationId: string
      verifierId: string
      projectId?: string
    }) => verifyObservation(observationId, verifierId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['observation-stats', variables.projectId],
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
      }
    },
  })
}
