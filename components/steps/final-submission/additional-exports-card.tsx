'use client'

import { Loader2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AdditionalExportsCardProps {
  isExporting: boolean
  hasSites: boolean
  hasSurveys: boolean
  generatingSummary: boolean
  surveySummary: string | null
  onShapefileExport: () => void
  onSurveyCsvExport: () => void
  onGenerateSummary: () => void
}

export function AdditionalExportsCard({
  isExporting,
  hasSites,
  hasSurveys,
  generatingSummary,
  surveySummary,
  onShapefileExport,
  onSurveyCsvExport,
  onGenerateSummary,
}: AdditionalExportsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Exports</CardTitle>
        <CardDescription>
          Export shapefiles, survey data, and generate AI survey summaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-4">
            <h4 className="font-medium">Shapefiles</h4>
            <p className="text-muted-foreground text-sm">
              Site boundaries and habitats with attributes
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onShapefileExport}
              disabled={isExporting || !hasSites}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Shapefiles
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <h4 className="font-medium">Survey Data (CSV)</h4>
            <p className="text-muted-foreground text-sm">All field surveys in spreadsheet format</p>
            <Button variant="outline" size="sm" onClick={onSurveyCsvExport} disabled={!hasSurveys}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <h4 className="font-medium">AI Survey Summary</h4>
            <p className="text-muted-foreground text-sm">
              AI-generated summary of all field surveys
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateSummary}
              disabled={generatingSummary || !hasSurveys}
            >
              {generatingSummary ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-3.5 w-3.5" />
              )}
              {generatingSummary ? 'Generating...' : 'Generate Summary'}
            </Button>
          </div>
        </div>

        {surveySummary && (
          <div className="mt-4 rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
            <h4 className="mb-2 font-medium">AI Survey Summary</h4>
            <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap">
              {surveySummary}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
