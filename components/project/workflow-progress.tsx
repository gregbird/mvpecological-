'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  WORKFLOW_PHASES,
  TOTAL_STEPS,
  getPhaseColorClasses,
  type WorkflowPhase,
} from '@/lib/config/workflow'
import { WorkflowStepItem, type StepStatus } from '@/components/project/workflow-step-item'

interface WorkflowProgressProps {
  project: {
    name?: string
    status?: string
    site_code?: string | null
    id?: string
  } | null
  completedSteps: number
  progress: number
  currentStepNumber: number
  defaultExpandedPhases: string[]
  isHeaderCollapsed: boolean
  onHeaderToggle: () => void
  getStepStatus: (stepNumber: number) => StepStatus
  navigateToStep: (stepNumber: number) => void
}

export function WorkflowProgress({
  project,
  completedSteps,
  progress,
  currentStepNumber: _currentStepNumber,
  defaultExpandedPhases,
  isHeaderCollapsed,
  onHeaderToggle,
  getStepStatus,
  navigateToStep,
}: WorkflowProgressProps) {
  return (
    <>
      {/* Project Header - Collapsible */}
      <ProjectHeader
        project={project}
        completedSteps={completedSteps}
        isHeaderCollapsed={isHeaderCollapsed}
        onHeaderToggle={onHeaderToggle}
        getStepStatus={getStepStatus}
      />

      {/* Workflow Phases */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          <Accordion type="multiple" defaultValue={defaultExpandedPhases}>
            {WORKFLOW_PHASES.map((phase) => (
              <PhaseAccordionItem
                key={phase.id}
                phase={phase}
                getStepStatus={getStepStatus}
                navigateToStep={navigateToStep}
              />
            ))}
          </Accordion>
        </div>
      </ScrollArea>

      {/* Collapsed Progress Ring for tooltip */}
      <CollapsedProgressRing
        completedSteps={completedSteps}
        progress={progress}
        className="hidden"
      />
    </>
  )
}

/** Collapsible project header with progress bar */
function ProjectHeader({
  project,
  completedSteps,
  isHeaderCollapsed,
  onHeaderToggle,
  getStepStatus,
}: {
  project: WorkflowProgressProps['project']
  completedSteps: number
  isHeaderCollapsed: boolean
  onHeaderToggle: () => void
  getStepStatus: (stepNumber: number) => StepStatus
}) {
  const ChevronDown = React.lazy(() =>
    import('lucide-react').then((mod) => ({ default: mod.ChevronDown }))
  )
  const ChevronUp = React.lazy(() =>
    import('lucide-react').then((mod) => ({ default: mod.ChevronUp }))
  )

  return (
    <div className="border-border border-b">
      <div className="flex items-center gap-1 px-4 py-3">
        <button
          onClick={onHeaderToggle}
          className="hover:bg-muted/50 flex min-w-0 flex-1 items-center justify-between rounded-md px-1 py-1 transition-colors"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="text-foreground truncate text-sm font-semibold">
              {project?.name || 'Loading...'}
            </h2>
            <Badge
              variant="outline"
              className={cn('h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize', {
                'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400':
                  project?.status === 'active',
                'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400':
                  project?.status === 'archived',
                'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400':
                  project?.status === 'completed',
                'border-border bg-muted text-muted-foreground': project?.status === 'draft',
              })}
            >
              {project?.status}
            </Badge>
          </div>
          <React.Suspense fallback={null}>
            {isHeaderCollapsed ? (
              <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
            ) : (
              <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
          </React.Suspense>
        </button>
      </div>

      {/* Expanded Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isHeaderCollapsed ? 'max-h-0' : 'max-h-40'
        )}
      >
        <div className="space-y-3 px-4 pb-4">
          <code className="bg-muted text-muted-foreground inline-block rounded px-1.5 py-0.5 font-mono text-[11px]">
            {project?.site_code || project?.id?.slice(0, 8)}
          </code>

          {/* Segmented progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Progress</span>
              <span className="text-foreground text-xs font-semibold">
                {completedSteps} of {TOTAL_STEPS} steps
              </span>
            </div>
            <div className="flex gap-1">
              {WORKFLOW_PHASES.map((phase) => {
                const phaseSteps = phase.steps
                const completedInPhase = phaseSteps.filter(
                  (s) => getStepStatus(s.number) === 'completed'
                ).length
                const phasePercentage = (completedInPhase / phaseSteps.length) * 100
                const colors = getPhaseColorClasses(phase.id)

                return (
                  <div
                    key={phase.id}
                    className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                  >
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                        colors.bg
                      )}
                      style={{ width: `${phasePercentage}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>Desk</span>
              <span>Field</span>
              <span>Report</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Single phase accordion item with its steps */
function PhaseAccordionItem({
  phase,
  getStepStatus,
  navigateToStep,
}: {
  phase: WorkflowPhase
  getStepStatus: (stepNumber: number) => StepStatus
  navigateToStep: (stepNumber: number) => void
}) {
  const phaseSteps = phase.steps
  const completedInPhase = phaseSteps.filter((s) => getStepStatus(s.number) === 'completed').length
  const isPhaseComplete = completedInPhase === phaseSteps.length
  const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')
  const colors = getPhaseColorClasses(phase.id)

  return (
    <AccordionItem value={phase.id} className="border-b-0">
      <AccordionTrigger
        className={cn(
          'hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:no-underline',
          hasActiveStep && colors.text
        )}
      >
        <phase.icon
          className={cn(
            'h-4 w-4 shrink-0',
            isPhaseComplete
              ? 'text-emerald-500'
              : hasActiveStep
                ? colors.text
                : 'text-muted-foreground'
          )}
        />
        <span className="flex-1 text-left">{phase.label}</span>
        <span className="text-muted-foreground mr-1 text-[11px] font-normal">
          {completedInPhase}/{phaseSteps.length}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-1">
        <div className="border-border ml-4 space-y-0.5 border-l pl-4">
          {phaseSteps.map((step) => (
            <WorkflowStepItem
              key={step.number}
              step={step}
              status={getStepStatus(step.number)}
              phaseColors={colors}
              onNavigate={navigateToStep}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

/** Collapsed sidebar progress ring */
export function CollapsedProgressRing({
  completedSteps,
  progress,
  className,
}: {
  completedSteps: number
  progress: number
  className?: string
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn('border-border flex flex-col items-center gap-2 border-b py-4', className)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-11 w-11">
              <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-muted"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="2.5"
                  strokeDasharray={`${progress}, 100`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {completedSteps}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">
              {completedSteps} of {TOTAL_STEPS} complete
            </p>
            <p className="text-muted-foreground text-xs">{Math.round(progress)}% progress</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
