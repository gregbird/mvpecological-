'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Info, Layers, MapPin, TreePine, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { searchCorineLandCover } from '@/lib/external-apis/epa'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import { mapCorineToFossitt, getCorineDisplayName } from '@/lib/data/corine-to-fossitt'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import type { Project } from '@/types/database'

interface HabitatInventorySectionProps {
  project: Project
}

interface HabitatRow {
  fossittCode: string
  fossittName: string
  color: string
  corineSources: string[]
  areaHa: number
  percentage: number
}

function groupByFossitt(corineData: { CODE_18: string; Area_ha: number }[]): HabitatRow[] {
  const groups: Record<
    string,
    { fossittName: string; color: string; corineSources: Set<string>; areaHa: number }
  > = {}

  let totalArea = 0

  for (const item of corineData) {
    const mapping = mapCorineToFossitt(item.CODE_18)
    if (!mapping) continue

    const { fossittCode, fossittName } = mapping
    const habitat = getHabitatByCode(fossittCode)
    const color = habitat?.color || '#9ca3af'

    if (!groups[fossittCode]) {
      groups[fossittCode] = {
        fossittName,
        color,
        corineSources: new Set(),
        areaHa: 0,
      }
    }

    groups[fossittCode].corineSources.add(getCorineDisplayName(item.CODE_18))
    groups[fossittCode].areaHa += item.Area_ha
    totalArea += item.Area_ha
  }

  return Object.entries(groups)
    .map(([code, group]) => ({
      fossittCode: code,
      fossittName: group.fossittName,
      color: group.color,
      corineSources: Array.from(group.corineSources),
      areaHa: group.areaHa,
      percentage: totalArea > 0 ? (group.areaHa / totalArea) * 100 : 0,
    }))
    .sort((a, b) => b.areaHa - a.areaHa)
}

function SummaryCards({ habitats, totalArea }: { habitats: HabitatRow[]; totalArea: number }) {
  const cards = [
    {
      label: 'Habitat Types',
      value: habitats.length.toString(),
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconColor: 'text-emerald-500',
      icon: Layers,
    },
    {
      label: 'Total Area',
      value: `${totalArea.toFixed(0)} ha`,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-500',
      icon: MapPin,
    },
    {
      label: 'Data Source',
      value: 'CORINE 2018',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
      icon: TreePine,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.color}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <c.icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
            <div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HabitatInventorySection({ project }: HabitatInventorySectionProps) {
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  const bbox = getBoundingBox(projectBoundary ?? null, projectCenter ?? null, 0)

  const {
    data: corineData = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['corine-land-cover', project.id],
    queryFn: () => searchCorineLandCover({ bbox: bbox! }),
    enabled: !!bbox,
    staleTime: 1000 * 60 * 30, // 30 min — CORINE is static reference data
  })

  const habitats = React.useMemo(() => groupByFossitt(corineData), [corineData])
  const totalArea = React.useMemo(() => habitats.reduce((sum, h) => sum + h.areaHa, 0), [habitats])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Fetching CORINE Land Cover data...</span>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertTriangle className="h-12 w-12 text-amber-300" />
          <div className="text-center">
            <h4 className="font-semibold">Unable to Load Land Cover Data</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Could not fetch CORINE 2018 data from EPA GeoServer. This may be a temporary issue.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!bbox || habitats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <TreePine className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Habitat Data Available</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              {!bbox
                ? 'Set a site boundary in GIS Mapping to generate a preliminary habitat inventory.'
                : 'No CORINE Land Cover data found for this site boundary.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards habitats={habitats} totalArea={totalArea} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-emerald-600" />
            Preliminary Habitat Types
            <Badge variant="secondary" className="ml-auto">
              {habitats.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">FOSSITT Code</TableHead>
                  <TableHead className="w-[180px]">Habitat Name</TableHead>
                  <TableHead className="w-[200px]">CORINE Source</TableHead>
                  <TableHead className="w-[100px] text-right">Area (ha)</TableHead>
                  <TableHead className="w-[80px] text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {habitats.map((h) => (
                  <TableRow key={h.fossittCode}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: h.color }}
                        />
                        <span className="font-mono text-sm font-medium">{h.fossittCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.fossittName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {h.corineSources.join(', ')}
                    </TableCell>
                    <TableCell className="text-right">{h.areaHa.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{h.percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 flex items-start gap-2 rounded-lg border px-4 py-3">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs">
          Based on CORINE 2018 Land Cover (25 ha minimum mapping unit). This is a preliminary
          desktop assessment — habitat types require field verification using FOSSITT Level 3
          classification.
        </p>
      </div>
    </div>
  )
}
