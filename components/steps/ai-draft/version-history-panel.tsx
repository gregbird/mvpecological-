'use client'

import { Eye, GitCompareArrows, RotateCcw, History } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useReports } from '@/hooks/queries/use-report-hooks'
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
        <ScrollArea className="max-h-64">
          <div className="space-y-1 px-6 pb-4">
            {reports.map((report) => {
              const isCurrent = report.id === currentReportId
              const content = report.content as unknown as ReportContent | null
              const sourceVersion = content?.metadata?.sourceVersion

              return (
                <div
                  key={report.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                    isCurrent ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{report.version}</span>
                    <Badge variant={STATUS_VARIANT[report.status] ?? 'outline'} className="text-xs">
                      {report.status.replace('_', ' ')}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    {sourceVersion !== undefined && (
                      <span className="text-muted-foreground text-xs">
                        restored from v{sourceVersion}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
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
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
