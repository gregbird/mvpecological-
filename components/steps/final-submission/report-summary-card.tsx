'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Report } from '@/types/database'

interface ReportSummaryCardProps {
  report: Report
  completedSections: number
  totalSections: number
  habitatTotal: number
  observationTotal: number
  protectedSpeciesTotal: number
}

export function ReportSummaryCard({
  report,
  completedSections,
  totalSections,
  habitatTotal,
  observationTotal,
  protectedSpeciesTotal,
}: ReportSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report Summary
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
            <Badge className={report.status === 'final' ? 'bg-green-600' : ''}>
              {report.status === 'final' ? 'Finalized' : report.status.replaceAll('_', ' ')}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Sections</p>
            <p className="font-medium">
              {completedSections} / {totalSections}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Habitats Mapped</p>
            <p className="text-xl font-bold">{habitatTotal}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Species Observed</p>
            <p className="text-xl font-bold">{observationTotal}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Protected Species</p>
            <p className="text-xl font-bold text-red-600">{protectedSpeciesTotal}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
