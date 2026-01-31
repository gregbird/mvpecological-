'use client'

import * as React from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useProject, useWorkflowSteps, useProjectProgress } from '@/hooks/use-project-data'
import type { Project, WorkflowStep } from '@/types/database'
import { TOTAL_STEPS } from '@/lib/config/workflow'

// Mock data for development when Supabase is not available
const MOCK_PROJECTS: Record<string, Partial<Project>> = {
  '1': {
    id: '1',
    name: 'Killarney National Park Assessment',
    site_code: 'KNP-2024-001',
    status: 'active',
    grid_reference: 'V95 K2H7',
    expected_end_date: '2024-04-30',
  },
  '2': {
    id: '2',
    name: 'Slieve Rushen Bog NHA',
    site_code: 'SRB-2024-002',
    status: 'active',
    grid_reference: 'H32 A1B2',
    expected_end_date: '2024-05-15',
  },
}

const MOCK_WORKFLOW_STEPS: Record<string, Partial<WorkflowStep>[]> = {
  '1': [
    {
      id: '1-1',
      project_id: '1',
      step_number: 1,
      name: 'GIS Mapping',
      status: 'approved',
      phase: 'desk_research',
    },
    {
      id: '1-2',
      project_id: '1',
      step_number: 2,
      name: 'Data Gathering',
      status: 'in_progress',
      phase: 'desk_research',
    },
    {
      id: '1-3',
      project_id: '1',
      step_number: 3,
      name: 'Desk Assessment',
      status: 'pending',
      phase: 'desk_research',
    },
    {
      id: '1-4',
      project_id: '1',
      step_number: 4,
      name: 'Field Survey',
      status: 'pending',
      phase: 'field_research',
    },
    {
      id: '1-5',
      project_id: '1',
      step_number: 5,
      name: 'Habitat Mapping',
      status: 'pending',
      phase: 'field_research',
    },
    {
      id: '1-6',
      project_id: '1',
      step_number: 6,
      name: 'Target Notes',
      status: 'pending',
      phase: 'field_research',
    },
    {
      id: '1-7',
      project_id: '1',
      step_number: 7,
      name: 'Data Analysis',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '1-8',
      project_id: '1',
      step_number: 8,
      name: 'AI Draft',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '1-9',
      project_id: '1',
      step_number: 9,
      name: 'Quality Review',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '1-10',
      project_id: '1',
      step_number: 10,
      name: 'Final Submission',
      status: 'pending',
      phase: 'reporting',
    },
  ],
  '2': [
    {
      id: '2-1',
      project_id: '2',
      step_number: 1,
      name: 'GIS Mapping',
      status: 'approved',
      phase: 'desk_research',
    },
    {
      id: '2-2',
      project_id: '2',
      step_number: 2,
      name: 'Data Gathering',
      status: 'approved',
      phase: 'desk_research',
    },
    {
      id: '2-3',
      project_id: '2',
      step_number: 3,
      name: 'Desk Assessment',
      status: 'approved',
      phase: 'desk_research',
    },
    {
      id: '2-4',
      project_id: '2',
      step_number: 4,
      name: 'Field Survey',
      status: 'approved',
      phase: 'field_research',
    },
    {
      id: '2-5',
      project_id: '2',
      step_number: 5,
      name: 'Habitat Mapping',
      status: 'in_progress',
      phase: 'field_research',
    },
    {
      id: '2-6',
      project_id: '2',
      step_number: 6,
      name: 'Target Notes',
      status: 'pending',
      phase: 'field_research',
    },
    {
      id: '2-7',
      project_id: '2',
      step_number: 7,
      name: 'Data Analysis',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '2-8',
      project_id: '2',
      step_number: 8,
      name: 'AI Draft',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '2-9',
      project_id: '2',
      step_number: 9,
      name: 'Quality Review',
      status: 'pending',
      phase: 'reporting',
    },
    {
      id: '2-10',
      project_id: '2',
      step_number: 10,
      name: 'Final Submission',
      status: 'pending',
      phase: 'reporting',
    },
  ],
}

interface ProjectContextType {
  // Project data
  projectId: string
  project: Project | null
  isLoading: boolean
  error: Error | null

  // Workflow data
  workflowSteps: WorkflowStep[]
  currentStepNumber: number
  progress: number

  // Navigation
  navigateToStep: (stepNumber: number) => void
  navigateToNextStep: () => void
  navigateToPreviousStep: () => void

  // Step status helpers
  isStepCompleted: (stepNumber: number) => boolean
  isStepActive: (stepNumber: number) => boolean
  isStepLocked: (stepNumber: number) => boolean
  getStepStatus: (stepNumber: number) => 'completed' | 'active' | 'pending' | 'locked'
}

const ProjectContext = React.createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectId = params.id as string
  const stepParam = searchParams.get('step')

  // Fetch project and workflow data from Supabase
  const {
    data: supabaseProject,
    isLoading: loadingProject,
    error: projectError,
  } = useProject(projectId)
  const { data: supabaseWorkflowSteps = [], isLoading: loadingSteps } = useWorkflowSteps(projectId)
  const supabaseProgress = useProjectProgress(projectId)

  // Use mock data as fallback when Supabase data is not available
  const project = React.useMemo(() => {
    if (supabaseProject) return supabaseProject
    // Fallback to mock data
    const mockProject = MOCK_PROJECTS[projectId]
    if (mockProject) return mockProject as Project
    return null
  }, [supabaseProject, projectId])

  const workflowSteps = React.useMemo(() => {
    if (supabaseWorkflowSteps.length > 0) return supabaseWorkflowSteps
    // Fallback to mock data
    const mockSteps = MOCK_WORKFLOW_STEPS[projectId]
    if (mockSteps) return mockSteps as WorkflowStep[]
    return []
  }, [supabaseWorkflowSteps, projectId])

  const progress = React.useMemo(() => {
    if (supabaseProgress > 0) return supabaseProgress
    // Calculate from mock workflow steps
    const completedSteps = workflowSteps.filter((s) => s.status === 'approved').length
    return Math.round((completedSteps / TOTAL_STEPS) * 100)
  }, [supabaseProgress, workflowSteps])

  // Check if we're using mock data (no error from Supabase but no data either)
  const isUsingMockData = !supabaseProject && !!MOCK_PROJECTS[projectId]
  const isLoading = loadingProject || loadingSteps
  const error = isUsingMockData ? null : projectError

  // Determine current step number
  const currentStepNumber = React.useMemo(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10)
      if (parsed >= 1 && parsed <= TOTAL_STEPS) {
        return parsed
      }
    }
    // Find first in_progress or pending step
    const inProgress = workflowSteps.find((s) => s.status === 'in_progress')
    if (inProgress) return inProgress.step_number

    const pending = workflowSteps.find((s) => s.status === 'pending')
    if (pending) return pending.step_number

    return 1
  }, [stepParam, workflowSteps])

  // Navigation functions
  const navigateToStep = React.useCallback(
    (stepNumber: number) => {
      if (stepNumber >= 1 && stepNumber <= TOTAL_STEPS) {
        router.push(`/projects/${projectId}?step=${stepNumber}`)
      }
    },
    [router, projectId]
  )

  const navigateToNextStep = React.useCallback(() => {
    if (currentStepNumber < TOTAL_STEPS) {
      navigateToStep(currentStepNumber + 1)
    }
  }, [currentStepNumber, navigateToStep])

  const navigateToPreviousStep = React.useCallback(() => {
    if (currentStepNumber > 1) {
      navigateToStep(currentStepNumber - 1)
    }
  }, [currentStepNumber, navigateToStep])

  // Step status helpers
  const isStepCompleted = React.useCallback(
    (stepNumber: number) => {
      const step = workflowSteps.find((s) => s.step_number === stepNumber)
      return step?.status === 'approved'
    },
    [workflowSteps]
  )

  const isStepActive = React.useCallback(
    (stepNumber: number) => {
      return stepNumber === currentStepNumber
    },
    [currentStepNumber]
  )

  const isStepLocked = React.useCallback((stepNumber: number) => {
    // A step is locked if it's beyond the current accessible step
    // For now, allow navigation to all steps for demo purposes
    return false
  }, [])

  const getStepStatus = React.useCallback(
    (stepNumber: number): 'completed' | 'active' | 'pending' | 'locked' => {
      if (isStepCompleted(stepNumber)) return 'completed'
      if (isStepActive(stepNumber)) return 'active'
      if (isStepLocked(stepNumber)) return 'locked'
      return 'pending'
    },
    [isStepCompleted, isStepActive, isStepLocked]
  )

  const value: ProjectContextType = {
    projectId,
    project,
    isLoading,
    error: error ?? null,
    workflowSteps,
    currentStepNumber,
    progress,
    navigateToStep,
    navigateToNextStep,
    navigateToPreviousStep,
    isStepCompleted,
    isStepActive,
    isStepLocked,
    getStepStatus,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectContext() {
  const context = React.useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}

// Optional: Hook that doesn't throw if used outside provider
export function useOptionalProjectContext() {
  return React.useContext(ProjectContext)
}
