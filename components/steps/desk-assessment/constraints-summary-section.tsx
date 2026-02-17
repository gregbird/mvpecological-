'use client'

import * as React from 'react'
import { Shield, Bug, Droplets, MapPin, AlertTriangle, ClipboardList } from 'lucide-react'

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
import type { DeskResearchFinding } from '@/types/database'

interface ConstraintsSummarySectionProps {
  findings: DeskResearchFinding[]
}

interface ConstraintItem {
  id: string
  title: string
  dataType: string
  source: string
  reason: string
}

const DATA_TYPE_LABELS: Record<string, string> = {
  designated_site: 'Designated Site',
  species_record: 'Species Record',
  water_quality: 'Water Quality',
  catchment: 'Catchment',
  other: 'Other',
}

const DATA_TYPE_COLORS: Record<string, string> = {
  designated_site: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  species_record: 'bg-purple-100 text-purple-800 border-purple-200',
  water_quality: 'bg-blue-100 text-blue-800 border-blue-200',
  catchment: 'bg-teal-100 text-teal-800 border-teal-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
}

function extractConstraints(findings: DeskResearchFinding[]): ConstraintItem[] {
  const constraints: ConstraintItem[] = []

  for (const f of findings) {
    const raw = f.raw_data as Record<string, unknown> | null
    const metadata = raw?.metadata as Record<string, unknown> | null

    // Designated sites within 2km are a key constraint
    if (f.data_type === 'designated_site') {
      const distance = f.distance_from_boundary_km ?? (metadata?.distance as number) ?? null
      if (distance != null && distance <= 2) {
        constraints.push({
          id: f.id,
          title: f.title,
          dataType: f.data_type,
          source: f.source,
          reason: `Within ${distance.toFixed(1)} km of site boundary`,
        })
      } else if (distance == null || distance === 0) {
        constraints.push({
          id: f.id,
          title: f.title,
          dataType: f.data_type,
          source: f.source,
          reason: 'Overlaps or adjacent to site boundary',
        })
      }
    }

    // Protected species
    if (f.data_type === 'species_record' && (f.is_protected || metadata?.isProtected)) {
      constraints.push({
        id: f.id,
        title: f.title,
        dataType: f.data_type,
        source: f.source,
        reason: 'Protected species — Wildlife Acts / Habitats Directive',
      })
    }

    // Invasive species
    if (f.data_type === 'species_record' && metadata?.isInvasive) {
      constraints.push({
        id: f.id,
        title: f.title,
        dataType: f.data_type,
        source: f.source,
        reason: 'Invasive species — management measures required',
      })
    }

    // Water bodies with poor/bad WFD status
    if (f.data_type === 'water_quality') {
      const wfdStatus = (raw?.WFD_Status as string) || ''
      if (['Poor', 'Bad', 'Moderate'].includes(wfdStatus)) {
        constraints.push({
          id: f.id,
          title: f.title,
          dataType: f.data_type,
          source: f.source,
          reason: `WFD Status: ${wfdStatus} — water quality constraint`,
        })
      }
    }
  }

  return constraints
}

function SummaryCards({ findings }: { findings: DeskResearchFinding[] }) {
  const designatedSites = findings.filter((f) => f.data_type === 'designated_site').length
  const speciesRecords = findings.filter((f) => f.data_type === 'species_record').length
  const protectedSpecies = findings.filter(
    (f) =>
      f.data_type === 'species_record' &&
      (f.is_protected ||
        ((f.raw_data as Record<string, unknown> | null)?.metadata as Record<string, unknown> | null)
          ?.isProtected)
  ).length
  const aquaticFeatures = findings.filter(
    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
  ).length

  const cards = [
    {
      label: 'Designated Sites',
      count: designatedSites,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconColor: 'text-emerald-500',
      icon: Shield,
    },
    {
      label: 'Species Records',
      count: speciesRecords,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      iconColor: 'text-purple-500',
      icon: Bug,
    },
    {
      label: 'Protected Species',
      count: protectedSpecies,
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500',
      icon: AlertTriangle,
    },
    {
      label: 'Aquatic Features',
      count: aquaticFeatures,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
      icon: Droplets,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
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

function RecommendedSurveys({ findings }: { findings: DeskResearchFinding[] }) {
  const recommendations: { title: string; reason: string }[] = []

  const hasDesignatedSites = findings.some((f) => f.data_type === 'designated_site')
  const hasProtectedSpecies = findings.some((f) => f.is_protected)
  const hasAquatic = findings.some(
    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
  )
  const hasInvasive = findings.some((f) => {
    const metadata = (f.raw_data as Record<string, unknown> | null)?.metadata as Record<
      string,
      unknown
    > | null
    return metadata?.isInvasive === true
  })

  if (hasDesignatedSites) {
    recommendations.push({
      title: 'Connectivity Assessment',
      reason: 'Designated sites identified within the study area or buffer zone.',
    })
  }

  if (hasProtectedSpecies) {
    recommendations.push({
      title: 'Protected Species Survey',
      reason: 'Protected species records found in desk study data.',
    })
  }

  if (hasAquatic) {
    recommendations.push({
      title: 'Aquatic Ecology Survey',
      reason: 'Water bodies or catchments identified in proximity to the site.',
    })
  }

  if (hasInvasive) {
    recommendations.push({
      title: 'Invasive Species Management Plan',
      reason: 'Invasive species records identified in the study area.',
    })
  }

  if (recommendations.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          Recommended Further Surveys
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((r) => (
            <li key={r.title} className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
              <div>
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-muted-foreground text-xs">{r.reason}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function ConstraintsSummarySection({ findings }: ConstraintsSummarySectionProps) {
  const constraints = React.useMemo(() => extractConstraints(findings), [findings])

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <MapPin className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Findings Available</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Complete the data gathering step to see constraints and recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards findings={findings} />

      {/* Key Ecological Constraints */}
      {constraints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Key Ecological Constraints
              <Badge variant="secondary" className="ml-auto">
                {constraints.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Finding</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[80px]">Source</TableHead>
                    <TableHead>Constraint</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constraints.map((c, i) => (
                    <TableRow key={`${c.id}-${i}`}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={DATA_TYPE_COLORS[c.dataType] || ''}>
                          {DATA_TYPE_LABELS[c.dataType] || c.dataType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.source.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {constraints.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-start gap-3 p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-800">
                No Major Constraints Identified
              </div>
              <div className="text-xs text-green-700">
                No designated sites within 2 km, protected species, or water quality issues were
                flagged. Standard field survey protocols apply.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <RecommendedSurveys findings={findings} />
    </div>
  )
}
