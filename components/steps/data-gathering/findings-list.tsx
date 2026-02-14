'use client'

import * as React from 'react'
import {
  Search,
  Loader2,
  ArrowUpDown,
  MapPin,
  Shield,
  Bug,
  Sparkles,
  Waves,
  Droplet,
  Mountain,
  Eye,
  EyeOff,
  Leaf,
  FlaskConical,
  Check,
  Save,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DeskResearchFinding } from '@/types/database'

// Finding type for display
export interface FindingDisplay {
  id: string
  source: string
  dataType: string
  title: string
  content?: string
  location?: GeoJSON.Geometry
  isSaved: boolean
  sourceUrl?: string
  rawData?: Record<string, unknown>
  metadata?: {
    siteCode?: string
    siteType?: string
    scientificName?: string
    commonName?: string
    recordCount?: number
    distance?: number
    isProtected?: boolean
    redListStatus?: string
    designation?: string
    // NBDC enrichment fields
    isInvasive?: boolean
    isThreatened?: boolean
    nbdcTaxonId?: number
    totalIrishRecords?: number
    gridSquares10km?: number
    designations?: string
    taxonGroup?: string
    nbdcEnriched?: boolean
    // Source URLs for both GBIF and NBDC
    gbifUrl?: string
    nbdcUrl?: string
    // SSCO fields
    habitatCount?: number
    // Deep research enrichment
    deepResearchAnalysis?: string
    relatedSitesCount?: number
    hasFPORecords?: boolean
    hasArticle17Data?: boolean
    // AI summary
    aiSummary?: string
    aiSummaryLoading?: boolean
  }
}

interface FindingsListProps {
  findings: FindingDisplay[]
  savedFindings: DeskResearchFinding[]
  isLoading?: boolean
  onSave: (finding: FindingDisplay) => void
  onViewOnMap?: (finding: FindingDisplay) => void
  onDeepResearch?: (finding: FindingDisplay) => void
  emptyMessage?: string
  showFilters?: boolean
  // Visibility toggle for map display
  hiddenIds?: Set<string>
  onToggleVisibility?: (findingId: string) => void
  // AI summary callback for designated sites
  onFetchAiSummary?: (finding: FindingDisplay) => void
  // IDs of findings currently being saved/deleted
  savingIds?: Set<string>
  // Currently selected finding ID (from map click)
  selectedFindingId?: string | null
  // Enable site type filter buttons - for designated sites and aquatic substeps
  showSiteTypeFilter?: boolean
  // Custom site type filter config (keys, colors). If not provided, defaults to SAC/SPA/NHA/pNHA
  siteTypeFilterConfig?: Record<string, { active: string; inactive: string }>
  // Ordered list of site type keys to display (e.g. ['SAC','SPA','NHA','pNHA'] or ['River','Lake','Catchment'])
  siteTypeFilterOrder?: string[]
  // Callback when site type filter changes (for syncing map display)
  onSiteTypeFilterChange?: (siteType: string | null) => void
  // AI Summary button in header
  onSummarizeAll?: () => void
  onStopSummarize?: () => void
  isSummarizing?: boolean
  // Callback when saved filter changes (for syncing map display)
  onSavedFilterChange?: (showSavedOnly: boolean) => void
  // Species-specific header props
  showSpeciesHeader?: boolean
  speciesCounts?: { total: number; protected: number; invasive: number; enriched: number }
  enrichmentStatus?: { isEnriching: boolean; current: number; total: number } | null
  sourceFilter?: 'all' | 'gbif' | 'nbdc' | 'protected'
  onSourceFilterChange?: (filter: 'all' | 'gbif' | 'nbdc' | 'protected') => void
}

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  npws: 'bg-emerald-100 text-emerald-700',
  gbif: 'bg-purple-100 text-purple-700',
  nbdc: 'bg-blue-100 text-blue-700',
  epa: 'bg-cyan-100 text-cyan-700',
  fpo: 'bg-rose-100 text-rose-700',
  manual: 'bg-gray-100 text-gray-700',
}

// Designated site type badge colors (SAC, SPA, NHA, pNHA)
const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-emerald-100 text-emerald-700', // Green for SAC
  SPA: 'bg-sky-100 text-sky-700', // Blue for SPA (birds)
  NHA: 'bg-amber-100 text-amber-700', // Amber for NHA
  pNHA: 'bg-orange-100 text-orange-700', // Orange for pNHA (proposed)
}

// EPA site type configs with icons and colors
const EPA_SITE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  River: {
    label: 'River',
    color: 'bg-blue-50 text-blue-700',
    icon: Waves,
  },
  Lake: {
    label: 'Lake',
    color: 'bg-cyan-50 text-cyan-700',
    icon: Droplet,
  },
  Catchment: {
    label: 'Catchment',
    color: 'bg-slate-50 text-slate-700',
    icon: Mountain,
  },
}

export function FindingsList({
  findings,
  savedFindings,
  isLoading,
  onSave,
  onViewOnMap,
  onDeepResearch,
  emptyMessage = 'No findings found',
  showFilters = true,
  hiddenIds,
  onToggleVisibility,
  onFetchAiSummary,
  savingIds,
  selectedFindingId,
  showSiteTypeFilter,
  siteTypeFilterConfig,
  siteTypeFilterOrder,
  onSiteTypeFilterChange,
  onSummarizeAll,
  onStopSummarize,
  isSummarizing,
  onSavedFilterChange,
  showSpeciesHeader,
  speciesCounts,
  enrichmentStatus,
  sourceFilter,
  onSourceFilterChange,
}: FindingsListProps) {
  const [sortBy, setSortBy] = React.useState<'distance' | 'title' | 'type'>('type')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [displayLimit, setDisplayLimit] = React.useState(20)
  const RESULTS_PER_PAGE = 20
  const [activeSiteTypeFilter, setActiveSiteTypeFilter] = React.useState<string | null>(null)
  const [showSavedOnly, setShowSavedOnly] = React.useState(false)

  // Check if finding is already saved
  const isFindingSaved = (finding: FindingDisplay) => {
    return savedFindings.some((f) => {
      // Match by ID
      if (f.id === finding.id) return true

      // Match by title (most reliable - titles are unique per search result)
      if (f.title === finding.title) return true

      return false
    })
  }

  // Sort findings - protected species always first
  const sortedFindings = React.useMemo(() => {
    const sorted = [...findings]
    sorted.sort((a, b) => {
      // Protected species always come first
      const aProtected = a.metadata?.isProtected ? 1 : 0
      const bProtected = b.metadata?.isProtected ? 1 : 0
      if (aProtected !== bProtected) return bProtected - aProtected

      let comparison = 0
      switch (sortBy) {
        case 'distance':
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          comparison = distA - distB
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'type':
          comparison = a.dataType.localeCompare(b.dataType)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [findings, sortBy, sortOrder])

  // Available site types with counts (for filter buttons)
  const siteTypeCounts = React.useMemo(() => {
    if (!showSiteTypeFilter) return null
    const counts: Record<string, number> = {}
    for (const f of sortedFindings) {
      const st = f.metadata?.siteType
      if (st) counts[st] = (counts[st] || 0) + 1
    }
    return counts
  }, [sortedFindings, showSiteTypeFilter])

  // Count saved findings
  const savedCount = React.useMemo(() => {
    return sortedFindings.filter((f) => isFindingSaved(f)).length
  }, [sortedFindings, savedFindings])

  // Apply site type filter + saved filter
  const filteredFindings = React.useMemo(() => {
    let result = sortedFindings
    if (activeSiteTypeFilter) {
      result = result.filter((f) => f.metadata?.siteType === activeSiteTypeFilter)
    }
    if (showSavedOnly) {
      result = result.filter((f) => isFindingSaved(f))
    }
    return result
  }, [sortedFindings, activeSiteTypeFilter, showSavedOnly, savedFindings])

  // Paginated findings
  const paginatedFindings = filteredFindings.slice(0, displayLimit)
  const hasMoreResults = filteredFindings.length > displayLimit

  // Reset display limit when findings or filter change
  React.useEffect(() => {
    setDisplayLimit(RESULTS_PER_PAGE)
  }, [findings, activeSiteTypeFilter, showSavedOnly])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Search className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with count and filters */}
      {showFilters && (
        <div className="flex items-center justify-between gap-1.5 border-b px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {/* Species header: enrichment status + count + filter badges */}
            {showSpeciesHeader ? (
              <>
                {enrichmentStatus?.isEnriching ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span className="text-blue-600">
                      NBDC {enrichmentStatus.current}/{enrichmentStatus.total}
                    </span>
                  </span>
                ) : (
                  <button
                    className={`shrink-0 text-sm font-medium ${showSavedOnly || sourceFilter !== 'all' ? 'text-blue-600 hover:underline' : ''}`}
                    onClick={() => {
                      if (showSavedOnly || (sourceFilter && sourceFilter !== 'all')) {
                        setShowSavedOnly(false)
                        onSavedFilterChange?.(false)
                        onSourceFilterChange?.('all')
                      }
                    }}
                  >
                    {sortedFindings.length} results
                  </button>
                )}
                {(speciesCounts?.protected ?? 0) > 0 && (
                  <button
                    onClick={() =>
                      onSourceFilterChange?.(sourceFilter === 'protected' ? 'all' : 'protected')
                    }
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      sourceFilter === 'protected'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Shield className="h-2.5 w-2.5" />
                    {speciesCounts!.protected}
                  </button>
                )}
                {(speciesCounts?.invasive ?? 0) > 0 && (
                  <button
                    onClick={() => onSourceFilterChange?.(sourceFilter === 'nbdc' ? 'all' : 'nbdc')}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      sourceFilter === 'nbdc'
                        ? 'bg-orange-600 text-white'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    <AlertCircle className="h-2.5 w-2.5" />
                    {speciesCounts!.invasive}
                  </button>
                )}
                {savedCount > 0 && (
                  <button
                    onClick={() => {
                      const next = !showSavedOnly
                      setShowSavedOnly(next)
                      onSavedFilterChange?.(next)
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      showSavedOnly
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                    {savedCount}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  className={`shrink-0 text-sm font-medium ${activeSiteTypeFilter || showSavedOnly ? 'text-blue-600 hover:underline' : ''}`}
                  onClick={() => {
                    if (activeSiteTypeFilter || showSavedOnly) {
                      setActiveSiteTypeFilter(null)
                      setShowSavedOnly(false)
                      onSiteTypeFilterChange?.(null)
                      onSavedFilterChange?.(false)
                    }
                  }}
                >
                  {sortedFindings.length} results
                </button>
                {savedCount > 0 && (
                  <button
                    onClick={() => {
                      const next = !showSavedOnly
                      setShowSavedOnly(next)
                      onSavedFilterChange?.(next)
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      showSavedOnly
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                    Saved {savedCount}
                  </button>
                )}
                {/* Site type filter buttons */}
                {showSiteTypeFilter && siteTypeCounts && Object.keys(siteTypeCounts).length > 0 && (
                  <>
                    {(siteTypeFilterOrder || ['SAC', 'SPA', 'NHA', 'pNHA']).map((siteType) => {
                      const count = siteTypeCounts[siteType]
                      if (!count) return null
                      const isActive = activeSiteTypeFilter === siteType
                      const defaultColorMap: Record<string, { active: string; inactive: string }> =
                        {
                          SAC: {
                            active: 'bg-emerald-600 text-white',
                            inactive: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                          },
                          SPA: {
                            active: 'bg-sky-600 text-white',
                            inactive: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
                          },
                          NHA: {
                            active: 'bg-amber-600 text-white',
                            inactive: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
                          },
                          pNHA: {
                            active: 'bg-orange-600 text-white',
                            inactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
                          },
                        }
                      const config = siteTypeFilterConfig || defaultColorMap
                      const colors = config[siteType] || {
                        active: 'bg-gray-600 text-white',
                        inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                      }
                      return (
                        <button
                          key={siteType}
                          onClick={() => {
                            const newValue = isActive ? null : siteType
                            setActiveSiteTypeFilter(newValue)
                            onSiteTypeFilterChange?.(newValue)
                          }}
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${isActive ? colors.active : colors.inactive}`}
                        >
                          {siteType} {count}
                        </button>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onSummarizeAll && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs ${isSummarizing ? 'text-red-600 hover:text-red-700' : 'text-purple-600 hover:text-purple-700'}`}
                onClick={isSummarizing ? onStopSummarize : onSummarizeAll}
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Stop
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI
                  </>
                )}
              </Button>
            )}
            {/* Source filter dropdown for species */}
            {onSourceFilterChange && (
              <Select
                value={sourceFilter || 'all'}
                onValueChange={(v) =>
                  onSourceFilterChange(v as 'all' | 'gbif' | 'nbdc' | 'protected')
                }
              >
                <SelectTrigger className="h-7 w-auto min-w-[80px] border-0 bg-transparent px-1.5 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="gbif">GBIF Only</SelectItem>
                  <SelectItem value="nbdc">NBDC Enriched</SelectItem>
                  <SelectItem value="protected">Protected</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-7 w-auto min-w-[80px] border-0 bg-transparent px-1.5 text-xs shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
            <button
              className="text-muted-foreground hover:text-foreground p-0.5"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Findings list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-2">
          {paginatedFindings.map((finding) => {
            const saved = isFindingSaved(finding)
            const isSaving = savingIds?.has(finding.id) ?? false
            const isEpaFinding = finding.source === 'epa'
            const isFpoFinding = finding.source === 'fpo'
            const epaConfig = finding.metadata?.siteType
              ? EPA_SITE_TYPE_CONFIG[finding.metadata.siteType]
              : null
            const isHidden = hiddenIds?.has(finding.id) ?? false

            const isSelected = selectedFindingId === finding.id

            return (
              <div
                key={finding.id}
                id={`finding-${finding.id}`}
                className={`rounded-lg p-2.5 transition-colors ${
                  isSelected
                    ? 'border border-blue-400 bg-blue-50 ring-2 ring-blue-400'
                    : isHidden
                      ? 'border border-gray-200 bg-gray-50 opacity-60'
                      : saved
                        ? 'border-t border-r border-b border-l-4 border-gray-200 border-l-emerald-500 bg-emerald-50/60'
                        : 'border hover:bg-gray-50'
                }`}
              >
                {/* Title + actions row */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {/* EPA type icon */}
                      {isEpaFinding && epaConfig && (
                        <epaConfig.icon className="h-4 w-4 shrink-0 opacity-70" />
                      )}
                      <h4
                        className={`line-clamp-2 text-sm leading-tight font-medium ${isHidden ? 'text-gray-400' : ''}`}
                        title={finding.title}
                      >
                        {finding.title}
                      </h4>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Visibility toggle */}
                    {onToggleVisibility && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${isHidden ? 'text-gray-400' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => onToggleVisibility(finding.id)}
                        title={isHidden ? 'Show on map' : 'Hide from map'}
                      >
                        {isHidden ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    {/* Save button */}
                    <button
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                        saved
                          ? 'text-emerald-600 hover:text-emerald-700'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                      disabled={isSaving}
                      onClick={() => onSave({ ...finding, isSaved: !saved })}
                      title={saved ? 'Remove from saved' : 'Save finding'}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : saved ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Summary for designated sites, species, and aquatic features */}
                {(finding.dataType === 'designated_site' ||
                  finding.dataType === 'water_quality' ||
                  finding.dataType === 'catchment' ||
                  finding.dataType === 'species_record') && (
                  <div className="mt-1.5">
                    {finding.metadata?.aiSummary ? (
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {finding.metadata.aiSummary}
                      </p>
                    ) : finding.metadata?.aiSummaryLoading ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-purple-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating summary...
                      </div>
                    ) : onFetchAiSummary ? (
                      <button
                        className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline"
                        onClick={() => onFetchAiSummary(finding)}
                      >
                        <Sparkles className="h-3 w-3" />
                        AI Summary
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Content summary for EPA aquatic features */}
                {(finding.dataType === 'water_quality' || finding.dataType === 'catchment') &&
                  finding.content && (
                    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                      {finding.content}
                    </p>
                  )}

                {/* Species detail fields - shown for species records */}
                {finding.dataType === 'species_record' && finding.metadata && (
                  <div className="mt-1.5 space-y-0.5 text-[11px]">
                    {finding.metadata.scientificName && (
                      <div className="text-muted-foreground italic">
                        {finding.metadata.scientificName}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {finding.metadata.taxonGroup && (
                        <span className="text-muted-foreground">{finding.metadata.taxonGroup}</span>
                      )}
                      {finding.metadata.designations && (
                        <span className="font-medium text-red-600">
                          {finding.metadata.designations}
                        </span>
                      )}
                      {finding.metadata.recordCount && finding.metadata.recordCount > 0 && (
                        <span className="text-muted-foreground">
                          {finding.metadata.recordCount} records
                        </span>
                      )}
                      {finding.metadata.totalIrishRecords &&
                        finding.metadata.totalIrishRecords > 0 && (
                          <span className="text-muted-foreground">
                            {finding.metadata.totalIrishRecords.toLocaleString()} Irish records
                          </span>
                        )}
                    </div>
                  </div>
                )}

                {/* Compact badges row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {/* FPO badge - special styling for protected flora */}
                  {isFpoFinding ? (
                    <Badge
                      variant="secondary"
                      className="h-5 gap-1 bg-rose-100 px-1.5 text-[10px] text-rose-700"
                    >
                      <Leaf className="h-2.5 w-2.5" />
                      FPO Protected
                    </Badge>
                  ) : /* EPA type badge */
                  isEpaFinding && epaConfig ? (
                    <Badge
                      variant="secondary"
                      className={`h-5 px-1.5 text-[10px] ${epaConfig.color}`}
                    >
                      {epaConfig.label}
                    </Badge>
                  ) : /* Designated site type badge (SAC, SPA, NHA, pNHA) */
                  finding.dataType === 'designated_site' && finding.metadata?.siteType ? (
                    <Badge
                      variant="secondary"
                      className={`h-5 px-1.5 text-[10px] ${SITE_TYPE_COLORS[finding.metadata.siteType] || SOURCE_COLORS[finding.source] || ''}`}
                    >
                      {finding.metadata.siteType}
                    </Badge>
                  ) : finding.metadata?.nbdcEnriched ? (
                    <Badge
                      variant="secondary"
                      className="h-5 gap-1 bg-linear-to-r from-purple-100 to-blue-100 px-1.5 text-[10px] text-purple-700"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                      GBIF+NBDC
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className={`h-5 px-1.5 text-[10px] ${SOURCE_COLORS[finding.source] || ''}`}
                    >
                      {finding.source.toUpperCase()}
                    </Badge>
                  )}
                  {/* WFD Status badge for EPA findings */}
                  {isEpaFinding && finding.metadata?.designation && (
                    <Badge
                      variant="outline"
                      className={`h-5 px-1.5 text-[10px] ${
                        finding.metadata.designation === 'Good' ||
                        finding.metadata.designation === 'High'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : finding.metadata.designation === 'Moderate'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : finding.metadata.designation === 'Poor' ||
                                finding.metadata.designation === 'Bad'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : ''
                      }`}
                    >
                      {finding.metadata.designation}
                    </Badge>
                  )}
                  {finding.metadata?.distance !== undefined && (
                    <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[10px]">
                      <MapPin className="h-2.5 w-2.5" />
                      {finding.metadata.distance === 0
                        ? 'Within'
                        : `${finding.metadata.distance.toFixed(1)}km`}
                    </Badge>
                  )}
                  {finding.metadata?.isProtected && (
                    <span title="Protected species">
                      <Shield className="h-3.5 w-3.5 text-red-500" />
                    </span>
                  )}
                  {finding.metadata?.isInvasive && (
                    <span title="Invasive species">
                      <Bug className="h-3.5 w-3.5 text-orange-500" />
                    </span>
                  )}
                  {finding.metadata?.redListStatus && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {finding.metadata.redListStatus}
                    </Badge>
                  )}
                </div>

                {/* Compact action links */}
                <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                  {finding.location && onViewOnMap && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onViewOnMap(finding)}
                    >
                      View on map
                    </button>
                  )}
                  {/* Deep Research button for designated sites, species, and aquatic features */}
                  {(finding.dataType === 'designated_site' ||
                    finding.dataType === 'species_record' ||
                    finding.dataType === 'water_quality' ||
                    finding.dataType === 'catchment') &&
                    onDeepResearch && (
                      <button
                        className="flex items-center gap-1 font-medium text-purple-600 hover:underline"
                        onClick={() => onDeepResearch(finding)}
                      >
                        <FlaskConical className="h-3 w-3" />
                        Deep Research
                      </button>
                    )}
                  {/* Show both GBIF and NBDC links when enriched */}
                  {finding.metadata?.nbdcEnriched ? (
                    <>
                      {(finding.metadata?.gbifUrl || finding.sourceUrl) && (
                        <a
                          href={finding.metadata?.gbifUrl || finding.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          GBIF ↗
                        </a>
                      )}
                      {finding.metadata?.nbdcUrl && (
                        <a
                          href={finding.metadata.nbdcUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          NBDC ↗
                        </a>
                      )}
                    </>
                  ) : (
                    finding.sourceUrl && (
                      <a
                        href={finding.sourceUrl}
                        target="_blank"
                        title={finding.sourceUrl}
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source ↗
                      </a>
                    )
                  )}
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {hasMoreResults && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit((prev) => prev + RESULTS_PER_PAGE)}
              >
                Load More ({filteredFindings.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
