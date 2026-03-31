'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectHabitats,
  getSurveyHabitats,
  createHabitat,
  updateHabitat,
  deleteHabitat,
  getHabitatStats,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

export function useHabitats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['habitats', projectId, siteId ?? null],
    queryFn: () => getProjectHabitats(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useSurveyHabitats(surveyId: string) {
  return useQuery({
    queryKey: ['survey-habitats', surveyId],
    queryFn: () => getSurveyHabitats(surveyId),
    enabled: !!surveyId,
  })
}

export function useHabitatStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['habitat-stats', projectId, siteId ?? null],
    queryFn: () => getHabitatStats(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useCreateHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitat: InsertTables<'habitat_polygons'>) => createHabitat(habitat),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['habitats'] })
        queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
      }
    },
  })
}

export function useUpdateHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      habitatId,
      updates,
    }: {
      habitatId: string
      updates: UpdateTables<'habitat_polygons'>
    }) => updateHabitat(habitatId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitats'] })
      queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
    },
  })
}

export function useDeleteHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitatId: string) => deleteHabitat(habitatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitats'] })
      queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
    },
  })
}
