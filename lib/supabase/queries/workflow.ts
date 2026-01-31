import { createClient } from '@/lib/supabase/client'
import type { Database, WorkflowStep } from '@/types/database'

type InsertWorkflowStep = Database['public']['Tables']['workflow_steps']['Insert']
type UpdateWorkflowStep = Database['public']['Tables']['workflow_steps']['Update']

// Default workflow steps for a project
export const DEFAULT_WORKFLOW_STEPS = [
  { step_number: 1, name: 'GIS Mapping', phase: 'desk_research' as const },
  { step_number: 2, name: 'Data Gathering', phase: 'desk_research' as const },
  { step_number: 3, name: 'Desk Assessment', phase: 'desk_research' as const },
  { step_number: 4, name: 'Field Survey', phase: 'field_research' as const },
  { step_number: 5, name: 'Habitat Mapping', phase: 'field_research' as const },
  { step_number: 6, name: 'Target Notes', phase: 'field_research' as const },
  { step_number: 7, name: 'Data Analysis', phase: 'reporting' as const },
  { step_number: 8, name: 'AI Draft', phase: 'reporting' as const },
  { step_number: 9, name: 'Quality Review', phase: 'reporting' as const },
  { step_number: 10, name: 'Final Submission', phase: 'reporting' as const },
]

// Get workflow steps for project
export async function getWorkflowSteps(projectId: string): Promise<WorkflowStep[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('project_id', projectId)
    .order('step_number', { ascending: true })

  if (error) {
    // Supabase bağlantısı yoksa veya tablo yoksa sessizce devam et (mock data kullanılacak)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Workflow steps fetch skipped - using mock data:', error.code)
    }
    return []
  }

  return (data ?? []) as WorkflowStep[]
}

// Get single workflow step
export async function getWorkflowStep(
  projectId: string,
  stepNumber: number
): Promise<WorkflowStep | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_number', stepNumber)
    .single()

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Workflow step fetch skipped - using mock data:', error.code)
    }
    return null
  }

  return data as WorkflowStep
}

// Initialize workflow steps for new project
export async function initializeWorkflowSteps(projectId: string): Promise<WorkflowStep[]> {
  const supabase = createClient()
  const steps: InsertWorkflowStep[] = DEFAULT_WORKFLOW_STEPS.map((step) => ({
    project_id: projectId,
    step_number: step.step_number,
    name: step.name,
    phase: step.phase,
    status: step.step_number === 1 ? 'in_progress' : 'pending',
  }))

  const { data, error } = await supabase
    .from('workflow_steps')
    .insert(steps as Database['public']['Tables']['workflow_steps']['Insert'][])
    .select()

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Workflow initialization skipped:', error.code)
    }
    return []
  }

  return (data ?? []) as unknown as WorkflowStep[]
}

// Update workflow step
export async function updateWorkflowStep(
  stepId: string,
  updates: UpdateWorkflowStep
): Promise<WorkflowStep | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', stepId)
    .select()
    .single()

  if (error) {
    console.error('Error updating workflow step:', error)
    return null
  }

  return data as unknown as WorkflowStep
}

// Complete a workflow step and advance to next
export async function completeWorkflowStep(
  projectId: string,
  stepNumber: number
): Promise<{ current: WorkflowStep | null; next: WorkflowStep | null }> {
  const supabase = createClient()

  // Mark current step as approved
  const { data: currentStep, error: currentError } = await supabase
    .from('workflow_steps')
    .update({
      status: 'approved',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('step_number', stepNumber)
    .select()
    .single()

  if (currentError) {
    console.error('Error completing workflow step:', currentError)
    return { current: null, next: null }
  }

  // If not the last step, activate next step
  let nextStep: WorkflowStep | null = null
  if (stepNumber < 10) {
    const { data, error: nextError } = await supabase
      .from('workflow_steps')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('step_number', stepNumber + 1)
      .select()
      .single()

    if (nextError) {
      console.error('Error activating next workflow step:', nextError)
    } else {
      nextStep = data as unknown as WorkflowStep
    }

    // Update project phase if needed
    const currentStepData = currentStep as unknown as WorkflowStep
    const nextPhase = DEFAULT_WORKFLOW_STEPS.find((s) => s.step_number === stepNumber + 1)?.phase
    if (nextPhase && nextPhase !== currentStepData.phase) {
      await supabase
        .from('projects')
        .update({ current_phase: nextPhase, updated_at: new Date().toISOString() })
        .eq('id', projectId)
    }
  } else {
    // Last step completed - mark project as completed
    await supabase
      .from('projects')
      .update({
        status: 'completed',
        actual_end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }

  return { current: currentStep as unknown as WorkflowStep, next: nextStep }
}

// Start a workflow step
export async function startWorkflowStep(
  projectId: string,
  stepNumber: number
): Promise<WorkflowStep | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('step_number', stepNumber)
    .select()
    .single()

  if (error) {
    console.error('Error starting workflow step:', error)
    return null
  }

  return data as unknown as WorkflowStep
}

// Mark step as needs review
export async function submitForReview(
  projectId: string,
  stepNumber: number
): Promise<WorkflowStep | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .update({
      status: 'needs_review',
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('step_number', stepNumber)
    .select()
    .single()

  if (error) {
    console.error('Error submitting step for review:', error)
    return null
  }

  return data as unknown as WorkflowStep
}

// Calculate project progress
export function calculateProgress(steps: WorkflowStep[]): number {
  if (steps.length === 0) return 0
  const completedSteps = steps.filter((s) => s.status === 'approved').length
  return Math.round((completedSteps / steps.length) * 100)
}

// Get current step number
export function getCurrentStep(steps: WorkflowStep[]): number {
  const inProgressStep = steps.find((s) => s.status === 'in_progress')
  if (inProgressStep) return inProgressStep.step_number

  const lastApprovedStep = steps
    .filter((s) => s.status === 'approved')
    .sort((a, b) => b.step_number - a.step_number)[0]

  if (lastApprovedStep) {
    return Math.min(lastApprovedStep.step_number + 1, 10)
  }

  return 1
}
