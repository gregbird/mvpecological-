'use client'

import Link from 'next/link'
import { BookOpen, Compass, BarChart3, AlertTriangle, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { WORKFLOW_PHASES } from '@/lib/config/workflow'
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
  leadName?: string
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

function formatStepDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ProjectDetailModal({
  project,
  workflowSteps,
  leadName,
  open,
  onOpenChange,
}: ProjectDetailModalProps) {
  if (!project) return null

  // Config step numarasına göre DB step'ini bul
  const phaseData = WORKFLOW_PHASES.map((phase) => {
    const mappedSteps = phase.steps.map((configStep) => ({
      configStep,
      dbStep: workflowSteps.find((ws) => ws.step_number === configStep.number) ?? null,
    }))

    const total = phase.steps.length
    const completed = mappedSteps.filter((m) => m.dbStep?.status === 'approved').length
    const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0

    return { ...phase, mappedSteps, completed, total, percentage }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-200 gap-0 overflow-y-auto p-0">
        {/* Header */}
        <div className="border-border border-b px-8 pt-8 pb-5">
          <DialogTitle className="text-foreground pr-8 text-2xl font-bold">
            {project.name}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-500">
            Site Code: {project.site_code || 'N/A'}
            <span className="mx-3 text-gray-300">|</span>
            Project ID: {project.id}
            {leadName && (
              <>
                <span className="mx-3 text-gray-300">|</span>
                Lead: {leadName}
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
                <div key={phase.id} className="border-border rounded-lg border px-5 py-4">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <PhaseIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-foreground text-sm font-semibold">{phase.label}</span>
                  </div>
                  <p className="mb-4 text-sm text-gray-500">
                    {phase.completed} of {phase.total} completed
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
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
                  className="border-border border-b last:border-b-0"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <PhaseIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-foreground text-[15px] font-medium">
                        {phase.label} Steps
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      {phase.mappedSteps.map(({ configStep, dbStep }, index) => {
                        const status = dbStep?.status || 'pending'
                        const completedDate = formatStepDate(dbStep?.completed_at)
                        const startedDate = formatStepDate(dbStep?.started_at)

                        // Blocker: önceki config step tamamlanmamışsa
                        let blockerStepName: string | null = null
                        if ((status === 'pending' || status === 'blocked') && index > 0) {
                          const prevMapped = phase.mappedSteps[index - 1]
                          if (prevMapped.dbStep && prevMapped.dbStep.status !== 'approved') {
                            blockerStepName = prevMapped.configStep.label
                          }
                        }

                        return (
                          <div
                            key={configStep.number}
                            className="border-border flex items-start gap-4 rounded-lg border px-5 py-4"
                          >
                            <div className="mt-1">
                              <StatusIcon status={status} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground font-semibold">{configStep.label}</p>
                              <p className="mt-0.5 text-sm text-gray-500">
                                {configStep.description}
                              </p>
                              {blockerStepName && (
                                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                  Blocked by: {blockerStepName}
                                </p>
                              )}
                            </div>
                            <div className="mt-1 flex flex-col items-end gap-1">
                              <span
                                className={`text-sm font-medium whitespace-nowrap ${getStatusColor(status)}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                              {status === 'approved' && completedDate && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  {completedDate}
                                </span>
                              )}
                              {status === 'in_progress' && startedDate && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  Started {startedDate}
                                </span>
                              )}
                            </div>
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
          <div className="border-border border-t pt-5">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
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
