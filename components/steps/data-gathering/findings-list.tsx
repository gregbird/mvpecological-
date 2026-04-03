'use client'

import * as React from 'react'
import { Search, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DeskResearchFinding } from '@/types/database'
import { SpeciesTableView } from './species-table-view'
import { FindingsHeader } from './findings-header'
import { FindingCard } from './finding-card'
import {
  useFindingsFilters,
  isFindingSaved,
  getSavedFindingDbId,
} from '@/hooks/data-gathering/use-findings-filters'

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
  notes?: string
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
    // Species table fields
    datasetName?: string
    newestRecordDate?: string
    gridReference?: string
    gridSquares?: string[]
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
  // Note callback for saved findings
  onUpdateNote?: (findingId: string, notes: string) => void
  // AI Summary button in header
  onSummarizeAll?: () => void
  onStopSummarize?: () => void
  isSummarizing?: boolean
  // Callback when saved filter changes (for syncing map display)
  onSavedFilterChange?: (showSavedOnly: boolean) => void
  // Species-specific header props
  showSpeciesHeader?: boolean
  speciesCounts?: {
    total: number
    protected: number
    invasive: number
    threatened?: number
    enriched: number
  }
  enrichmentStatus?: { isEnriching: boolean; current: number; total: number } | null
  sourceFilter?: 'all' | 'protected' | 'invasive' | 'threatened'
  onSourceFilterChange?: (filter: 'all' | 'protected' | 'invasive' | 'threatened') => void
  // Distance/proximity filter
  distanceFilter?: 'all' | '0-1' | '1-5' | '5-10' | '10+'
  onDistanceFilterChange?: (filter: 'all' | '0-1' | '1-5' | '5-10' | '10+') => void
  // View mode change callback (for grid overlay visibility)
  onViewModeChange?: (mode: 'cards' | 'table') => void
  // Save all filtered findings at once
  onSaveAll?: (findings: FindingDisplay[]) => void
  isSavingAll?: boolean
}

const RESULTS_PER_PAGE = 20

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
  distanceFilter,
  onDistanceFilterChange,
  onUpdateNote,
  onViewModeChange,
  onSaveAll,
  isSavingAll,
}: FindingsListProps) {
  const [viewMode, setViewModeInternal] = React.useState<'cards' | 'table'>(
    showSpeciesHeader ? 'table' : 'cards'
  )
  const setViewMode = React.useCallback(
    (mode: 'cards' | 'table') => {
      setViewModeInternal(mode)
      onViewModeChange?.(mode)
    },
    [onViewModeChange]
  )
  const [sortBy, setSortBy] = React.useState<'distance' | 'title' | 'type'>('type')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [displayLimit, setDisplayLimit] = React.useState(RESULTS_PER_PAGE)
  const [activeSiteTypeFilter, setActiveSiteTypeFilter] = React.useState<string | null>(null)
  const [showSavedOnly, setShowSavedOnly] = React.useState(false)

  const { sortedFindings, filteredFindings, siteTypeCounts, savedCount } = useFindingsFilters(
    findings,
    savedFindings,
    { activeSiteTypeFilter, showSavedOnly, sourceFilter, distanceFilter, sortBy, sortOrder }
  )

  // Paginated findings
  const paginatedFindings = filteredFindings.slice(0, displayLimit)
  const hasMoreResults = filteredFindings.length > displayLimit

  // Reset display limit when findings or filter change
  React.useEffect(() => {
    setDisplayLimit(RESULTS_PER_PAGE)
  }, [findings, activeSiteTypeFilter, showSavedOnly, distanceFilter])

  // When selectedFindingId changes (e.g. map marker click), ensure it's visible and scroll to it
  React.useEffect(() => {
    if (!selectedFindingId) return

    // Expand pagination if the finding is beyond the current display limit
    const idx = filteredFindings.findIndex((f) => f.id === selectedFindingId)
    if (idx >= 0 && idx >= displayLimit) {
      setDisplayLimit(idx + RESULTS_PER_PAGE)
    }

    // Scroll into view after a short delay to allow DOM to update
    const timer = setTimeout(() => {
      const el = document.getElementById(`finding-${selectedFindingId}`)
      if (!el) return
      const viewport = el.closest('[data-radix-scroll-area-viewport]')
      if (viewport) {
        const elRect = el.getBoundingClientRect()
        const vpRect = viewport.getBoundingClientRect()
        const offset = elRect.top - vpRect.top - vpRect.height / 2 + elRect.height / 2
        viewport.scrollBy({ top: offset, behavior: 'smooth' })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedFindingId, filteredFindings, displayLimit])

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
        <FindingsHeader
          filteredFindings={filteredFindings}
          sortedFindings={sortedFindings}
          savedFindings={savedFindings}
          savedCount={savedCount}
          siteTypeCounts={showSiteTypeFilter ? siteTypeCounts : null}
          showSpeciesHeader={showSpeciesHeader}
          speciesCounts={speciesCounts}
          enrichmentStatus={enrichmentStatus}
          sourceFilter={sourceFilter}
          onSourceFilterChange={onSourceFilterChange}
          showSavedOnly={showSavedOnly}
          onShowSavedOnlyChange={setShowSavedOnly}
          onSavedFilterChange={onSavedFilterChange}
          showSiteTypeFilter={showSiteTypeFilter}
          siteTypeFilterConfig={siteTypeFilterConfig}
          siteTypeFilterOrder={siteTypeFilterOrder}
          activeSiteTypeFilter={activeSiteTypeFilter}
          onActiveSiteTypeFilterChange={setActiveSiteTypeFilter}
          onSiteTypeFilterChange={onSiteTypeFilterChange}
          distanceFilter={distanceFilter}
          onDistanceFilterChange={onDistanceFilterChange}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderToggle={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          onSummarizeAll={onSummarizeAll}
          onStopSummarize={onStopSummarize}
          isSummarizing={isSummarizing}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSaveAll={onSaveAll}
          isSavingAll={isSavingAll}
        />
      )}

      {/* Table view for species */}
      {showSpeciesHeader && viewMode === 'table' ? (
        <ScrollArea className="flex-1">
          <SpeciesTableView
            findings={filteredFindings}
            savedFindings={savedFindings}
            onRowClick={onViewOnMap}
            selectedFindingId={selectedFindingId}
            onSave={onSave}
            onFetchAiSummary={onFetchAiSummary}
            onDeepResearch={onDeepResearch}
            onUpdateNote={onUpdateNote}
            savingIds={savingIds}
          />
        </ScrollArea>
      ) : (
        /* Findings list (card view) */
        <ScrollArea className="flex-1">
          <div className="space-y-1.5 p-2">
            {paginatedFindings.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <p className="text-muted-foreground text-sm">No results match the current filter</p>
              </div>
            )}
            {paginatedFindings.map((finding, findingIdx) => (
              <FindingCard
                key={`${finding.id}-${findingIdx}`}
                finding={finding}
                isSaved={isFindingSaved(finding, savedFindings)}
                isSaving={savingIds?.has(finding.id) ?? false}
                isHidden={hiddenIds?.has(finding.id) ?? false}
                isSelected={selectedFindingId === finding.id}
                onSave={onSave}
                onViewOnMap={onViewOnMap}
                onDeepResearch={onDeepResearch}
                onToggleVisibility={onToggleVisibility}
                onFetchAiSummary={onFetchAiSummary}
                onUpdateNote={onUpdateNote}
                getSavedFindingDbId={(f) => getSavedFindingDbId(f, savedFindings)}
              />
            ))}

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
      )}
    </div>
  )
}
