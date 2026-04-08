'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectHabitats,
  getSurveyHabitats,
  createHabitat,
  createHabitatsBulk,
  updateHabitat,
  deleteHabitat,
  getHabitatStats,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

export function useHabitats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['habitats', projectId, siteId ?? null],
    queryFn: () => getProjectHabitats(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useSurveyHabitats(surveyId: string) {
  return useQuery({
    queryKey: ['survey-habitats', surveyId],
    queryFn: () => getSurveyHabitats(surveyId),
    enabled: !!surveyId,
    staleTime: FIVE_MINUTES,
  })
}

export function useHabitatStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['habitat-stats', projectId, siteId ?? null],
    queryFn: () => getHabitatStats(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useCreateHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitat: InsertTables<'habitat_polygons'>) => createHabitat(habitat),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['habitats', variables.project_id] })
        queryClient.invalidateQueries({ queryKey: ['habitat-stats', variables.project_id] })
      }
    },
  })
}

/**
 * Bulk create habitats — single Supabase round-trip + single invalidation.
 * Use this when inserting many habitats at once (ex: auto-import from findings)
 * to avoid N sequential invalidations that re-render the map + re-run heavy
 * useMemos for every row.
 */
export function useCreateHabitatsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      habitats,
    }: {
      habitats: InsertTables<'habitat_polygons'>[]
      projectId: string
    }) => createHabitatsBulk(habitats),
    onSuccess: (data, variables) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['habitats', variables.projectId] })
        queryClient.invalidateQueries({ queryKey: ['habitat-stats', variables.projectId] })
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
      projectId,
    }: {
      habitatId: string
      updates: UpdateTables<'habitat_polygons'>
      projectId?: string
    }) => updateHabitat(habitatId, updates),
    onSuccess: (_data, variables) => {
      const scope = variables.projectId ? ['habitats', variables.projectId] : ['habitats']
      queryClient.invalidateQueries({ queryKey: scope })
      const statsScope = variables.projectId
        ? ['habitat-stats', variables.projectId]
        : ['habitat-stats']
      queryClient.invalidateQueries({ queryKey: statsScope })
    },
  })
}

export function useDeleteHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ habitatId, projectId }: { habitatId: string; projectId?: string }) =>
      deleteHabitat(habitatId),
    onSuccess: (_data, variables) => {
      const scope = variables.projectId ? ['habitats', variables.projectId] : ['habitats']
      queryClient.invalidateQueries({ queryKey: scope })
      const statsScope = variables.projectId
        ? ['habitat-stats', variables.projectId]
        : ['habitat-stats']
      queryClient.invalidateQueries({ queryKey: statsScope })
    },
  })
}
