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

export function useProjectObservations(projectId: string) {
  return useQuery({
    queryKey: ['project-observations', projectId],
    queryFn: () => getProjectObservations(projectId),
    enabled: !!projectId,
  })
}

export function useObservationStats(projectId: string) {
  return useQuery({
    queryKey: ['observation-stats', projectId],
    queryFn: () => getObservationStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (observation: InsertTables<'species_observations'>) =>
      createObservation(observation),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['observations'] })
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
    }) => updateObservation(observationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['project-observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}

export function useDeleteObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (observationId: string) => deleteObservation(observationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['project-observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}

export function useVerifyObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ observationId, verifierId }: { observationId: string; verifierId: string }) =>
      verifyObservation(observationId, verifierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}
