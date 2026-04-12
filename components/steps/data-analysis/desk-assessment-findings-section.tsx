'use client'

import * as React from 'react'
import { Database, MapPin, Bug, Droplets, Globe, Pencil, Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  useSavedFindings,
  useFindingsStats,
  useCreateFinding,
  useUpdateFinding,
} from '@/hooks/queries/use-finding-hooks'
import { FindingEditDialog } from '@/components/steps/data-analysis/finding-edit-dialog'
import type { DeskResearchFinding } from '@/types/database'

interface DeskAssessmentFindingsSectionProps {
  projectId: string
  siteId?: string | null
  userId: string
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Database; color: string }> = {
  npws: { label: 'NPWS', icon: MapPin, color: 'text-emerald-600' },
  gbif: { label: 'GBIF', icon: Globe, color: 'text-blue-600' },
  nbdc: { label: 'NBDC', icon: Bug, color: 'text-purple-600' },
  epa: { label: 'EPA', icon: Droplets, color: 'text-cyan-600' },
  catchments: { label: 'Catchments', icon: Droplets, color: 'text-sky-600' },
  manual: { label: 'Manual', icon: Database, color: 'text-gray-600' },
  company_reports: { label: 'Company Reports', icon: FileText, color: 'text-indigo-600' },
}

export function DeskAssessmentFindingsSection({
  projectId,
  siteId,
  userId,
}: DeskAssessmentFindingsSectionProps) {
  const { toast } = useToast()
  const { data: findings = [] } = useSavedFindings(projectId, siteId)
  const { data: stats } = useFindingsStats(projectId, siteId)
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()
  const [editingFinding, setEditingFinding] = React.useState<DeskResearchFinding | null>(null)

  const sourceStats = stats?.bySource || []

  const handleAddManualFinding = async () => {
    try {
      await createFinding.mutateAsync({
        project_id: projectId,
        created_by: userId,
        title: 'New Manual Finding',
        source: 'manual',
        data_type: 'other',
        is_saved: true,
        site_id: siteId || undefined,
      })
      toast({ title: 'Manual finding added' })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add finding.' })
    }
  }

  const handleToggleInclude = async (finding: DeskResearchFinding) => {
    try {
      await updateFinding.mutateAsync({
        findingId: finding.id,
        projectId,
        updates: { include_in_report: !finding.include_in_report },
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update report inclusion.',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Source Stats */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sourceStats.map((s) => {
          const config = SOURCE_CONFIG[s.source] || SOURCE_CONFIG.manual
          const Icon = config.icon
          return (
            <Card key={s.source}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                <div>
                  <div className="text-xl font-bold">{s.count}</div>
                  <div className="text-muted-foreground text-xs">{config.label}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {sourceStats.length === 0 && (
          <div className="text-muted-foreground col-span-full py-8 text-center text-sm">
            No findings saved yet. Complete Step 2 (Data Gathering) first.
          </div>
        )}
      </div>

      {/* Findings Table */}
      {findings.length > 0 && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-base font-semibold">Saved Findings ({findings.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddManualFinding}
              disabled={createFinding.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Finding
            </Button>
          </div>
          <CardContent className="pt-0">
            <div className="max-h-[400px] overflow-y-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="w-24 text-center">Add to Report</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map((f) => {
                    const raw = f.raw_data as Record<string, unknown> | null
                    const scientificName =
                      f.data_type === 'species_record'
                        ? (raw?.scientificName as string) ||
                          (raw?.species_name_scientific as string) ||
                          null
                        : null
                    const commonName =
                      f.data_type === 'species_record'
                        ? (raw?.vernacularName as string) ||
                          (raw?.commonName as string) ||
                          (raw?.species_name_common as string) ||
                          null
                        : null
                    return (
                      <TableRow key={f.id} className={cn(!f.include_in_report && 'opacity-50')}>
                        <TableCell className="max-w-60">
                          {scientificName ? (
                            <div>
                              <span className="truncate font-medium italic">{scientificName}</span>
                              {commonName && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  ({commonName})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="truncate font-medium">{f.title}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {f.data_type.replaceAll('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs uppercase">
                            {f.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {f.distance_from_boundary_km != null
                            ? f.distance_from_boundary_km.toFixed(2)
                            : '\u2014'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={f.include_in_report}
                            onCheckedChange={() => handleToggleInclude(f)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingFinding(f)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </UITable>
            </div>
          </CardContent>
        </Card>
      )}

      <FindingEditDialog
        finding={editingFinding}
        onOpenChange={(open) => !open && setEditingFinding(null)}
      />
    </div>
  )
}
