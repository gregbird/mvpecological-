'use client'

import Link from 'next/link'
import { CornerDownRight, BookOpen, Compass, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { WORKFLOW_PHASES, ALL_WORKFLOW_STEPS } from '@/lib/config/workflow'
import type { Project, WorkflowStep } from '@/types/database'

// Icons matching Bolt.new reference design
const PHASE_ICONS: Record<string, LucideIcon> = {
  'desk-research': BookOpen,
  'field-research': Compass,
  reporting: BarChart3,
}

interface ProjectDetailModalProps {
  project: Project | null
  workflowSteps: WorkflowStep[]
  teamName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StatusIcon({ status }: { status: string }) {
  const s = 18
  const c = 9
  const r = 6.5

  switch (status) {
    case 'approved':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
          <circle cx={c} cy={c} r={r} fill="#111827" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="#111827" strokeWidth="1.5" />
          <path d={`M ${c} ${c - r} A ${r} ${r} 0 0 0 ${c} ${c + r} Z`} fill="#111827" />
        </svg>
      )
    case 'needs_review':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="#4b5563" strokeWidth="1.5" />
          <path d={`M ${c} ${c - r} A ${r} ${r} 0 0 0 ${c} ${c + r} Z`} fill="#4b5563" />
        </svg>
      )
    case 'blocked':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="#d1d5db" strokeWidth="1.5" />
        </svg>
      )
    default:
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="#d1d5db" strokeWidth="1.5" />
        </svg>
      )
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Completed'
    case 'in_progress':
      return 'In Progress'
    case 'needs_review':
      return 'Needs Review'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Not Started'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'text-green-600'
    case 'in_progress':
      return 'text-blue-600'
    case 'needs_review':
      return 'text-amber-600'
    case 'blocked':
      return 'text-red-600'
    default:
      return 'text-gray-500'
  }
}

export function ProjectDetailModal({
  project,
  workflowSteps,
  teamName,
  open,
  onOpenChange,
}: ProjectDetailModalProps) {
  if (!project) return null

  const phaseData = WORKFLOW_PHASES.map((phase) => {
    const dbPhaseId = phase.id.replace('-', '_')
    const dbSteps = workflowSteps.filter((ws) => ws.phase === dbPhaseId)
    const completed = dbSteps.filter((s) => s.status === 'approved').length
    const total = phase.steps.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { ...phase, dbSteps, completed, total, percentage }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[800px] gap-0 overflow-y-auto p-0">
        {/* Header */}
        <div className="border-b border-gray-100 px-8 pt-8 pb-5">
          <DialogTitle className="pr-8 text-2xl font-bold text-gray-900">
            {project.name}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-500">
            Site Code: {project.site_code || 'N/A'}
            <span className="mx-3 text-gray-300">|</span>
            Project ID: {project.id}
            {teamName && (
              <>
                <span className="mx-3 text-gray-300">|</span>
                Team: {teamName}
              </>
            )}
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="px-8 pt-6 pb-8">
          {/* Phase Summary Cards */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            {phaseData.map((phase) => {
              const PhaseIcon = PHASE_ICONS[phase.id] || phase.icon
              return (
                <div
                  key={phase.id}
                  className="rounded-lg border border-gray-200 px-5 py-4"
                >
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <PhaseIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {phase.label}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-gray-500">
                    {phase.completed} of {phase.total} completed
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${phase.percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-gray-500">
                      {phase.percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Accordion Steps */}
          <Accordion type="multiple" className="mb-6 w-full">
            {phaseData.map((phase) => {
              const PhaseIcon = PHASE_ICONS[phase.id] || phase.icon
              return (
                <AccordionItem
                  key={phase.id}
                  value={phase.id}
                  className="border-b border-gray-200 last:border-b-0"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <PhaseIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-[15px] font-medium text-gray-900">
                        {phase.label} Steps
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      {phase.steps.map((step) => {
                        const dbStep = phase.dbSteps.find(
                          (s) => s.step_number === step.number
                        )
                        const status = dbStep?.status || 'pending'
                        const prevStep = ALL_WORKFLOW_STEPS.find(
                          (s) => s.number === step.number - 1
                        )

                        return (
                          <div
                            key={step.number}
                            className="flex items-start gap-4 rounded-lg border border-gray-200 px-5 py-4"
                          >
                            <div className="mt-1">
                              <StatusIcon status={status} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900">
                                {step.label}
                              </p>
                              <p className="mt-0.5 text-sm text-gray-500">
                                {step.description}
                              </p>
                              {prevStep && (
                                <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                                  <CornerDownRight className="h-3 w-3" />
                                  Depends on: {prevStep.label}
                                </p>
                              )}
                            </div>
                            <span
                              className={`mt-1 whitespace-nowrap text-sm font-medium ${getStatusColor(status)}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {/* Status Legend */}
          <div className="border-t border-gray-200 pt-5">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Status Legend
            </p>
            <div className="flex flex-wrap items-center gap-5">
              {[
                { status: 'pending', label: 'Not Started' },
                { status: 'in_progress', label: 'In Progress' },
                { status: 'approved', label: 'Completed' },
                { status: 'needs_review', label: 'Needs Review' },
                { status: 'blocked', label: 'Blocked' },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <StatusIcon status={item.status} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Go to Project */}
          <div className="mt-5 flex justify-end">
            <Button asChild size="sm">
              <Link href={`/projects/${project.id}`}>Go to Project</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
