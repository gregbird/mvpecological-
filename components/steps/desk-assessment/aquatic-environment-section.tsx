'use client'

import * as React from 'react'
import {
  ArrowRight,
  Droplets,
  GitBranch,
  Layers,
  Map,
  MapPin,
  Sparkles,
  Waves,
  X,
} from 'lucide-react'

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
import { getWFDStatusColor, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import { BaselineMap, toMapFindings } from './baseline-map-utils'
import { FindingDetailDialog } from './finding-detail-dialog'
import type { DeskResearchFinding } from '@/types/database'
import type { AquaticResearchResult } from '@/lib/supabase/queries/aquatic-research'

interface AquaticEnvironmentSectionProps {
  findings: DeskResearchFinding[]
  aquaticResearch: AquaticResearchResult[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  onRemoveFinding?: (findingId: string) => void
}

interface WaterBodyRow {
  id: string
  name: string
  type: 'River' | 'Lake' | 'Catchment'
  wfdStatus: string | null
  catchment: string | null
  distance: number | null
  detail: string | null
  source: string
  finding: DeskResearchFinding
}

function parseWaterBodyRows(
  findings: DeskResearchFinding[],
  aquaticResearch: AquaticResearchResult[]
): WaterBodyRow[] {
  const researchMap: Record<string, AquaticResearchResult> = {}
  for (const ar of aquaticResearch) {
    researchMap[ar.water_body_code] = ar
  }

  const aquaticFindings = findings.filter(
    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
  )

  return aquaticFindings.map((f): WaterBodyRow => {
    const raw = f.raw_data as Record<string, unknown> | null
    const metadata = raw?.metadata as Record<string, unknown> | null

    const siteType = (metadata?.siteType as string) || ''
    let type: 'River' | 'Lake' | 'Catchment' = 'River'
    if (siteType.toLowerCase().includes('lake')) type = 'Lake'
    else if (siteType.toLowerCase().includes('catchment') || f.data_type === 'catchment')
      type = 'Catchment'

    const name =
      (raw?.RiverName as string) ||
      (raw?.LakeName as string) ||
      (raw?.CatchmentName as string) ||
      f.title

    const waterBodyCode = (raw?.RiverCode as string) || (raw?.LakeCode as string) || ''
    const research = researchMap[waterBodyCode]
    const wfdStatus = research?.current_status || (raw?.WFD_Status as string) || null

    const catchment = research?.catchment_name || (raw?.CatchmentName as string) || null

    let detail: string | null = null
    const lengthKm = raw?.Length_km as number | undefined
    const areaHa = raw?.Area_ha as number | undefined
    if (type === 'River' && lengthKm) detail = `${lengthKm.toFixed(1)} km`
    else if (type === 'Lake' && areaHa) detail = `${areaHa.toFixed(1)} ha`

    return {
      id: f.id,
      name,
      type,
      wfdStatus,
      catchment,
      distance: f.distance_from_boundary_km,
      detail,
      source: f.source,
      finding: f,
    }
  })
}

type AquaticFilter = 'all' | 'River' | 'Lake' | 'Catchment'

function SummaryCards({
  waterBodies,
  activeFilter,
  onFilterChange,
}: {
  waterBodies: WaterBodyRow[]
  activeFilter: AquaticFilter
  onFilterChange: (filter: AquaticFilter) => void
}) {
  const total = waterBodies.length
  const rivers = waterBodies.filter((w) => w.type === 'River').length
  const lakes = waterBodies.filter((w) => w.type === 'Lake').length
  const catchments = waterBodies.filter((w) => w.type === 'Catchment').length

  const cards: Array<{
    filter: AquaticFilter
    label: string
    count: number
    color: string
    activeColor: string
    iconColor: string
    icon: typeof Waves
  }> = [
    {
      filter: 'all',
      label: 'Total',
      count: total,
      color:
        'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      activeColor: 'ring-2 ring-slate-500 dark:ring-slate-400',
      iconColor: 'text-slate-500',
      icon: Droplets,
    },
    {
      filter: 'River',
      label: 'Rivers',
      count: rivers,
      color:
        'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200',
      activeColor: 'ring-2 ring-blue-500 dark:ring-blue-400',
      iconColor: 'text-blue-500',
      icon: Waves,
    },
    {
      filter: 'Lake',
      label: 'Lakes',
      count: lakes,
      color:
        'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-200',
      activeColor: 'ring-2 ring-cyan-500 dark:ring-cyan-400',
      iconColor: 'text-cyan-500',
      icon: Droplets,
    },
    {
      filter: 'Catchment',
      label: 'Catchments',
      count: catchments,
      color:
        'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-200',
      activeColor: 'ring-2 ring-teal-500 dark:ring-teal-400',
      iconColor: 'text-teal-500',
      icon: Map,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const isActive = activeFilter === c.filter
        const isDisabled = c.count === 0 && c.filter !== 'all'
        return (
          <button
            key={c.filter}
            type="button"
            onClick={() => {
              if (isDisabled) return
              onFilterChange(isActive ? 'all' : c.filter)
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
                <c.icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
                <div>
                  <div className="text-2xl font-bold">{c.count}</div>
                  <div className="text-xs font-medium">{c.label}</div>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  River: 'bg-blue-100 text-blue-800 border-blue-200',
  Lake: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Catchment: 'bg-teal-100 text-teal-800 border-teal-200',
}

function WFDStatusBadge({ status }: { status: string | null }) {
  const displayName = getWFDStatusDisplayName(status ?? undefined)
  const color = getWFDStatusColor(status ?? undefined)

  return (
    <Badge variant="outline" style={{ borderColor: color, color }} className="font-medium">
      {displayName}
    </Badge>
  )
}

function ConnectivityCard({ aquaticResearch }: { aquaticResearch: AquaticResearchResult[] }) {
  const connectivityData = React.useMemo(() => {
    return aquaticResearch
      .filter((ar) => ar.connectivity && ar.connectivity.length > 0)
      .map((ar) => ({
        name: ar.water_body_name,
        code: ar.water_body_code,
        type: ar.water_body_type,
        inputs: ar.connectivity.filter((c) => c.Direction?.toLowerCase() === 'input'),
        outputs: ar.connectivity.filter((c) => c.Direction?.toLowerCase() === 'output'),
      }))
  }, [aquaticResearch])

  if (connectivityData.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-5 w-5 text-teal-600" />
          Connectivity Analysis
          <Badge variant="secondary" className="ml-auto">
            {connectivityData.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectivityData.map((wb) => (
          <div key={wb.code} className="rounded-lg border p-3">
            <div className="mb-2 font-medium">{wb.name}</div>
            <div className="flex flex-wrap items-center gap-2">
              {wb.inputs.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {wb.inputs.map((inp) => (
                      <Badge
                        key={inp.Code}
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-800"
                      >
                        {inp.Name}
                      </Badge>
                    ))}
                  </div>
                  <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                </>
              )}
              <Badge className="bg-teal-100 text-teal-800">{wb.name}</Badge>
              {wb.outputs.length > 0 && (
                <>
                  <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {wb.outputs.map((out) => (
                      <Badge
                        key={out.Code}
                        variant="outline"
                        className="border-cyan-200 bg-cyan-50 text-cyan-800"
                      >
                        {out.Name}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AquaticEnvironmentSection({
  findings,
  aquaticResearch,
  boundary,
  otherBoundaries,
  allBoundaries,
  onRemoveFinding,
}: AquaticEnvironmentSectionProps) {
  const waterBodies = React.useMemo(
    () => parseWaterBodyRows(findings, aquaticResearch),
    [findings, aquaticResearch]
  )
  const [selectedFinding, setSelectedFinding] = React.useState<DeskResearchFinding | null>(null)
  const [activeFilter, setActiveFilter] = React.useState<AquaticFilter>('all')

  const filteredWaterBodies = React.useMemo(
    () =>
      activeFilter === 'all' ? waterBodies : waterBodies.filter((w) => w.type === activeFilter),
    [waterBodies, activeFilter]
  )

  const [layerToggles, setLayerToggles] = React.useState({
    sites: true,
    aquatic: true,
    habitats: true,
  })

  // Aquatic findings render through FindingMarkers (Polygon + LineString +
  // Point support) — matches data-gathering rendering. Habitat layer was
  // stamping "Lake"/"River" labels at polygon center which was misleading.
  const aquaticMapFindings = React.useMemo(
    () => [...toMapFindings(findings, 'water_quality'), ...toMapFindings(findings, 'catchment')],
    [findings]
  )

  // Cross-reference overlays — designated sites + habitats — so the user can
  // see which water bodies sit inside protected areas / sensitive habitats.
  const overlayMapFindings = React.useMemo(
    () => [...toMapFindings(findings, 'designated_site'), ...toMapFindings(findings, 'habitat')],
    [findings]
  )

  const visibleFindingTypes = React.useMemo(() => {
    const types: string[] = []
    if (layerToggles.sites) types.push('designated_site')
    if (layerToggles.aquatic) types.push('water_quality', 'catchment')
    if (layerToggles.habitats) types.push('habitat')
    return types
  }, [layerToggles])

  const combinedMapFindings = React.useMemo(
    () => (layerToggles.aquatic ? aquaticMapFindings : []).concat(overlayMapFindings),
    [layerToggles.aquatic, aquaticMapFindings, overlayMapFindings]
  )

  // Legacy: kept for reference but no longer used after switching to FindingMarkers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _aquaticFeatureCollection = React.useMemo<GeoJSON.FeatureCollection | null>(() => {
    const aquaticFindings = findings.filter(
      (f) => (f.data_type === 'water_quality' || f.data_type === 'catchment') && f.location != null
    )
    if (aquaticFindings.length === 0) return null

    const features: GeoJSON.Feature[] = aquaticFindings.map((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null
      const siteType = (metadata?.siteType as string) || ''

      // Classify the feature so catchments don't get mislabeled as "River"
      // (the previous logic only distinguished Lake vs. River).
      let waterType: 'River' | 'Lake' | 'Catchment' = 'River'
      let color = '#3b82f6'
      if (siteType.toLowerCase().includes('lake')) {
        waterType = 'Lake'
        color = '#06b6d4'
      } else if (siteType.toLowerCase().includes('catchment') || f.data_type === 'catchment') {
        waterType = 'Catchment'
        color = '#14b8a6'
      }

      return {
        type: 'Feature',
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          fossitt_name: f.title,
          // Catchments cover huge areas — skip the centered label so the map
          // doesn't end up with "Catchment" painted across half the country.
          // Rivers/lakes keep their label since they're small enough to read.
          // Em-dash signals HabitatPolygonLayer to skip the permanent label.
          // Aquatic features were getting "Lake"/"River" stamped at polygon
          // center which is misleading \u2014 the table beside the map already
          // identifies each feature.
          fossitt_code: '\u2014',
          waterType,
          color,
          fillOpacity: waterType === 'Catchment' ? 0.15 : 0.35,
        },
      }
    })

    return { type: 'FeatureCollection', features }
  }, [findings])

  if (waterBodies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Droplets className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Aquatic Features</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              No rivers, lakes, or catchments were found in the data gathering step.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        waterBodies={waterBodies}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Table + Map side by side */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex h-[450px] flex-col">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-5 w-5 text-blue-600" />
              Water Bodies
              {activeFilter !== 'all' && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {activeFilter}
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="hover:text-foreground ml-1"
                    aria-label="Clear filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Badge variant="secondary" className="ml-auto">
                {filteredWaterBodies.length}
                {activeFilter !== 'all' ? ` of ${waterBodies.length}` : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[70px]">Type</TableHead>
                    <TableHead className="w-[90px]">WFD Status</TableHead>
                    <TableHead className="w-[80px] text-right">Distance (km)</TableHead>
                    <TableHead className="w-[60px] text-right">Size</TableHead>
                    {onRemoveFinding && <TableHead className="w-[40px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWaterBodies.map((wb) => (
                    <TableRow key={wb.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => setSelectedFinding(wb.finding)}
                          className="inline-flex items-center gap-1 text-left text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {wb.name}
                          <Sparkles className="h-3 w-3 shrink-0 text-purple-500" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_COLORS[wb.type] || ''}>
                          {wb.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <WFDStatusBadge status={wb.wfdStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        {wb.distance != null ? wb.distance.toFixed(1) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">{wb.detail || '—'}</TableCell>
                      {onRemoveFinding && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => onRemoveFinding(wb.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Map beside table */}
        {(aquaticMapFindings.length > 0 || boundary) && (
          <Card className="relative flex h-[450px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
            <CardContent className="flex min-h-0 flex-1 p-0">
              <div className="h-full min-h-[250px] w-full">
                <BaselineMap
                  findings={combinedMapFindings.length > 0 ? combinedMapFindings : undefined}
                  visibleFindingTypes={visibleFindingTypes}
                  boundary={boundary}
                  otherBoundaries={otherBoundaries}
                  allBoundaries={allBoundaries}
                  bufferDistances={[2, 5]}
                  showControls={false}
                />
              </div>
            </CardContent>

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

      <ConnectivityCard aquaticResearch={aquaticResearch} />

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  )
}
