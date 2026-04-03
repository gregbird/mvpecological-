'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkflowSteps,
  getWorkflowStep,
  initializeWorkflowSteps,
  updateWorkflowStep,
  completeWorkflowStep,
  startWorkflowStep,
  submitForReview,
  calculateProgress,
  getCurrentStep,
} from '@/lib/supabase/queries'
import type { UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

export function useWorkflowSteps(projectId: string) {
  return useQuery({
    queryKey: ['workflow-steps', projectId],
    queryFn: () => getWorkflowSteps(projectId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useWorkflowStep(projectId: string, stepNumber: number) {
  return useQuery({
    queryKey: ['workflow-step', projectId, stepNumber],
    queryFn: () => getWorkflowStep(projectId, stepNumber),
    enabled: !!projectId && stepNumber > 0,
    staleTime: FIVE_MINUTES,
  })
}

export function useInitializeWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => initializeWorkflowSteps(projectId),
    onSuccess: (data, projectId) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['workflow-steps', projectId] })
      }
    },
  })
}

export function useUpdateWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stepId,
      updates,
    }: {
      stepId: string
      updates: UpdateTables<'workflow_steps'>
    }) => updateWorkflowStep(stepId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-step'] })
    },
  })
}

export function useCompleteWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      completeWorkflowStep(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
    },
  })
}

export function useStartWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      startWorkflowStep(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
    },
  })
}

export function useSubmitForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      submitForReview(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
    },
  })
}

// Helper hooks for workflow
export function useProjectProgress(projectId: string) {
  const { data: steps } = useWorkflowSteps(projectId)
  return steps ? calculateProgress(steps) : 0
}

export function useCurrentStepNumber(projectId: string) {
  const { data: steps } = useWorkflowSteps(projectId)
  return steps ? getCurrentStep(steps) : 1
}
