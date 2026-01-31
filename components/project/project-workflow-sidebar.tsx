'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  PanelLeftClose,
  PanelLeft,
  Circle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useProjectContext } from '@/contexts/project-context'
import {
  WORKFLOW_PHASES,
  getPhaseByStepNumber,
  getPhaseColorClasses,
  TOTAL_STEPS,
} from '@/lib/config/workflow'

export function ProjectWorkflowSidebar() {
  const {
    project,
    workflowSteps,
    currentStepNumber,
    progress,
    navigateToStep,
    getStepStatus,
    isLoading,
    isSidebarCollapsed,
    toggleSidebar,
  } = useProjectContext()

  // Determine which phases to expand by default
  const currentPhase = getPhaseByStepNumber(currentStepNumber)
  const defaultExpandedPhases = currentPhase ? [currentPhase.id] : ['desk-research']

  // Header collapse state - auto collapse when on GIS mapping step (step 1)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = React.useState(currentStepNumber === 1)

  // Update header collapse when step changes
  React.useEffect(() => {
    if (currentStepNumber === 1) {
      setIsHeaderCollapsed(true)
    }
  }, [currentStepNumber])

  if (isLoading) {
    return (
      <aside
        className={cn(
          'bg-background border-border/50 flex h-full flex-col border-r transition-all duration-300',
          isSidebarCollapsed ? 'w-[60px]' : 'w-[300px]'
        )}
      >
        <div className="border-border/50 flex h-14 items-center border-b px-4">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </aside>
    )
  }

  const completedSteps = workflowSteps.filter((s) => s.status === 'approved').length

  // Collapsed view
  if (isSidebarCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <aside className="border-border bg-card flex h-full w-[60px] flex-col border-r transition-all duration-300">
          {/* Toggle Button */}
          <div className="border-border flex h-14 items-center justify-center border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-9 w-9">
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>

          {/* Collapsed Progress */}
          <div className="border-border flex flex-col items-center gap-2 border-b py-4">
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

          {/* Collapsed Phase Icons */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center gap-1 py-2">
              {WORKFLOW_PHASES.map((phase) => {
                const phaseSteps = phase.steps
                const completedInPhase = phaseSteps.filter(
                  (s) => getStepStatus(s.number) === 'completed'
                ).length
                const isPhaseComplete = completedInPhase === phaseSteps.length
                const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')
                const colors = getPhaseColorClasses(phase.id)

                return (
                  <Tooltip key={phase.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          const firstStep = phaseSteps[0]
                          if (firstStep) navigateToStep(firstStep.number)
                        }}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                          hasActiveStep ? colors.bgLight : 'hover:bg-muted',
                          hasActiveStep
                            ? colors.text
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <phase.icon
                          className={cn('h-5 w-5', isPhaseComplete && 'text-emerald-500')}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{phase.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {completedInPhase}/{phaseSteps.length} complete
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </ScrollArea>

          {/* Back to Projects */}
          <div className="border-border border-t py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/projects"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to Projects</TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
    )
  }

  // Expanded view
  return (
    <aside className="border-border bg-card flex h-full w-[280px] flex-col border-r transition-all duration-300">
      {/* Back Link + Toggle */}
      <div className="border-border flex h-14 items-center justify-between border-b px-4">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Project Header - Collapsible */}
      <div className="border-border border-b">
        {/* Collapsed Header - Always visible */}
        <button
          onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 transition-colors"
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
          {isHeaderCollapsed ? (
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          ) : (
            <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
        </button>

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

            {/* Progress - Segmented by phase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">Progress</span>
                <span className="text-foreground text-xs font-semibold">
                  {completedSteps} of {TOTAL_STEPS} steps
                </span>
              </div>
              {/* Segmented progress bar */}
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

      {/* Workflow Phases */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <Accordion type="multiple" defaultValue={defaultExpandedPhases} className="space-y-2">
            {WORKFLOW_PHASES.map((phase) => {
              const phaseSteps = phase.steps
              const completedInPhase = phaseSteps.filter(
                (s) => getStepStatus(s.number) === 'completed'
              ).length
              const isPhaseComplete = completedInPhase === phaseSteps.length
              const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')
              const colors = getPhaseColorClasses(phase.id)

              return (
                <AccordionItem
                  key={phase.id}
                  value={phase.id}
                  className={cn(
                    'rounded-lg border',
                    hasActiveStep ? colors.border : 'border-border'
                  )}
                >
                  <AccordionTrigger
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:no-underline',
                      hasActiveStep ? colors.bgLight : 'hover:bg-muted/50',
                      hasActiveStep ? colors.text : 'text-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        isPhaseComplete
                          ? 'bg-emerald-100 dark:bg-emerald-900'
                          : hasActiveStep
                            ? colors.bgLight
                            : 'bg-muted'
                      )}
                    >
                      {isPhaseComplete ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <phase.icon
                          className={cn(
                            'h-4 w-4',
                            hasActiveStep ? colors.text : 'text-muted-foreground'
                          )}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col items-start gap-0.5">
                      <span className="text-left">{phase.label}</span>
                      <span className="text-muted-foreground text-[10px] font-normal">
                        {completedInPhase}/{phaseSteps.length} steps
                      </span>
                    </div>
                    {/* Mini progress indicator */}
                    <div className="mr-2 flex gap-1">
                      {phaseSteps.map((step) => {
                        const stepStatus = getStepStatus(step.number)
                        return (
                          <div
                            key={step.number}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              stepStatus === 'completed' && 'bg-emerald-500',
                              stepStatus === 'active' && colors.bg,
                              stepStatus === 'pending' && 'bg-muted-foreground/30',
                              stepStatus === 'locked' && 'bg-muted-foreground/20'
                            )}
                          />
                        )
                      })}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-0 pb-2">
                    <div className="space-y-1">
                      {phaseSteps.map((step) => {
                        const status = getStepStatus(step.number)
                        const isActive = status === 'active'
                        const isCompleted = status === 'completed'
                        const isLocked = status === 'locked'

                        return (
                          <button
                            key={step.number}
                            onClick={() => !isLocked && navigateToStep(step.number)}
                            disabled={isLocked}
                            className={cn(
                              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                              isActive && cn(colors.bgLight, 'font-medium', colors.text),
                              isCompleted &&
                                'text-muted-foreground hover:bg-muted hover:text-foreground',
                              isLocked && 'cursor-not-allowed opacity-40',
                              !isActive &&
                                !isCompleted &&
                                !isLocked &&
                                'text-foreground hover:bg-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all',
                                isActive && cn(colors.bg, 'text-white shadow-sm'),
                                isCompleted &&
                                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
                                isLocked && 'bg-muted text-muted-foreground/50',
                                !isActive &&
                                  !isCompleted &&
                                  !isLocked &&
                                  'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20'
                              )}
                            >
                              {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
                            </span>
                            <span className="flex-1 truncate text-left">{step.label}</span>
                            {isActive && (
                              <Circle
                                className={cn('h-2 w-2 animate-pulse fill-current', colors.text)}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </ScrollArea>
    </aside>
  )
}
