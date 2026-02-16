'use client'

import * as React from 'react'
import { Droplets, Waves, Map } from 'lucide-react'

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
import { getWFDStatusColor, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import type { DeskResearchFinding } from '@/types/database'
import type { AquaticResearchResult } from '@/lib/supabase/queries/aquatic-research'

interface AquaticEnvironmentSectionProps {
  findings: DeskResearchFinding[]
  aquaticResearch: AquaticResearchResult[]
}

interface WaterBodyRow {
  id: string
  name: string
  type: 'River' | 'Lake' | 'Catchment'
  wfdStatus: string | null
  catchment: string | null
  distance: number | null
  detail: string | null // Length_km or Area_ha
  source: string
}

function parseWaterBodyRows(
  findings: DeskResearchFinding[],
  aquaticResearch: AquaticResearchResult[]
): WaterBodyRow[] {
  // Build map from aquatic research for enrichment
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

    // Determine water body type
    const siteType = (metadata?.siteType as string) || ''
    let type: 'River' | 'Lake' | 'Catchment' = 'River'
    if (siteType.toLowerCase().includes('lake')) type = 'Lake'
    else if (siteType.toLowerCase().includes('catchment') || f.data_type === 'catchment')
      type = 'Catchment'

    // Get name
    const name =
      (raw?.RiverName as string) ||
      (raw?.LakeName as string) ||
      (raw?.CatchmentName as string) ||
      f.title

    // WFD Status: prioritize aquatic research, then raw_data
    const waterBodyCode = (raw?.RiverCode as string) || (raw?.LakeCode as string) || ''
    const research = researchMap[waterBodyCode]
    const wfdStatus = research?.current_status || (raw?.WFD_Status as string) || null

    // Catchment name
    const catchment = research?.catchment_name || (raw?.CatchmentName as string) || null

    // Detail: Length for rivers, Area for lakes
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

export function AquaticEnvironmentSection({
  findings,
  aquaticResearch,
}: AquaticEnvironmentSectionProps) {
  const waterBodies = React.useMemo(
    () => parseWaterBodyRows(findings, aquaticResearch),
    [findings, aquaticResearch]
  )

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-5 w-5 text-blue-600" />
            Water Bodies
            <Badge variant="secondary" className="ml-auto">
              {waterBodies.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[90px]">Type</TableHead>
                  <TableHead className="w-[120px]">WFD Status</TableHead>
                  <TableHead className="w-[150px]">Catchment</TableHead>
                  <TableHead className="w-[100px] text-right">Distance (km)</TableHead>
                  <TableHead className="w-[100px] text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waterBodies.map((wb) => (
                  <TableRow key={wb.id}>
                    <TableCell className="font-medium">{wb.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TYPE_COLORS[wb.type] || ''}>
                        {wb.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <WFDStatusBadge status={wb.wfdStatus} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {wb.catchment || <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {wb.distance != null ? wb.distance.toFixed(1) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{wb.detail || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
