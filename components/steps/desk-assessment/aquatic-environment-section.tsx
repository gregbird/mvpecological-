'use client'

import * as React from 'react'
import { Droplets, Waves, Map, GitBranch, ArrowRight, ExternalLink, X } from 'lucide-react'

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
import { getFindingSourceUrl } from '@/lib/utils/finding-source-url'
import { BaselineMap } from './baseline-map-utils'
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
  sourceUrl: string | null
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
      sourceUrl: getFindingSourceUrl(f),
    }
  })
}

function SummaryCards({ waterBodies }: { waterBodies: WaterBodyRow[] }) {
  const rivers = waterBodies.filter((w) => w.type === 'River').length
  const lakes = waterBodies.filter((w) => w.type === 'Lake').length
  const catchments = waterBodies.filter((w) => w.type === 'Catchment').length

  const cards = [
    {
      label: 'Rivers',
      count: rivers,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
      icon: Waves,
    },
    {
      label: 'Lakes',
      count: lakes,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      iconColor: 'text-cyan-500',
      icon: Droplets,
    },
    {
      label: 'Catchments',
      count: catchments,
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      iconColor: 'text-teal-500',
      icon: Map,
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

  const aquaticFeatureCollection = React.useMemo<GeoJSON.FeatureCollection | null>(() => {
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
          fossitt_code: waterType === 'Catchment' ? '\u2014' : waterType,
          color,
          // Drop the catchment fill so the basemap stays legible underneath.
          // River/lake features keep the default 0.35 from habitatStyle.
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
      <SummaryCards waterBodies={waterBodies} />

      {/* Table + Map side by side */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex max-h-[420px] flex-col">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-5 w-5 text-blue-600" />
              Water Bodies
              <Badge variant="secondary" className="ml-auto">
                {waterBodies.length}
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
                  {waterBodies.map((wb) => (
                    <TableRow key={wb.id}>
                      <TableCell className="font-medium">
                        {wb.sourceUrl ? (
                          <a
                            href={wb.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            {wb.name}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          wb.name
                        )}
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
        {(aquaticFeatureCollection || boundary) && (
          <Card className="flex max-h-[420px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
            <CardContent className="flex min-h-0 flex-1 p-0">
              <div className="h-full min-h-[250px] w-full">
                <BaselineMap
                  habitatPolygons={aquaticFeatureCollection ?? undefined}
                  boundary={boundary}
                  otherBoundaries={otherBoundaries}
                  allBoundaries={allBoundaries}
                  bufferDistances={[2, 5]}
                  showControls={false}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConnectivityCard aquaticResearch={aquaticResearch} />
    </div>
  )
}
