'use client'

import * as React from 'react'
import {
  MapPin,
  Shield,
  AlertTriangle,
  Leaf,
  Bird,
  ChevronDown,
  ExternalLink,
  FileText,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getNPWSSiteData } from '@/lib/data/npws-site-lookup'
import { AiAnalysisBlock } from '@/components/steps/desk-assessment/research-shared'
import type { DeepResearchResult } from '@/hooks/queries/use-deep-research-hooks'

function SiteTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    SAC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    SPA: 'bg-blue-100 text-blue-700 border-blue-200',
    NHA: 'bg-amber-100 text-amber-700 border-amber-200',
    pNHA: 'bg-orange-100 text-orange-700 border-orange-200',
  }
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold', colors[type] || '')}>
      {type}
    </Badge>
  )
}

function buildSiteSummary(
  site: DeepResearchResult,
  npwsData: ReturnType<typeof getNPWSSiteData>
): string | null {
  const parts: string[] = []
  const habitats = site.habitats || []
  const species = npwsData?.species || []
  const birds = npwsData?.birdSpecies || []

  if (habitats.length > 0) {
    const priorityCount = habitats.filter((h) => h.priorityHabitat).length
    parts.push(
      `${habitats.length} Annex I habitat${habitats.length !== 1 ? 's' : ''}${priorityCount > 0 ? ` (${priorityCount} priority)` : ''}`
    )
  }
  if (species.length > 0) {
    const topSpecies = species.slice(0, 2).map((s) => s.name)
    parts.push(`${species.length} Annex II species incl. ${topSpecies.join(', ')}`)
  }
  if (birds.length > 0) {
    const topBirds = birds.slice(0, 2).map((s) => s.name)
    parts.push(
      `${birds.length} bird SCI${birds.length !== 1 ? 's' : ''} incl. ${topBirds.join(', ')}`
    )
  }

  const cons = site.conservation_summary
  if (cons) {
    const statusParts: string[] = []
    if (cons.favourable) statusParts.push(`${cons.favourable} favourable`)
    if (cons.unfavourableInadequate)
      statusParts.push(`${cons.unfavourableInadequate} unfav-inadequate`)
    if (cons.unfavourableBad) statusParts.push(`${cons.unfavourableBad} unfav-bad`)
    if (cons.declining) statusParts.push(`${cons.declining} declining`)
    if (statusParts.length > 0) parts.push(`Status: ${statusParts.join(', ')}`)
  }

  if (parts.length === 0) return null
  return parts.join('. ') + '.'
}

export function SiteCard({ site }: { site: DeepResearchResult }) {
  const [expanded, setExpanded] = React.useState(false)

  const habitats = site.habitats || []
  const conservation = site.conservation_summary || {}
  const threats = site.threats_pressures || {}

  const npwsData = React.useMemo(() => getNPWSSiteData(site.site_code), [site.site_code])
  const annexSpecies = npwsData?.species || []
  const birdSpecies = npwsData?.birdSpecies || []
  const siteSummary = React.useMemo(() => buildSiteSummary(site, npwsData), [site, npwsData])

  const totalConservation =
    (conservation.favourable || 0) +
    (conservation.unfavourableInadequate || 0) +
    (conservation.unfavourableBad || 0) +
    (conservation.improving || 0) +
    (conservation.declining || 0) +
    (conservation.priorityCount || 0)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-semibold">{site.site_name}</p>
            <SiteTypeBadge type={site.site_type} />
          </div>
          <p className="text-xs text-gray-500">
            {site.site_code}
            {habitats.length > 0 && ` · ${habitats.length} habitats`}
            {totalConservation > 0 && ` · ${totalConservation} assessments`}
          </p>
          {siteSummary && !expanded && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{siteSummary}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          <SiteHabitats habitats={habitats} />
          <SiteSpecies annexSpecies={annexSpecies} birdSpecies={birdSpecies} />
          <SiteConservation conservation={conservation} total={totalConservation} />
          <SiteThreats threats={threats} />
          <AiAnalysisBlock analysis={site.ai_analysis} />
          <NpwsDocuments npwsData={npwsData} />
        </div>
      )}
    </Card>
  )
}

interface HabitatItem {
  habitatCode?: string
  habitatName?: string
  priorityHabitat?: boolean
  status?: string
}

function SiteHabitats({ habitats }: { habitats: HabitatItem[] }) {
  if (habitats.length === 0) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Leaf className="h-3.5 w-3.5 text-green-600" />
        Habitats ({habitats.length})
      </h4>
      <div className="space-y-1">
        {habitats.map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
          >
            <span className="text-gray-800">
              {h.habitatCode && (
                <span className="mr-1.5 font-mono font-semibold text-emerald-700">
                  {h.habitatCode}
                </span>
              )}
              {h.habitatName || 'Unknown habitat'}
            </span>
            <div className="flex items-center gap-1.5">
              {h.priorityHabitat && (
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-[10px] text-red-600"
                >
                  Priority
                </Badge>
              )}
              {h.status && (
                <span
                  className={cn('text-[10px] font-medium', {
                    'text-green-600': h.status === 'Favourable',
                    'text-amber-600': h.status === 'Inadequate' || h.status === 'Unfavourable',
                    'text-red-600': h.status === 'Bad',
                    'text-gray-500': !['Favourable', 'Inadequate', 'Unfavourable', 'Bad'].includes(
                      h.status
                    ),
                  })}
                >
                  {h.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SpeciesEntry {
  name: string
  code?: string
}

function SiteSpecies({
  annexSpecies,
  birdSpecies,
}: {
  annexSpecies: SpeciesEntry[]
  birdSpecies: SpeciesEntry[]
}) {
  if (annexSpecies.length === 0 && birdSpecies.length === 0) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Bird className="h-3.5 w-3.5 text-indigo-600" />
        {birdSpecies.length > 0 ? 'Bird Special Conservation Interests' : 'Annex II Species'} (
        {annexSpecies.length + birdSpecies.length})
      </h4>
      <div className="space-y-1">
        {annexSpecies.map((s, i) => (
          <div
            key={`sp-${i}`}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
          >
            <span className="text-gray-800 italic">{s.name}</span>
            {s.code && <span className="font-mono text-[10px] text-gray-500">{s.code}</span>}
          </div>
        ))}
        {birdSpecies.map((s, i) => (
          <div
            key={`bird-${i}`}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
          >
            <span className="text-gray-800">{s.name}</span>
            {s.code && <span className="font-mono text-[10px] text-gray-500">{s.code}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ConservationSummary {
  favourable?: number
  unfavourableInadequate?: number
  unfavourableBad?: number
  declining?: number
  improving?: number
  priorityCount?: number
}

function SiteConservation({
  conservation,
  total,
}: {
  conservation: ConservationSummary
  total: number
}) {
  if (total === 0) return null

  const badges: Array<{ count: number; label: string; color: string }> = [
    {
      count: conservation.favourable || 0,
      label: 'Favourable',
      color: 'border-green-200 bg-green-50 text-green-700',
    },
    {
      count: conservation.unfavourableInadequate || 0,
      label: 'Unfav-Inadequate',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      count: conservation.unfavourableBad || 0,
      label: 'Unfav-Bad',
      color: 'border-red-200 bg-red-50 text-red-700',
    },
    {
      count: conservation.declining || 0,
      label: 'Declining',
      color: 'border-red-200 bg-red-50 text-red-700',
    },
    {
      count: conservation.improving || 0,
      label: 'Improving',
      color: 'border-green-200 bg-green-50 text-green-700',
    },
    {
      count: conservation.priorityCount || 0,
      label: 'Priority',
      color: 'border-purple-200 bg-purple-50 text-purple-700',
    },
  ]

  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Shield className="h-3.5 w-3.5 text-blue-600" />
        Conservation Status
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {badges
          .filter((b) => b.count > 0)
          .map((b) => (
            <Badge key={b.label} variant="outline" className={cn('text-[10px]', b.color)}>
              {b.count} {b.label}
            </Badge>
          ))}
      </div>
    </div>
  )
}

interface ThreatsData {
  threats?: string[]
  pressures?: string[]
}

function SiteThreats({ threats }: { threats: ThreatsData }) {
  const hasThreats = (threats.threats?.length || 0) > 0
  const hasPressures = (threats.pressures?.length || 0) > 0
  if (!hasThreats && !hasPressures) return null

  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        Threats & Pressures
      </h4>
      <div className="flex flex-wrap gap-1">
        {threats.threats?.map((t, i) => (
          <Badge
            key={`t-${i}`}
            variant="outline"
            className="border-red-200 bg-red-50 text-[10px] text-red-600"
          >
            {t}
          </Badge>
        ))}
        {threats.pressures?.map((p, i) => (
          <Badge
            key={`p-${i}`}
            variant="outline"
            className="border-amber-200 bg-amber-50 text-[10px] text-amber-600"
          >
            {p}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function NpwsDocuments({ npwsData }: { npwsData: ReturnType<typeof getNPWSSiteData> }) {
  if (!npwsData || (!npwsData.sscoUrl && !npwsData.siUrl)) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <FileText className="h-3.5 w-3.5 text-gray-600" />
        NPWS Documents
      </h4>
      <div className="flex flex-wrap gap-2">
        {npwsData.sscoUrl && (
          <a
            href={npwsData.sscoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <ExternalLink className="h-3 w-3" />
            Conservation Objectives
          </a>
        )}
        {npwsData.siUrl && (
          <a
            href={npwsData.siUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3 w-3" />
            Statutory Instrument
          </a>
        )}
      </div>
    </div>
  )
}
