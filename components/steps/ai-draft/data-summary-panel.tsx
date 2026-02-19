'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DataSummaryPanelProps {
  habitatTotal: number
  observationTotal: number
  protectedCount: number
  findingsTotal: number
}

export function DataSummaryPanel({
  habitatTotal,
  observationTotal,
  protectedCount,
  findingsTotal,
}: DataSummaryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Habitats Mapped</span>
            <Badge variant="outline">{habitatTotal}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Species Observed</span>
            <Badge variant="outline">{observationTotal}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Protected Species</span>
            <Badge variant={protectedCount > 0 ? 'destructive' : 'outline'}>{protectedCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Desk Findings</span>
            <Badge variant="outline">{findingsTotal}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
