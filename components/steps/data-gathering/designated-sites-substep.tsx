'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, RefreshCw, MapPin, AlertCircle } from 'lucide-react'
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
import { useCreateFinding, useDeleteFinding } from '@/hooks/use-project-data'
import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import { findIntersectingSSCO, getHabitatsBySiteCode, type SSCOResult } from '@/lib/data/ssco-lookup'
import { FindingsList, type FindingDisplay } from './findings-list'
import { DeepResearchModal, type DeepResearchSite } from '@/components/desk-research/deep-research-modal'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

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
}: DesignatedSitesSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()

  // Cache key for sessionStorage
  const cacheKey = `npws-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<FindingDisplay[]>(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          return JSON.parse(cached)
        } catch {
          return []
        }
      }
    }
    return []
  })
  const [selectedBuffer, setSelectedBuffer] = React.useState<number>(bufferDistances[0] || 2)
  const [selectedFinding, setSelectedFinding] = React.useState<FindingDisplay | null>(null)
  // Track hidden findings (for map visibility toggle)
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set())
  // Deep Research modal state
  const [deepResearchSite, setDeepResearchSite] = React.useState<DeepResearchSite | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)

  // Handle Deep Research click
  const handleDeepResearch = React.useCallback(async (finding: FindingDisplay) => {
    const siteCode = finding.metadata?.siteCode || ''

    // Extract habitats from SSCO data if available in finding
    const sscoData = finding.rawData?.ssco as SSCOResult | undefined
    let habitats = sscoData?.habitats || finding.rawData?.habitats as Array<{ habitatCode: string; habitatName: string }> | undefined

    // If no habitats in finding data, try to lookup from SSCO by site code
    if ((!habitats || habitats.length === 0) && siteCode) {
      try {
        const sscoHabitats = await getHabitatsBySiteCode(siteCode)
        if (sscoHabitats.length > 0) {
          habitats = sscoHabitats.map(h => ({
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

  // Toggle visibility of a finding on the map
  const handleToggleVisibility = React.useCallback((findingId: string) => {
    setHiddenIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(findingId)) {
        newSet.delete(findingId)
      } else {
        newSet.add(findingId)
      }
      return newSet
    })
  }, [])

  // Save to sessionStorage when results change (without rawData to avoid quota issues)
  React.useEffect(() => {
    if (searchResults.length > 0) {
      try {
        // Strip rawData and location to reduce storage size
        const cacheableResults = searchResults.map(({ rawData, location, ...rest }) => ({
          ...rest,
          locationCenter: location
            ? location.type === 'Point'
              ? location.coordinates
              : undefined
            : undefined,
        }))
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheableResults))
      } catch (e) {
        console.warn('Failed to cache sites results:', e)
        // Try to clear old caches and retry with minimal data
        try {
          const keysToRemove: string[] = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (
              key &&
              (key.startsWith('npws-') || key.startsWith('gbif-') || key.startsWith('epa-'))
            ) {
              if (key !== cacheKey) keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((k) => sessionStorage.removeItem(k))
          const minimalResults = searchResults.map(({ id, title, source, dataType, metadata }) => ({
            id,
            title,
            source,
            dataType,
            metadata: { siteCode: metadata?.siteCode, siteType: metadata?.siteType },
          }))
          sessionStorage.setItem(cacheKey, JSON.stringify(minimalResults))
        } catch {
          // Give up caching
        }
      }
    }
  }, [searchResults, cacheKey])

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

  // Get bounding box for search
  const getBoundingBox = React.useCallback(() => {
    if (!projectBoundary && !projectCenter) return null

    if (projectBoundary) {
      const coords = projectBoundary.geometry.coordinates[0]
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity

      for (const coord of coords) {
        minLng = Math.min(minLng, coord[0])
        maxLng = Math.max(maxLng, coord[0])
        minLat = Math.min(minLat, coord[1])
        maxLat = Math.max(maxLat, coord[1])
      }

      const buffer = selectedBuffer * 0.009
      return {
        minLng: minLng - buffer,
        maxLng: maxLng + buffer,
        minLat: minLat - buffer,
        maxLat: maxLat + buffer,
      }
    }

    if (projectCenter) {
      const buffer = selectedBuffer * 0.009
      return {
        minLng: projectCenter.lng - buffer,
        maxLng: projectCenter.lng + buffer,
        minLat: projectCenter.lat - buffer,
        maxLat: projectCenter.lat + buffer,
      }
    }

    return null
  }, [projectBoundary, projectCenter, selectedBuffer])

  // Perform search
  const performSearch = async () => {
    const bbox = getBoundingBox()
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
          pNHA: 'protected-sites/pnha',
        }
        const urlPath = siteTypeUrlMap[site.SITE_TYPE || ''] || 'protected-sites'
        const distance = calculateDistanceFromBoundary(site.geometry)

        return {
          // Use SITECODE + SITE_TYPE + OBJECTID for unique ID
          id: `npws-${site.SITECODE}-${site.SITE_TYPE || 'unknown'}-${site.OBJECTID || idx}`,
          source: 'npws',
          dataType: 'designated_site',
          title: site.SITENAME,
          content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
          location: site.geometry,
          isSaved: false,
          sourceUrl: `https://www.npws.ie/${urlPath}/${site.SITECODE}`,
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
      if (projectBoundary) {
        try {
          console.log('🔍 Searching SSCO with buffer:', selectedBuffer, 'km')
          const sscoResults = await findIntersectingSSCO(projectBoundary, selectedBuffer)
          console.log('🔍 SSCO Results:', sscoResults.length, 'SAC sites found')

          // Add SSCO findings
          for (const ssco of sscoResults) {
            const habitatList = ssco.habitats.map(h => `[${h.habitatCode}] ${h.habitatName}`).join(', ')

            findings.push({
              id: `ssco-${ssco.siteCode}`,
              source: 'npws',
              dataType: 'designated_site',
              title: `${ssco.siteName} - Conservation Objectives`,
              content: `Site-specific Conservation Objectives. Protected habitats: ${habitatList}${ssco.intersectionArea ? `. Overlap: ~${ssco.intersectionArea.toFixed(1)} ha` : ''}`,
              isSaved: false,
              sourceUrl: `https://www.npws.ie/protected-sites/sac/${ssco.siteCode}`,
              rawData: { ssco, habitats: ssco.habitats },
              metadata: {
                siteCode: ssco.siteCode,
                siteType: 'SSCO',
                designation: 'Site-specific Conservation Objectives',
                habitatCount: ssco.habitats.length,
                isProtected: true,
              },
            })
          }
        } catch (error) {
          console.warn('SSCO search error:', error)
          // Don't show error toast - SSCO is supplementary
        }
      }

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

  // Handle saving a finding
  // Note: finding.isSaved represents the NEW desired state (toggled from current)
  const handleSaveFinding = async (finding: FindingDisplay) => {
    // Check current saved state in our savedFindings list
    const isCurrentlySaved = savedFindings.some(
      (f) =>
        (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode ||
        f.id === finding.id
    )

    if (isCurrentlySaved) {
      // Currently saved, so user wants to remove it
      const existingFinding = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode ||
          f.id === finding.id
      )
      if (existingFinding) {
        try {
          await deleteFinding.mutateAsync(existingFinding.id)
        } catch (error) {
          console.error('Remove finding error:', error)
        }
      }
    } else {
      // Not saved yet, so save it
      try {
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
      } catch (error) {
        console.error('Save finding error:', error)
      }
    }
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
      {/* Results Panel - 340px fixed width with compact cards */}
      <div className="flex w-85 shrink-0 flex-col border-r">
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

            <Button onClick={performSearch} disabled={isSearching} className="flex-1">
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

          {searchResults.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="secondary">{searchResults.length} sites found</Badge>
              <Button variant="ghost" size="sm" onClick={performSearch} disabled={isSearching}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>
          )}
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
            emptyMessage="Search to find sites"
            hiddenIds={hiddenIds}
            onToggleVisibility={handleToggleVisibility}
          />
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="relative flex-1">
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
            zoom={11}
            boundary={projectBoundary}
            bufferDistances={bufferDistances}
            findings={searchResults
              .filter((f) => !hiddenIds.has(f.id)) // Filter out hidden findings
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
            onFindingClick={(f) =>
              setSelectedFinding(searchResults.find((r) => r.id === f.id) || null)
            }
          />

          {/* Map toggle button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-[1000]"
            onClick={onToggleMap}
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide Map
          </Button>
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
      />
    </div>
  )
}
