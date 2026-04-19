'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cascadeNeedsReview } from '@/lib/supabase/queries/workflow'

/**
 * Flip downstream workflow steps to needs_review after upstream data changes.
 * Cascade walks STEP_DEPENDENCIES transitively — every approved or in_progress
 * step reachable from `stepNumber` is flagged. Pending steps are skipped.
 *
 * Fetches workflow_steps fresh from the DB, so callers cannot pass stale data.
 *
 * Usage:
 *   const cascade = useCascadeNeedsReview()
 *   cascade.mutate({ projectId, stepNumber })
 */
export function useCascadeNeedsReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      cascadeNeedsReview(projectId, stepNumber),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-steps', variables.projectId],
      })
    },
  })
}
