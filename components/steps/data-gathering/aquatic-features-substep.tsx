'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, AlertCircle, Droplets } from 'lucide-react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'

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
import { useCreateFinding, useDeleteFinding, useUpdateFinding } from '@/hooks/use-project-data'
import { searchAllAquaticFeatures, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import { FindingsList, type FindingDisplay } from './findings-list'
import {
  AquaticDeepResearchModal,
  type AquaticDeepResearchSite,
} from '@/components/desk-research/aquatic-deep-research-modal'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { useSubstepSearch } from '@/hooks/shared/use-substep-search'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'
import { MapCaptureButton } from '@/components/maps/map-capture-button'

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

interface AquaticFeaturesSubStepProps {
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
}

export function AquaticFeaturesSubStep({
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
}: AquaticFeaturesSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()

  // Cache key for sessionStorage
  const cacheKey = `epa-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = useSessionStorage<FindingDisplay[]>(cacheKey, [])
  // Filter by feature type (null = show all)
  const [activeFilter, setActiveFilter] = React.useState<'River' | 'Lake' | 'Catchment' | null>(
    null
  )
  // Map container ref for screenshot capture
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  // Shared substep search logic (auto-search, visibility toggle, session cache, location restore)
  const performSearchRef = React.useRef<(() => Promise<void>) | null>(null)
  const MINIMAL_METADATA_KEYS = React.useMemo(() => ['siteType', 'siteCode'], [])
  const matchPredicate = React.useCallback((sf: DeskResearchFinding, result: FindingDisplay) => {
    const rawData = sf.raw_data as Record<string, unknown>
    return rawData?.siteCode === result.metadata?.siteCode && sf.source === 'epa'
  }, [])
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
      matchPredicate,
      minimalMetadataKeys: MINIMAL_METADATA_KEYS,
    },
    bufferDistances[0] || 2
  )

  // Deep Research modal state
  const [deepResearchSite, setDeepResearchSite] = React.useState<AquaticDeepResearchSite | null>(
    null
  )
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)
  const [aquaticExistingAnalysis, setAquaticExistingAnalysis] = React.useState<string | undefined>()

  // Handle Deep Research click
  const handleDeepResearch = React.useCallback(
    (finding: FindingDisplay) => {
      const site: AquaticDeepResearchSite = {
        waterBodyName: finding.title,
        waterBodyType: (finding.metadata?.siteType as 'River' | 'Lake' | 'Catchment') || 'River',
        waterBodyCode: finding.metadata?.siteCode,
        wfdStatus: finding.metadata?.designation,
        catchmentName: finding.rawData?.CatchmentName as string | undefined,
        catchmentId: finding.rawData?.CatchmentId as string | undefined,
        distance: finding.metadata?.distance,
        areaHa: finding.rawData?.Area_ha as number | undefined,
        lengthKm: finding.rawData?.Length_km as number | undefined,
      }

      // Check for existing analysis in savedFindings
      let cachedAnalysis: string | undefined
      const savedMatch = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode &&
          f.source === 'epa'
      )
      if (savedMatch) {
        const rawData = savedMatch.raw_data as Record<string, unknown>
        const aquaticResearch = rawData?.aquaticResearch as Record<string, unknown> | undefined
        if (aquaticResearch?.aiAnalysis) {
          cachedAnalysis = aquaticResearch.aiAnalysis as string
        }
      }

      setDeepResearchSite(site)
      setAquaticExistingAnalysis(cachedAnalysis)
      setIsDeepResearchOpen(true)
    },
    [savedFindings]
  )

  // Calculate distance from finding location to project boundary
  const calculateDistanceFromBoundary = React.useCallback(
    (location?: GeoJSON.Geometry): number | undefined => {
      if (!location || !projectBoundary) return undefined

      try {
        let findingPoint: GeoJSON.Feature<GeoJSON.Point>

        if (location.type === 'Point') {
          findingPoint = turf.point(location.coordinates)
        } else if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
          findingPoint = turf.centroid(location as GeoJSON.Polygon | GeoJSON.MultiPolygon)
        } else if (location.type === 'LineString' || location.type === 'MultiLineString') {
          // For rivers (lines), get the centroid
          findingPoint = turf.centroid(location as GeoJSON.LineString | GeoJSON.MultiLineString)
        } else {
          return undefined
        }

        if (turf.booleanPointInPolygon(findingPoint, projectBoundary)) {
          return 0
        }

        const nearestPoint = turf.nearestPointOnLine(
          turf.polygonToLine(projectBoundary) as GeoJSON.Feature<GeoJSON.LineString>,
          findingPoint
        )

        const distance = turf.distance(findingPoint, nearestPoint, { units: 'kilometers' })
        return Math.round(distance * 100) / 100
      } catch (error) {
        console.warn('Error calculating distance:', error)
        return undefined
      }
    },
    [projectBoundary]
  )

  // Perform search
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
      const results = await searchAllAquaticFeatures({
        bbox: {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        limit: 50,
      })

      const findings: FindingDisplay[] = []

      // Add rivers
      for (let i = 0; i < results.rivers.length; i++) {
        const river = results.rivers[i]
        const distance = calculateDistanceFromBoundary(river.geometry)

        findings.push({
          id: `epa-river-${river.RiverCode || river.OBJECTID || i}`,
          source: 'epa',
          dataType: 'water_quality',
          title: river.RiverName,
          content: `River${river.Length_km ? ` (${river.Length_km.toFixed(1)} km)` : ''}. ${river.CatchmentName ? `Catchment: ${river.CatchmentName}.` : ''} ${river.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(river.WFD_Status)}` : ''}`,
          location: river.geometry,
          isSaved: false,
          sourceUrl: river.CatchmentsUrl || `https://gis.epa.ie/EPAMaps/Water`,
          rawData: river as unknown as Record<string, unknown>,
          metadata: {
            siteCode: river.RiverCode,
            siteType: 'River',
            designation: river.WFD_Status,
            distance,
          },
        })
      }

      // Add lakes
      for (let i = 0; i < results.lakes.length; i++) {
        const lake = results.lakes[i]
        const distance = calculateDistanceFromBoundary(lake.geometry)

        findings.push({
          id: `epa-lake-${lake.LakeCode || lake.OBJECTID || i}`,
          source: 'epa',
          dataType: 'water_quality',
          title: lake.LakeName,
          content: `Lake${lake.Area_ha ? ` (${lake.Area_ha.toFixed(1)} ha)` : ''}. ${lake.CatchmentName ? `Catchment: ${lake.CatchmentName}.` : ''} ${lake.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(lake.WFD_Status)}` : ''}`,
          location: lake.geometry,
          isSaved: false,
          sourceUrl: lake.CatchmentsUrl || `https://gis.epa.ie/EPAMaps/Water`,
          rawData: lake as unknown as Record<string, unknown>,
          metadata: {
            siteCode: lake.LakeCode,
            siteType: 'Lake',
            designation: lake.WFD_Status,
            distance,
          },
        })
      }

      // Add catchments
      for (let i = 0; i < results.catchments.length; i++) {
        const catchment = results.catchments[i]
        const distance = calculateDistanceFromBoundary(catchment.geometry)

        findings.push({
          id: `epa-catchment-${catchment.CatchmentId || catchment.OBJECTID || i}`,
          source: 'epa',
          dataType: 'catchment',
          title: catchment.CatchmentName,
          content: `Catchment${catchment.Area_km2 ? ` (${catchment.Area_km2.toFixed(1)} km²)` : ''}. ${catchment.RiverBasinDistrict ? `River Basin District: ${catchment.RiverBasinDistrict}` : ''}`,
          location: catchment.geometry,
          isSaved: false,
          sourceUrl: `https://gis.epa.ie/EPAMaps/Water`,
          rawData: catchment as unknown as Record<string, unknown>,
          metadata: {
            siteCode: catchment.CatchmentId,
            siteType: 'Catchment',
            distance,
          },
        })
      }

      setSearchResults(findings)

      // No toast - results are shown in the UI
    } catch (error) {
      console.error('EPA search error:', error)
      toast({
        variant: 'destructive',
        title: 'EPA search failed',
        description: 'Could not fetch water quality and catchment data.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Assign ref so the hook can call performSearch
  performSearchRef.current = performSearch

  // Handle saving a finding
  // Note: Check current saved state directly from savedFindings list
  const handleSaveFinding = async (finding: FindingDisplay) => {
    setSavingIds((prev) => new Set(prev).add(finding.id))
    try {
      // Check current saved state in our savedFindings list
      const isCurrentlySaved = savedFindings.some(
        (f) => f.title === finding.title || f.id === finding.id
      )

      if (isCurrentlySaved) {
        // Currently saved, so user wants to remove it
        const existingFinding = savedFindings.find(
          (f) => f.title === finding.title || f.id === finding.id
        )
        if (existingFinding) {
          await deleteFinding.mutateAsync(existingFinding.id)
        }
      } else {
        // Not saved yet, so save it
        await createFinding.mutateAsync({
          project_id: project.id,
          source: 'epa',
          data_type: finding.dataType as 'water_quality' | 'catchment',
          title: finding.title,
          content: finding.content || null,
          raw_data: {
            ...finding.rawData,
            siteCode: finding.metadata?.siteCode,
            metadata: finding.metadata,
          } as unknown as Json,
          location: finding.location as unknown as Json,
          is_saved: true,
          distance_from_boundary_km: finding.metadata?.distance || null,
          created_by: userId,
        })
      }
    } catch (error) {
      console.error('Save finding error:', error)
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(finding.id)
        return next
      })
    }
  }

  // Handle AI summary fetch for an aquatic feature
  const handleFetchAiSummary = async (finding: FindingDisplay) => {
    // Set loading state
    setSearchResults((prev) =>
      prev.map((f) =>
        f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: true } } : f
      )
    )

    try {
      const rawData = finding.rawData as Record<string, unknown> | undefined
      const response = await fetch('/api/ai/aquatic-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waterBodyName: finding.title,
          waterBodyType: finding.metadata?.siteType || 'River',
          waterBodyCode: finding.metadata?.siteCode,
          wfdStatus: finding.metadata?.designation,
          catchmentName: rawData?.CatchmentName,
          distance: finding.metadata?.distance,
          areaHa: rawData?.Area_ha,
          lengthKm: rawData?.Length_km,
          riverBasinDistrict: rawData?.RiverBasinDistrict,
        }),
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
      const existingSaved = savedFindings.find(
        (f) => f.title === finding.title || f.id === finding.id
      )
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

  // Batch summarize all features
  const [isSummarizing, setIsSummarizing] = React.useState(false)
  const summarizeCancelRef = React.useRef(false)
  const handleSummarizeAll = async () => {
    const featuresWithoutSummary = searchResults.filter(
      (f) => !f.metadata?.aiSummary && !f.metadata?.aiSummaryLoading && f.sourceUrl
    )
    if (featuresWithoutSummary.length === 0) return

    summarizeCancelRef.current = false
    setIsSummarizing(true)
    for (const finding of featuresWithoutSummary) {
      if (summarizeCancelRef.current) break
      await handleFetchAiSummary(finding)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setIsSummarizing(false)
  }
  const handleStopSummarize = () => {
    summarizeCancelRef.current = true
  }

  // No boundary check
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

  // Filter results by active filter (for map sync)
  const filteredResults = React.useMemo(() => {
    if (!activeFilter) return searchResults
    return searchResults.filter((f) => f.metadata?.siteType === activeFilter)
  }, [searchResults, activeFilter])

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Droplets className="h-4 w-4 text-cyan-500" />
            Aquatic Features (EPA)
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Search for rivers, lakes, and catchments within the selected buffer zone.
          </p>

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
              disabled={isSearching}
              className="flex-1 border-cyan-300 text-cyan-700 hover:bg-gray-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search EPA
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-hidden">
          <FindingsList
            findings={searchResults}
            savedFindings={savedFindings}
            isLoading={isSearching}
            onSave={handleSaveFinding}
            onViewOnMap={(f) => setSelectedFinding(f)}
            onDeepResearch={handleDeepResearch}
            onFetchAiSummary={handleFetchAiSummary}
            emptyMessage="Search to find features"
            hiddenIds={hiddenIds}
            onToggleVisibility={handleToggleVisibility}
            savingIds={savingIds}
            selectedFindingId={selectedFinding?.id}
            onSavedFilterChange={setShowSavedOnMap}
            showSiteTypeFilter
            siteTypeFilterOrder={['River', 'Lake', 'Catchment']}
            siteTypeFilterConfig={{
              River: {
                active: 'bg-blue-600 text-white',
                inactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
              },
              Lake: {
                active: 'bg-cyan-600 text-white',
                inactive: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
              },
              Catchment: {
                active: 'bg-slate-600 text-white',
                inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              },
            }}
            onSiteTypeFilterChange={setActiveFilter as (siteType: string | null) => void}
            onSummarizeAll={isSummarizing ? handleStopSummarize : handleSummarizeAll}
            isSummarizing={isSummarizing}
          />
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="relative flex-1" ref={mapContainerRef}>
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
            zoom={11}
            boundary={projectBoundary}
            bufferDistances={bufferDistances}
            findings={filteredResults
              .filter((f) => !hiddenIds.has(f.id)) // Filter out hidden findings
              .filter(
                (f) =>
                  !showSavedOnMap ||
                  savedFindings.some(
                    (sf) =>
                      (sf.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode &&
                      sf.source === 'epa'
                  )
              )
              .map((f) => ({
                id: f.id,
                source: f.source as FindingSource,
                dataType: f.dataType as FindingType,
                title: f.title,
                content: f.content,
                location: f.location,
                isSaved: savedFindings.some(
                  (sf) =>
                    (sf.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode &&
                    sf.source === 'epa'
                ),
              }))}
            selectedFinding={
              selectedFinding
                ? {
                    id: selectedFinding.id,
                    source: selectedFinding.source as FindingSource,
                    dataType: selectedFinding.dataType as FindingType,
                    title: selectedFinding.title,
                    content: selectedFinding.content,
                    location: selectedFinding.location,
                    isSaved: false,
                  }
                : undefined
            }
            onFindingClick={(f) => {
              // Toggle selection - if clicking the same finding, deselect it
              const found = filteredResults.find((r) => r.id === f.id) || null
              setSelectedFinding((prev) => (prev?.id === f.id ? null : found))
              // Scroll to the finding card in the panel
              document
                .getElementById(`finding-${f.id}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            onMapClick={() => {
              // Clear selection when clicking on empty map space
              setSelectedFinding(null)
            }}
          />

          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-1000"
            onClick={onToggleMap}
            data-map-control="true"
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide Map
          </Button>

          {/* Map capture button */}
          <MapCaptureButton
            containerRef={mapContainerRef}
            projectId={project.id}
            stepName="aquatic_features"
            userId={userId}
            className="absolute top-14 right-4 z-1000 shadow-md"
          />
        </div>
      )}

      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}

      {/* Deep Research Modal */}
      <AquaticDeepResearchModal
        open={isDeepResearchOpen}
        onOpenChange={setIsDeepResearchOpen}
        site={deepResearchSite}
        projectId={project.id}
        userId={userId}
        existingAnalysis={aquaticExistingAnalysis}
      />
    </div>
  )
}
