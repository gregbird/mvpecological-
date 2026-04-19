import {
  Map,
  Search,
  FileCheck,
  Clipboard,
  BarChart3,
  Sparkles,
  CheckCircle,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface WorkflowStep {
  number: number
  label: string
  icon: LucideIcon
  description: string
}

export interface WorkflowPhase {
  id: string
  label: string
  icon: LucideIcon
  color: string
  steps: WorkflowStep[]
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 'desk-research',
    label: 'Desk Research',
    icon: Search,
    color: 'blue',
    steps: [
      {
        number: 1,
        label: 'GIS Mapping',
        icon: Map,
        description: 'Upload project map and define site boundaries',
      },
      {
        number: 2,
        label: 'Data Gathering',
        icon: Search,
        description: 'Gather data from external sources (NPWS, NBDC, EPA)',
      },
      {
        number: 3,
        label: 'Desk Assessment',
        icon: FileCheck,
        description: 'Complete desk-based ecological assessment',
      },
    ],
  },
  {
    id: 'field-research',
    label: 'Field Research',
    icon: Clipboard,
    color: 'amber',
    steps: [
      {
        number: 4,
        label: 'Field Research',
        icon: Clipboard,
        description: 'Field surveys, habitat mapping and target notes',
      },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: BarChart3,
    color: 'purple',
    steps: [
      {
        number: 5,
        label: 'Data Analysis',
        icon: BarChart3,
        description: 'Analyse and visualize collected data',
      },
      {
        number: 6,
        label: 'AI Draft',
        icon: Sparkles,
        description: 'Generate AI-assisted report draft',
      },
      {
        number: 7,
        label: 'Quality Review',
        icon: CheckCircle,
        description: 'Review and quality check report',
      },
      {
        number: 8,
        label: 'Final Submission',
        icon: Send,
        description: 'Submit final report',
      },
    ],
  },
]

// Flatten all steps for easy lookup
export const ALL_WORKFLOW_STEPS = WORKFLOW_PHASES.flatMap((phase) => phase.steps)

// Get step by number
export function getStepByNumber(stepNumber: number): WorkflowStep | undefined {
  return ALL_WORKFLOW_STEPS.find((step) => step.number === stepNumber)
}

// Get phase by step number
export function getPhaseByStepNumber(stepNumber: number): WorkflowPhase | undefined {
  return WORKFLOW_PHASES.find((phase) => phase.steps.some((step) => step.number === stepNumber))
}

// Get phase color classes
export function getPhaseColorClasses(phaseId: string): {
  bg: string
  text: string
  border: string
  bgLight: string
} {
  switch (phaseId) {
    case 'desk-research':
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        bgLight: 'bg-blue-50 dark:bg-blue-950/30',
      }
    case 'field-research':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      }
    case 'reporting':
      return {
        bg: 'bg-purple-500',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        bgLight: 'bg-purple-50 dark:bg-purple-950/30',
      }
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        bgLight: 'bg-gray-50 dark:bg-gray-950/30',
      }
  }
}

// Total steps count
export const TOTAL_STEPS = 8

/**
 * Step dependency map — when a step is edited after approval/during review,
 * its direct downstream dependents should be flagged as needs_review.
 * The cascade resolver walks this graph transitively, so only direct edges
 * need to be declared here.
 */
export const STEP_DEPENDENCIES: Record<number, number[]> = {
  1: [2, 3], // GIS boundary → Data Gathering, Desk Assessment
  2: [3], // Findings → Desk Assessment
  3: [5, 6], // Desk Assessment AI insights are read by Data Analysis + AI Draft
  4: [5], // Field Research → Data Analysis
  5: [6], // Data Analysis → AI Draft
  6: [7], // AI Draft → Quality Review
  7: [8], // Quality Review → Final Submission
  8: [], // Final step has no downstream
}

/**
 * Walks STEP_DEPENDENCIES transitively starting from `stepNumber` and returns
 * every downstream step that should be flagged for review.
 */
export function resolveDownstreamSteps(stepNumber: number): Set<number> {
  const visited = new Set<number>()
  const queue: number[] = [...(STEP_DEPENDENCIES[stepNumber] ?? [])]
  while (queue.length > 0) {
    const next = queue.shift()!
    if (visited.has(next)) continue
    visited.add(next)
    queue.push(...(STEP_DEPENDENCIES[next] ?? []))
  }
  return visited
}

/**
 * Role-based step access control
 * Defines which steps each user role can access.
 * Steps not listed are locked (hidden/disabled) for that role.
 */
export const ROLE_STEP_ACCESS: Record<string, number[]> = {
  admin: [1, 2, 3, 4, 5, 6, 7, 8],
  project_manager: [1, 2, 3, 4, 5, 6, 7, 8],
  ecologist: [1, 2, 3, 4, 5, 6, 7, 8],
  assessor: [1, 2, 3, 4, 5, 6, 7, 8], // deprecated, maps to ecologist
  junior: [2, 4], // Data Gathering + Field Research
  third_party: [4], // Field Research only
  client: [], // No step access (read-only project view)
}

/**
 * Check if a role can access a specific step
 */
export function canRoleAccessStep(role: string, stepNumber: number): boolean {
  const allowedSteps = ROLE_STEP_ACCESS[role]
  if (!allowedSteps) return false
  return allowedSteps.includes(stepNumber)
}
