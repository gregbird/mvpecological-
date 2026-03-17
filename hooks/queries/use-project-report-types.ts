'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectReportTypes,
  getEffectiveReportTypes,
  setProjectReportTypes,
  addProjectReportType,
  removeProjectReportType,
} from '@/lib/supabase/queries/project-report-types'

export function useProjectReportTypes(projectId: string) {
  return useQuery({
    queryKey: ['project-report-types', projectId],
    queryFn: () => getProjectReportTypes(projectId),
    enabled: !!projectId,
  })
}

export function useEffectiveReportTypes(projectId: string) {
  return useQuery({
    queryKey: ['effective-report-types', projectId],
    queryFn: () => getEffectiveReportTypes(projectId),
    enabled: !!projectId,
  })
}

export function useSetProjectReportTypes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, reportTypes }: { projectId: string; reportTypes: string[] }) =>
      setProjectReportTypes(projectId, reportTypes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-report-types', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['effective-report-types', variables.projectId],
      })
    },
  })
}

export function useAddProjectReportType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, reportType }: { projectId: string; reportType: string }) =>
      addProjectReportType(projectId, reportType),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-report-types', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['effective-report-types', variables.projectId],
      })
    },
  })
}

export function useRemoveProjectReportType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, reportType }: { projectId: string; reportType: string }) =>
      removeProjectReportType(projectId, reportType),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-report-types', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['effective-report-types', variables.projectId],
      })
    },
  })
}
