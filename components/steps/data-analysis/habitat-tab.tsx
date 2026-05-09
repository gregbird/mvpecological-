'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Download, Pencil } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useHabitats, useHabitatStats, useUpdateHabitat } from '@/hooks/queries/use-habitat-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { HabitatEditDialog } from '@/components/steps/data-analysis/habitat-edit-dialog'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { getHeritageColor } from '@/lib/config/map-constants'
import { mapFossittToNlcLabel } from '@/lib/data/nlc-to-fossitt'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import {
  usePlacementPreferences,
  PLACEMENT_INCLUDE_OPTIONS,
  type PlacementOption,
} from '@/hooks/steps/use-placement-preferences'
import { CreateSummaryButton } from './create-summary-button'
import type { HabitatPolygon, Project, WorkflowStep } from '@/types/database'

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

interface HabitatTabProps {
  projectId: string
  siteId?: string | null
  siteCode: string | null
  project: Project
  workflowStep: WorkflowStep
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  moderate: '#f59e0b',
  poor: '#f97316',
  bad: '#ef4444',
}

export function HabitatTab({
  projectId,
  siteId,
  siteCode,
  project,
  workflowStep,
}: HabitatTabProps) {
  const { toast } = useToast()
  const { data: habitats = [] } = useHabitats(projectId, siteId)
  const { data: habitatStats } = useHabitatStats(projectId, siteId)
  const { data: savedFindings = [] } = useSavedFindings(projectId, siteId)
  const { data: projectSites = [] } = useProjectSites(projectId)
  const updateHabitat = useUpdateHabitat()
  const { getPlacement, setPlacement } = usePlacementPreferences({ workflowStep })
  const [editingHabitat, setEditingHabitat] = React.useState<HabitatPolygon | null>(null)

  const siteNameById = React.useMemo(
    () => new Map(projectSites.map((s) => [s.id, s.site_name || s.site_code || '\u2014'])),
    [projectSites]
  )

  // Desk research habitat findings (NLC 2018 from Step 2)
  const deskHabitats = React.useMemo(() => {
    return savedFindings
      .filter((f) => f.data_type === 'habitat')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const fossittCode = String(raw?.fossittCode ?? '—')
        return {
          id: f.id,
          fossittCode,
          fossittName: String(raw?.fossittName ?? f.title),
          nlcLabel: String(raw?.nlcLabel ?? ''),
          areaHa: Number(raw?.areaHectares) || 0,
          color: getHeritageColor(fossittCode),
        }
      })
      .sort((a, b) => b.areaHa - a.areaHa)
  }, [savedFindings])

  const habitatChartData = React.useMemo(() => {
    if (!habitatStats?.byFossittCode) return []
    return habitatStats.byFossittCode.slice(0, 8).map((h) => ({
      name: h.code,
      fullName: h.name,
      area: Math.round(h.area * 100) / 100,
      count: h.count,
    }))
  }, [habitatStats])

  const conditionChartData = React.useMemo(() => {
    if (!habitatStats?.byCondition) return []
    return habitatStats.byCondition.map((c) => ({
      name: c.condition.charAt(0).toUpperCase() + c.condition.slice(1),
      value: c.count,
      color: CONDITION_COLORS[c.condition] || '#9ca3af',
    }))
  }, [habitatStats])

  const { projectBoundary, projectCenter } = useProjectBoundary(project)

  // Combine field-verified habitats + desk research habitat polygons for map.
  // Property shape mirrors what HabitatPolygonLayer expects (snake_case +
  // nlc_label/nlc_level1 for the NLC palette toggle, area_hectares so the
  // largest parcel per FOSSITT code can be picked as the tooltip anchor).
  const habitatFeatureCollection: GeoJSON.FeatureCollection = React.useMemo(() => {
    const fieldFeatures = habitats
      .filter((h) => h.boundary && h.include_in_report)
      .map((h) => ({
        type: 'Feature' as const,
        properties: {
          fossitt_code: h.fossitt_code,
          fossitt_name: h.fossitt_name,
          condition: h.condition,
          color: getHeritageColor(h.fossitt_code),
          // habitat_polygons rows do not persist NLC labels — derive a
          // representative one from the FOSSITT code so the NLC native
          // palette toggle resolves to a real colour at every zoom for
          // field-verified habitats too. Approximate for ambiguous codes.
          nlc_label: mapFossittToNlcLabel(h.fossitt_code),
          area_hectares: h.area_hectares ?? 0,
          is_label_anchor: false,
        },
        geometry: h.boundary as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      }))

    const deskFeatures = savedFindings
      .filter((f) => f.data_type === 'habitat' && f.location != null)
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const fossittCode = String(raw?.fossittCode ?? '')
        const info = getHabitatByCode(fossittCode)
        return {
          type: 'Feature' as const,
          properties: {
            fossitt_code: fossittCode,
            fossitt_name: String(raw?.fossittName ?? f.title),
            condition: info ? 'desk' : undefined,
            color: getHeritageColor(fossittCode),
            // raw_data carries the NLC labels at save time (use-habitat-save
            // / use-habitat-auto-save); pass them through so the NLC palette
            // resolves at render time.
            nlc_label: typeof raw?.nlcLabel === 'string' ? raw.nlcLabel : undefined,
            nlc_level1: typeof raw?.nlcLevel1 === 'string' ? raw.nlcLevel1 : undefined,
            nlc_id: typeof raw?.nlcId === 'string' ? raw.nlcId : undefined,
            area_hectares: typeof raw?.areaHectares === 'number' ? raw.areaHectares : 0,
            is_label_anchor: false,
          },
          geometry: f.location as GeoJSON.Geometry,
        }
      })

    const features = [...fieldFeatures, ...deskFeatures]
    // Pick the largest parcel per fossitt_code as the tooltip anchor — same
    // mechanism osi.ts uses for live NLC fetches.
    const largest = new Map<string, number>()
    features.forEach((f, i) => {
      const code = String(f.properties.fossitt_code || '')
      if (!code) return
      const area = Number(f.properties.area_hectares || 0)
      const cur = largest.get(code)
      if (cur === undefined || area > Number(features[cur].properties.area_hectares || 0)) {
        largest.set(code, i)
      }
    })
    largest.forEach((i) => {
      features[i].properties.is_label_anchor = true
    })

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [habitats, savedFindings])

  const handleExportCSV = () => {
    const filename = `${siteCode || projectId}_habitats.csv`
    let csvContent = 'Fossitt Code,Habitat Name,Area (ha),Condition,Notes\n'
    habitats.forEach((h) => {
      csvContent += `"${h.fossitt_code}","${h.fossitt_name}",${h.area_hectares || 0},"${h.condition || ''}","${h.notes || ''}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)

    toast({
      title: 'Export complete',
      description: `Habitats exported to ${filename}`,
    })
  }

  const handleToggleInclude = async (habitat: HabitatPolygon) => {
    try {
      await updateHabitat.mutateAsync({
        habitatId: habitat.id,
        projectId,
        updates: { include_in_report: !habitat.include_in_report },
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
      {/* AI Summary */}
      <CreateSummaryButton projectId={projectId} siteId={siteId} tabContext="habitats" />

      {/* Habitat Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Habitat Map</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <DynamicProjectMap
            className="h-72"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={projectCenter ? 11 : 7}
            boundary={projectBoundary}
            habitatPolygons={habitatFeatureCollection}
            showControls={true}
            showNlcToggle
          />
        </CardContent>
      </Card>

      {/* Desktop Habitat Assessment (NLC 2018 from Step 2) — collapsible */}
      {deskHabitats.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="hover:bg-muted/50 cursor-pointer pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Desktop Habitat Assessment</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      NLC 2018
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {deskHabitats.length} habitats
                    </Badge>
                  </div>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                </div>
                <p className="text-muted-foreground text-xs">
                  Click to expand — Habitat data from National Land Cover 2018 (Desk Research, Step
                  2)
                </p>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FOSSITT Code</TableHead>
                      <TableHead>Habitat</TableHead>
                      <TableHead>NLC Label</TableHead>
                      <TableHead className="text-right">Area (ha)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deskHabitats.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-3 w-3 rounded-sm"
                              style={{ backgroundColor: h.color }}
                            />
                            <span className="font-mono text-xs">{h.fossittCode}</span>
                          </span>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">{h.fossittName}</TableCell>
                        <TableCell className="text-muted-foreground max-w-40 truncate text-xs">
                          {h.nlcLabel}
                        </TableCell>
                        <TableCell className="text-right">{h.areaHa.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">
                        {deskHabitats.reduce((sum, h) => sum + h.areaHa, 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </UITable>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Field-Verified Habitat Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Habitat Areas by Fossitt Code</CardTitle>
              {habitats.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {habitatChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={habitatChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background rounded border p-2 shadow">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-muted-foreground text-sm">{data.fullName}</p>
                            <p className="text-sm">Area: {data.area} ha</p>
                            <p className="text-sm">Polygons: {data.count}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="area" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
                No habitat data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Habitat Condition Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {conditionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={conditionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {conditionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
                No condition data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Habitat Detail Table — collapsible, closed by default */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="hover:bg-muted/50 cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Field-Verified Habitat Details</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Step 5
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {habitats.length} habitats
                  </Badge>
                </div>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
              </div>
              <p className="text-muted-foreground text-xs">Click to expand the details table</p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Habitat</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>EU Annex</TableHead>
                    <TableHead>Threats</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-20 text-center">Include</TableHead>
                    <TableHead className="w-44">Placement</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {habitats.length > 0 ? (
                    habitats.map((h) => {
                      const placement = getPlacement('habitats', h.id)
                      const placementValue = placement === 'exclude' ? 'both' : placement
                      return (
                        <TableRow key={h.id} className={cn(!h.include_in_report && 'opacity-50')}>
                          <TableCell className="font-mono">{h.fossitt_code}</TableCell>
                          <TableCell className="max-w-50 truncate">{h.fossitt_name}</TableCell>
                          <TableCell
                            className="text-muted-foreground max-w-32 truncate text-xs"
                            title={h.site_id ? siteNameById.get(h.site_id) : ''}
                          >
                            {h.site_id ? (siteNameById.get(h.site_id) ?? '\u2014') : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right">
                            {(h.area_hectares ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">{h.condition || '\u2014'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {h.eu_annex_code || '\u2014'}
                          </TableCell>
                          <TableCell
                            className="max-w-32 truncate text-xs"
                            title={Array.isArray(h.threats) ? h.threats.join(', ') : ''}
                          >
                            {Array.isArray(h.threats) && h.threats.length > 0
                              ? h.threats.join(', ')
                              : '\u2014'}
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-xs" title={h.notes || ''}>
                            {h.notes || '\u2014'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={h.include_in_report}
                              onCheckedChange={() => handleToggleInclude(h)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={placementValue}
                              onValueChange={(value) =>
                                setPlacement('habitats', h.id, value as PlacementOption)
                              }
                              disabled={!h.include_in_report}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLACEMENT_INCLUDE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-xs"
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingHabitat(h)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-muted-foreground text-center">
                        No habitat data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </UITable>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <HabitatEditDialog
        habitat={editingHabitat}
        onOpenChange={(open) => !open && setEditingHabitat(null)}
        projectId={projectId}
      />
    </div>
  )
}
