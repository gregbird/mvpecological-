'use client'

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
import { cascadeNeedsReview } from '@/lib/supabase/queries/workflow'
import type { DeskResearchFinding, InsertTables, UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

// Any mutation that changes findings is treated as an edit to Step 2
// (Data Gathering). cascadeNeedsReview fetches workflow_steps fresh from the
// DB so the cascade is correct even on a cold React Query cache.
async function cascadeFromFindings(queryClient: QueryClient, projectId: string) {
  try {
    await cascadeNeedsReview(projectId, 2)
    queryClient.invalidateQueries({ queryKey: ['workflow-steps', projectId] })
  } catch (error) {
    console.error('[useFindingHooks] cascade failed:', error)
  }
}

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
      if (!data) return

      // saved-findings keys are 3-element: ['saved-findings', projectId, siteId]
      // Use findAll() so we patch BOTH the per-site and the project-wide caches
      // (matches `useDeleteFinding`'s pattern). A 2-element setQueryData would
      // miss the actual queries entirely and the optimistic update would never
      // fire.
      const matchingQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['saved-findings', variables.project_id] })

      let patched = false
      for (const query of matchingQueries) {
        const prev = query.state.data as DeskResearchFinding[] | undefined
        if (!prev) continue

        // Site-scoped query: only patch caches whose siteId matches the new
        // finding's site_id (or whose siteId is null = "All Sites" view).
        const cachedSiteId = query.queryKey[2] as string | null | undefined
        if (cachedSiteId != null && cachedSiteId !== variables.site_id) continue

        queryClient.setQueryData(query.queryKey, [data, ...prev])
        patched = true
      }

      // If no cache existed yet (e.g. first save before the list was fetched),
      // fall back to invalidation so the next mount picks it up.
      if (!patched) {
        queryClient.invalidateQueries({
          queryKey: ['saved-findings', variables.project_id],
        })
      }

      // Stats counts always need a refresh (the cache patch above doesn't
      // recompute byType/bySource).
      queryClient.invalidateQueries({
        queryKey: ['findings-stats', variables.project_id],
      })

      void cascadeFromFindings(queryClient, variables.project_id)
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

      if (variables.projectId) void cascadeFromFindings(queryClient, variables.projectId)
    },
  })
}

export function useDeleteFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findingId: string) => deleteFinding(findingId),
    onSuccess: (_data, findingId) => {
      // Immediately remove from cache so UI updates in sync with spinner.
      // Also remember which project the deleted row belonged to so we can
      // cascade needs_review downstream (delete vars only carry the id).
      const queries = queryClient.getQueryCache().findAll({ queryKey: ['saved-findings'] })
      const affectedProjectIds = new Set<string>()
      for (const query of queries) {
        const data = query.state.data as DeskResearchFinding[] | undefined
        const match = data?.find((f) => f.id === findingId)
        if (!match) continue
        if (match.project_id) affectedProjectIds.add(match.project_id)
        queryClient.setQueryData(
          query.queryKey,
          data!.filter((f) => f.id !== findingId)
        )
      }
      for (const projectId of affectedProjectIds) {
        void cascadeFromFindings(queryClient, projectId)
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
    onSuccess: (data, variables) => {
      if (data.length === 0) return

      const projectId = variables[0]?.project_id
      if (!projectId) return

      // saved-findings keys are 3-element: ['saved-findings', projectId, siteId]
      // Patch every matching cache (per-site + "All Sites" null), filtering each
      // bulk row by its own site_id so a multi-site batch doesn't leak rows
      // into the wrong site's cache.
      const matchingQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['saved-findings', projectId] })

      let patched = false
      for (const query of matchingQueries) {
        const prev = query.state.data as DeskResearchFinding[] | undefined
        if (!prev) continue

        const cachedSiteId = query.queryKey[2] as string | null | undefined
        // Null = "All Sites" cache → take everything; otherwise filter to this site.
        const rowsForCache =
          cachedSiteId == null ? data : data.filter((row) => row.site_id === cachedSiteId)
        if (rowsForCache.length === 0) continue

        queryClient.setQueryData(query.queryKey, [...rowsForCache, ...prev])
        patched = true
      }

      if (!patched) {
        queryClient.invalidateQueries({ queryKey: ['saved-findings', projectId] })
      }
      queryClient.invalidateQueries({ queryKey: ['findings-stats', projectId] })

      void cascadeFromFindings(queryClient, projectId)
    },
  })
}
