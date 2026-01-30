'use client'

import * as React from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Loader2,
  Map,
  Search,
  FileCheck,
  Clipboard,
  Target,
  Sparkles,
  CheckCircle,
  Send,
  BarChart3,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useProject, useWorkflowSteps, useProjectProgress } from '@/hooks/use-project-data'
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

// Workflow steps configuration
const workflowStepsConfig = [
  {
    number: 1,
    label: 'GIS Mapping',
    phase: 'desk_research',
    icon: Map,
    description: 'Upload project map and define boundaries',
  },
  {
    number: 2,
    label: 'Data Gathering',
    phase: 'desk_research',
    icon: Search,
    description: 'Gather data from external sources (NPWS, NBDC, EPA)',
  },
  {
    number: 3,
    label: 'Desk Assessment',
    phase: 'desk_research',
    icon: FileCheck,
    description: 'Complete desk-based assessment',
  },
  {
    number: 4,
    label: 'Field Survey',
    phase: 'field_research',
    icon: Clipboard,
    description: 'Plan and conduct field survey',
  },
  {
    number: 5,
    label: 'Habitat Mapping',
    phase: 'field_research',
    icon: Map,
    description: 'Map habitats using Fossitt codes',
  },
  {
    number: 6,
    label: 'Target Notes',
    phase: 'field_research',
    icon: Target,
    description: 'Add target notes and observations',
  },
  {
    number: 7,
    label: 'Data Analysis',
    phase: 'reporting',
    icon: BarChart3,
    description: 'Analyse collected data',
  },
  {
    number: 8,
    label: 'AI Draft',
    phase: 'reporting',
    icon: Sparkles,
    description: 'Generate AI-assisted draft',
  },
  {
    number: 9,
    label: 'Quality Review',
    phase: 'reporting',
    icon: CheckCircle,
    description: 'Review and quality check',
  },
  {
    number: 10,
    label: 'Final Submission',
    phase: 'reporting',
    icon: Send,
    description: 'Submit final report',
  },
]

// Mock user ID - in production this would come from auth context
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')

  const projectId = params.id as string

  // Fetch project and workflow data
  const { data: project, isLoading: loadingProject, error: projectError } = useProject(projectId)
  const { data: workflowSteps = [], isLoading: loadingSteps } = useWorkflowSteps(projectId)
  const progress = useProjectProgress(projectId)

  // Determine current step
  const currentStepNumber = stepParam
    ? parseInt(stepParam)
    : workflowSteps.find((s) => s.status === 'in_progress')?.step_number ||
      workflowSteps.find((s) => s.status === 'pending')?.step_number ||
      1

  const currentWorkflowStep = workflowSteps.find((s) => s.step_number === currentStepNumber)
  const currentStepConfig =
    workflowStepsConfig.find((s) => s.number === currentStepNumber) || workflowStepsConfig[0]
  const StepIcon = currentStepConfig.icon

  // Navigate to next step
  const handleStepComplete = () => {
    if (currentStepNumber < 10) {
      router.push(`/projects/${projectId}?step=${currentStepNumber + 1}`)
    }
  }

  // Loading state
  if (loadingProject || loadingSteps) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Error state
  if (projectError || !project) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error loading project</AlertTitle>
          <AlertDescription>
            {projectError?.message || 'Project not found. Please check the URL and try again.'}
          </AlertDescription>
        </Alert>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    )
  }

  // Format due date
  const dueDate = project.expected_end_date
    ? new Date(project.expected_end_date).toLocaleDateString('en-IE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not set'

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-950">
        <div className="px-6 py-4">
          {/* Breadcrumb */}
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>

          {/* Project Info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-sm">
                  {project.site_code || project.id.slice(0, 8)}
                </span>
                <span
                  className={cn('h-2 w-2 rounded-full', {
                    'bg-emerald-500': project.status === 'active',
                    'bg-amber-500': project.status === 'archived',
                    'bg-green-500': project.status === 'completed',
                    'bg-gray-400': project.status === 'draft',
                  })}
                />
              </div>
              <h1 className="text-foreground text-xl font-bold">{project.name}</h1>
              <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
                {project.client_id && <span>Client: {project.client_id}</span>}
                {project.grid_reference && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.grid_reference}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {dueDate}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-1 flex items-center gap-2">
                <Progress value={progress} className="h-2 w-24" />
                <span className="text-foreground text-sm font-medium">{progress}%</span>
              </div>
              <p className="text-muted-foreground text-xs">Step {currentStepNumber}/10</p>
            </div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="overflow-x-auto border-t">
          <div className="flex min-w-max px-6">
            {workflowStepsConfig.map((step) => {
              const wfStep = workflowSteps.find((s) => s.step_number === step.number)
              const isActive = step.number === currentStepNumber
              const isComplete = wfStep?.status === 'approved'
              const isInProgress = wfStep?.status === 'in_progress'

              return (
                <button
                  key={step.number}
                  onClick={() => router.push(`/projects/${projectId}?step=${step.number}`)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors',
                    {
                      'border-primary text-primary font-medium': isActive,
                      'text-muted-foreground hover:text-foreground border-transparent': !isActive,
                    }
                  )}
                >
                  <div
                    className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs', {
                      'bg-green-500 text-white': isComplete,
                      'bg-primary text-primary-foreground': isActive && !isComplete,
                      'bg-amber-500 text-white': isInProgress && !isActive,
                      'bg-muted text-muted-foreground': !isActive && !isComplete && !isInProgress,
                    })}
                  >
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : <span>{step.number}</span>}
                  </div>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Current Step Header */}
        <div className="bg-primary/5 border-t px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-primary text-xs font-medium tracking-wider uppercase">
                  Step {currentStepNumber}
                </span>
                {currentWorkflowStep && (
                  <Badge
                    variant={
                      currentWorkflowStep.status === 'approved'
                        ? 'default'
                        : currentWorkflowStep.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {currentWorkflowStep.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <h2 className="text-foreground text-lg font-semibold">{currentStepConfig.label}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Render appropriate step component */}
      <div className="p-6">
        {currentWorkflowStep ? (
          <>
            {currentStepNumber === 1 && (
              <GISMappingStep
                project={project}
                workflowStep={currentWorkflowStep}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 2 && (
              <DataGatheringStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 3 && (
              <DeskAssessmentStep
                project={project}
                workflowStep={currentWorkflowStep}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 4 && (
              <FieldSurveyStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 5 && (
              <HabitatMappingStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 6 && (
              <TargetNotesStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 7 && (
              <DataAnalysisStep
                project={project}
                workflowStep={currentWorkflowStep}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 8 && (
              <AIDraftStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 9 && (
              <QualityReviewStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
            {currentStepNumber === 10 && (
              <FinalSubmissionStep
                project={project}
                workflowStep={currentWorkflowStep}
                userId={MOCK_USER_ID}
                onComplete={handleStepComplete}
              />
            )}
          </>
        ) : (
          <Alert>
            <AlertTitle>Workflow not initialized</AlertTitle>
            <AlertDescription>
              The workflow steps for this project have not been initialized yet. Please contact an
              administrator.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
