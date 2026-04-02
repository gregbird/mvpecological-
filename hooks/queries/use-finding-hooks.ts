'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectFindings,
  getSavedFindings,
  createFinding,
  updateFinding,
  deleteFinding,
  toggleFindingSaved,
  getFindingsStats,
  bulkSaveFindings,
} from '@/lib/supabase/queries'
import type { DeskResearchFinding, InsertTables, UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

export function useFindings(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['findings', projectId, siteId ?? null],
    queryFn: () => getProjectFindings(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useSavedFindings(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['saved-findings', projectId, siteId ?? null],
    queryFn: () => getSavedFindings(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useFindingsStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['findings-stats', projectId, siteId ?? null],
    queryFn: () => getFindingsStats(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useCreateFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (finding: InsertTables<'desk_research_findings'>) => createFinding(finding),
    onSuccess: (data, variables) => {
      // Immediately add to cache so UI updates in sync with spinner
      const key = ['saved-findings', variables.project_id]
      const prev = queryClient.getQueryData<DeskResearchFinding[]>(key)
      if (prev && data) {
        queryClient.setQueryData(key, [data, ...prev])
      } else {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useUpdateFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      findingId,
      updates,
    }: {
      findingId: string
      updates: UpdateTables<'desk_research_findings'>
      projectId?: string
    }) => updateFinding(findingId, updates),
    onSuccess: (_data, variables) => {
      // Always scope invalidation to the project to avoid refetching all projects' data
      const scope = variables.projectId ? [variables.projectId] : []
      queryClient.invalidateQueries({ queryKey: ['findings', ...scope] })
      queryClient.invalidateQueries({ queryKey: ['saved-findings', ...scope] })
      queryClient.invalidateQueries({ queryKey: ['findings-stats', ...scope] })
    },
  })
}

export function useDeleteFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findingId: string) => deleteFinding(findingId),
    onSuccess: (_data, findingId) => {
      // Immediately remove from cache so UI updates in sync with spinner
      const queries = queryClient.getQueryCache().findAll({ queryKey: ['saved-findings'] })
      for (const query of queries) {
        const data = query.state.data as DeskResearchFinding[] | undefined
        if (data?.some((f) => f.id === findingId)) {
          queryClient.setQueryData(
            query.queryKey,
            data.filter((f) => f.id !== findingId)
          )
        }
      }
    },
  })
}

export function useToggleFindingSaved() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ findingId, isSaved }: { findingId: string; isSaved: boolean }) =>
      toggleFindingSaved(findingId, isSaved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] })
      queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
      queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
    },
  })
}

export function useBulkSaveFindings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findings: InsertTables<'desk_research_findings'>[]) => bulkSaveFindings(findings),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['findings'] })
        queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
        queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
      }
    },
  })
}
