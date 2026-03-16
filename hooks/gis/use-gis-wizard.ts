'use client'

import * as React from 'react'
import type { Project, WorkflowStep } from '@/types/database'
import { useWorkflowSteps } from '@/hooks/queries/use-workflow-hooks'

export type WizardStep = 'source' | 'boundary' | 'buffers' | 'layers'
export type ViewMode = 'preview' | 'wizard'

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'boundary', label: 'Boundary' },
  { id: 'buffers', label: 'Buffers' },
  { id: 'layers', label: 'Layers' },
]

export function useGISWizard(project: Project, workflowStep: WorkflowStep) {
  const isStepCompleted =
    workflowStep.status === 'approved' || workflowStep.status === 'needs_review'
  const hasSavedData = !!(project.boundary && project.grid_reference)

  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    if (isStepCompleted && hasSavedData) return 'preview'
    return 'wizard'
  })

  const [currentStep, setCurrentStep] = React.useState<WizardStep>(() => {
    if (project.boundary) return 'boundary'
    return 'source'
  })

  const [showEditWarning, setShowEditWarning] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  const { data: allWorkflowSteps } = useWorkflowSteps(project.id)

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1
  const isComplete = workflowStep.status === 'approved'
  const isMapMode = currentStep !== 'source'

  const hasLaterStepsStarted = React.useMemo(() => {
    if (!allWorkflowSteps) return false
    return allWorkflowSteps.some((s) => s.step_number > 1 && s.status !== 'pending')
  }, [allWorkflowSteps])

  const goBack = React.useCallback(() => {
    if (currentStepIndex > 0) setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
  }, [currentStepIndex])

  const editStartStep = hasSavedData ? 'boundary' : 'source'

  const handleEditClick = React.useCallback(() => {
    if (hasLaterStepsStarted) {
      setShowEditWarning(true)
    } else {
      setViewMode('wizard')
      setCurrentStep(editStartStep as WizardStep)
    }
  }, [hasLaterStepsStarted, editStartStep])

  const confirmEdit = React.useCallback(() => {
    setShowEditWarning(false)
    setViewMode('wizard')
    setCurrentStep(editStartStep as WizardStep)
  }, [editStartStep])

  return {
    viewMode,
    setViewMode,
    currentStep,
    setCurrentStep,
    showEditWarning,
    setShowEditWarning,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    allWorkflowSteps,
    currentStepIndex,
    canGoBack,
    canGoNext,
    isComplete,
    isMapMode,
    isStepCompleted,
    hasSavedData,
    hasLaterStepsStarted,
    goBack,
    handleEditClick,
    confirmEdit,
  }
}
