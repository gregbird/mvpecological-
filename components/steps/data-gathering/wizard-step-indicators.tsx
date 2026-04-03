'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardStepIndicatorsProps {
  steps: { id: string; label: string; icon: React.ElementType }[]
  currentStep: string
  currentStepIndex: number
  onStepClick: (stepId: string) => void
  compact?: boolean
}

export function WizardStepIndicators({
  steps,
  currentStep,
  currentStepIndex,
  onStepClick,
  compact = false,
}: WizardStepIndicatorsProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.id === currentStep
          const isPast = index < currentStepIndex
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  'flex cursor-pointer flex-row items-center gap-1 transition-all',
                  !isActive && 'opacity-60 hover:opacity-100'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
                    isActive && 'border-blue-500 bg-blue-500 text-white',
                    isPast && 'border-blue-500 bg-blue-50 text-blue-600',
                    !isActive && !isPast && 'border-gray-300 text-gray-400'
                  )}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isActive && 'text-blue-600',
                    isPast && 'text-blue-600',
                    !isActive && !isPast && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6',
                    index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = step.id === currentStep
        const isPast = index < currentStepIndex

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(step.id)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1 transition-all',
                !isActive && 'opacity-60 hover:opacity-100'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  isActive && 'border-blue-500 bg-blue-500 text-white',
                  isPast && 'border-blue-500 bg-blue-50 text-blue-600',
                  !isActive && !isPast && 'border-gray-300 text-gray-400'
                )}
              >
                {isPast ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive && 'text-blue-600',
                  isPast && 'text-blue-600',
                  !isActive && !isPast && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1',
                  index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
