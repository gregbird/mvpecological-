'use client'

import { Loader2, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EXPORT_FORMATS } from './constants'

interface ExportFormatCardProps {
  selectedFormat: string
  isExporting: boolean
  onSelect: (formatId: string) => void
  onExport: () => void
  onPrint: () => void
}

export function ExportFormatCard({
  selectedFormat,
  isExporting,
  onSelect,
  onExport,
  onPrint,
}: ExportFormatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Format</CardTitle>
        <CardDescription>Choose the format for your final report</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {EXPORT_FORMATS.map((format) => (
            <div
              key={format.id}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                selectedFormat === format.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => onSelect(format.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    selectedFormat === format.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}
                />
                <span className="font-medium">{format.name}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{format.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Report
          </Button>
          <Button variant="outline" onClick={onPrint} disabled={isExporting}>
            <Printer className="mr-2 h-4 w-4" />
            Print Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
