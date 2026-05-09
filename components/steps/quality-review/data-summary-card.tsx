'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DataSummaryCardProps {
  selectedSiteId: string | null
  habitatTotal: number
  habitatTotalArea: number
  observationTotal: number
  protectedSpeciesTotal: number
  findingsTotal: number
  findingsSourceCount: number
  completedSections: number
  totalSections: number
}

export function DataSummaryCard({
  selectedSiteId,
  habitatTotal,
  habitatTotalArea,
  observationTotal,
  protectedSpeciesTotal,
  findingsTotal,
  findingsSourceCount,
  completedSections,
  totalSections,
}: DataSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Summary</CardTitle>
        {selectedSiteId && (
          <p className="text-muted-foreground text-xs">
            Site filter affects completeness stats only. The report itself covers the entire
            project.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Habitats Mapped</p>
            <p className="text-2xl font-bold">{habitatTotal}</p>
            <p className="text-muted-foreground text-xs">{habitatTotalArea.toFixed(2)} ha total</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Species Observed</p>
            <p className="text-2xl font-bold">{observationTotal}</p>
            <p className="text-muted-foreground text-xs">{protectedSpeciesTotal} protected</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Desk Findings</p>
            <p className="text-2xl font-bold">{findingsTotal}</p>
            <p className="text-muted-foreground text-xs">{findingsSourceCount} sources</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Report Sections</p>
            <p className="text-2xl font-bold">{completedSections}</p>
            <p className="text-muted-foreground text-xs">of {totalSections} total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
