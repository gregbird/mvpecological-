'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveDeepResearch,
  getProjectDeepResearch,
  getSiteDeepResearch,
  deleteDeepResearch,
  type CreateDeepResearchInput,
  type DeepResearchResult,
} from '@/lib/supabase/queries/deep-research'
import {
  getWaterBodyResearch,
  getProjectAquaticResearch,
} from '@/lib/supabase/queries/aquatic-research'

const FIVE_MINUTES = 5 * 60 * 1000

export function useProjectDeepResearch(projectId: string) {
  return useQuery({
    queryKey: ['deep-research', projectId],
    queryFn: () => getProjectDeepResearch(projectId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useSiteDeepResearch(projectId: string, siteCode: string) {
  return useQuery({
    queryKey: ['deep-research', projectId, siteCode],
    queryFn: () => getSiteDeepResearch(projectId, siteCode),
    enabled: !!projectId && !!siteCode,
    staleTime: FIVE_MINUTES,
  })
}

export function useSaveDeepResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDeepResearchInput) => saveDeepResearch(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deep-research', data.project_id] })
    },
  })
}

export function useDeleteDeepResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDeepResearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deep-research'] })
    },
  })
}

export function useProjectAquaticResearch(projectId: string) {
  return useQuery({
    queryKey: ['aquatic-research', projectId],
    queryFn: () => getProjectAquaticResearch(projectId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useWaterBodyResearch(projectId: string, waterBodyCode: string) {
  return useQuery({
    queryKey: ['aquatic-research', projectId, waterBodyCode],
    queryFn: () => getWaterBodyResearch(projectId, waterBodyCode),
    enabled: !!projectId && !!waterBodyCode,
    staleTime: FIVE_MINUTES,
  })
}

// Re-export types
export type { DeepResearchResult, CreateDeepResearchInput }
