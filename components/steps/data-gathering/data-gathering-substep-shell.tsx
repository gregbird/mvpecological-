'use client'

import * as React from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import { FindingsList, type FindingDisplay } from './findings-list'
import { ShellMapPanel } from './shell-map-panel'
import type { Project, DeskResearchFinding } from '@/types/database'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { useSubstepSearch } from '@/hooks/shared/use-substep-search'
import { useShellSearch } from '@/hooks/data-gathering/use-shell-search'
import { useShellSave } from '@/hooks/data-gathering/use-shell-save'
import { useShellAi } from '@/hooks/data-gathering/use-shell-ai'
import { useSpatialFilter } from '@/hooks/shared/use-spatial-filter'
import type { MapStepName } from '@/lib/map-screenshots/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubstepShellProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  /** Merged boundary for search (covers all sites); falls back to projectBoundary */
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  /** Active site ID for site-scoped caching and saving */
  siteId?: string | null
  /** Other site boundaries to show as dimmed overlays on the map */
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries — when provided, render buffers for every boundary */
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void

  config: SubstepShellConfig
  aiSummaryTriggerRef?: React.MutableRefObject<((finding: FindingDisplay) => void) | null>

  renderDeepResearchModal?: (props: {
    searchResults: FindingDisplay[]
    savedFindings: DeskResearchFinding[]
  }) => React.ReactNode

  renderExtraControls?: () => React.ReactNode
}

export interface SubstepShellConfig {
  title: string
  titleIcon?: React.ReactNode
  description: string
  searchButtonLabel: string
  searchButtonColor: string
  emptyMessage: string
  cacheKeyPrefix: string
  stepName: MapStepName
  source: string
  /** Source values to match when restoring saved findings from DB (defaults to [source]) */
  sourceFilter?: string[]

  performSearch: (params: {
    bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
    buffer: number
    boundary?: GeoJSON.Feature<GeoJSON.Polygon>
    /** In merged multi-site mode, the full set of site boundaries so the
     *  substep can compute per-site geometry (e.g. union of site buffers for
     *  dedupe'd grid-ref generation). */
    allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  }) => Promise<FindingDisplay[]>

  /**
   * Controls how `allBoundaries` (multi-site "All Sites" mode) is translated
   * into external API calls.
   *
   * - `'per-site'` (default): one `performSearch` call per site boundary,
   *   running in a small concurrency pool. Good when each site needs its own
   *   spatial query (NPWS, EPA, NLC).
   *
   * - `'merged'`: skip the per-site loop and make a single `performSearch`
   *   call against the pre-merged `searchBoundary`. Use when the substep can
   *   dedupe / batch work internally across all sites (species records fan
   *   out to one NBDC report request with union'd grid refs).
   */
  multiSiteSearchMode?: 'per-site' | 'merged'

  matchPredicate: (saved: DeskResearchFinding, result: FindingDisplay) => boolean
  minimalMetadataKeys: string[]

  buildCreatePayload: (
    finding: FindingDisplay,
    context: { projectId: string; userId: string; siteId?: string | null }
  ) => Record<string, unknown>

  aiSummaryEndpoint: string
  buildAiSummaryBody: (finding: FindingDisplay) => Record<string, unknown>
  /** Optional guard — if returns false, skip AI summary for this finding */
  canFetchAiSummary?: (finding: FindingDisplay) => boolean
  /** Optional filter for which findings to batch-summarize */
  summarizeFilter?: (finding: FindingDisplay) => boolean

  filterConfig?: {
    showSiteTypeFilter: boolean
    siteTypeFilterOrder: string[]
    siteTypeFilterConfig: Record<string, { active: string; inactive: string }>
  }

  showDistanceFilter?: boolean
  findingsListExtraProps?: Record<string, unknown>

  onPostSearch?: (
    findings: FindingDisplay[],
    setResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  ) => Promise<void>

  onDeepResearch?: (finding: FindingDisplay, savedFindings: DeskResearchFinding[]) => void

  isSearchDisabled?: boolean
  gridOverlay?: GeoJSON.FeatureCollection
  /** Compute grid overlay based on selected buffer — takes priority over static gridOverlay */
  computeGridOverlay?: (bufferKm: number) => GeoJSON.FeatureCollection | undefined

  /** Custom spatial filter for findings without location (e.g. grid-based species records).
   *  Called for findings where the built-in location filter doesn't apply. */
  customSpatialFilter?: (finding: FindingDisplay) => boolean
  /** Called whenever the spatially filtered results change (for external count tracking) */
  onFilteredResultsChange?: (filtered: FindingDisplay[]) => void

  mapFindingsMapper?: (
    finding: FindingDisplay,
    savedFindings: DeskResearchFinding[]
  ) => import('@/components/desk-research/finding-card').DeskResearchFinding
  mapSelectedMapper?: (
    finding: FindingDisplay
  ) => import('@/components/desk-research/finding-card').DeskResearchFinding
  mapFindingsSavedFilter?: (
    finding: FindingDisplay,
    savedFindings: DeskResearchFinding[]
  ) => boolean

  onSiteTypeFilterChange?: (siteType: string | null) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function DataGatheringSubstepShell({
  project,
  projectBoundary,
  searchBoundary,
  projectCenter,
  bufferDistances,
  siteId,
  otherBoundaries,
  allBoundaries,
  userId,
  savedFindings,
  showMap,
  onToggleMap,
  isActive,
  autoSearchTrigger,
  onAutoSearchComplete,
  config,
  aiSummaryTriggerRef,
  renderDeepResearchModal,
  renderExtraControls,
}: SubstepShellProps) {
  const updateFinding = useUpdateFinding()

  // The `config` object is created fresh on every substep render. Keep it
  // behind a ref so internal callbacks/memos stay stable across renders —
  // otherwise every parent re-render invalidates the spatial filter memos,
  // which are the hottest path for multi-site projects.
  const configRef = React.useRef(config)
  configRef.current = config

  const cacheKey = `${config.cacheKeyPrefix}-search-${project.id}`

  const [searchResults, setSearchResults] = useSessionStorage<FindingDisplay[]>(cacheKey, [])

  const [, setListViewMode] = React.useState<'cards' | 'table'>('table')
  const [activeSiteTypeFilter, setActiveSiteTypeFilter] = React.useState<string | null>(null)

  const [activeDistanceFilter, setActiveDistanceFilter] = React.useState<
    'all' | '0-1' | '1-5' | '5-10' | '10+'
  >('all')

  const performSearchRef = React.useRef<(() => Promise<void>) | null>(null)
  const stableMinimalKeys = React.useMemo(
    () => config.minimalMetadataKeys,
    [config.minimalMetadataKeys.join(',')]
  )
  // Stable match predicate — read from ref so repeated substep re-renders
  // don't invalidate `useSubstepSearch`'s effects.
  const stableMatchPredicate = React.useCallback(
    (sf: DeskResearchFinding, result: FindingDisplay) =>
      configRef.current.matchPredicate(sf, result),
    []
  )
  const {
    selectedFinding,
    setSelectedFinding,
    selectedBuffer,
    setSelectedBuffer,
    hiddenIds,
    handleToggleVisibility,
    savingIds,
    setSavingIds,
    showSavedOnMap,
    setShowSavedOnMap,
  } = useSubstepSearch(
    {
      searchResults,
      setSearchResults,
      cacheKey,
      savedFindings,
      autoSearchTrigger,
      onAutoSearchComplete,
      isActive,
      projectBoundary,
      performSearchRef,
      matchPredicate: stableMatchPredicate,
      minimalMetadataKeys: stableMinimalKeys,
      sourceFilter: config.sourceFilter ?? [config.source],
      siteId,
    },
    bufferDistances[0] || 2
  )

  // Species substep is responsible for keeping `computeGridOverlay`'s
  // reference stable via useCallback — here we depend on the reference
  // directly so grid-resolution changes propagate immediately.
  const computeGridOverlayFn = config.computeGridOverlay
  const computedGridOverlay = React.useMemo(
    () => computeGridOverlayFn?.(selectedBuffer),
    [computeGridOverlayFn, selectedBuffer]
  )

  const { isSearching, searchProgress, performSearch } = useShellSearch({
    config,
    allBoundaries,
    searchBoundary,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    setSearchResults,
    performSearchRef,
  })

  const { handleFetchAiSummary, handleSummarizeAll, handleStopSummarize, isSummarizing } =
    useShellAi({
      config,
      savedFindings,
      searchResults,
      setSearchResults,
      aiSummaryTriggerRef,
    })

  const { handleSaveFinding, handleSaveAll, isSavingAll } = useShellSave({
    config,
    projectId: project.id,
    userId,
    siteId,
    savedFindings,
    setSavingIds,
    onAfterSave: (finding) => {
      handleFetchAiSummary(finding).catch((err) =>
        console.error('[AI Summary] Auto-trigger failed:', err)
      )
    },
  })

  // In "All Sites" mode we still want spatial filtering — but against every site boundary,
  // not just a single one.  When a specific site is selected, filter against that site only.
  const isAllSitesMode = !!(allBoundaries && allBoundaries.length > 0)
  const spatialFilterDisabled = !projectBoundary && !isAllSitesMode
  const getGeometry = React.useCallback((f: FindingDisplay) => {
    return f.location ?? null
  }, [])

  // Single-boundary spatial filter (used when a specific site is selected)
  const { filteredItems: singleBoundaryFiltered } = useSpatialFilter({
    boundary: projectBoundary,
    bufferKm: selectedBuffer,
    items: searchResults,
    getGeometry,
    disabled: isAllSitesMode || !projectBoundary,
  })

  // Pre-compute buffer polygons + their bboxes for every site (only used in
  // "All Sites" mode). The bbox is used for a cheap pre-filter below so we
  // can short-circuit the expensive turf.booleanIntersects call for the
  // vast majority of findings that are far outside a given site.
  const allSiteBufferData = React.useMemo(() => {
    if (!isAllSitesMode || !allBoundaries || allBoundaries.length === 0) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const turf = require('@turf/turf')
      return allBoundaries.map((b) => {
        const bufferPoly = turf.buffer(b, selectedBuffer, {
          units: 'kilometers',
        }) as GeoJSON.Feature
        const [minLng, minLat, maxLng, maxLat] = turf.bbox(bufferPoly) as [
          number,
          number,
          number,
          number,
        ]
        return { bufferPoly, minLng, minLat, maxLng, maxLat }
      })
    } catch {
      return null
    }
  }, [isAllSitesMode, allBoundaries, selectedBuffer])

  // Multi-boundary spatial filter: keep items that intersect ANY site's buffer.
  //
  // Performance: for a project with 20+ sites and hundreds of findings, the
  // naive O(findings × sites) booleanIntersects call is the dominant cost on
  // every re-render. Two optimisations:
  //   1. For Points, compute lng/lat once and do a bbox check before calling
  //      the polygon test. A bbox hit means we still need the accurate test,
  //      a miss short-circuits immediately.
  //   2. For non-Point geometries, we first compute the finding's own bbox
  //      once and test it against each site bbox (cheap scalar compare).
  const spatiallyFilteredBase = React.useMemo(() => {
    if (!isAllSitesMode) return singleBoundaryFiltered
    if (!allSiteBufferData) return searchResults
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')

    const bboxesIntersect = (
      a: { minLng: number; minLat: number; maxLng: number; maxLat: number },
      b: { minLng: number; minLat: number; maxLng: number; maxLat: number }
    ) =>
      a.maxLng >= b.minLng && a.minLng <= b.maxLng && a.maxLat >= b.minLat && a.minLat <= b.maxLat

    return searchResults.filter((item) => {
      const geom = getGeometry(item)
      if (!geom) return true // no location → include (customSpatialFilter handles these)
      try {
        if (geom.type === 'Point') {
          const [lng, lat] = geom.coordinates
          return allSiteBufferData.some((bp) => {
            if (lng < bp.minLng || lng > bp.maxLng || lat < bp.minLat || lat > bp.maxLat)
              return false
            return turf.booleanPointInPolygon(geom, bp.bufferPoly)
          })
        }
        // Non-point: compute once, reuse across all sites
        const [minLng, minLat, maxLng, maxLat] = turf.bbox({
          type: 'Feature' as const,
          properties: {},
          geometry: geom,
        }) as [number, number, number, number]
        const itemBbox = { minLng, minLat, maxLng, maxLat }
        return allSiteBufferData.some((bp) => {
          if (!bboxesIntersect(itemBbox, bp)) return false
          return turf.booleanIntersects(geom, bp.bufferPoly)
        })
      } catch {
        return false
      }
    })
  }, [isAllSitesMode, allSiteBufferData, searchResults, singleBoundaryFiltered, getGeometry])

  const spatiallyFilteredResults = React.useMemo(() => {
    if (!config.customSpatialFilter || spatialFilterDisabled) return spatiallyFilteredBase
    return spatiallyFilteredBase.filter((f) => {
      if (f.location) return true
      return config.customSpatialFilter!(f)
    })
  }, [spatiallyFilteredBase, config.customSpatialFilter, spatialFilterDisabled])

  React.useEffect(() => {
    config.onFilteredResultsChange?.(spatiallyFilteredResults)
  }, [spatiallyFilteredResults, config.onFilteredResultsChange])

  // UI filters are split into independent memos so that, e.g., toggling the
  // distance filter does not re-run the site-type filter and vice-versa.
  // These are cheap O(N) passes, but keeping them independent also means
  // child components with React.memo only re-render when *their* data
  // actually changes.
  const siteTypeFilteredResults = React.useMemo(() => {
    if (!activeSiteTypeFilter) return spatiallyFilteredResults
    return spatiallyFilteredResults.filter((f) => f.metadata?.siteType === activeSiteTypeFilter)
  }, [spatiallyFilteredResults, activeSiteTypeFilter])

  const filteredResults = React.useMemo(() => {
    if (!activeDistanceFilter || activeDistanceFilter === 'all') return siteTypeFilteredResults
    return siteTypeFilteredResults.filter((f) => {
      const d = f.metadata?.distance
      if (d == null) return false
      switch (activeDistanceFilter) {
        case '0-1':
          return d <= 1
        case '1-5':
          return d > 1 && d <= 5
        case '5-10':
          return d > 5 && d <= 10
        case '10+':
          return d > 10
        default:
          return true
      }
    })
  }, [siteTypeFilteredResults, activeDistanceFilter])

  const handleDeepResearch = React.useCallback(
    (finding: FindingDisplay) => {
      configRef.current.onDeepResearch?.(finding, savedFindings)
    },
    [savedFindings]
  )

  const handleUpdateNote = React.useCallback(
    async (findingId: string, notes: string) => {
      try {
        await updateFinding.mutateAsync({ findingId, updates: { notes: notes || null } })
      } catch (error) {
        console.error('Failed to update note:', error)
      }
    },
    [updateFinding]
  )

  const handleSiteTypeFilterChange = React.useCallback((siteType: string | null) => {
    setActiveSiteTypeFilter(siteType)
    configRef.current.onSiteTypeFilterChange?.(siteType)
  }, [])

  const handleDistanceFilterChange = React.useCallback(
    (filter: 'all' | '0-1' | '1-5' | '5-10' | '10+') => {
      setActiveDistanceFilter(filter)
    },
    []
  )

  if (!projectBoundary) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No project boundary defined. Please complete Step 1 (GIS Mapping) first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const displayFindings =
    config.filterConfig || config.showDistanceFilter ? filteredResults : spatiallyFilteredResults

  return (
    <div className="flex h-full">
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        <div className="border-b p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            {config.titleIcon}
            {config.title}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">{config.description}</p>

          <div className="flex items-center gap-2">
            <Select
              value={selectedBuffer.toString()}
              onValueChange={(v) => setSelectedBuffer(parseFloat(v))}
            >
              <SelectTrigger className="w-30">
                <SelectValue placeholder="Buffer" />
              </SelectTrigger>
              <SelectContent>
                {(bufferDistances.length > 0 ? bufferDistances : [2, 5]).map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d} km buffer
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={performSearch}
              disabled={isSearching || config.isSearchDisabled}
              className={`flex-1 ${config.searchButtonColor}`}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {searchProgress ? `Searching ${searchProgress}` : 'Searching...'}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  {config.searchButtonLabel}
                </>
              )}
            </Button>
          </div>
        </div>

        {renderExtraControls?.()}
        <div className="flex-1 overflow-hidden">
          <FindingsList
            findings={config.filterConfig ? filteredResults : spatiallyFilteredResults}
            savedFindings={savedFindings}
            isLoading={isSearching}
            onSave={handleSaveFinding}
            onViewOnMap={(f) => setSelectedFinding(f)}
            onDeepResearch={config.onDeepResearch ? handleDeepResearch : undefined}
            onFetchAiSummary={handleFetchAiSummary}
            onUpdateNote={handleUpdateNote}
            emptyMessage={config.emptyMessage}
            hiddenIds={hiddenIds}
            onToggleVisibility={handleToggleVisibility}
            savingIds={savingIds}
            selectedFindingId={selectedFinding?.id}
            onSavedFilterChange={setShowSavedOnMap}
            onSummarizeAll={isSummarizing ? handleStopSummarize : handleSummarizeAll}
            isSummarizing={isSummarizing}
            {...(config.filterConfig
              ? {
                  showSiteTypeFilter: config.filterConfig.showSiteTypeFilter,
                  siteTypeFilterOrder: config.filterConfig.siteTypeFilterOrder,
                  siteTypeFilterConfig: config.filterConfig.siteTypeFilterConfig,
                  onSiteTypeFilterChange: handleSiteTypeFilterChange,
                }
              : {})}
            {...(config.showDistanceFilter
              ? {
                  distanceFilter: activeDistanceFilter,
                  onDistanceFilterChange: handleDistanceFilterChange,
                }
              : {})}
            {...(config.findingsListExtraProps || {})}
            onViewModeChange={setListViewMode}
            onSaveAll={handleSaveAll}
            isSavingAll={isSavingAll}
          />
        </div>
      </div>

      <ShellMapPanel
        showMap={showMap}
        onToggleMap={onToggleMap}
        isActive={isActive ?? true}
        projectCenter={projectCenter}
        projectBoundary={projectBoundary}
        otherBoundaries={otherBoundaries}
        allBoundaries={allBoundaries}
        selectedBuffer={selectedBuffer}
        computedGridOverlay={computedGridOverlay}
        config={config}
        projectId={project.id}
        userId={userId}
        displayFindings={displayFindings}
        savedFindings={savedFindings}
        hiddenIds={hiddenIds}
        showSavedOnMap={showSavedOnMap}
        selectedFinding={selectedFinding}
        searchResults={searchResults}
        onFindingClick={(found) => {
          setSelectedFinding((prev) => (prev?.id === found?.id ? null : found))
        }}
        onMapClick={() => setSelectedFinding(null)}
      />

      {renderDeepResearchModal?.({ searchResults, savedFindings })}
    </div>
  )
}
