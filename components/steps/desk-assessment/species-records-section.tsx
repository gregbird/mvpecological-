'use client'

import * as React from 'react'
import { Bug, Shield, AlertTriangle, ExternalLink, X } from 'lucide-react'

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
import { getFindingSourceUrl } from '@/lib/utils/finding-source-url'
import { gridRefToItm, itmToWgs84 } from '@/lib/utils/grid-reference'
import { toMapFindings, BaselineMap } from './baseline-map-utils'
import type { DeskResearchFinding } from '@/types/database'

interface SpeciesRecordsSectionProps {
  findings: DeskResearchFinding[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  onRemoveFinding?: (findingId: string) => void
}

interface SpeciesRow {
  id: string
  name: string
  scientificName: string
  taxonGroup: string
  source: string
  isProtected: boolean
  isInvasive: boolean
  redListStatus: string | null
  recordCount: number
  designation: string | null
  sourceUrl: string | null
}

function parseSpeciesRows(findings: DeskResearchFinding[]): SpeciesRow[] {
  return findings
    .filter((f) => f.data_type === 'species_record')
    .map((f): SpeciesRow => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null

      return {
        id: f.id,
        name: f.title,
        scientificName: (metadata?.scientificName as string) || f.title,
        taxonGroup: (metadata?.taxonGroup as string) || 'Unknown',
        source: f.source,
        isProtected: (metadata?.isProtected as boolean) || f.is_protected || false,
        isInvasive: (metadata?.isInvasive as boolean) || false,
        redListStatus: f.red_list_status || (metadata?.redListStatus as string) || null,
        recordCount: (metadata?.recordCount as number) || 1,
        designation: (metadata?.designation as string) || null,
        sourceUrl: getFindingSourceUrl(f),
      }
    })
}

function SummaryCards({ species }: { species: SpeciesRow[] }) {
  const totalSpecies = species.length
  const protectedSpecies = species.filter((s) => s.isProtected).length
  const invasiveSpecies = species.filter((s) => s.isInvasive).length

  const cards = [
    {
      label: 'Total Species',
      count: totalSpecies,
      color:
        'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200',
      iconColor: 'text-blue-500',
      icon: Bug,
    },
    {
      label: 'Protected',
      count: protectedSpecies,
      color:
        'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200',
      iconColor: 'text-emerald-500',
      icon: Shield,
    },
    {
      label: 'Invasive',
      count: invasiveSpecies,
      color:
        'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-200',
      iconColor: 'text-red-500',
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.color}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <c.icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
            <div>
              <div className="text-2xl font-bold">{c.count}</div>
              <div className="text-xs font-medium">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
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

/** Build grid square polygons from species findings metadata */
function buildGridSquarePolygons(
  findings: DeskResearchFinding[]
): GeoJSON.FeatureCollection | null {
  const gridRefs = new Set<string>()
  for (const f of findings) {
    if (f.data_type !== 'species_record') continue
    const raw = f.raw_data as Record<string, unknown> | null
    const squares = raw?.gridSquares as string[] | undefined
    if (squares) {
      for (const sq of squares) gridRefs.add(sq.replace(/\s+/g, '').toUpperCase())
    }
    const metadata = raw?.metadata as Record<string, unknown> | null
    const singleRef = metadata?.gridReference as string | undefined
    if (singleRef) gridRefs.add(singleRef.replace(/\s+/g, '').toUpperCase())
  }
  if (gridRefs.size === 0) return null

  const features: GeoJSON.Feature[] = []
  for (const ref of gridRefs) {
    try {
      const ing = gridRefToItm(ref)
      // Determine resolution from ref length: letter + 2 digits = 10km, +4 = 1km, etc.
      const digits = ref.length - 1
      const resolution = digits <= 2 ? 10000 : digits <= 4 ? 1000 : 100
      // gridRefToItm returns ING coordinates (0-500k), but itmToWgs84 expects ITM (+400k/+500k offset)
      const sw = itmToWgs84(ing.easting + 400000, ing.northing + 500000)
      const ne = itmToWgs84(ing.easting + resolution + 400000, ing.northing + resolution + 500000)
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat],
            ],
          ],
        },
        properties: {
          label: ref,
          fossitt_name: `Grid: ${ref}`,
          fossitt_code: ref,
          color: '#8b5cf6',
        },
      })
    } catch {
      // skip invalid grid refs
    }
  }
  return features.length > 0 ? { type: 'FeatureCollection', features } : null
}

export function SpeciesRecordsSection({
  findings,
  boundary,
  onRemoveFinding,
}: SpeciesRecordsSectionProps) {
  const species = React.useMemo(() => parseSpeciesRows(findings), [findings])
  const mapFindings = React.useMemo(() => toMapFindings(findings, 'species_record'), [findings])
  const gridPolygons = React.useMemo(() => buildGridSquarePolygons(findings), [findings])
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
      <SummaryCards species={species} />

      {/* Table + Map side by side */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex max-h-[420px] flex-col">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-5 w-5 text-blue-600" />
              Species Records
              <Badge variant="secondary" className="ml-auto">
                {species.length}
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
                  {species.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {s.sourceUrl ? (
                              <a
                                href={s.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                              >
                                {s.name}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              s.name
                            )}
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
                  bufferDistances={[2, 5, 15]}
                  showControls={false}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
