'use client'

import * as React from 'react'
import {
  Search,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  MapPin,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import {
  findIntersectingSSCO,
  getHabitatsBySiteCode,
  type SSCOResult,
} from '@/lib/data/ssco-lookup'
import { FindingsList, type FindingDisplay } from './findings-list'
import {
  DeepResearchModal,
  type DeepResearchSite,
} from '@/components/desk-research/deep-research-modal'
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

interface DesignatedSitesSubStepProps {
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

export function DesignatedSitesSubStep({
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
}: DesignatedSitesSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()

  // Cache key for sessionStorage
  const cacheKey = `npws-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = useSessionStorage<FindingDisplay[]>(cacheKey, [])

  // Map container ref for screenshot capture
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  // Site type filter for map sync (SAC, SPA, NHA, pNHA)
  const [activeSiteTypeFilter, setActiveSiteTypeFilter] = React.useState<string | null>(null)
  // Deep Research modal state
  const [deepResearchSite, setDeepResearchSite] = React.useState<DeepResearchSite | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)

  // Shared substep search logic (auto-search, visibility toggle, session cache, location restore)
  const performSearchRef = React.useRef<(() => Promise<void>) | null>(null)
  const MINIMAL_METADATA_KEYS = React.useMemo(() => ['siteCode', 'siteType'], [])
  const matchPredicate = React.useCallback(
    (sf: DeskResearchFinding, result: FindingDisplay) =>
      (sf.raw_data as Record<string, unknown>)?.siteCode === result.metadata?.siteCode,
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
      matchPredicate,
      minimalMetadataKeys: MINIMAL_METADATA_KEYS,
    },
    bufferDistances[0] || 2
  )

  // Handle Deep Research save → update finding's raw_data with AI analysis
  const handleDeepResearchSave = React.useCallback(
    async (data: { aiAnalysis: string; siteCode: string }) => {
      const finding = savedFindings.find(
        (f) => (f.raw_data as Record<string, unknown>)?.siteCode === data.siteCode
      )
      if (finding) {
        try {
          const existingRawData = (finding.raw_data as Record<string, unknown>) || {}
          // Merge session AI summary into DB data if present
          const sessionFinding = searchResults.find((r) => r.metadata?.siteCode === data.siteCode)
          const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}
          const mergedMetadata = sessionFinding?.metadata?.aiSummary
            ? { ...existingMetadata, aiSummary: sessionFinding.metadata.aiSummary }
            : existingMetadata

          await updateFinding.mutateAsync({
            findingId: finding.id,
            updates: {
              raw_data: {
                ...existingRawData,
                metadata: mergedMetadata,
                deepResearch: { aiAnalysis: data.aiAnalysis },
              } as unknown as Json,
            },
          })
        } catch (error) {
          console.error('Failed to update finding with deep research:', error)
        }
      }
    },
    [savedFindings, updateFinding, searchResults]
  )

  // Handle Deep Research click
  const handleDeepResearch = React.useCallback(async (finding: FindingDisplay) => {
    const siteCode = finding.metadata?.siteCode || ''

    // Extract habitats from SSCO data if available in finding
    const sscoData = finding.rawData?.ssco as SSCOResult | undefined
    let habitats =
      sscoData?.habitats ||
      (finding.rawData?.habitats as Array<{ habitatCode: string; habitatName: string }> | undefined)

    // If no habitats in finding data, try to lookup from SSCO by site code
    if ((!habitats || habitats.length === 0) && siteCode) {
      try {
        const sscoHabitats = await getHabitatsBySiteCode(siteCode)
        if (sscoHabitats.length > 0) {
          habitats = sscoHabitats.map((h) => ({
            habitatCode: h.habitatCode,
            habitatName: h.habitatName,
          }))
        }
      } catch (error) {
        console.warn('Failed to lookup SSCO habitats:', error)
      }
    }

    const site: DeepResearchSite = {
      siteCode,
      siteName: finding.title.replace(' - Conservation Objectives', ''),
      siteType: (finding.metadata?.siteType as 'SAC' | 'SPA' | 'NHA' | 'pNHA') || 'SAC',
      habitats: habitats,
      distance: finding.metadata?.distance,
      areaHa: finding.rawData?.AREA_HA as number | undefined,
    }

    setDeepResearchSite(site)
    setIsDeepResearchOpen(true)
  }, [])

  // Calculate distance from finding location to project boundary
  // Returns 0 if the site intersects with or contains the project boundary
  const calculateDistanceFromBoundary = React.useCallback(
    (location?: GeoJSON.Geometry): number | undefined => {
      if (!location || !projectBoundary) return undefined

      try {
        // For polygon/multipolygon geometries (designated sites), check for intersection
        if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
          const siteFeature = turf.feature(location as GeoJSON.Polygon | GeoJSON.MultiPolygon)

          // Check if site intersects with project boundary (includes: overlaps, contains, within)
          if (turf.booleanIntersects(siteFeature, projectBoundary)) {
            return 0 // Site overlaps with or contains the project boundary
          }

          // No intersection - calculate distance from site boundary to project boundary
          const siteCentroid = turf.centroid(siteFeature)
          const nearestPoint = turf.nearestPointOnLine(
            turf.polygonToLine(projectBoundary) as GeoJSON.Feature<GeoJSON.LineString>,
            siteCentroid
          )
          const distance = turf.distance(siteCentroid, nearestPoint, { units: 'kilometers' })
          return Math.round(distance * 100) / 100
        }

        // For point geometries
        if (location.type === 'Point') {
          const findingPoint = turf.point(location.coordinates)

          if (turf.booleanPointInPolygon(findingPoint, projectBoundary)) {
            return 0
          }

          const nearestPoint = turf.nearestPointOnLine(
            turf.polygonToLine(projectBoundary) as GeoJSON.Feature<GeoJSON.LineString>,
            findingPoint
          )
          const distance = turf.distance(findingPoint, nearestPoint, { units: 'kilometers' })
          return Math.round(distance * 100) / 100
        }

        return undefined
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
      const results = await queryDesignatedSites({
        bbox: {
          minX: bbox.minLng,
          minY: bbox.minLat,
          maxX: bbox.maxLng,
          maxY: bbox.maxLat,
        },
      })

      // Deduplicate results by SITECODE + SITE_TYPE combination
      const uniqueResults = results.filter(
        (site, index, self) =>
          index ===
          self.findIndex((s) => s.SITECODE === site.SITECODE && s.SITE_TYPE === site.SITE_TYPE)
      )

      const findings: FindingDisplay[] = uniqueResults.map((site, idx) => {
        // NPWS URL format: https://www.npws.ie/protected-sites/sac/002122
        const siteTypeUrlMap: Record<string, string> = {
          SAC: 'protected-sites/sac',
          SPA: 'protected-sites/spa',
          NHA: 'protected-sites/nha',
        }
        const urlPath = siteTypeUrlMap[site.SITE_TYPE || '']
        const distance = calculateDistanceFromBoundary(site.geometry)

        // pNHA sites don't have individual NPWS pages — link to the portfolio PDF
        const sourceUrl =
          site.SITE_TYPE === 'pNHA'
            ? 'https://www.npws.ie/sites/default/files/general/pNHA_Site_Synopsis_Portfolio.pdf'
            : `https://www.npws.ie/${urlPath || 'protected-sites'}/${site.SITECODE}`

        return {
          // Use SITECODE + SITE_TYPE + OBJECTID for unique ID
          id: `npws-${site.SITECODE}-${site.SITE_TYPE || 'unknown'}-${site.OBJECTID || idx}`,
          source: 'npws',
          dataType: 'designated_site',
          title: site.SITENAME,
          content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
          location: site.geometry,
          isSaved: false,
          sourceUrl,
          rawData: site as unknown as Record<string, unknown>,
          metadata: {
            siteCode: site.SITECODE,
            siteType: site.SITE_TYPE,
            distance,
            designation: site.SITE_TYPE,
          },
        }
      })

      // Also search SSCO (Site-specific Conservation Objectives) if we have a boundary
      // SSCO data enriches existing SAC findings with habitat information
      if (projectBoundary) {
        try {
          console.log('🔍 Searching SSCO with buffer:', selectedBuffer, 'km')
          const sscoResults = await findIntersectingSSCO(projectBoundary, selectedBuffer)
          console.log('🔍 SSCO Results:', sscoResults.length, 'SAC sites found')

          // Enrich existing SAC findings with SSCO habitat data
          for (const ssco of sscoResults) {
            // Find matching SAC in findings by site code
            const matchingFinding = findings.find(
              (f) => f.metadata?.siteCode === ssco.siteCode && f.metadata?.siteType === 'SAC'
            )

            if (matchingFinding) {
              // Enrich existing finding with habitat data
              matchingFinding.rawData = {
                ...matchingFinding.rawData,
                ssco,
                habitats: ssco.habitats,
              }
              matchingFinding.metadata = {
                ...matchingFinding.metadata,
                habitatCount: ssco.habitats.length,
              }
              // Add habitat info to content
              const habitatList = ssco.habitats
                .slice(0, 3)
                .map((h) => h.habitatName)
                .join(', ')
              const moreCount = ssco.habitats.length > 3 ? ` +${ssco.habitats.length - 3} more` : ''
              matchingFinding.content = `${matchingFinding.content} Habitats: ${habitatList}${moreCount}`
            } else {
              // SSCO found a SAC not in NPWS results - add it as new finding
              const habitatList = ssco.habitats
                .map((h) => `[${h.habitatCode}] ${h.habitatName}`)
                .join(', ')

              findings.push({
                id: `ssco-${ssco.siteCode}`,
                source: 'npws',
                dataType: 'designated_site',
                title: `${ssco.siteName}`,
                content: `Special Area of Conservation. Protected habitats: ${habitatList}${ssco.intersectionArea ? `. Overlap: ~${ssco.intersectionArea.toFixed(1)} ha` : ''}`,
                location: ssco.geometry,
                isSaved: false,
                sourceUrl: `https://www.npws.ie/protected-sites/sac/${ssco.siteCode}`,
                rawData: { ssco, habitats: ssco.habitats },
                metadata: {
                  siteCode: ssco.siteCode,
                  siteType: 'SAC',
                  designation: 'Special Area of Conservation',
                  habitatCount: ssco.habitats.length,
                  isProtected: true,
                  distance: 0, // SSCO intersection means it overlaps with boundary
                },
              })
            }
          }
        } catch (error) {
          console.warn('SSCO search error:', error)
          // Don't show error toast - SSCO is supplementary
        }
      }

      // Sort findings: sites intersecting boundary (distance=0) first, then by distance
      findings.sort((a, b) => {
        const distA = a.metadata?.distance ?? Infinity
        const distB = b.metadata?.distance ?? Infinity
        return distA - distB
      })

      setSearchResults(findings)

      // No toast - results are shown in the UI
    } catch (error) {
      console.error('NPWS search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch designated sites data from NPWS.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Assign ref so the hook can call performSearch
  performSearchRef.current = performSearch

  // Handle saving a finding
  // Note: finding.isSaved represents the NEW desired state (toggled from current)
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
          source: 'npws',
          data_type: 'designated_site',
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
          is_protected: true,
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

  // Handle AI summary fetch for a designated site
  const handleFetchAiSummary = async (finding: FindingDisplay) => {
    if (!finding.sourceUrl || !finding.metadata?.siteCode) return

    // Set loading state
    setSearchResults((prev) =>
      prev.map((f) =>
        f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: true } } : f
      )
    )

    try {
      const response = await fetch('/api/ai/site-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: finding.sourceUrl,
          siteName: finding.title,
          siteCode: finding.metadata.siteCode,
          siteType: finding.metadata.siteType || finding.metadata.designation,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }

      const data = await response.json()

      // Update the finding with the summary
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

  // Batch summarize all sites that don't have summaries yet
  const [isSummarizing, setIsSummarizing] = React.useState(false)
  const summarizeCancelRef = React.useRef(false)
  const handleSummarizeAll = async () => {
    const sitesWithoutSummary = searchResults.filter(
      (f) =>
        f.dataType === 'designated_site' &&
        !f.metadata?.aiSummary &&
        !f.metadata?.aiSummaryLoading &&
        f.sourceUrl
    )
    if (sitesWithoutSummary.length === 0) return

    summarizeCancelRef.current = false
    setIsSummarizing(true)
    for (const finding of sitesWithoutSummary) {
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

  return (
    <div className="flex h-full">
      {/* Results Panel - 40% width */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-3 font-semibold">Designated Sites (NPWS)</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Search for SAC, SPA, NHA, and pNHA sites within the selected buffer zone.
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
              className="flex-1 border-emerald-300 text-emerald-700 hover:bg-gray-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search NPWS
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
            emptyMessage="Search to find sites"
            hiddenIds={hiddenIds}
            onToggleVisibility={handleToggleVisibility}
            savingIds={savingIds}
            selectedFindingId={selectedFinding?.id}
            showSiteTypeFilter
            onSiteTypeFilterChange={setActiveSiteTypeFilter}
            onSummarizeAll={handleSummarizeAll}
            onStopSummarize={handleStopSummarize}
            isSummarizing={isSummarizing}
            onSavedFilterChange={setShowSavedOnMap}
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
            findings={searchResults
              .filter((f) => !hiddenIds.has(f.id))
              .filter((f) => !activeSiteTypeFilter || f.metadata?.siteType === activeSiteTypeFilter)
              .filter(
                (f) =>
                  !showSavedOnMap ||
                  savedFindings.some((sf) => sf.title === f.title || sf.id === f.id)
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
                    (sf.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode
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
              const found = searchResults.find((r) => r.id === f.id) || null
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

          {/* Map toggle button */}
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
            stepName="designated_sites"
            userId={userId}
            className="absolute top-14 right-4 z-1000 shadow-md"
          />
        </div>
      )}

      {/* Show map button when hidden */}
      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}

      {/* Deep Research Modal */}
      <DeepResearchModal
        open={isDeepResearchOpen}
        onOpenChange={setIsDeepResearchOpen}
        site={deepResearchSite}
        projectId={project.id}
        userId={userId}
        onSaveAnalysis={handleDeepResearchSave}
      />
    </div>
  )
}
