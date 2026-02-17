'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBaselineCache,
  saveBaselineCache,
  type SaveBaselineCacheInput,
} from '@/lib/supabase/queries/baseline-cache'

export function useBaselineCache(projectId: string, boundaryHash: string) {
  return useQuery({
    queryKey: ['baseline-cache', projectId, boundaryHash],
    queryFn: () => getBaselineCache(projectId, boundaryHash),
    enabled: !!projectId && !!boundaryHash,
    staleTime: Infinity,
  })
}

export function useSaveBaselineCache() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveBaselineCacheInput) => saveBaselineCache(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['baseline-cache', data.project_id],
      })
    },
  })
}
