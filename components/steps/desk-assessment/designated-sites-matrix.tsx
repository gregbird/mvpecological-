'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp, MapPin, Shield, FileWarning, ExternalLink, X } from 'lucide-react'

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
import { toMapFindings, BaselineMap } from './baseline-map-utils'
import type { DeskResearchFinding } from '@/types/database'
import type { DeepResearchResult } from '@/lib/supabase/queries/deep-research'

interface DesignatedSitesMatrixProps {
  findings: DeskResearchFinding[]
  deepResearch: DeepResearchResult[]
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  onRemoveFinding?: (findingId: string) => void
}

interface SiteRow {
  id: string
  name: string
  code: string
  type: string
  areaHa: number | null
  distanceKm: number | null
  qualifyingInterests: string[]
  isStatutory: boolean
  sourceUrl: string | null
}

const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  SPA: 'bg-blue-100 text-blue-800 border-blue-200',
  NHA: 'bg-amber-100 text-amber-800 border-amber-200',
  pNHA: 'bg-gray-100 text-gray-700 border-gray-200',
}

function parseSiteRows(
  findings: DeskResearchFinding[],
  deepResearch: DeepResearchResult[]
): SiteRow[] {
  const deepResearchMap = new Map<string, DeepResearchResult>()
  for (const dr of deepResearch) {
    deepResearchMap.set(dr.site_code, dr)
  }

  return findings
    .filter((f) => f.data_type === 'designated_site')
    .map((f): SiteRow => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null
      const ssco = raw?.ssco as Record<string, unknown> | null

      const siteCode = ((raw?.SITECODE || raw?.siteCode || metadata?.siteCode) as string) || ''
      const siteType = ((metadata?.siteType || metadata?.designation) as string) || ''

      // Qualifying Interests: prioritize deepResearch > ssco > raw habitats
      let qualifyingInterests: string[] = []

      const dr = deepResearchMap.get(siteCode)
      if (dr?.habitats && dr.habitats.length > 0) {
        qualifyingInterests = dr.habitats.map(
          (h) => `${h.habitatName}${h.habitatCode ? ` [${h.habitatCode}]` : ''}`
        )
      } else if (ssco?.habitats && Array.isArray(ssco.habitats)) {
        qualifyingInterests = (ssco.habitats as Array<Record<string, unknown>>).map(
          (h) =>
            `${h.habitatName || h.name || ''}${h.habitatCode || h.code ? ` [${h.habitatCode || h.code}]` : ''}`
        )
      } else if (raw?.habitats && Array.isArray(raw.habitats)) {
        qualifyingInterests = (raw.habitats as Array<Record<string, unknown>>).map(
          (h) =>
            `${h.habitatName || h.name || ''}${h.habitatCode || h.code ? ` [${h.habitatCode || h.code}]` : ''}`
        )
      }

      const isStatutory = ['SAC', 'SPA', 'NHA'].includes(siteType)

      return {
        id: f.id,
        name: f.title,
        code: siteCode,
        type: siteType,
        areaHa: (raw?.AREA_HA as number) ?? (ssco?.intersectionArea as number) ?? null,
        distanceKm: f.distance_from_boundary_km ?? (metadata?.distance as number) ?? null,
        qualifyingInterests: qualifyingInterests.filter(Boolean),
        isStatutory,
        sourceUrl: getFindingSourceUrl(f),
      }
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
}

function ZoneOfInfluenceCards({ sites }: { sites: SiteRow[] }) {
  const zone0to2 = sites.filter((s) => s.distanceKm != null && s.distanceKm <= 2)
  const zone2to5 = sites.filter(
    (s) => s.distanceKm != null && s.distanceKm > 2 && s.distanceKm <= 5
  )
  const zone5to15 = sites.filter(
    (s) => s.distanceKm != null && s.distanceKm > 5 && s.distanceKm <= 15
  )
  const unknownDistance = sites.filter((s) => s.distanceKm == null)

  const zones = [
    {
      label: '0 – 2 km',
      count: zone0to2.length,
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500',
    },
    {
      label: '2 – 5 km',
      count: zone2to5.length,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-500',
    },
    {
      label: '5 – 15 km',
      count: zone5to15.length,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
    },
  ]

  if (unknownDistance.length > 0) {
    zones.push({
      label: 'Distance N/A',
      count: unknownDistance.length,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
      iconColor: 'text-gray-400',
    })
  }

  return (
    <div className={`grid gap-3 ${zones.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {zones.map((z) => (
        <Card key={z.label} className={`border ${z.color}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <MapPin className={`h-5 w-5 shrink-0 ${z.iconColor}`} />
            <div>
              <div className="text-2xl font-bold">{z.count}</div>
              <div className="text-xs font-medium">{z.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CollapsibleQI({ items }: { items: string[] }) {
  const [expanded, setExpanded] = React.useState(false)

  if (items.length === 0) {
    return <span className="text-muted-foreground text-xs italic">Not available</span>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-gray-100"
      >
        {expanded ? (
          <>
            Hide
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            View ({items.length})
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
      {expanded && (
        <div className="mt-1 flex flex-wrap gap-1">
          {items.map((qi, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {qi}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function SitesTable({
  sites,
  title,
  icon,
  onRemoveFinding,
}: {
  sites: SiteRow[]
  title: string
  icon: React.ReactNode
  onRemoveFinding?: (findingId: string) => void
}) {
  if (sites.length === 0) return null

  return (
    <Card className="flex max-h-[420px] flex-col">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {sites.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Site Name</TableHead>
                <TableHead className="w-[90px]">Code</TableHead>
                <TableHead className="w-[70px]">Type</TableHead>
                <TableHead className="w-[90px] text-right">Area (ha)</TableHead>
                <TableHead className="w-[90px] text-right">Distance (km)</TableHead>
                <TableHead>Qualifying Interests</TableHead>
                {onRemoveFinding && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">
                    {site.sourceUrl ? (
                      <a
                        href={site.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        {site.name}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      site.name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{site.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SITE_TYPE_COLORS[site.type] || ''}>
                      {site.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {site.areaHa != null
                      ? site.areaHa.toLocaleString(undefined, { maximumFractionDigits: 1 })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {site.distanceKm != null ? site.distanceKm.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell>
                    <CollapsibleQI items={site.qualifyingInterests} />
                  </TableCell>
                  {onRemoveFinding && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-600"
                        onClick={() => onRemoveFinding(site.id)}
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
  )
}

export function DesignatedSitesMatrix({
  findings,
  deepResearch,
  boundary,
  onRemoveFinding,
}: DesignatedSitesMatrixProps) {
  const sites = React.useMemo(() => parseSiteRows(findings, deepResearch), [findings, deepResearch])
  const mapFindings = React.useMemo(() => toMapFindings(findings, 'designated_site'), [findings])
  const hasLocationData = mapFindings.length > 0

  const statutory = sites.filter((s) => s.isStatutory)
  const nonStatutory = sites.filter((s) => !s.isStatutory)

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <MapPin className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Designated Sites</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              No designated sites were found in the data gathering step.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const mapCard = hasLocationData ? (
    <Card className="flex max-h-[420px] flex-col overflow-hidden [&_.leaflet-control-attribution]:hidden">
      <CardContent className="flex min-h-0 flex-1 p-0">
        <div className="h-full min-h-[250px] w-full">
          <BaselineMap findings={mapFindings} boundary={boundary} showControls={false} />
        </div>
      </CardContent>
    </Card>
  ) : null

  return (
    <div className="space-y-6">
      {/* Zone of Influence Summary */}
      <div>
        <h4 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Zone of Influence
        </h4>
        <ZoneOfInfluenceCards sites={sites} />
      </div>

      {/* Statutory Sites — table + map side by side */}
      {statutory.length > 0 && (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
          <SitesTable
            sites={statutory}
            title="Statutory Designated Sites"
            icon={<Shield className="h-5 w-5 text-emerald-600" />}
            onRemoveFinding={onRemoveFinding}
          />
          {mapCard}
        </div>
      )}

      {/* Non-Statutory Sites — table + map side by side */}
      {nonStatutory.length > 0 && (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 xl:grid-cols-2">
          <SitesTable
            sites={nonStatutory}
            title="Non-Statutory Designated Sites"
            icon={<FileWarning className="h-5 w-5 text-gray-500" />}
            onRemoveFinding={onRemoveFinding}
          />
          {mapCard}
        </div>
      )}
    </div>
  )
}
