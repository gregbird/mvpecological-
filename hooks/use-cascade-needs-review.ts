'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cascadeNeedsReview } from '@/lib/supabase/queries/workflow'
import type { WorkflowStep } from '@/types/database'

/**
 * Hook to cascade needs_review to downstream steps when data is saved
 * in an already-approved step. Call after any data save operation.
 *
 * Usage:
 *   const cascade = useCascadeNeedsReview()
 *   // After saving data:
 *   cascade.mutate({ projectId, stepNumber, workflowSteps })
 */
export function useCascadeNeedsReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      stepNumber,
      workflowSteps,
      currentStatus,
    }: {
      projectId: string
      stepNumber: number
      workflowSteps: WorkflowStep[]
      currentStatus: string
    }) => {
      // Only cascade if the step being edited is already approved
      if (currentStatus !== 'approved') return Promise.resolve()
      return cascadeNeedsReview(projectId, stepNumber, workflowSteps)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-steps', variables.projectId],
      })
    },
  })
}
