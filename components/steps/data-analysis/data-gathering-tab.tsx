'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Database, MapPin, Bug, Droplets, Globe, Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { DeskResearchFinding, Project } from '@/types/database'

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-72 items-center justify-center rounded-lg">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
      </div>
    ),
  }
)

interface DataGatheringTabProps {
  projectId: string
  userId: string
  project: Project
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Database; color: string }> = {
  npws: { label: 'NPWS', icon: MapPin, color: 'text-emerald-600' },
  gbif: { label: 'GBIF', icon: Globe, color: 'text-blue-600' },
  nbdc: { label: 'NBDC', icon: Bug, color: 'text-purple-600' },
  epa: { label: 'EPA', icon: Droplets, color: 'text-cyan-600' },
  catchments: { label: 'Catchments', icon: Droplets, color: 'text-sky-600' },
  manual: { label: 'Manual', icon: Database, color: 'text-gray-600' },
}

export function DataGatheringTab({ projectId, userId, project }: DataGatheringTabProps) {
  const { toast } = useToast()
  const { data: findings = [] } = useSavedFindings(projectId)
  const { data: stats } = useFindingsStats(projectId)
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()
  const [editingFinding, setEditingFinding] = React.useState<DeskResearchFinding | null>(null)

  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  const mapFindings = React.useMemo(
    () =>
      findings
        .filter((f) => f.include_in_report)
        .map((f) => ({
          id: f.id,
          source: f.source,
          dataType: f.data_type,
          title: f.title,
          content: f.content || undefined,
          location: f.location as GeoJSON.Geometry | undefined,
          isSaved: true,
        })),
    [findings]
  )

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
    <div className="space-y-4 p-4">
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

      {/* Findings Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Findings Map</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <DynamicProjectMap
            className="h-72"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
            zoom={projectCenter ? 14 : 7}
            boundary={projectBoundary}
            findings={mapFindings}
            showControls={false}
          />
        </CardContent>
      </Card>

      {/* Findings Table */}
      {findings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Saved Findings ({findings.length})</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Distance (km)</TableHead>
                    <TableHead className="w-20 text-center">Include</TableHead>
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
                            {f.data_type.replace('_', ' ')}
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

      {findings.length === 0 && sourceStats.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddManualFinding}
              disabled={createFinding.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Finding
            </Button>
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
