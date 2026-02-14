'use client'

import * as React from 'react'
import { Download, FileSpreadsheet, FileJson, MapPin, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

interface ExportFindingsModalProps {
  projectName: string
  findings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  trigger?: React.ReactNode
}

type ExportFormat = 'csv' | 'geojson' | 'json'

export function ExportFindingsModal({
  projectName,
  findings,
  targetNotes,
  trigger,
}: ExportFindingsModalProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('csv')
  const [includeFindings, setIncludeFindings] = React.useState(true)
  const [includeTargetNotes, setIncludeTargetNotes] = React.useState(true)

  const safeFileName = projectName.replace(/[^a-zA-Z0-9]/g, '_')

  const exportAsCSV = () => {
    const rows: string[] = []

    if (includeFindings && findings.length > 0) {
      rows.push('# Findings')
      rows.push('Title,Source,Type,Distance (km),Protected,Red List Status,Content')
      for (const f of findings) {
        rows.push(
          [
            `"${f.title.replace(/"/g, '""')}"`,
            f.source.toUpperCase(),
            f.data_type.replace('_', ' '),
            f.distance_from_boundary_km?.toFixed(2) || '',
            f.is_protected ? 'Yes' : 'No',
            f.red_list_status || '',
            `"${(f.content || '').replace(/"/g, '""')}"`,
          ].join(',')
        )
      }
      rows.push('')
    }

    if (includeTargetNotes && targetNotes.length > 0) {
      rows.push('# Target Notes')
      rows.push('Category,Title,Description,Priority,Verified')
      for (const n of targetNotes) {
        rows.push(
          [
            n.category,
            `"${n.title.replace(/"/g, '""')}"`,
            `"${(n.description || '').replace(/"/g, '""')}"`,
            n.priority,
            n.is_verified ? 'Yes' : 'No',
          ].join(',')
        )
      }
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    downloadBlob(blob, `${safeFileName}_export.csv`)
  }

  const exportAsGeoJSON = () => {
    const features: GeoJSON.Feature[] = []

    if (includeFindings) {
      for (const f of findings) {
        if (f.location) {
          features.push({
            type: 'Feature',
            geometry: f.location as GeoJSON.Geometry,
            properties: {
              type: 'finding',
              id: f.id,
              title: f.title,
              source: f.source,
              dataType: f.data_type,
              distance_km: f.distance_from_boundary_km,
              isProtected: f.is_protected,
              redListStatus: f.red_list_status,
              content: f.content,
            },
          })
        }
      }
    }

    if (includeTargetNotes) {
      for (const n of targetNotes) {
        if (n.location) {
          features.push({
            type: 'Feature',
            geometry: n.location as GeoJSON.Geometry,
            properties: {
              type: 'target_note',
              id: n.id,
              category: n.category,
              title: n.title,
              description: n.description,
              priority: n.priority,
              isVerified: n.is_verified,
            },
          })
        }
      }
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${safeFileName}_export.geojson`)
  }

  const exportAsJSON = () => {
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      project: projectName,
    }

    if (includeFindings) {
      data.findings = findings.map((f) => ({
        id: f.id,
        title: f.title,
        source: f.source,
        dataType: f.data_type,
        content: f.content,
        distance_km: f.distance_from_boundary_km,
        isProtected: f.is_protected,
        redListStatus: f.red_list_status,
      }))
    }

    if (includeTargetNotes) {
      data.targetNotes = targetNotes.map((n) => ({
        id: n.id,
        category: n.category,
        title: n.title,
        description: n.description,
        priority: n.priority,
        isVerified: n.is_verified,
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${safeFileName}_export.json`)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    setOpen(false)
  }

  const handleExport = () => {
    switch (selectedFormat) {
      case 'csv':
        exportAsCSV()
        break
      case 'geojson':
        exportAsGeoJSON()
        break
      case 'json':
        exportAsJSON()
        break
    }
  }

  const formats = [
    {
      value: 'csv' as const,
      label: 'CSV',
      icon: FileSpreadsheet,
      description: 'Spreadsheet format for Excel',
    },
    {
      value: 'geojson' as const,
      label: 'GeoJSON',
      icon: MapPin,
      description: 'Geographic data format for GIS',
    },
    {
      value: 'json' as const,
      label: 'JSON',
      icon: FileJson,
      description: 'Complete data export',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>Choose what to export and the format.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* What to include */}
          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="findings"
                  checked={includeFindings}
                  onCheckedChange={(checked) => setIncludeFindings(!!checked)}
                />
                <Label htmlFor="findings" className="font-normal">
                  Findings ({findings.length})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notes"
                  checked={includeTargetNotes}
                  onCheckedChange={(checked) => setIncludeTargetNotes(!!checked)}
                />
                <Label htmlFor="notes" className="font-normal">
                  Target Notes ({targetNotes.length})
                </Label>
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <div className="grid gap-2">
              {formats.map((format) => {
                const Icon = format.icon
                const isSelected = selectedFormat === format.value

                return (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => setSelectedFormat(format.value)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                      }`}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium">{format.label}</div>
                      <div className="text-muted-foreground text-xs">{format.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!includeFindings && !includeTargetNotes}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
