'use client'

import * as React from 'react'
import { Info, Layers, MapPin, TreePine, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { BaselineMap } from './baseline-map-utils'
import type { DeskResearchFinding } from '@/types/database'

export interface HabitatRow {
  findingId: string
  fossittCode: string
  fossittName: string
  color: string
  nlcLabel: string
  areaHa: number
  percentage: number
  distanceKm: number | null
}

interface HabitatInventorySectionProps {
  findings: DeskResearchFinding[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  onHabitatData?: (habitats: HabitatRow[]) => void
  onRemoveFinding?: (findingId: string) => void
  /** NPWS layer IDs saved from GIS step (e.g. ['sac', 'spa']) */
  npwsVisibleLayers?: string[]
}

function SummaryCards({ habitats, totalArea }: { habitats: HabitatRow[]; totalArea: number }) {
  const cards = [
    {
      label: 'Habitat Types',
      value: habitats.length.toString(),
      color:
        'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200',
      iconColor: 'text-emerald-500',
      icon: Layers,
    },
    {
      label: 'Total Area',
      value: `${totalArea.toFixed(0)} ha`,
      color:
        'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200',
      iconColor: 'text-green-500',
      icon: MapPin,
    },
    {
      label: 'Data Source',
      value: 'NLC 2018',
      color:
        'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200',
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

function HabitatTable({
  habitats,
  selectedCode,
  onSelect,
  onRemoveFinding,
}: {
  habitats: HabitatRow[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
  onRemoveFinding?: (findingId: string) => void
}) {
  if (habitats.length === 0) return null

  // Compute percentage relative to this group's total area (not all habitats)
  const groupTotal = habitats.reduce((sum, h) => sum + h.areaHa, 0)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">FOSSITT Code</TableHead>
            <TableHead className="w-[180px]">Habitat Name</TableHead>
            <TableHead className="w-[200px]">NLC Label</TableHead>
            <TableHead className="w-[100px] text-right">Area (ha)</TableHead>
            <TableHead className="w-[80px] text-right" title="Relative share within this group">
              %
            </TableHead>
            {onRemoveFinding && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {habitats.map((h, idx) => {
            const isSelected = selectedCode === h.fossittCode
            const groupPct = groupTotal > 0 ? (h.areaHa / groupTotal) * 100 : 0
            return (
              <TableRow
                key={`${h.fossittCode}-${idx}`}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                onClick={() => onSelect(selectedCode === h.fossittCode ? null : h.fossittCode)}
              >
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
                <TableCell className="text-muted-foreground text-sm">{h.nlcLabel}</TableCell>
                <TableCell className="text-right">{h.areaHa.toFixed(1)}</TableCell>
                <TableCell className="text-right">{groupPct.toFixed(1)}%</TableCell>
                {onRemoveFinding && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveFinding(h.findingId)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function HabitatInventorySection({
  findings,
  boundary,
  onHabitatData,
  onRemoveFinding,
  npwsVisibleLayers,
}: HabitatInventorySectionProps) {
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null)

  const habitatFindings = React.useMemo(
    () => findings.filter((f) => f.data_type === 'habitat'),
    [findings]
  )

  const { habitats, totalArea } = React.useMemo(() => {
    if (habitatFindings.length === 0) return { habitats: [], totalArea: 0 }

    const total = habitatFindings.reduce((sum, f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      return sum + (Number(raw?.areaHectares) || 0)
    }, 0)

    const rows: HabitatRow[] = habitatFindings
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const fossittCode = String(raw?.fossittCode ?? '—')
        const fossittName = String(raw?.fossittName ?? f.title)
        const nlcLabel = String(raw?.nlcLabel ?? '')
        const areaHa = Number(raw?.areaHectares) || 0
        const habitat = getHabitatByCode(fossittCode)
        const distanceKm =
          raw?.distance_from_boundary_km != null
            ? Number(raw.distance_from_boundary_km)
            : f.distance_from_boundary_km != null
              ? Number(f.distance_from_boundary_km)
              : null

        return {
          findingId: f.id,
          fossittCode,
          fossittName,
          color: habitat?.color || '#808080',
          nlcLabel,
          areaHa,
          percentage: total > 0 ? (areaHa / total) * 100 : 0,
          distanceKm,
        }
      })
      .sort((a, b) => b.areaHa - a.areaHa)

    return { habitats: rows, totalArea: total }
  }, [habitatFindings])

  const habitatPolygons = React.useMemo<GeoJSON.FeatureCollection | null>(() => {
    const withLocation = habitatFindings.filter((f) => f.location != null)
    if (withLocation.length === 0) return null

    const features: GeoJSON.Feature[] = withLocation.map((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      const fossittCode = String(raw?.fossittCode ?? '')
      const habitat = getHabitatByCode(fossittCode)
      return {
        type: 'Feature',
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          fossitt_name: String(raw?.fossittName ?? f.title),
          fossitt_code: fossittCode,
          color: habitat?.color || '#22c55e',
        },
      }
    })

    return { type: 'FeatureCollection', features }
  }, [habitatFindings])

  const styledPolygons = React.useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!habitatPolygons) return null
    if (!selectedCode) return habitatPolygons

    return {
      type: 'FeatureCollection',
      features: habitatPolygons.features.map((f) => {
        const code = String(f.properties?.fossitt_code ?? '')
        const isMatch = code === selectedCode
        return {
          ...f,
          properties: {
            ...f.properties,
            fillOpacity: isMatch ? 0.85 : 0.05,
          },
        }
      }),
    }
  }, [habitatPolygons, selectedCode])

  // Notify parent (used for export)
  const onHabitatDataRef = React.useRef(onHabitatData)
  onHabitatDataRef.current = onHabitatData
  React.useEffect(() => {
    if (habitats.length > 0) {
      onHabitatDataRef.current?.(habitats)
    }
  }, [habitats])

  if (habitats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <TreePine className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Habitat Data Available</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Save habitat findings in Data Gathering (Step 2) to see them here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Within boundary: distance computed and < 10m (epsilon for float comparison)
  // Null distance = not computed — shown in a separate "Unknown distance" bucket if needed
  const WITHIN_EPSILON_KM = 0.01
  const withinBoundary = habitats.filter(
    (h) => h.distanceKm != null && h.distanceKm < WITHIN_EPSILON_KM
  )
  const adjacent = habitats.filter(
    (h) => h.distanceKm != null && h.distanceKm >= WITHIN_EPSILON_KM && h.distanceKm <= 0.1
  )
  const beyondAdjacent = habitats.filter((h) => h.distanceKm != null && h.distanceKm > 0.1)
  const unknownDistance = habitats.filter((h) => h.distanceKm === null)
  // Merge unknown distance habitats into "within boundary" for display (most likely within)
  const withinDisplay = [...withinBoundary, ...unknownDistance]

  const showMap = !!habitatPolygons || !!boundary

  return (
    <div className="space-y-6">
      <SummaryCards habitats={habitats} totalArea={totalArea} />

      <div className={`grid auto-rows-fr grid-cols-1 gap-4 ${showMap ? 'xl:grid-cols-2' : ''}`}>
        <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto">
          {/* Primary: Habitats within site boundary */}
          <Card className="flex flex-col">
            <CardHeader className="shrink-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-emerald-600" />
                Within Site Boundary
                <Badge variant="secondary" className="ml-auto">
                  {withinDisplay.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
              <HabitatTable
                habitats={withinDisplay}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                onRemoveFinding={onRemoveFinding}
              />
            </CardContent>
          </Card>

          {/* Adjacent: Habitats within 100m of boundary */}
          {adjacent.length > 0 && (
            <Card className="flex flex-col">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  Adjacent (within 100m)
                  <Badge
                    variant="outline"
                    className="ml-auto border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400"
                  >
                    {adjacent.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                <HabitatTable
                  habitats={adjacent}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                  onRemoveFinding={onRemoveFinding}
                />
              </CardContent>
            </Card>
          )}

          {/* Beyond 100m */}
          {beyondAdjacent.length > 0 && (
            <Card className="flex flex-col">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  Beyond 100m
                  <Badge variant="outline" className="ml-auto">
                    {beyondAdjacent.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                <HabitatTable
                  habitats={beyondAdjacent}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                  onRemoveFinding={onRemoveFinding}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {showMap && (
          <Card className="flex max-h-[420px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
            <CardContent className="flex min-h-0 flex-1 p-0">
              <div className="h-full min-h-[250px] w-full">
                <BaselineMap
                  habitatPolygons={styledPolygons ?? undefined}
                  habitatSelectionKey={selectedCode || 'all'}
                  boundary={boundary}
                  bufferDistances={[2, 5]}
                  showControls={false}
                  npwsVisibleLayers={npwsVisibleLayers}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-muted/50 flex items-start gap-2 rounded-lg border px-4 py-3">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs">
          Based on National Land Cover 2018 (NLC). This is a preliminary desktop assessment —
          habitat types require field verification using FOSSITT Level 3 classification.
        </p>
      </div>
    </div>
  )
}
