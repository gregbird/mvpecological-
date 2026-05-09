'use client'

import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Report } from '@/types/database'

interface ReportStatusCardProps {
  report: Report
  completedSections: number
  totalSections: number
}

export function ReportStatusCard({
  report,
  completedSections,
  totalSections,
}: ReportStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-sm">Report Type</p>
            <p className="font-medium capitalize">{report.report_type.replaceAll('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Version</p>
            <p className="font-medium">{report.version}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Status</p>
            <Badge
              variant={
                report.status === 'approved'
                  ? 'default'
                  : report.status === 'internal_review'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {report.status.replaceAll('_', ' ')}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Sections Complete</p>
            <p className="font-medium">
              {completedSections} / {totalSections}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
