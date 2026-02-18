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
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useHabitats, useHabitatStats, useUpdateHabitat } from '@/hooks/queries/use-habitat-hooks'
import { HabitatEditDialog } from '@/components/steps/data-analysis/habitat-edit-dialog'
import type { HabitatPolygon, Project } from '@/types/database'

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
  siteCode: string | null
  project: Project
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  moderate: '#f59e0b',
  poor: '#f97316',
  bad: '#ef4444',
}

export function HabitatTab({ projectId, siteCode, project }: HabitatTabProps) {
  const { toast } = useToast()
  const { data: habitats = [] } = useHabitats(projectId)
  const { data: habitatStats } = useHabitatStats(projectId)
  const updateHabitat = useUpdateHabitat()
  const [editingHabitat, setEditingHabitat] = React.useState<HabitatPolygon | null>(null)

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

  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  const habitatFeatureCollection: GeoJSON.FeatureCollection = React.useMemo(
    () => ({
      type: 'FeatureCollection',
      features: habitats
        .filter((h) => h.boundary && h.include_in_report)
        .map((h) => ({
          type: 'Feature' as const,
          properties: {
            fossitt_code: h.fossitt_code,
            fossitt_name: h.fossitt_name,
            condition: h.condition,
          },
          geometry: h.boundary as GeoJSON.Polygon,
        })),
    }),
    [habitats]
  )

  const handleExportCSV = () => {
    const filename = `${siteCode || projectId}_habitats.csv`
    let csvContent = 'Fossitt Code,Habitat Name,Area (ha),Condition,Notes\n'
    habitats.forEach((h) => {
      csvContent += `"${h.fossitt_code}","${h.fossitt_name}",${h.area_hectares || 0},"${h.condition || ''}","${h.notes || ''}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    toast({
      title: 'Export complete',
      description: `Habitats exported to ${filename}`,
    })
  }

  const handleToggleInclude = async (habitat: HabitatPolygon) => {
    try {
      await updateHabitat.mutateAsync({
        habitatId: habitat.id,
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
      {/* Habitat Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Habitat Map</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <DynamicProjectMap
            className="h-72"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
            zoom={projectCenter ? 14 : 7}
            boundary={projectBoundary}
            habitatPolygons={habitatFeatureCollection}
            showControls={false}
          />
        </CardContent>
      </Card>

      {/* Charts */}
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
              <div className="text-muted-foreground flex h-75 items-center justify-center text-sm">
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
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {conditionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-75 items-center justify-center text-sm">
                No condition data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Habitat Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Habitat Details</CardTitle>
        </CardHeader>
        <CardContent>
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Habitat</TableHead>
                <TableHead className="text-right">Area (ha)</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="w-20 text-center">Include</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {habitats.length > 0 ? (
                habitats.map((h) => (
                  <TableRow
                    key={h.id}
                    className={cn(!h.include_in_report && 'opacity-50')}
                  >
                    <TableCell className="font-mono">{h.fossitt_code}</TableCell>
                    <TableCell className="max-w-50 truncate">{h.fossitt_name}</TableCell>
                    <TableCell className="text-right">
                      {(h.area_hectares ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">{h.condition || '\u2014'}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={h.include_in_report}
                        onCheckedChange={() => handleToggleInclude(h)}
                      />
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    No habitat data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>

      <HabitatEditDialog
        habitat={editingHabitat}
        onOpenChange={(open) => !open && setEditingHabitat(null)}
      />
    </div>
  )
}
