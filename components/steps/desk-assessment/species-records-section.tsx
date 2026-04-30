'use client'

import * as React from 'react'
import { Bug, Shield, AlertTriangle, Sparkles, TrendingDown, X } from 'lucide-react'

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
import { wgs84ToItm, itmToWgs84, itmToGridRef } from '@/lib/utils/grid-reference'
import { toMapFindings, BaselineMap } from './baseline-map-utils'
import { FindingDetailDialog } from './finding-detail-dialog'
import type { DeskResearchFinding } from '@/types/database'

interface SpeciesRecordsSectionProps {
  findings: DeskResearchFinding[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  onRemoveFinding?: (findingId: string) => void
}

type SpeciesFilter = 'all' | 'protected' | 'invasive' | 'threatened'

const THREATENED_STATUSES = new Set(['Critically Endangered', 'Endangered', 'Vulnerable'])

interface SpeciesRow {
  id: string
  name: string
  scientificName: string
  taxonGroup: string
  source: string
  isProtected: boolean
  isInvasive: boolean
  isThreatened: boolean
  redListStatus: string | null
  recordCount: number
  designation: string | null
  finding: DeskResearchFinding
}

function parseSpeciesRows(findings: DeskResearchFinding[]): SpeciesRow[] {
  return findings
    .filter((f) => f.data_type === 'species_record')
    .map((f): SpeciesRow => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null

      const redListStatus = f.red_list_status || (metadata?.redListStatus as string) || null
      const isThreatened =
        (metadata?.isThreatened as boolean) ||
        (redListStatus != null && THREATENED_STATUSES.has(redListStatus))

      return {
        id: f.id,
        name: f.title,
        scientificName: (metadata?.scientificName as string) || f.title,
        taxonGroup: (metadata?.taxonGroup as string) || 'Unknown',
        source: f.source,
        isProtected: (metadata?.isProtected as boolean) || f.is_protected || false,
        isInvasive: (metadata?.isInvasive as boolean) || false,
        isThreatened,
        redListStatus,
        recordCount: (metadata?.recordCount as number) || 1,
        designation: (metadata?.designation as string) || null,
        finding: f,
      }
    })
}

function SummaryCards({
  species,
  activeFilter,
  onFilterChange,
}: {
  species: SpeciesRow[]
  activeFilter: SpeciesFilter
  onFilterChange: (filter: SpeciesFilter) => void
}) {
  const totalSpecies = species.length
  const protectedSpecies = species.filter((s) => s.isProtected).length
  const invasiveSpecies = species.filter((s) => s.isInvasive).length
  const threatenedSpecies = species.filter((s) => s.isThreatened).length

  const cards: Array<{
    filter: SpeciesFilter
    label: string
    count: number
    color: string
    activeColor: string
    iconColor: string
    icon: typeof Bug
  }> = [
    {
      filter: 'all',
      label: 'Total Species',
      count: totalSpecies,
      color:
        'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200',
      activeColor: 'ring-2 ring-blue-500 dark:ring-blue-400',
      iconColor: 'text-blue-500',
      icon: Bug,
    },
    {
      filter: 'protected',
      label: 'Protected',
      count: protectedSpecies,
      color:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
      activeColor: 'ring-2 ring-emerald-500 dark:ring-emerald-400',
      iconColor: 'text-emerald-500',
      icon: Shield,
    },
    {
      filter: 'threatened',
      label: 'Threatened',
      count: threatenedSpecies,
      color:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200',
      activeColor: 'ring-2 ring-amber-500 dark:ring-amber-400',
      iconColor: 'text-amber-500',
      icon: TrendingDown,
    },
    {
      filter: 'invasive',
      label: 'Invasive',
      count: invasiveSpecies,
      color:
        'border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200',
      activeColor: 'ring-2 ring-red-500 dark:ring-red-400',
      iconColor: 'text-red-500',
      icon: AlertTriangle,
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

const SOURCE_COLORS: Record<string, string> = {
  nbdc: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
  gbif: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700',
  npws: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700',
  manual:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  epa: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
  catchments:
    'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-700',
  company_reports:
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
}

const RED_LIST_COLORS: Record<string, string> = {
  'Critically Endangered': 'bg-red-100 text-red-800 border-red-200',
  Endangered: 'bg-orange-100 text-orange-800 border-orange-200',
  Vulnerable: 'bg-amber-100 text-amber-800 border-amber-200',
  'Near Threatened': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Least Concern': 'bg-green-100 text-green-800 border-green-200',
}

/** ITM → Irish National Grid (ING) offset */
function itmToIng(itmEasting: number, itmNorthing: number) {
  return { easting: itmEasting - 400000, northing: itmNorthing - 500000 }
}

/** Build 2km grid overlay from project boundary + buffer (matches data-gathering view) */
function buildBoundaryGridOverlay(
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | undefined,
  bufferKm: number
): GeoJSON.FeatureCollection | null {
  if (!boundary) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')
    const bufferPoly = turf.buffer(boundary, bufferKm, { units: 'kilometers' })
    const [minLng, minLat, maxLng, maxLat] = turf.bbox(bufferPoly) as [
      number,
      number,
      number,
      number,
    ]

    const resolutionMeters = 2000 // 2km grid
    const swItm = wgs84ToItm(minLat, minLng)
    const neItm = wgs84ToItm(maxLat, maxLng)
    const swIng = itmToIng(swItm.easting, swItm.northing)
    const neIng = itmToIng(neItm.easting, neItm.northing)

    const minE = Math.floor(swIng.easting / resolutionMeters) * resolutionMeters
    const minN = Math.floor(swIng.northing / resolutionMeters) * resolutionMeters
    const maxE = Math.floor(neIng.easting / resolutionMeters) * resolutionMeters
    const maxN = Math.floor(neIng.northing / resolutionMeters) * resolutionMeters

    const features: GeoJSON.Feature[] = []
    const seenRefs = new Set<string>()
    for (let e = minE; e <= maxE; e += resolutionMeters) {
      for (let n = minN; n <= maxN; n += resolutionMeters) {
        try {
          const ref = itmToGridRef(e, n, 2, true)
          if (seenRefs.has(ref)) continue
          seenRefs.add(ref)

          const sw = itmToWgs84(e + 400000, n + 500000)
          const ne = itmToWgs84(e + resolutionMeters + 400000, n + resolutionMeters + 500000)
          const gridPoly = turf.polygon([
            [
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat],
            ],
          ])

          if (!turf.booleanIntersects(gridPoly, bufferPoly)) continue

          features.push({
            type: 'Feature',
            properties: { label: ref.replace(/\s+/g, '') },
            geometry: gridPoly.geometry,
          })
        } catch {
          // Outside Irish Grid
        }
      }
    }

    return features.length > 0 ? { type: 'FeatureCollection', features } : null
  } catch {
    return null
  }
}

export function SpeciesRecordsSection({
  findings,
  boundary,
  otherBoundaries,
  allBoundaries,
  onRemoveFinding,
}: SpeciesRecordsSectionProps) {
  const species = React.useMemo(() => parseSpeciesRows(findings), [findings])
  const [selectedFinding, setSelectedFinding] = React.useState<DeskResearchFinding | null>(null)
  const [activeFilter, setActiveFilter] = React.useState<SpeciesFilter>('all')

  const filteredSpecies = React.useMemo(() => {
    if (activeFilter === 'all') return species
    if (activeFilter === 'protected') return species.filter((s) => s.isProtected)
    if (activeFilter === 'invasive') return species.filter((s) => s.isInvasive)
    if (activeFilter === 'threatened') return species.filter((s) => s.isThreatened)
    return species
  }, [species, activeFilter])
  const mapFindings = React.useMemo(() => toMapFindings(findings, 'species_record'), [findings])
  const gridPolygons = React.useMemo(() => buildBoundaryGridOverlay(boundary, 2), [boundary])
  const hasLocationData = mapFindings.length > 0
  const hasGridData = gridPolygons != null

  if (species.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Bug className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Species Records</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              No species records were found in the data gathering step.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        species={species}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Table + Map side by side */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex max-h-[420px] flex-col">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-5 w-5 text-blue-600" />
              Species Records
              {activeFilter !== 'all' && (
                <Badge variant="outline" className="ml-1 text-xs capitalize">
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
                {filteredSpecies.length}
                {activeFilter !== 'all' ? ` of ${species.length}` : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Species Name</TableHead>
                    <TableHead className="w-[120px]">Taxon Group</TableHead>
                    <TableHead className="w-[80px]">Source</TableHead>
                    <TableHead className="w-[90px]">Protected</TableHead>
                    <TableHead className="w-[140px]">Red List Status</TableHead>
                    <TableHead className="w-[80px] text-right">Records</TableHead>
                    {onRemoveFinding && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecies.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            <button
                              type="button"
                              onClick={() => setSelectedFinding(s.finding)}
                              className="inline-flex items-center gap-1 text-left text-blue-700 hover:underline dark:text-blue-400"
                            >
                              {s.name}
                              <Sparkles className="h-3 w-3 shrink-0 text-purple-500" />
                            </button>
                          </div>
                          {s.scientificName !== s.name && (
                            <div className="text-muted-foreground text-xs italic">
                              {s.scientificName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.taxonGroup}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SOURCE_COLORS[s.source] || ''}>
                          {s.source.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.isProtected || s.isInvasive ? (
                          <div className="flex flex-wrap gap-1">
                            {s.isProtected && (
                              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                                Protected
                              </Badge>
                            )}
                            {s.isInvasive && (
                              <Badge className="border-red-200 bg-red-100 text-red-800">
                                Invasive
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.redListStatus ? (
                          <Badge
                            variant="outline"
                            className={RED_LIST_COLORS[s.redListStatus] || ''}
                          >
                            {s.redListStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{s.recordCount}</TableCell>
                      {onRemoveFinding && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => onRemoveFinding(s.id)}
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
        {(hasLocationData || hasGridData || !!boundary) && (
          <Card className="flex max-h-[420px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
            <CardContent className="flex min-h-0 flex-1 p-0">
              <div className="h-full min-h-[250px] w-full">
                <BaselineMap
                  findings={hasLocationData ? mapFindings : undefined}
                  gridOverlay={gridPolygons ?? undefined}
                  boundary={boundary}
                  otherBoundaries={otherBoundaries}
                  allBoundaries={allBoundaries}
                  bufferDistances={[2, 5, 15]}
                  showControls={false}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  )
}
