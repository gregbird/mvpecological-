'use client'

import * as React from 'react'
import { AlertCircle, AlertTriangle, Info, HelpCircle, ClipboardList } from 'lucide-react'

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

type RelevanceLevel = 'high' | 'medium' | 'low' | 'unassessed'

interface ConstraintRow {
  id: string
  title: string
  dataType: string
  source: string
  relevance: RelevanceLevel
  notes: string | null
}

function parseRelevance(finding: DeskResearchFinding): RelevanceLevel {
  // Check relevance_level field first
  if (finding.relevance_level) {
    const level = finding.relevance_level.toLowerCase()
    if (level === 'high') return 'high'
    if (level === 'medium') return 'medium'
    if (level === 'low') return 'low'
  }

  // Try to parse from notes JSON
  if (finding.notes) {
    try {
      const parsed = JSON.parse(finding.notes)
      const relevance = (parsed.relevance || parsed.relevanceLevel || '').toLowerCase()
      if (relevance === 'high') return 'high'
      if (relevance === 'medium') return 'medium'
      if (relevance === 'low') return 'low'
    } catch {
      // Not JSON, check plain text
      const notesLower = finding.notes.toLowerCase()
      if (notesLower.includes('high relevance') || notesLower.includes('high priority'))
        return 'high'
      if (notesLower.includes('medium relevance') || notesLower.includes('medium priority'))
        return 'medium'
      if (notesLower.includes('low relevance') || notesLower.includes('low priority')) return 'low'
    }
  }

  return 'unassessed'
}

function parseNotesText(finding: DeskResearchFinding): string | null {
  if (!finding.notes) return null
  try {
    const parsed = JSON.parse(finding.notes)
    return parsed.notes || parsed.assessment || parsed.comment || finding.notes
  } catch {
    return finding.notes
  }
}

function parseConstraintRows(findings: DeskResearchFinding[]): ConstraintRow[] {
  return findings.map(
    (f): ConstraintRow => ({
      id: f.id,
      title: f.title,
      dataType: f.data_type,
      source: f.source,
      relevance: parseRelevance(f),
      notes: parseNotesText(f),
    })
  )
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

function SummaryCards({ constraints }: { constraints: ConstraintRow[] }) {
  const high = constraints.filter((c) => c.relevance === 'high').length
  const medium = constraints.filter((c) => c.relevance === 'medium').length
  const low = constraints.filter((c) => c.relevance === 'low').length
  const unassessed = constraints.filter((c) => c.relevance === 'unassessed').length

  const cards = [
    {
      label: 'High',
      count: high,
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500',
      icon: AlertCircle,
    },
    {
      label: 'Medium',
      count: medium,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-500',
      icon: AlertTriangle,
    },
    {
      label: 'Low',
      count: low,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
      icon: Info,
    },
    {
      label: 'Unassessed',
      count: unassessed,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
      iconColor: 'text-gray-400',
      icon: HelpCircle,
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

function ConstraintsTable({
  constraints,
  title,
  icon,
}: {
  constraints: ConstraintRow[]
  title: string
  icon: React.ReactNode
}) {
  if (constraints.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
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
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {constraints.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={DATA_TYPE_COLORS[c.dataType] || ''}>
                      {DATA_TYPE_LABELS[c.dataType] || c.dataType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.source.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate text-sm">
                    {c.notes || <span className="italic">No notes</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
  const constraints = React.useMemo(() => parseConstraintRows(findings), [findings])

  const hasAnyAssessment = constraints.some((c) => c.relevance !== 'unassessed')

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-12 w-12 text-gray-300" />
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

  const high = constraints.filter((c) => c.relevance === 'high')
  const medium = constraints.filter((c) => c.relevance === 'medium')

  return (
    <div className="space-y-6">
      <SummaryCards constraints={constraints} />

      {!hasAnyAssessment && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-medium text-amber-800">No Relevance Assessments</div>
              <div className="text-xs text-amber-700">
                Use the Assessment tab to review findings and assign relevance levels before
                generating reports.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConstraintsTable
        constraints={high}
        title="High Relevance Constraints"
        icon={<AlertCircle className="h-5 w-5 text-red-600" />}
      />

      <ConstraintsTable
        constraints={medium}
        title="Medium Relevance Constraints"
        icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
      />

      <RecommendedSurveys findings={findings} />
    </div>
  )
}
