'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { WorkflowStep as WorkflowStepConfig } from '@/lib/config/workflow'

export type StepStatus = 'completed' | 'active' | 'pending' | 'locked' | 'needs_review'

interface WorkflowStepItemProps {
  step: WorkflowStepConfig
  status: StepStatus
  phaseColors: {
    bg: string
    text: string
    border: string
    bgLight: string
  }
  onNavigate: (stepNumber: number) => void
}

export function WorkflowStepItem({ step, status, phaseColors, onNavigate }: WorkflowStepItemProps) {
  const isActive = status === 'active'
  const isCompleted = status === 'completed'
  const isLocked = status === 'locked'
  const isNeedsReview = status === 'needs_review'

  return (
    <button
      onClick={() => !isLocked && onNavigate(step.number)}
      disabled={isLocked}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all',
        isActive && cn(phaseColors.bgLight, 'font-medium', phaseColors.text),
        isCompleted && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        isNeedsReview &&
          'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50',
        isLocked && 'cursor-not-allowed opacity-40',
        !isActive && !isCompleted && !isLocked && !isNeedsReview && 'text-foreground hover:bg-muted'
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
          isActive && cn(phaseColors.bg, 'text-white'),
          isCompleted &&
            'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
          isNeedsReview && 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
          isLocked && 'bg-muted text-muted-foreground/50',
          !isActive &&
            !isCompleted &&
            !isLocked &&
            !isNeedsReview &&
            'bg-muted text-muted-foreground'
        )}
      >
        {isCompleted ? <Check className="h-3 w-3" /> : step.number}
      </span>
      <span className="flex-1 truncate text-left">{step.label}</span>
    </button>
  )
}
