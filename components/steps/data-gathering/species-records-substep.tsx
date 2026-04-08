'use client'

import * as React from 'react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import { SpeciesResearchModal } from '@/components/desk-research/species-research-modal'
import { useSpeciesEnrichment } from '@/hooks/data-gathering/use-species-enrichment'
import { useGridOverlay } from '@/hooks/data-gathering/use-grid-overlay'
import { buildPerformSearch, buildPostSearchHook } from '@/hooks/data-gathering/use-species-search'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

interface SpeciesRecordsSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId?: string | null
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries regardless of selection — used by the shell to
   *  keep manual search project-wide. */
  allSiteBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void
}

export function SpeciesRecordsSubStep(props: SpeciesRecordsSubStepProps) {
  const {
    projectBoundary,
    searchBoundary,
    allBoundaries,
    allSiteBoundaries,
    projectCenter,
    savedFindings,
    project,
    userId,
    siteId,
  } = props

  // Ref to trigger short AI summary from the shell
  const aiSummaryTriggerRef = React.useRef<((finding: FindingDisplay) => void) | null>(null)

  // Source filter — default to 'protected' (only show species with designation)
  const [sourceFilter, setSourceFilter] = React.useState<
    'all' | 'protected' | 'invasive' | 'threatened'
  >('protected')

  // Grid resolution for NBDC search
  const gridResolutionKey = `species-grid-res-${project.id}`
  const [gridResolution, setGridResolution] = React.useState<'10km' | '2km' | '1km'>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(gridResolutionKey)
      if (cached === '10km' || cached === '2km' || cached === '1km') return cached
    }
    return '10km'
  })
  React.useEffect(() => {
    sessionStorage.setItem(gridResolutionKey, gridResolution)
  }, [gridResolution, gridResolutionKey])

  // Extracted hooks
  const {
    speciesResearchOpen,
    selectedSpeciesResearch,
    speciesExistingAnalysis,
    setSpeciesResearchOpen,
    handleSpeciesDeepResearch,
    handleSaveDeepResearchAnalysis,
  } = useSpeciesEnrichment({
    project,
    userId,
    siteId,
    savedFindings,
    aiSummaryTriggerRef,
  })

  const { computeGridOverlay, customSpatialFilter } = useGridOverlay({
    projectCenter,
    projectBoundary,
    searchBoundary,
    allBoundaries,
    bufferDistances: props.bufferDistances,
    gridResolution,
  })

  // Track spatially filtered results — updated by onFilteredResultsChange from the shell
  const [currentSearchResults, setCurrentSearchResults] = React.useState<FindingDisplay[]>([])

  const handleFilteredResultsChange = React.useCallback((filtered: FindingDisplay[]) => {
    setCurrentSearchResults(filtered)
  }, [])

  const { protectedCount, invasiveCount, threatenedCount } = React.useMemo(() => {
    let prot = 0
    let inv = 0
    let thr = 0
    for (const f of currentSearchResults) {
      if (f.metadata?.isProtected || f.metadata?.designations) prot++
      if (f.metadata?.isInvasive) inv++
      if (f.metadata?.isThreatened) thr++
    }
    return { protectedCount: prot, invasiveCount: inv, threatenedCount: thr }
  }, [currentSearchResults])

  const config: SubstepShellConfig = React.useMemo(
    () => ({
      title: 'Species Records',
      description: 'Search Biodiversity Ireland (NBDC) by grid reference for species records.',
      searchButtonLabel: 'Search Species',
      searchButtonColor:
        'border-purple-300 text-purple-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      emptyMessage: 'Search to find species',
      cacheKeyPrefix: `nbdc-report-${gridResolution}`,
      stepName: 'species_records',
      source: 'nbdc',
      // Species search dedupes grid refs across all sites and fires a single
      // NBDC report request — skip per-site fan-out in the shell.
      multiSiteSearchMode: 'merged',
      computeGridOverlay,
      customSpatialFilter,
      onFilteredResultsChange: handleFilteredResultsChange,
      performSearch: buildPerformSearch(gridResolution, projectCenter, projectBoundary),
      onPostSearch: buildPostSearchHook(aiSummaryTriggerRef),
      matchPredicate: (sf, result) => {
        const rawData = sf.raw_data as Record<string, unknown>
        return rawData?.scientificName === result.metadata?.scientificName
      },
      minimalMetadataKeys: ['scientificName', 'recordCount'],
      buildCreatePayload: (finding, { projectId, userId: uid, siteId: sid }) => ({
        project_id: projectId,
        site_id: sid ?? null,
        source: 'nbdc' as const,
        data_type: 'species_record',
        title: finding.title,
        content: finding.content || null,
        raw_data: {
          ...finding.rawData,
          scientificName: finding.metadata?.scientificName,
          metadata: finding.metadata,
        } as unknown as Json,
        location: finding.location as unknown as Json,
        is_saved: true,
        distance_from_boundary_km: finding.metadata?.distance || null,
        is_protected: finding.metadata?.isProtected || false,
        red_list_status: finding.metadata?.redListStatus || null,
        created_by: uid,
      }),
      aiSummaryEndpoint: '/api/ai/species-summary',
      buildAiSummaryBody: (finding) => ({
        scientificName: finding.metadata?.scientificName || finding.title,
        commonName: finding.metadata?.commonName,
        taxonGroup: finding.metadata?.taxonGroup,
        designations: finding.metadata?.designations,
        isProtected: finding.metadata?.isProtected,
        isInvasive: finding.metadata?.isInvasive,
        isThreatened: finding.metadata?.isThreatened,
        totalIrishRecords: finding.metadata?.totalIrishRecords,
        gridSquares10km: finding.metadata?.gridSquares10km,
        recordCount: finding.metadata?.recordCount,
        distance: finding.metadata?.distance,
        source: finding.source,
        hasFPO:
          finding.source === 'fpo' ||
          finding.metadata?.designation === 'Flora Protection Order 2022',
        hasArticle17: finding.metadata?.designation === 'Habitats Directive Annex II/IV/V',
        relatedSitesCount: finding.metadata?.relatedSitesCount,
      }),
      summarizeFilter: (f) => f.dataType === 'species_record' && !f.metadata?.aiSummary,
      showDistanceFilter: false,
      findingsListExtraProps: {
        showSpeciesHeader: true,
        speciesCounts: {
          total: currentSearchResults.length,
          protected: protectedCount,
          invasive: invasiveCount,
          threatened: threatenedCount,
          enriched: currentSearchResults.length,
        },
        sourceFilter,
        onSourceFilterChange: setSourceFilter,
      },
      mapFindingsSavedFilter: (f, sf) =>
        sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.scientificName ===
            f.metadata?.scientificName
        ),
      mapFindingsMapper: (f, sf) => ({
        id: f.id,
        source: 'nbdc' as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.scientificName ===
            f.metadata?.scientificName
        ),
        metadata: f.metadata,
      }),
      mapSelectedMapper: (f) => ({
        id: f.id,
        source: 'nbdc' as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: false,
        metadata: f.metadata,
      }),
      onDeepResearch: handleSpeciesDeepResearch,
    }),
    [
      projectBoundary,
      projectCenter,
      sourceFilter,
      gridResolution,
      computeGridOverlay,
      customSpatialFilter,
      handleFilteredResultsChange,
      currentSearchResults.length,
      protectedCount,
      invasiveCount,
      threatenedCount,
      handleSpeciesDeepResearch,
    ]
  )

  const renderResolutionControls = React.useCallback(
    () => (
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs">Grid Resolution:</span>
        <div className="flex gap-1">
          {(['10km', '2km', '1km'] as const).map((res) => (
            <button
              key={res}
              onClick={() => setGridResolution(res)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                gridResolution === res
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>
    ),
    [gridResolution]
  )

  return (
    <>
      <DataGatheringSubstepShell
        {...props}
        config={config}
        searchBoundary={searchBoundary}
        allBoundaries={allBoundaries}
        allSiteBoundaries={allSiteBoundaries}
        aiSummaryTriggerRef={aiSummaryTriggerRef}
        renderExtraControls={renderResolutionControls}
      />
      <SpeciesResearchModal
        open={speciesResearchOpen}
        onOpenChange={setSpeciesResearchOpen}
        species={selectedSpeciesResearch}
        existingAnalysis={speciesExistingAnalysis}
        onSaveAnalysis={handleSaveDeepResearchAnalysis}
      />
    </>
  )
}
