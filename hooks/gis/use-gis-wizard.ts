'use client'

import * as React from 'react'
import type { Project, WorkflowStep } from '@/types/database'
import { useWorkflowSteps } from '@/hooks/queries/use-workflow-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'

export type WizardStep = 'source' | 'boundary' | 'sites' | 'buffers' | 'layers'
export type ViewMode = 'preview' | 'wizard'

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'sites', label: 'Sites' },
  { id: 'buffers', label: 'Buffers' },
  { id: 'layers', label: 'Layers' },
]

export function useGISWizard(project: Project, workflowStep: WorkflowStep) {
  const isStepCompleted =
    workflowStep.status === 'approved' || workflowStep.status === 'needs_review'
  const { data: projectSites } = useProjectSites(project.id)
  const hasMultiSiteData = !!projectSites?.some((s) => s.boundary)
  const hasLegacyData = !!(project.boundary && project.grid_reference)
  const hasSavedData = hasLegacyData || hasMultiSiteData

  // Manual override trumps the derived default. Null means "follow the
  // conditions below" — this way async-loading site data promotes the view
  // to preview without a ref latch, and any status transition is reflected.
  const [manualViewMode, setManualViewMode] = React.useState<ViewMode | null>(null)
  const derivedViewMode: ViewMode = isStepCompleted && hasSavedData ? 'preview' : 'wizard'
  const viewMode = manualViewMode ?? derivedViewMode
  const setViewMode = React.useCallback((mode: ViewMode) => setManualViewMode(mode), [])

  const [currentStep, setCurrentStep] = React.useState<WizardStep>(() => {
    if (hasLegacyData) return 'sites'
    return 'source'
  })

  // Advance past 'source' once multi-site boundaries load (async fetch)
  const hasAdvancedStepRef = React.useRef(false)
  React.useEffect(() => {
    if (hasAdvancedStepRef.current) return
    if (hasMultiSiteData && currentStep === 'source') {
      setCurrentStep('sites')
      hasAdvancedStepRef.current = true
    }
  }, [hasMultiSiteData, currentStep])

  const [showEditWarning, setShowEditWarning] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  const { data: allWorkflowSteps } = useWorkflowSteps(project.id)

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1
  const isComplete = workflowStep.status === 'approved'
  const isMapMode = currentStep !== 'source'
  // Legacy alias for code that still references 'boundary'
  const isSitesStep = currentStep === 'sites'

  const hasLaterStepsStarted = React.useMemo(() => {
    if (!allWorkflowSteps) return false
    return allWorkflowSteps.some((s) => s.step_number > 1 && s.status !== 'pending')
  }, [allWorkflowSteps])

  const goBack = React.useCallback(() => {
    if (currentStepIndex > 0) setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
  }, [currentStepIndex])

  const editStartStep = hasSavedData ? 'sites' : 'source'

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
    isSitesStep,
  }
}
