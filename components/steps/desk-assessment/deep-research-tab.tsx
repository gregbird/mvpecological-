'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import {
  Loader2,
  MapPin,
  Shield,
  AlertTriangle,
  Leaf,
  Bug,
  Bird,
  ChevronDown,
  ExternalLink,
  FileText,
  Droplets,
  Layers,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  useProjectDeepResearch,
  useSaveDeepResearch,
  useProjectAquaticResearch,
  type DeepResearchResult,
} from '@/hooks/queries/use-deep-research-hooks'
import type { AquaticResearchResult } from '@/lib/supabase/queries/aquatic-research'
import type { DeskResearchFinding as MapFinding } from '@/components/desk-research/finding-card'
import { getNPWSSiteData } from '@/lib/data/npws-site-lookup'
import { getArticle17Data, getHabitatsSummary } from '@/lib/data/article17-habitats'
import { useToast } from '@/hooks/use-toast'
import type { Project, DeskResearchFinding as DbFinding } from '@/types/database'

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  { ssr: false, loading: () => <MapSkeleton /> }
)

function MapSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}

interface DeepResearchTabProps {
  projectId: string
  project: Project
  findings: DbFinding[]
}

function toMapFindings(dbFindings: DbFinding[]): MapFinding[] {
  return dbFindings
    .filter((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      return raw?.geometry != null
    })
    .map((f) => {
      const raw = f.raw_data as Record<string, unknown>
      // Use geometry from raw_data (GeoJSON) since DB location column returns WKB binary
      const geometry = raw.geometry as GeoJSON.Geometry
      return {
        id: f.id,
        source: f.source as MapFinding['source'],
        dataType: f.data_type as MapFinding['dataType'],
        title: f.title,
        content: f.content || undefined,
        rawData: raw,
        location: geometry,
        isSaved: true,
        notes: f.notes || undefined,
        metadata: {
          siteCode: raw.siteCode as string | undefined,
          siteType: raw.siteType as string | undefined,
          distance: f.distance_from_boundary_km || undefined,
        },
      }
    })
}

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

/** Build a structured 2-line summary from available data */
function buildSiteSummary(
  site: DeepResearchResult,
  npwsData: ReturnType<typeof getNPWSSiteData>
): string | null {
  const parts: string[] = []
  const habitats = site.habitats || []
  const species = npwsData?.species || []
  const birds = npwsData?.birdSpecies || []

  // Line 1: Habitats + species count
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

  // Line 2: Conservation status
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

function SiteCard({ site }: { site: DeepResearchResult }) {
  const [expanded, setExpanded] = React.useState(false)

  const habitats = site.habitats || []
  const conservation = site.conservation_summary || {}
  const threats = site.threats_pressures || {}

  // Get species/QI data from NPWS Excel datasheets
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
          {/* Habitats */}
          {habitats.length > 0 && (
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
                            'text-amber-600':
                              h.status === 'Inadequate' || h.status === 'Unfavourable',
                            'text-red-600': h.status === 'Bad',
                            'text-gray-500': ![
                              'Favourable',
                              'Inadequate',
                              'Unfavourable',
                              'Bad',
                            ].includes(h.status),
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
          )}

          {/* Species / Qualifying Interests */}
          {(annexSpecies.length > 0 || birdSpecies.length > 0) && (
            <div className="mt-2">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Bird className="h-3.5 w-3.5 text-indigo-600" />
                {birdSpecies.length > 0
                  ? 'Bird Special Conservation Interests'
                  : 'Annex II Species'}{' '}
                ({annexSpecies.length + birdSpecies.length})
              </h4>
              <div className="space-y-1">
                {annexSpecies.map((s, i) => (
                  <div
                    key={`sp-${i}`}
                    className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
                  >
                    <span className="text-gray-800 italic">{s.name}</span>
                    {s.code && (
                      <span className="font-mono text-[10px] text-gray-500">{s.code}</span>
                    )}
                  </div>
                ))}
                {birdSpecies.map((s, i) => (
                  <div
                    key={`bird-${i}`}
                    className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
                  >
                    <span className="text-gray-800">{s.name}</span>
                    {s.code && (
                      <span className="font-mono text-[10px] text-gray-500">{s.code}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conservation Summary */}
          {totalConservation > 0 && (
            <div className="mt-2">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Conservation Status
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(conservation.favourable || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-[10px] text-green-700"
                  >
                    {conservation.favourable} Favourable
                  </Badge>
                )}
                {(conservation.unfavourableInadequate || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                  >
                    {conservation.unfavourableInadequate} Unfav-Inadequate
                  </Badge>
                )}
                {(conservation.unfavourableBad || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-700"
                  >
                    {conservation.unfavourableBad} Unfav-Bad
                  </Badge>
                )}
                {(conservation.declining || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-700"
                  >
                    {conservation.declining} Declining
                  </Badge>
                )}
                {(conservation.improving || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-[10px] text-green-700"
                  >
                    {conservation.improving} Improving
                  </Badge>
                )}
                {(conservation.priorityCount || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="border-purple-200 bg-purple-50 text-[10px] text-purple-700"
                  >
                    {conservation.priorityCount} Priority
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Threats & Pressures */}
          {((threats.threats?.length || 0) > 0 || (threats.pressures?.length || 0) > 0) && (
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
          )}

          {/* AI Analysis */}
          {site.ai_analysis && (
            <div className="mt-2">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Bug className="h-3.5 w-3.5 text-purple-600" />
                AI Analysis
              </h4>
              <div className="prose prose-xs dark:prose-invert max-w-none rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{site.ai_analysis}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* NPWS Documents */}
          {npwsData && (npwsData.sscoUrl || npwsData.siUrl) && (
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
          )}
        </div>
      )}
    </Card>
  )
}

function AquaticCard({ result }: { result: AquaticResearchResult }) {
  const [expanded, setExpanded] = React.useState(false)

  const statusColor: Record<string, string> = {
    Good: 'text-green-600',
    Moderate: 'text-amber-600',
    Poor: 'text-orange-600',
    Bad: 'text-red-600',
    High: 'text-green-600',
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100">
          <Droplets className="h-3.5 w-3.5 text-cyan-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-semibold">
              {result.water_body_name}
            </p>
            <Badge variant="outline" className="text-[10px]">
              {result.water_body_type}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {result.water_body_code}
            {result.current_status && (
              <span className={cn('ml-1.5 font-medium', statusColor[result.current_status] || '')}>
                · {result.current_status}
              </span>
            )}
            {result.catchment_name && ` · ${result.catchment_name}`}
          </p>
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
          {/* Linked SAC */}
          {result.linked_sac_name && (
            <div className="mt-2">
              <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Linked SAC
              </h4>
              <p className="text-xs text-gray-600">
                {result.linked_sac_name} ({result.linked_sac_code})
              </p>
            </div>
          )}

          {/* Failures */}
          {result.failures.length > 0 && (
            <div className="mt-2">
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                Failures ({result.failures.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.failures.map((f, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-600"
                  >
                    {f.Name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="mt-2">
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Bug className="h-3.5 w-3.5 text-purple-600" />
                AI Analysis
              </h4>
              <div className="prose prose-xs dark:prose-invert max-w-none rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.ai_analysis}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function FindingResearchCard({
  finding,
  type,
}: {
  finding: DbFinding
  type: 'species' | 'habitat'
}) {
  const [expanded, setExpanded] = React.useState(false)
  const raw = finding.raw_data as Record<string, unknown>
  const deepResearch = raw.deepResearch as Record<string, unknown>
  const aiAnalysis = deepResearch.aiAnalysis as string

  const Icon = type === 'species' ? Bug : Layers
  const iconColor = type === 'species' ? 'text-amber-600' : 'text-green-600'
  const bgColor = type === 'species' ? 'bg-amber-100' : 'bg-green-100'

  // Extract extra info
  const fossittCode = type === 'habitat' ? (raw.fossittCode as string) : null
  const areaHa = type === 'habitat' ? (raw.areaHectares as number) : null

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            bgColor
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{finding.title}</p>
          <p className="text-xs text-gray-500">
            {fossittCode && <span className="mr-1.5 font-mono font-medium">{fossittCode}</span>}
            {areaHa != null && `${areaHa} ha`}
            {!expanded && aiAnalysis && (
              <span className="text-muted-foreground">
                {' '}
                · {aiAnalysis.slice(0, 80)}
                {aiAnalysis.length > 80 ? '…' : ''}
              </span>
            )}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && aiAnalysis && (
        <div className="border-t px-3 pb-3">
          <div className="prose prose-xs dark:prose-invert mt-2 max-w-none rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </Card>
  )
}

export function DeepResearchTab({ projectId, project, findings }: DeepResearchTabProps) {
  const { data: researchResults = [], isLoading } = useProjectDeepResearch(projectId)
  const { data: aquaticResults = [], isLoading: aquaticLoading } =
    useProjectAquaticResearch(projectId)
  const saveResearch = useSaveDeepResearch()
  const { toast } = useToast()

  // Species findings with deep research
  const speciesWithResearch = React.useMemo(
    () =>
      findings.filter((f) => {
        if (f.data_type !== 'species_record') return false
        const raw = f.raw_data as Record<string, unknown> | null
        return !!(raw?.deepResearch as Record<string, unknown> | undefined)?.aiAnalysis
      }),
    [findings]
  )

  // Habitat findings with deep research
  const habitatsWithResearch = React.useMemo(
    () =>
      findings.filter((f) => {
        if (f.data_type !== 'habitat') return false
        const raw = f.raw_data as Record<string, unknown> | null
        return !!(raw?.deepResearch as Record<string, unknown> | undefined)?.aiAnalysis
      }),
    [findings]
  )

  // Total researched count across all types
  const totalResearched =
    researchResults.length +
    aquaticResults.length +
    speciesWithResearch.length +
    habitatsWithResearch.length
  const [batchProgress, setBatchProgress] = React.useState<{
    running: boolean
    current: number
    total: number
    currentSite: string
  } | null>(null)

  const boundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const bufferDistances = (project.buffer_distances as number[] | null) || []
  // Only show designated sites that have deep research
  const researchedSiteCodes = React.useMemo(
    () => new Set(researchResults.map((r) => r.site_code)),
    [researchResults]
  )
  const mapFindings = React.useMemo(
    () =>
      toMapFindings(
        findings.filter((f) => {
          if (f.data_type !== 'designated_site') return false
          const raw = f.raw_data as Record<string, unknown> | null
          const siteCode = raw?.siteCode as string | undefined
          return siteCode ? researchedSiteCodes.has(siteCode) : false
        })
      ),
    [findings, researchedSiteCodes]
  )

  // Find unresearched designated sites
  const unresearchedSites = React.useMemo(() => {
    return findings
      .filter((f) => {
        if (f.data_type !== 'designated_site') return false
        const raw = f.raw_data as Record<string, unknown> | null
        const siteCode = raw?.siteCode as string | undefined
        return siteCode ? !researchedSiteCodes.has(siteCode) : false
      })
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown>
        return {
          findingId: f.id,
          siteCode: (raw.siteCode as string) || '',
          siteName: f.title,
          siteType: ((raw.SITE_TYPE as string) || (raw.siteType as string) || 'SAC') as
            | 'SAC'
            | 'SPA'
            | 'NHA'
            | 'pNHA',
        }
      })
      .filter((s) => s.siteCode)
  }, [findings, researchedSiteCodes])

  const handleBatchResearch = React.useCallback(async () => {
    if (unresearchedSites.length === 0) return

    setBatchProgress({
      running: true,
      current: 0,
      total: unresearchedSites.length,
      currentSite: '',
    })

    let completed = 0
    for (const site of unresearchedSites) {
      setBatchProgress({
        running: true,
        current: completed + 1,
        total: unresearchedSites.length,
        currentSite: site.siteName,
      })

      try {
        // 1. Call AI deep research API
        const response = await fetch('/api/ai/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteCode: site.siteCode,
            siteName: site.siteName,
            siteType: site.siteType,
          }),
        })
        const data = await response.json()

        // 2. Get habitat data from Excel + Article 17
        const excelData = getNPWSSiteData(site.siteCode)
        const habitatList =
          excelData?.habitats?.map((h) => ({ habitatCode: h.code, habitatName: h.name })) || []
        const habitatsWithArticle17 = habitatList.map((h) => ({
          ...h,
          article17: getArticle17Data(h.habitatCode),
        }))
        const habitatCodes = habitatList.map((h) => h.habitatCode)
        const summary = getHabitatsSummary(habitatCodes)

        const allPressures = new Set<string>()
        const allThreats = new Set<string>()
        habitatsWithArticle17.forEach((h) => {
          h.article17?.pressures.forEach((p: string) => allPressures.add(p))
          h.article17?.threats.forEach((t: string) => allThreats.add(t))
        })

        // 3. Save to DB
        await saveResearch.mutateAsync({
          project_id: projectId,
          finding_id: site.findingId,
          site_code: site.siteCode,
          site_name: site.siteName,
          site_type: site.siteType,
          habitats: habitatsWithArticle17.map((h) => ({
            habitatCode: h.habitatCode,
            habitatName: h.habitatName,
            status: h.article17?.status,
            trend: h.article17?.trend,
            priorityHabitat: h.article17?.priorityHabitat,
          })),
          conservation_summary: {
            total: summary.total,
            favourable: summary.favourable,
            unfavourableInadequate: summary.unfavourableInadequate,
            unfavourableBad: summary.unfavourableBad,
            improving: summary.improving,
            declining: summary.declining,
            priorityCount: summary.priorityCount,
          },
          threats_pressures: {
            pressures: Array.from(allPressures),
            threats: Array.from(allThreats),
          },
          ai_analysis: response.ok ? data.summary || null : null,
        })

        completed++
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${site.siteName}`,
          description: 'Skipping and continuing with next site.',
        })
        completed++
      }
    }

    setBatchProgress(null)
    toast({
      title: 'Batch research complete',
      description: `${completed} site${completed !== 1 ? 's' : ''} researched.`,
    })
  }, [unresearchedSites, projectId, saveResearch, toast])

  if (isLoading || aquaticLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (totalResearched === 0) {
    return (
      <div className="flex h-full">
        {/* Map side */}
        <div className="flex-1">
          <DynamicProjectMap
            boundary={boundary}
            bufferDistances={bufferDistances}
            findings={mapFindings}
            visibleFindingTypes={['designated_site']}
            zoom={13}
          />
        </div>
        {/* Empty state panel */}
        <div className="border-border bg-background flex w-[420px] flex-col items-center justify-center border-l p-6 text-center">
          <MapPin className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Deep Research Yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {unresearchedSites.length > 0
              ? `${unresearchedSites.length} designated sites available for research.`
              : 'Save designated sites in Step 2 (Data Gathering) first.'}
          </p>
          {unresearchedSites.length > 0 && (
            <Button
              className="mt-4"
              onClick={handleBatchResearch}
              disabled={batchProgress?.running}
            >
              {batchProgress?.running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {batchProgress.current}/{batchProgress.total} — {batchProgress.currentSite}
                </>
              ) : (
                `Research All ${unresearchedSites.length} Sites`
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Group by site type
  const byType: Record<string, DeepResearchResult[]> = {}
  for (const r of researchResults) {
    const type = r.site_type || 'Other'
    if (!byType[type]) byType[type] = []
    byType[type].push(r)
  }

  const typeOrder = ['SAC', 'SPA', 'NHA', 'pNHA', 'Other']
  const sortedTypes = typeOrder.filter((t) => byType[t]?.length > 0)

  return (
    <div className="flex h-full">
      {/* Left: Map */}
      <div className="flex-1">
        <DynamicProjectMap
          boundary={boundary}
          bufferDistances={bufferDistances}
          findings={mapFindings}
          visibleFindingTypes={['designated_site']}
          zoom={13}
        />
      </div>

      {/* Right: Deep Research Panel */}
      <div className="border-border bg-background flex w-[420px] flex-col border-l">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Deep Research</h3>
            <p className="text-muted-foreground text-xs">
              {totalResearched} item{totalResearched !== 1 ? 's' : ''} researched
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {unresearchedSites.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchResearch}
                disabled={batchProgress?.running}
                className="text-xs"
              >
                {batchProgress?.running ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    {batchProgress.current}/{batchProgress.total}
                  </>
                ) : (
                  `Research ${unresearchedSites.length} More`
                )}
              </Button>
            )}
            {sortedTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-[10px]">
                {byType[type].length} {type}
              </Badge>
            ))}
            {aquaticResults.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {aquaticResults.length} Aquatic
              </Badge>
            )}
            {speciesWithResearch.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {speciesWithResearch.length} Species
              </Badge>
            )}
            {habitatsWithResearch.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {habitatsWithResearch.length} Habitat
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {/* Designated Sites */}
          {sortedTypes.map((type) =>
            byType[type].map((site) => <SiteCard key={site.id} site={site} />)
          )}

          {/* Aquatic Research */}
          {aquaticResults.length > 0 && (
            <>
              {researchResults.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Aquatic Features ({aquaticResults.length})
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
              )}
              {aquaticResults.map((ar) => (
                <AquaticCard key={ar.id} result={ar} />
              ))}
            </>
          )}

          {/* Species Deep Research */}
          {speciesWithResearch.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Bug className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Species ({speciesWithResearch.length})
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              {speciesWithResearch.map((f) => (
                <FindingResearchCard key={f.id} finding={f} type="species" />
              ))}
            </>
          )}

          {/* Habitat Deep Research */}
          {habitatsWithResearch.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Layers className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Habitats ({habitatsWithResearch.length})
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              {habitatsWithResearch.map((f) => (
                <FindingResearchCard key={f.id} finding={f} type="habitat" />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
