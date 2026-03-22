'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, AlertCircle, Grid3X3 } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  useCreateFinding,
  useDeleteFinding,
  useUpdateFinding,
} from '@/hooks/queries/use-finding-hooks'
import { FindingsList, type FindingDisplay } from './findings-list'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { useSubstepSearch } from '@/hooks/shared/use-substep-search'
import {
  type FindingSource,
  type FindingType,
  type DeskResearchFinding as MapFinding,
} from '@/components/desk-research/finding-card'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { MapCaptureButton } from '@/components/maps/map-capture-button'
import type { MapStepName } from '@/lib/map-screenshots/types'

// Dynamic import for map
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubstepShellProps {
  // Common props passed by parent
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void

  // Configuration
  config: SubstepShellConfig

  // Ref to expose the AI summary trigger to parent substep components
  aiSummaryTriggerRef?: React.MutableRefObject<((finding: FindingDisplay) => void) | null>

  // Children: render prop for deep research modal
  renderDeepResearchModal?: (props: {
    searchResults: FindingDisplay[]
    savedFindings: DeskResearchFinding[]
  }) => React.ReactNode

  // Optional extra content above FindingsList (e.g. enrichment progress)
  renderExtraControls?: () => React.ReactNode
}

export interface SubstepShellConfig {
  // Identity
  title: string
  titleIcon?: React.ReactNode
  description: string
  searchButtonLabel: string
  searchButtonColor: string
  emptyMessage: string
  cacheKeyPrefix: string // e.g. 'npws', 'gbif', 'epa'
  stepName: MapStepName // for MapCaptureButton

  // Data source
  source: string // 'npws' | 'gbif' | 'epa'
  /** Source values to match when restoring saved findings from DB (defaults to [source]) */
  sourceFilter?: string[]

  // Search
  performSearch: (params: {
    bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
    buffer: number
    boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  }) => Promise<FindingDisplay[]>

  // Matching (save/unsave)
  matchPredicate: (saved: DeskResearchFinding, result: FindingDisplay) => boolean
  minimalMetadataKeys: string[]

  // Build the DB payload when saving a finding (varies per substep)
  buildCreatePayload: (
    finding: FindingDisplay,
    context: { projectId: string; userId: string }
  ) => Record<string, unknown>

  // AI summary
  aiSummaryEndpoint: string
  buildAiSummaryBody: (finding: FindingDisplay) => Record<string, unknown>
  /** Optional guard — if returns false, skip AI summary for this finding */
  canFetchAiSummary?: (finding: FindingDisplay) => boolean
  /** Optional filter for which findings to batch-summarize */
  summarizeFilter?: (finding: FindingDisplay) => boolean

  // Filtering (optional, for site-type filter)
  filterConfig?: {
    showSiteTypeFilter: boolean
    siteTypeFilterOrder: string[]
    siteTypeFilterConfig: Record<string, { active: string; inactive: string }>
  }

  // Distance/proximity filter (for species records)
  showDistanceFilter?: boolean

  // Extra FindingsList props
  findingsListExtraProps?: Record<string, unknown>

  // Post-search hook (e.g. NBDC enrichment)
  onPostSearch?: (
    findings: FindingDisplay[],
    setResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  ) => Promise<void>

  // Deep research
  onDeepResearch?: (finding: FindingDisplay, savedFindings: DeskResearchFinding[]) => void

  // Extra search disabled condition
  isSearchDisabled?: boolean

  // Grid overlay for map (searched grid squares)
  gridOverlay?: GeoJSON.FeatureCollection
  /** Compute grid overlay based on selected buffer — takes priority over static gridOverlay */
  computeGridOverlay?: (bufferKm: number) => GeoJSON.FeatureCollection | undefined

  // Map findings customization
  mapFindingsMapper?: (finding: FindingDisplay, savedFindings: DeskResearchFinding[]) => MapFinding
  mapSelectedMapper?: (finding: FindingDisplay) => MapFinding
  mapFindingsSavedFilter?: (
    finding: FindingDisplay,
    savedFindings: DeskResearchFinding[]
  ) => boolean

  // Site type filter state callback (for parent-level filter sync)
  onSiteTypeFilterChange?: (siteType: string | null) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function DataGatheringSubstepShell({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
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
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()

  // Cache key for sessionStorage
  const cacheKey = `${config.cacheKeyPrefix}-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = useSessionStorage<FindingDisplay[]>(cacheKey, [])

  // Map container ref for screenshot capture
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  // View mode tracking
  const [listViewMode, setListViewMode] = React.useState<'cards' | 'table'>('table')
  // Grid overlay toggle (default on when grid overlay is available)
  const [showGridOverlay, setShowGridOverlay] = React.useState(true)

  // Memoize computed grid overlay to avoid recalculating on every render
  const computedGridOverlay = React.useMemo(
    () => config.computeGridOverlay?.(selectedBuffer ?? bufferDistances[0] ?? 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.computeGridOverlay, selectedBuffer]
  )

  // Site type filter for map sync
  const [activeSiteTypeFilter, setActiveSiteTypeFilter] = React.useState<string | null>(null)

  // Distance filter for map sync
  const [activeDistanceFilter, setActiveDistanceFilter] = React.useState<
    'all' | '0-1' | '1-5' | '5-10' | '10+'
  >('all')

  // Shared substep search logic
  const performSearchRef = React.useRef<(() => Promise<void>) | null>(null)
  const stableMinimalKeys = React.useMemo(
    () => config.minimalMetadataKeys,
    [config.minimalMetadataKeys.join(',')]
  )
  const stableMatchPredicate = React.useCallback(
    (sf: DeskResearchFinding, result: FindingDisplay) => config.matchPredicate(sf, result),
    [config.matchPredicate]
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
    },
    bufferDistances[0] || 2
  )

  // ── Perform search ──────────────────────────────────────────────────────
  const performSearch = async () => {
    const bbox = getBoundingBox(projectBoundary, projectCenter, selectedBuffer)
    if (!bbox) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Please define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      const findings = await config.performSearch({
        bbox: {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        buffer: selectedBuffer,
        boundary: projectBoundary,
      })

      setSearchResults(findings)

      // Post-search hook (e.g. NBDC enrichment)
      if (config.onPostSearch && findings.length > 0) {
        config.onPostSearch(findings, setSearchResults)
      }
    } catch (error) {
      console.error(`${config.cacheKeyPrefix} search error:`, error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: `Could not fetch data from ${config.searchButtonLabel.replace('Search ', '')}.`,
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Assign ref so the hook can call performSearch
  performSearchRef.current = performSearch

  // ── Handle save/unsave ──────────────────────────────────────────────────
  const handleSaveFinding = async (finding: FindingDisplay) => {
    setSavingIds((prev) => new Set(prev).add(finding.id))
    try {
      // Use the substep's matchPredicate for consistent matching
      const existingFinding = savedFindings.find((f) => config.matchPredicate(f, finding))

      if (existingFinding) {
        await deleteFinding.mutateAsync(existingFinding.id)
      } else {
        const payload = config.buildCreatePayload(finding, {
          projectId: project.id,
          userId,
        })
        await createFinding.mutateAsync(payload as Parameters<typeof createFinding.mutateAsync>[0])

        // Auto-trigger AI summary generation after saving
        if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
          handleFetchAiSummary(finding).catch((err) =>
            console.error('[AI Summary] Auto-trigger failed:', err)
          )
        }
      }
    } catch (error) {
      console.error('Save finding error:', error)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save the finding. Please try again.',
      })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(finding.id)
        return next
      })
    }
  }

  // ── Handle Save All ─────────────────────────────────────────────────────
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  const handleSaveAll = async (findings: FindingDisplay[]) => {
    setIsSavingAll(true)
    let savedCount = 0
    const savedFindings: FindingDisplay[] = []
    try {
      for (const finding of findings) {
        try {
          const payload = config.buildCreatePayload(finding, {
            projectId: project.id,
            userId,
          })
          await createFinding.mutateAsync(
            payload as Parameters<typeof createFinding.mutateAsync>[0]
          )
          savedCount++
          savedFindings.push(finding)
        } catch {
          // Skip individual failures
        }
      }
      toast({
        title: `Saved ${savedCount} species`,
        description: `${savedCount} of ${findings.length} species records saved. Generating AI summaries...`,
      })

      // Auto-trigger AI summaries for all saved findings (fire-and-forget)
      for (const finding of savedFindings) {
        if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
          handleFetchAiSummary(finding).catch(() => {})
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      }
    } finally {
      setIsSavingAll(false)
    }
  }

  // ── Handle AI summary ───────────────────────────────────────────────────
  const handleFetchAiSummary = async (finding: FindingDisplay) => {
    if (config.canFetchAiSummary && !config.canFetchAiSummary(finding)) return

    // Set loading state
    setSearchResults((prev) =>
      prev.map((f) =>
        f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: true } } : f
      )
    )

    try {
      const response = await fetch(config.aiSummaryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.buildAiSummaryBody(finding)),
      })

      if (!response.ok) throw new Error('Failed to fetch summary')

      const data = await response.json()

      setSearchResults((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? {
                ...f,
                metadata: {
                  ...f.metadata,
                  aiSummary: data.summary,
                  aiSummaryLoading: false,
                },
              }
            : f
        )
      )

      // Persist AI summary to DB if finding is already saved
      const existingSaved = savedFindings.find((f) => config.matchPredicate(f, finding))
      if (existingSaved) {
        const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}
        const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}
        updateFinding
          .mutateAsync({
            findingId: existingSaved.id,
            updates: {
              raw_data: {
                ...existingRawData,
                metadata: { ...existingMetadata, aiSummary: data.summary },
              } as unknown as Json,
            },
          })
          .catch((err) => console.error('Failed to persist AI summary:', err))
      }
    } catch (error) {
      console.error('AI summary error:', error)
      setSearchResults((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? {
                ...f,
                metadata: {
                  ...f.metadata,
                  aiSummary: 'Failed to generate summary. Try again later.',
                  aiSummaryLoading: false,
                },
              }
            : f
        )
      )
    }
  }

  // ── Expose AI summary trigger to parent substep components ──────────────
  if (aiSummaryTriggerRef) {
    aiSummaryTriggerRef.current = handleFetchAiSummary
  }

  // ── Batch summarize ─────────────────────────────────────────────────────
  const [isSummarizing, setIsSummarizing] = React.useState(false)
  const summarizeCancelRef = React.useRef(false)

  const handleSummarizeAll = async () => {
    const filter =
      config.summarizeFilter ||
      ((f: FindingDisplay) => !f.metadata?.aiSummary && !f.metadata?.aiSummaryLoading)
    const candidates = searchResults.filter(filter)
    if (candidates.length === 0) return

    summarizeCancelRef.current = false
    setIsSummarizing(true)
    for (const finding of candidates) {
      if (summarizeCancelRef.current) break
      await handleFetchAiSummary(finding)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setIsSummarizing(false)
  }

  const handleStopSummarize = () => {
    summarizeCancelRef.current = true
  }

  // ── Deep research handler ───────────────────────────────────────────────
  const handleDeepResearch = React.useCallback(
    (finding: FindingDisplay) => {
      config.onDeepResearch?.(finding, savedFindings)
    },
    [config, savedFindings]
  )

  // ── Note update handler ─────────────────────────────────────────────────
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

  // ── No boundary check ──────────────────────────────────────────────────
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

  // ── Filter results for map ──────────────────────────────────────────────
  const filteredResults = React.useMemo(() => {
    let result = searchResults
    if (activeSiteTypeFilter) {
      result = result.filter((f) => f.metadata?.siteType === activeSiteTypeFilter)
    }
    if (activeDistanceFilter && activeDistanceFilter !== 'all') {
      result = result.filter((f) => {
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
    }
    return result
  }, [searchResults, activeSiteTypeFilter, activeDistanceFilter])

  // Default map findings mapper
  const defaultMapFindingsMapper = (f: FindingDisplay): MapFinding => ({
    id: f.id,
    source: f.source as FindingSource,
    dataType: f.dataType as FindingType,
    title: f.title,
    content: f.content,
    location: f.location,
    isSaved: savedFindings.some((sf) => config.matchPredicate(sf, f)),
  })

  // Default saved filter
  const defaultSavedFilter = (f: FindingDisplay) =>
    savedFindings.some((sf) => config.matchPredicate(sf, f))

  const mapFindingsMapper = config.mapFindingsMapper
    ? (f: FindingDisplay) => config.mapFindingsMapper!(f, savedFindings)
    : defaultMapFindingsMapper

  const savedFilter = config.mapFindingsSavedFilter
    ? (f: FindingDisplay) => config.mapFindingsSavedFilter!(f, savedFindings)
    : defaultSavedFilter

  const mapSelectedMapper = config.mapSelectedMapper
    ? (f: FindingDisplay): MapFinding => config.mapSelectedMapper!(f)
    : (f: FindingDisplay): MapFinding => ({
        id: f.id,
        source: f.source as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: false,
      })

  // Handle site type filter change
  const handleSiteTypeFilterChange = React.useCallback(
    (siteType: string | null) => {
      setActiveSiteTypeFilter(siteType)
      config.onSiteTypeFilterChange?.(siteType)
    },
    [config]
  )

  // Handle distance filter change (syncs map)
  const handleDistanceFilterChange = React.useCallback(
    (filter: 'all' | '0-1' | '1-5' | '5-10' | '10+') => {
      setActiveDistanceFilter(filter)
    },
    []
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
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
                  Searching...
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

        {/* Optional extra controls (e.g. enrichment progress) */}
        {renderExtraControls?.()}

        {/* Results List */}
        <div className="flex-1 overflow-hidden">
          <FindingsList
            findings={config.filterConfig ? filteredResults : searchResults}
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
            // Site type filter props
            {...(config.filterConfig
              ? {
                  showSiteTypeFilter: config.filterConfig.showSiteTypeFilter,
                  siteTypeFilterOrder: config.filterConfig.siteTypeFilterOrder,
                  siteTypeFilterConfig: config.filterConfig.siteTypeFilterConfig,
                  onSiteTypeFilterChange: handleSiteTypeFilterChange,
                }
              : {})}
            // Distance filter props
            {...(config.showDistanceFilter
              ? {
                  distanceFilter: activeDistanceFilter,
                  onDistanceFilterChange: handleDistanceFilterChange,
                }
              : {})}
            // Extra props (e.g. species header, enrichment, source filter)
            {...(config.findingsListExtraProps || {})}
            onViewModeChange={setListViewMode}
            onSaveAll={handleSaveAll}
            isSavingAll={isSavingAll}
          />
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="relative flex-1" ref={mapContainerRef}>
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={11}
            boundary={projectBoundary}
            bufferDistances={[selectedBuffer]}
            gridOverlay={
              showGridOverlay
                ? (config.computeGridOverlay?.(selectedBuffer) ?? config.gridOverlay)
                : undefined
            }
            findings={(config.filterConfig || config.showDistanceFilter
              ? filteredResults
              : searchResults
            )
              .filter((f) => !hiddenIds.has(f.id))
              .filter((f) => !showSavedOnMap || savedFilter(f))
              .map(mapFindingsMapper)}
            selectedFinding={selectedFinding ? mapSelectedMapper(selectedFinding) : undefined}
            onFindingClick={(f) => {
              const found = searchResults.find((r) => r.id === f.id) || null
              setSelectedFinding((prev) => (prev?.id === f.id ? null : found))
            }}
            onMapClick={() => setSelectedFinding(null)}
          />

          {(config.gridOverlay || config.computeGridOverlay) && (
            <div className="absolute top-4 right-4 z-1000" data-map-control="true">
              <Button
                variant="secondary"
                size="sm"
                className={`shadow-md ${showGridOverlay ? 'bg-purple-100 text-purple-700' : ''}`}
                onClick={() => setShowGridOverlay((prev) => !prev)}
              >
                <Grid3X3 className="mr-1 h-4 w-4" />
                {showGridOverlay ? 'Hide Grid' : 'Show Grid'}
              </Button>
            </div>
          )}

          <MapCaptureButton
            containerRef={mapContainerRef}
            projectId={project.id}
            stepName={config.stepName}
            userId={userId}
            className="absolute top-14 right-4 z-1000 shadow-md"
          />
        </div>
      )}

      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}

      {/* Deep Research Modal (render prop) */}
      {renderDeepResearchModal?.({ searchResults, savedFindings })}
    </div>
  )
}
