'use client'

import { Loader2, Table2 } from 'lucide-react'
import { useTemplateData } from '@/hooks/queries/use-template-data'
import type { Project } from '@/types/database'

interface AssetPanelDataTablesProps {
  project: Project
}

export function AssetPanelDataTables({ project }: AssetPanelDataTablesProps) {
  const { templateData, isLoading } = useTemplateData(project)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!templateData) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
        <Table2 className="h-8 w-8 opacity-40" />
        <p>No project data available yet.</p>
      </div>
    )
  }

  const sitesCount = templateData.findings.filter((f) => f.data_type === 'designated_site').length
  const speciesCount = templateData.observations.length
  const habitatCount = templateData.habitats.length
  const surveyCount = templateData.surveys.length

  return (
    <div className="space-y-3">
      <DataSummaryCard label="Designated Sites" count={sitesCount} />
      <DataSummaryCard label="Habitats Mapped" count={habitatCount} />
      <DataSummaryCard label="Species Observations" count={speciesCount} />
      <DataSummaryCard label="Field Surveys" count={surveyCount} />
      <DataSummaryCard label="Total Findings" count={templateData.findings.length} />
    </div>
  )
}

function DataSummaryCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2">
      <span className="text-xs">{label}</span>
      <span className="text-sm font-semibold">{count}</span>
    </div>
  )
}
