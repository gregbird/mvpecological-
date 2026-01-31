'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
  } = useProjectContext()

  // Determine which phases to expand by default (the one containing current step)
  const currentPhase = getPhaseByStepNumber(currentStepNumber)
  const defaultExpandedPhases = currentPhase ? [currentPhase.id] : ['desk-research']

  if (isLoading) {
    return (
      <aside className="border-border bg-card flex h-full w-[280px] flex-col border-r">
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

  return (
    <aside className="border-border bg-card flex h-full w-[280px] flex-col border-r">
      {/* Back Link */}
      <div className="border-border flex h-14 items-center border-b px-4">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
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
