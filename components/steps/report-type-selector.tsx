'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { REPORT_TYPES } from '@/lib/config/template-types'
import { useAddProjectReportType } from '@/hooks/queries/use-project-report-types'
import type { Report } from '@/types/database'

const REPORT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_TYPES.map((r) => [r.id, r.name])
)

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  internal_review: {
    label: 'Review',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  client_review: {
    label: 'Client Review',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  final: {
    label: 'Final',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  not_started: {
    label: 'Not Started',
    className: 'bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500',
  },
}

interface ReportTypeSelectorProps {
  projectId: string
  reportTypes: string[]
  activeReportType: string
  onReportTypeChange: (type: string) => void
  latestReports?: Record<string, Report | undefined>
  allowAdd?: boolean
}

export function ReportTypeSelector({
  projectId,
  reportTypes,
  activeReportType,
  onReportTypeChange,
  latestReports,
  allowAdd = true,
}: ReportTypeSelectorProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const addReportType = useAddProjectReportType()

  const availableToAdd = REPORT_TYPES.filter((r) => !reportTypes.includes(r.id))

  const handleAdd = async (typeId: string) => {
    await addReportType.mutateAsync({ projectId, reportType: typeId })
    setShowAddDialog(false)
    onReportTypeChange(typeId)
  }

  if (reportTypes.length === 0) return null

  return (
    <>
      <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b pb-0">
        {reportTypes.map((type) => {
          const isActive = type === activeReportType
          const report = latestReports?.[type]
          const status = report?.status || 'not_started'
          const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.not_started

          return (
            <button
              key={type}
              onClick={() => onReportTypeChange(type)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {REPORT_TYPE_LABELS[type] || type}
              <Badge
                variant="secondary"
                className={cn('px-1.5 py-0 text-[10px]', statusStyle.className)}
              >
                {statusStyle.label}
              </Badge>
            </button>
          )
        })}
        {allowAdd && availableToAdd.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-8 gap-1 text-xs text-gray-400 hover:text-gray-600"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Report
          </Button>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Add Report Type</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Select a report type to add to this project.
          </DialogDescription>
          <div className="mt-2 space-y-2">
            {availableToAdd.map((type) => (
              <button
                key={type.id}
                onClick={() => handleAdd(type.id)}
                disabled={addReportType.isPending}
                className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                <Checkbox checked={false} className="pointer-events-none" />
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-muted-foreground text-xs">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
