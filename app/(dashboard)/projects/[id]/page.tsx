'use client'

import * as React from 'react'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useProjectContext } from '@/contexts/project-context'
import { useRole } from '@/contexts/role-context'
import { getStepByNumber } from '@/lib/config/workflow'
import {
  GISMappingStep,
  DataGatheringStep,
  DeskAssessmentStep,
  FieldSurveyStep,
  HabitatMappingStep,
  TargetNotesStep,
  DataAnalysisStep,
  AIDraftStep,
  QualityReviewStep,
  FinalSubmissionStep,
} from '@/components/steps'

export default function ProjectDetailPage() {
  const {
    project,
    workflowSteps,
    currentStepNumber,
    isLoading,
    error,
    navigateToNextStep,
    isStepLocked,
  } = useProjectContext()
  const { user } = useRole()

  const currentWorkflowStep = workflowSteps.find((s) => s.step_number === currentStepNumber)

  // Loading state - only show full loading screen on initial load (no project yet)
  // Don't unmount existing content during background refetches to preserve map state
  if (isLoading && !project) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error loading project</AlertTitle>
          <AlertDescription>
            {error?.message || 'Project not found. Please check the URL and try again.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // No workflow step found - only show on initial load, not during refetches
  if (!currentWorkflowStep && !isLoading) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Workflow not initialized</AlertTitle>
          <AlertDescription>
            The workflow steps for this project have not been initialized yet. Please contact an
            administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Still loading workflow steps
  if (!currentWorkflowStep) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Check if the current step is locked for this user's role
  if (isStepLocked(currentStepNumber)) {
    const stepInfo = getStepByNumber(currentStepNumber)
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Lock className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            You do not have permission to access{' '}
            <span className="font-medium">{stepInfo?.label || `Step ${currentStepNumber}`}</span>.
            Contact your project manager if you need access.
          </p>
        </div>
      </div>
    )
  }

  // Render the appropriate step component
  const renderStepContent = () => {
    const stepProps = {
      project,
      workflowStep: currentWorkflowStep,
      userId: user?.id || '',
      onComplete: navigateToNextStep,
    }

    switch (currentStepNumber) {
      case 1:
        return <GISMappingStep {...stepProps} />
      case 2:
        return <DataGatheringStep {...stepProps} />
      case 3:
        return <DeskAssessmentStep {...stepProps} />
      case 4:
        return <FieldSurveyStep {...stepProps} />
      case 5:
        return <HabitatMappingStep {...stepProps} />
      case 6:
        return <TargetNotesStep {...stepProps} />
      case 7:
        return <DataAnalysisStep {...stepProps} />
      case 8:
        return <AIDraftStep {...stepProps} />
      case 9:
        return <QualityReviewStep {...stepProps} />
      case 10:
        return <FinalSubmissionStep {...stepProps} />
      default:
        return (
          <Alert>
            <AlertTitle>Unknown step</AlertTitle>
            <AlertDescription>Step {currentStepNumber} is not recognized.</AlertDescription>
          </Alert>
        )
    }
  }

  // GIS Mapping and Data Gathering steps need full height without padding
  const isFullHeightStep =
    currentStepNumber === 1 || currentStepNumber === 2 || currentStepNumber === 3

  const showNeedsReviewBanner =
    currentWorkflowStep.status === 'needs_review' && currentStepNumber > 1

  return (
    <div className="h-full">
      {showNeedsReviewBanner && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              The GIS Mapping configuration has been updated. Please review the data in this step to
              ensure it is still accurate.
            </span>
          </div>
        </div>
      )}
      {isFullHeightStep ? renderStepContent() : <div className="p-6">{renderStepContent()}</div>}
    </div>
  )
}
