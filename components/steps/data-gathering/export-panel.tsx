'use client'

import { FileSpreadsheet, FileJson, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import { useExportFindings } from '@/hooks/data-gathering/use-export-findings'

interface ExportPanelProps {
  project: Project
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  /** Active site for multi-site filename + content disambiguation */
  selectedSite?: ProjectSiteWithGeoJSON | null
}

export function ExportPanel({
  project,
  savedFindings,
  targetNotes,
  selectedSite,
}: ExportPanelProps) {
  const { exportAsCSV, exportAsGeoJSON, exportAsJSON } = useExportFindings(
    project,
    savedFindings,
    targetNotes,
    selectedSite
  )

  return (
    <div className="rounded-lg border p-3">
      <h4 className="mb-2 text-sm font-medium">Export Data</h4>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={exportAsCSV}
          disabled={savedFindings.length === 0}
          className="h-auto flex-col py-3"
        >
          <FileSpreadsheet className="mb-1 h-5 w-5" />
          <span className="text-xs">CSV</span>
          <span className="text-muted-foreground text-[9px]">Spreadsheet</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportAsGeoJSON}
          disabled={savedFindings.length === 0}
          className="h-auto flex-col py-3"
        >
          <MapPin className="mb-1 h-5 w-5" />
          <span className="text-xs">GeoJSON</span>
          <span className="text-muted-foreground text-[9px]">Spatial Data</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportAsJSON}
          disabled={savedFindings.length === 0}
          className="h-auto flex-col py-3"
        >
          <FileJson className="mb-1 h-5 w-5" />
          <span className="text-xs">JSON</span>
          <span className="text-muted-foreground text-[9px]">Full Data</span>
        </Button>
      </div>
    </div>
  )
}
