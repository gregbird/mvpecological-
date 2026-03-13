'use client'

import * as React from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useProject } from '@/hooks/queries/use-project-hooks'
import { useWorkflowSteps, useProjectProgress } from '@/hooks/queries/use-workflow-hooks'
import type { Project, WorkflowStep } from '@/types/database'
import { TOTAL_STEPS, canRoleAccessStep } from '@/lib/config/workflow'
import { useRole } from '@/contexts/role-context'

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

  // Sidebar state
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Map fullscreen mode (collapses sidebar + header)
  isMapFullscreen: boolean
  setMapFullscreen: (fullscreen: boolean) => void

  // Refresh data
  refetchProject: () => void
  refetchWorkflowSteps: () => void
}

const ProjectContext = React.createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useRole()

  const projectId = params.id as string
  const stepParam = searchParams.get('step')
  const userRole = user?.role || 'client'

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isMapFullscreen, setIsMapFullscreenState] = React.useState(false)

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
    // Trigger resize for map components
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 300) // Wait for animation
  }, [])

  const setSidebarCollapsed = React.useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 300)
  }, [])

  const setMapFullscreen = React.useCallback((fullscreen: boolean) => {
    setIsMapFullscreenState(fullscreen)
    setIsSidebarCollapsed(fullscreen)
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 300)
  }, [])

  // Fetch project and workflow data from Supabase
  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
    refetch: refetchProject,
  } = useProject(projectId)

  const {
    data: workflowSteps = [],
    isLoading: loadingSteps,
    refetch: refetchWorkflowSteps,
  } = useWorkflowSteps(projectId)

  const supabaseProgress = useProjectProgress(projectId)

  const progress = React.useMemo(() => {
    if (supabaseProgress > 0) return supabaseProgress
    // Calculate from workflow steps
    const completedSteps = workflowSteps.filter((s) => s.status === 'approved').length
    return Math.round((completedSteps / TOTAL_STEPS) * 100)
  }, [supabaseProgress, workflowSteps])

  const isLoading = loadingProject || loadingSteps
  const error = projectError

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

  const isStepLocked = React.useCallback(
    (stepNumber: number) => {
      return !canRoleAccessStep(userRole, stepNumber)
    },
    [userRole]
  )

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
    project: project ?? null,
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
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    isMapFullscreen,
    setMapFullscreen,
    refetchProject,
    refetchWorkflowSteps,
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
