'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProjectContext } from '@/contexts/project-context'
import { WORKFLOW_PHASES, getPhaseByStepNumber, TOTAL_STEPS } from '@/lib/config/workflow'

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

  // Determine which phases to expand by default (the one containing current step)
  const currentPhase = getPhaseByStepNumber(currentStepNumber)
  const defaultExpandedPhases = currentPhase ? [currentPhase.id] : ['desk-research']

  if (isLoading) {
    return (
      <aside
        className={cn(
          'border-border bg-card flex h-full flex-col border-r transition-all duration-300',
          isSidebarCollapsed ? 'w-[60px]' : 'w-[280px]'
        )}
      >
        <div className="border-border flex h-14 items-center border-b px-4">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-10 animate-pulse rounded" />
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
          <div className="border-border flex flex-col items-center gap-2 border-b py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${progress}, 100`}
                      className="text-emerald-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                    {completedSteps}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {completedSteps} of {TOTAL_STEPS} steps complete
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

                return (
                  <Tooltip key={phase.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          // Navigate to first step in phase
                          const firstStep = phaseSteps[0]
                          if (firstStep) navigateToStep(firstStep.number)
                        }}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                          hasActiveStep
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

      {/* Project Header */}
      <div className="border-border border-b px-4 py-4">
        <h2 className="text-foreground mb-1 truncate font-semibold">
          {project?.name || 'Loading...'}
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">
            {project?.site_code || project?.id?.slice(0, 8)}
          </span>
          <span
            className={cn('h-2 w-2 rounded-full', {
              'bg-emerald-500': project?.status === 'active',
              'bg-amber-500': project?.status === 'archived',
              'bg-green-500': project?.status === 'completed',
              'bg-muted-foreground': project?.status === 'draft',
            })}
          />
          <span className="text-muted-foreground text-xs capitalize">{project?.status}</span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {completedSteps} of {TOTAL_STEPS} steps
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Workflow Phases */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <Accordion type="multiple" defaultValue={defaultExpandedPhases} className="space-y-1">
            {WORKFLOW_PHASES.map((phase) => {
              const phaseSteps = phase.steps
              const completedInPhase = phaseSteps.filter(
                (s) => getStepStatus(s.number) === 'completed'
              ).length
              const isPhaseComplete = completedInPhase === phaseSteps.length
              const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')

              return (
                <AccordionItem key={phase.id} value={phase.id} className="border-none">
                  <AccordionTrigger
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:no-underline',
                      hasActiveStep
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <phase.icon
                      className={cn(
                        'h-4 w-4',
                        isPhaseComplete && 'text-emerald-500',
                        hasActiveStep && 'text-emerald-600 dark:text-emerald-400'
                      )}
                    />
                    <span className="flex-1 text-left">{phase.label}</span>
                    {isPhaseComplete && (
                      <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-1">
                    <div className="border-border ml-3 space-y-0.5 border-l-2 pl-4">
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
                              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                              isActive &&
                                'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                              isCompleted &&
                                'text-muted-foreground hover:bg-muted hover:text-foreground',
                              isLocked && 'text-muted-foreground/50 cursor-not-allowed',
                              !isActive &&
                                !isCompleted &&
                                !isLocked &&
                                'text-foreground hover:bg-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
                                isActive && 'bg-emerald-500 text-white',
                                isCompleted &&
                                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
                                isLocked && 'bg-muted text-muted-foreground/50',
                                !isActive &&
                                  !isCompleted &&
                                  !isLocked &&
                                  'bg-muted text-muted-foreground'
                              )}
                            >
                              {isCompleted ? <Check className="h-3 w-3" /> : step.number}
                            </span>
                            <span className="truncate">{step.label}</span>
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
