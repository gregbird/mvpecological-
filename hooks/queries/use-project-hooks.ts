'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProject,
  getProjects,
  getAssignedProjects,
  createProject,
  updateProject,
  updateProjectBoundary,
  deleteProject,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useProjects(organizationId: string) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => getProjects(organizationId),
    enabled: !!organizationId,
    staleTime: FIVE_MINUTES,
  })
}

export function useAssignedProjects(userId: string) {
  return useQuery({
    queryKey: ['assigned-projects', userId],
    queryFn: () => getAssignedProjects(userId),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (project: InsertTables<'projects'>) => createProject(project),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['assigned-projects'] })
      }
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      updates,
    }: {
      projectId: string
      updates: UpdateTables<'projects'>
    }) => updateProject(projectId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    },
  })
}

export function useUpdateProjectBoundary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      boundary,
      centerPoint,
      gridReference,
      bufferDistances,
      visibleLayers,
      townland,
      county,
      province,
    }: {
      projectId: string
      boundary: GeoJSON.Feature<GeoJSON.Polygon> | GeoJSON.Polygon
      centerPoint: GeoJSON.Point | { type: 'Point'; coordinates: [number, number] }
      gridReference: string
      bufferDistances?: number[]
      visibleLayers?: string[]
      townland?: string
      county?: string
      province?: string
    }) =>
      updateProjectBoundary(
        projectId,
        boundary,
        centerPoint,
        gridReference,
        bufferDistances,
        visibleLayers,
        townland,
        county,
        province
      ),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
      }
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['assigned-projects'] })
    },
  })
}
