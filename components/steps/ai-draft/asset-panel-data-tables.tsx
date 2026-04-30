'use client'

import * as React from 'react'
import { Loader2, Table2, Plus, MapPin, Bug, Waves } from 'lucide-react'
import { useTemplateData } from '@/hooks/queries/use-template-data'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { prepareAppendixData } from '@/lib/export/appendix-data'
import {
  buildDesignatedSitesTable,
  buildSpeciesTable,
  buildAquaticTable,
} from '@/lib/utils/tiptap-table'
import { useEditorRegistry } from './editor-registry'
import type { Project } from '@/types/database'

interface AssetPanelDataTablesProps {
  project: Project
}

export function AssetPanelDataTables({ project }: AssetPanelDataTablesProps) {
  const { templateData, isLoading } = useTemplateData(project)
  const registry = useEditorRegistry()
  const { toast } = useToast()

  const appendixData = React.useMemo(
    () => (templateData ? prepareAppendixData(templateData.findings) : null),
    [templateData]
  )

  const handleInsert = React.useCallback(
    (label: string, node: unknown | null) => {
      if (!node) {
        toast({
          variant: 'destructive',
          title: 'No data to insert',
          description: `No ${label.toLowerCase()} have been saved yet.`,
        })
        return
      }
      const inserted = registry?.insertContent(node)
      if (!inserted) {
        toast({
          variant: 'destructive',
          title: 'Click into a section first',
          description: 'Place your cursor inside a section before inserting a table.',
        })
        return
      }
      toast({ title: `${label} table inserted` })
    },
    [registry, toast]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!templateData || !appendixData) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
        <Table2 className="h-8 w-8 opacity-40" />
        <p>No project data available yet.</p>
      </div>
    )
  }

  const designatedCount = appendixData.designatedSites.length
  const speciesCount = appendixData.speciesRecords.length
  const aquaticCount = appendixData.aquaticFeatures.length

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[11px] leading-snug">
        Click into a section, then insert a table at the cursor.
      </p>

      <InsertTableCard
        icon={MapPin}
        iconClass="text-emerald-600 dark:text-emerald-400"
        label="Designated Sites"
        count={designatedCount}
        onInsert={() => handleInsert('Designated Sites', buildDesignatedSitesTable(appendixData))}
      />

      <InsertTableCard
        icon={Bug}
        iconClass="text-purple-600 dark:text-purple-400"
        label="Species List"
        count={speciesCount}
        onInsert={() => handleInsert('Species List', buildSpeciesTable(appendixData))}
      />

      <InsertTableCard
        icon={Waves}
        iconClass="text-cyan-600 dark:text-cyan-400"
        label="Aquatic Features"
        count={aquaticCount}
        onInsert={() => handleInsert('Aquatic Features', buildAquaticTable(appendixData))}
      />

      <div className="border-t pt-3">
        <p className="text-muted-foreground mb-2 text-[10px] tracking-wide uppercase">Other</p>
        <DataSummaryCard label="Habitats Mapped" count={templateData.habitats.length} />
        <DataSummaryCard label="Field Surveys" count={templateData.surveys.length} />
        <DataSummaryCard label="Total Findings" count={templateData.findings.length} />
      </div>
    </div>
  )
}

interface InsertTableCardProps {
  icon: React.ElementType
  iconClass: string
  label: string
  count: number
  onInsert: () => void
}

function InsertTableCard({ icon: Icon, iconClass, label, count, onInsert }: InsertTableCardProps) {
  const disabled = count === 0
  return (
    <div className="bg-muted/50 rounded-md p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
          <span className="truncate text-xs font-medium">{label}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums">{count}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-full justify-center text-[11px]"
        disabled={disabled}
        onClick={onInsert}
      >
        <Plus className="mr-1 h-3 w-3" />
        Insert as Table
      </Button>
    </div>
  )
}

function DataSummaryCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-muted/50 mt-1.5 flex items-center justify-between rounded-md px-3 py-1.5">
      <span className="text-xs">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{count}</span>
    </div>
  )
}
