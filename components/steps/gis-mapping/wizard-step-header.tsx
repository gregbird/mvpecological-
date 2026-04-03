'use client'

import * as React from 'react'
import { Check, Globe, MapPin, Circle, Layers } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { WIZARD_STEPS, type WizardStep } from '@/hooks/gis/use-gis-wizard'

interface WizardStepHeaderProps {
  currentStep: WizardStep
  currentStepIndex: number
  isMapMode: boolean
  isComplete: boolean
  hasSites: boolean
  hasAnySiteBoundary: boolean
  onStepClick: (stepId: WizardStep) => void
}

const stepIcons: Record<string, typeof Globe> = {
  source: Globe,
  sites: MapPin,
  boundary: MapPin,
  buffers: Circle,
  layers: Layers,
}

export function WizardStepHeader({
  currentStep,
  currentStepIndex,
  isMapMode,
  isComplete,
  hasSites,
  hasAnySiteBoundary,
  onStepClick,
}: WizardStepHeaderProps) {
  return (
    <div
      className={cn(
        'border-border bg-card shrink-0 border-b transition-all duration-300',
        isMapMode ? 'px-4 py-2' : 'px-6 py-4'
      )}
    >
      {!isMapMode && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">GIS Mapping</h2>
            <p className="text-muted-foreground text-sm">Define your project boundary</p>
          </div>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {isComplete ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
      )}

      {/* Step indicators */}
      <div
        className={cn('flex items-center', isMapMode ? 'justify-center gap-2' : 'justify-between')}
      >
        {WIZARD_STEPS.map((step, index) => {
          const Icon = stepIcons[step.id] ?? Globe
          const isActive = step.id === currentStep
          const isPast = index < currentStepIndex
          const isClickable =
            isPast ||
            (index === currentStepIndex + 1 &&
              (currentStep !== 'source' || hasSites) &&
              (currentStep !== 'sites' || hasAnySiteBoundary))

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable && !isActive}
                className={cn(
                  'flex items-center gap-1 transition-all',
                  isClickable && 'cursor-pointer',
                  !isClickable && !isActive && 'opacity-40',
                  isMapMode ? 'flex-row' : 'flex-col'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 transition-all',
                    isMapMode ? 'h-7 w-7' : 'h-10 w-10',
                    isActive && 'border-emerald-500 bg-emerald-500 text-white',
                    isPast &&
                      'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
                    !isActive && !isPast && 'border-gray-300 text-gray-400'
                  )}
                >
                  {isPast ? (
                    <Check className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                  ) : (
                    <Icon className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                  )}
                </div>
                <span
                  className={cn(
                    'font-medium',
                    isMapMode ? 'text-[11px]' : 'text-xs',
                    isActive && 'text-emerald-600',
                    isPast && 'text-emerald-600',
                    !isActive && !isPast && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5',
                    isMapMode ? 'w-6' : 'mx-2 flex-1',
                    index < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
