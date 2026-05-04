'use client'

import * as React from 'react'
import { Droplets, Info, Layers, MapPin, Sparkles, TreePine, X } from 'lucide-react'

import { cn } from '@/lib/utils'

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
import { getHeritageColor } from '@/lib/config/map-constants'
import { mapFossittToNlcLabel } from '@/lib/data/nlc-to-fossitt'
import { BaselineMap, toMapFindings } from './baseline-map-utils'
import { FindingDetailDialog } from './finding-detail-dialog'
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
  finding?: DeskResearchFinding
}

interface HabitatInventorySectionProps {
  findings: DeskResearchFinding[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  onHabitatData?: (habitats: HabitatRow[]) => void
  onRemoveFinding?: (findingId: string) => void
  /** NPWS layer IDs saved from GIS step (e.g. ['sac', 'spa']) */
  npwsVisibleLayers?: string[]
}

type DistanceFilter = 'all' | 'within' | 'adjacent'

interface DistanceCard {
  key: DistanceFilter
  label: string
  count: number
  area: number
  color: string
  activeColor: string
  iconColor: string
  icon: typeof Layers
}

function FilterCards({
  cards,
  activeFilter,
  onFilterChange,
}: {
  cards: DistanceCard[]
  activeFilter: DistanceFilter
  onFilterChange: (filter: DistanceFilter) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {cards.map((c) => {
        const isActive = activeFilter === c.key
        const isDisabled = c.count === 0 && c.key !== 'all'
        const Icon = c.icon
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              if (isDisabled) return
              onFilterChange(c.key)
            }}
            aria-pressed={isActive}
            disabled={isDisabled}
            className="text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Card
              className={cn(
                'border transition-all',
                c.color,
                isActive && c.activeColor,
                !isDisabled && 'hover:brightness-110'
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-6 w-6 shrink-0 ${c.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{c.count}</span>
                    <span className="text-xs font-medium opacity-70">types</span>
                  </div>
                  <div className="text-xs font-medium">
                    {c.label}
                    {c.area > 0 && (
                      <span className="ml-1 opacity-60">· {c.area.toFixed(0)} ha</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

function HabitatTable({
  habitats,
  selectedCode,
  onSelect,
  onRemoveFinding,
  onSelectFinding,
}: {
  habitats: HabitatRow[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
  onRemoveFinding?: (findingId: string) => void
  onSelectFinding: (finding: DeskResearchFinding) => void
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
                <TableCell className="font-medium">
                  {h.finding ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectFinding(h.finding!)
                      }}
                      className="inline-flex items-center gap-1 text-left text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {h.fossittName}
                      <Sparkles className="h-3 w-3 shrink-0 text-purple-500" />
                    </button>
                  ) : (
                    h.fossittName
                  )}
                </TableCell>
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
  otherBoundaries,
  allBoundaries,
  onHabitatData,
  onRemoveFinding,
  npwsVisibleLayers,
}: HabitatInventorySectionProps) {
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = React.useState<DeskResearchFinding | null>(null)
  const [distanceFilter, setDistanceFilter] = React.useState<'all' | 'within' | 'adjacent'>('all')
  const [layerToggles, setLayerToggles] = React.useState({
    sites: true,
    aquatic: true,
    habitats: true,
  })

  // Multi-source map findings (designated sites + aquatic) so the habitat
  // map can overlay them with the layer toggle pills.
  const overlayMapFindings = React.useMemo(
    () => [
      ...toMapFindings(findings, 'designated_site'),
      ...toMapFindings(findings, 'water_quality'),
      ...toMapFindings(findings, 'catchment'),
    ],
    [findings]
  )

  // ProjectMap gates the habitat polygon layer with
  // `!visibleFindingTypes || visibleFindingTypes.includes('habitat')`.
  // We pass a non-empty list (sites/aquatic), so the truthy branch is always
  // taken and 'habitat' MUST be in the list when the user has the Habitats
  // pill toggled on — otherwise polygons render only when *all* layers happen
  // to be off.
  const visibleFindingTypes = React.useMemo(() => {
    const types: string[] = []
    if (layerToggles.sites) types.push('designated_site')
    if (layerToggles.aquatic) types.push('water_quality', 'catchment')
    if (layerToggles.habitats) types.push('habitat')
    return types
  }, [layerToggles])

  const habitatFindings = React.useMemo(
    () => findings.filter((f) => f.data_type === 'habitat'),
    [findings]
  )

  const { habitats } = React.useMemo(() => {
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
          color: getHeritageColor(fossittCode),
          nlcLabel,
          areaHa,
          percentage: total > 0 ? (areaHa / total) * 100 : 0,
          distanceKm,
          finding: f,
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
      // Prefer the NLC label saved at fetch time; fall back to the FOSSITT
      // representative reverse mapping so the NLC palette toggle resolves
      // for habitats imported through code paths that didn't persist
      // nlcLabel.
      const nlcLabel =
        typeof raw?.nlcLabel === 'string'
          ? (raw.nlcLabel as string)
          : mapFossittToNlcLabel(fossittCode)
      return {
        type: 'Feature',
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          fossitt_name: String(raw?.fossittName ?? f.title),
          fossitt_code: fossittCode,
          color: getHeritageColor(fossittCode),
          nlc_label: nlcLabel,
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

  // Within boundary: distance computed and < 10m (epsilon for float comparison).
  // Null distance = not computed — bucketed with "within" (most likely inside).
  const WITHIN_EPSILON_KM = 0.01
  const withinBoundary = habitats.filter(
    (h) => h.distanceKm != null && h.distanceKm < WITHIN_EPSILON_KM
  )
  const adjacent = habitats.filter(
    (h) => h.distanceKm != null && h.distanceKm >= WITHIN_EPSILON_KM && h.distanceKm <= 0.1
  )
  const unknownDistance = habitats.filter((h) => h.distanceKm === null)
  const withinDisplay = [...withinBoundary, ...unknownDistance]

  // Distance filter pre-aggregates the rows shown in the unified table.
  // "Beyond 100m" is no longer surfaced — those rows fall outside both
  // "within" and "adjacent" buckets and are excluded from the table when
  // a filter other than "all" is active.
  const filteredHabitats = React.useMemo(() => {
    if (distanceFilter === 'within') return withinDisplay
    if (distanceFilter === 'adjacent') return adjacent
    return [...withinDisplay, ...adjacent]
  }, [distanceFilter, withinDisplay, adjacent])

  const showMap = !!habitatPolygons || !!boundary

  const withinArea = withinDisplay.reduce((sum, h) => sum + h.areaHa, 0)
  const adjacentArea = adjacent.reduce((sum, h) => sum + h.areaHa, 0)

  const filterCards: DistanceCard[] = [
    {
      key: 'all',
      label: 'All Habitats',
      count: withinDisplay.length + adjacent.length,
      area: withinArea + adjacentArea,
      color:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
      activeColor: 'ring-2 ring-emerald-500 dark:ring-emerald-400',
      iconColor: 'text-emerald-500',
      icon: Layers,
    },
    {
      key: 'within',
      label: 'Within Site Boundary',
      count: withinDisplay.length,
      area: withinArea,
      color:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200',
      activeColor: 'ring-2 ring-green-500 dark:ring-green-400',
      iconColor: 'text-green-500',
      icon: TreePine,
    },
    {
      key: 'adjacent',
      label: 'Within 100m',
      count: adjacent.length,
      area: adjacentArea,
      color:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200',
      activeColor: 'ring-2 ring-amber-500 dark:ring-amber-400',
      iconColor: 'text-amber-500',
      icon: MapPin,
    },
  ]

  return (
    <div className="space-y-6">
      <FilterCards
        cards={filterCards}
        activeFilter={distanceFilter}
        onFilterChange={setDistanceFilter}
      />

      <div className={`grid auto-rows-fr grid-cols-1 gap-4 ${showMap ? 'xl:grid-cols-2' : ''}`}>
        <Card className="flex h-[450px] flex-col">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-emerald-600" />
              Habitats
              <Badge variant="secondary" className="ml-auto">
                {filteredHabitats.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            <HabitatTable
              habitats={filteredHabitats}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              onRemoveFinding={onRemoveFinding}
              onSelectFinding={setSelectedFinding}
            />
          </CardContent>
        </Card>

        {showMap && (
          <Card className="relative flex h-[450px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
            <CardContent className="flex min-h-0 flex-1 p-0">
              <div className="h-full w-full">
                <BaselineMap
                  habitatPolygons={
                    layerToggles.habitats ? (styledPolygons ?? undefined) : undefined
                  }
                  habitatSelectionKey={selectedCode || 'all'}
                  findings={overlayMapFindings.length > 0 ? overlayMapFindings : undefined}
                  visibleFindingTypes={visibleFindingTypes}
                  boundary={boundary}
                  otherBoundaries={otherBoundaries}
                  allBoundaries={allBoundaries}
                  bufferDistances={[2, 5]}
                  showControls={true}
                  npwsVisibleLayers={layerToggles.sites ? npwsVisibleLayers : []}
                />
              </div>
            </CardContent>

            {/* Layer toggle pills — same pattern as Target Notes / Habitat
                Mapping in Field Research. Click to show/hide each data layer
                on the map. */}
            <div className="absolute top-3 left-1/2 z-[400] flex -translate-x-1/2 items-center gap-2">
              {(
                [
                  {
                    key: 'sites',
                    label: 'Sites',
                    icon: MapPin,
                    activeColor: 'bg-emerald-500 text-white hover:bg-emerald-600',
                  },
                  {
                    key: 'aquatic',
                    label: 'Aquatic',
                    icon: Droplets,
                    activeColor: 'bg-sky-500 text-white hover:bg-sky-600',
                  },
                  {
                    key: 'habitats',
                    label: 'Habitats',
                    icon: Layers,
                    activeColor: 'bg-green-500 text-white hover:bg-green-600',
                  },
                ] as const
              ).map((l) => {
                const isActive = layerToggles[l.key]
                const Icon = l.icon
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setLayerToggles((prev) => ({ ...prev, [l.key]: !prev[l.key] }))}
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-md transition-all',
                      isActive
                        ? l.activeColor
                        : 'bg-background/90 text-muted-foreground hover:bg-background backdrop-blur'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {l.label}
                  </button>
                )
              })}
            </div>
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

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  )
}
