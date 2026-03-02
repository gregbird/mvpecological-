'use client'

import * as React from 'react'
import { Eye, GitCompareArrows, RotateCcw, History, Pencil, Check, X } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useReports, useUpdateVersionName } from '@/hooks/queries/use-report-hooks'
import type { Report } from '@/types/database'
import type { ReportContent } from '@/lib/supabase/queries/reports'

interface VersionHistoryPanelProps {
  projectId: string
  currentReportId: string | null
  onViewVersion: (report: Report) => void
  onCompareVersion: (report: Report) => void
  onRestoreVersion: (report: Report) => void
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  internal_review: 'secondary',
  client_review: 'secondary',
  approved: 'default',
  final: 'default',
}

export function VersionHistoryPanel({
  projectId,
  currentReportId,
  onViewVersion,
  onCompareVersion,
  onRestoreVersion,
}: VersionHistoryPanelProps) {
  const { data: allReports, isLoading } = useReports(projectId)
  const updateVersionName = useUpdateVersionName()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState('')

  if (isLoading) return null

  const reports = allReports ?? []

  if (reports.length <= 1) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Save as New Version to start tracking changes across report drafts.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleStartEdit = (report: Report) => {
    setEditingId(report.id)
    setEditValue(report.version_name || '')
  }

  const handleSaveEdit = async (reportId: string) => {
    const trimmed = editValue.trim()
    await updateVersionName.mutateAsync({ reportId, versionName: trimmed })
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, reportId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(reportId)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Version History
          <Badge variant="secondary" className="ml-auto">
            {reports.length} versions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1 px-6 pb-4">
            {reports.map((report) => {
              const isCurrent = report.id === currentReportId
              const content = report.content as unknown as ReportContent | null
              const sourceVersion = content?.metadata?.sourceVersion
              const isEditing = editingId === report.id

              return (
                <div
                  key={report.id}
                  className={`group flex items-center justify-between rounded-md border px-3 py-2 ${
                    isCurrent ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 text-sm font-medium">v{report.version}</span>

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, report.id)}
                          className="h-6 w-32 text-xs"
                          placeholder="Version name..."
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleSaveEdit(report.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {report.version_name && (
                          <span className="text-muted-foreground truncate text-xs">
                            {report.version_name}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                          onClick={() => handleStartEdit(report)}
                          title="Rename version"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}

                    <Badge
                      variant={STATUS_VARIANT[report.status] ?? 'outline'}
                      className="shrink-0 text-xs"
                    >
                      {report.status.replace('_', ' ')}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="default" className="shrink-0 text-xs">
                        Current
                      </Badge>
                    )}
                    {sourceVersion !== undefined && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        restored from v{sourceVersion}
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-muted-foreground mr-2 text-xs">
                      {format(new Date(report.created_at), 'dd MMM yyyy HH:mm')}
                    </span>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onViewVersion(report)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View version</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onCompareVersion(report)}
                            disabled={isCurrent}
                          >
                            <GitCompareArrows className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Compare with current</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onRestoreVersion(report)}
                            disabled={isCurrent}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore version</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
