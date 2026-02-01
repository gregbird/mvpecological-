'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, RefreshCw, AlertCircle, Droplets } from 'lucide-react'
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
import { searchAllAquaticFeatures, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import { FindingsList, type FindingDisplay } from './findings-list'
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

interface AquaticFeaturesSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
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
}: AquaticFeaturesSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()

  // Cache key for sessionStorage
  const cacheKey = `epa-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<FindingDisplay[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached)
        try {
          return JSON.parse(cached)
        } catch {
          return []
        }
    }
    return []
  })
  const [selectedBuffer, setSelectedBuffer] = React.useState<number>(bufferDistances[0] || 2)
  const [selectedFinding, setSelectedFinding] = React.useState<FindingDisplay | null>(null)

  // Save to sessionStorage when results change (without rawData to avoid quota issues)
  React.useEffect(() => {
    if (searchResults.length > 0) {
      try {
        // Strip rawData to reduce storage size
        const cacheableResults = searchResults.map(({ rawData, ...rest }) => rest)
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheableResults))
      } catch (e) {
        console.warn('Failed to cache aquatic results:', e)
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
          sourceUrl: `https://www.catchments.ie/data/#/waterbody/${river.RiverCode}`,
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
          sourceUrl: `https://www.catchments.ie/data/#/waterbody/${lake.LakeCode}`,
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
          sourceUrl: `https://www.catchments.ie/data/#/catchment/${catchment.CatchmentId}`,
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

  // Handle saving a finding
  const handleSaveFinding = async (finding: FindingDisplay) => {
    if (finding.isSaved) {
      const existingFinding = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode &&
          f.source === 'epa'
      )
      if (existingFinding) {
        try {
          await deleteFinding.mutateAsync(existingFinding.id)
          toast({ title: 'Finding removed' })
        } catch (error) {
          console.error('Remove finding error:', error)
          toast({
            variant: 'destructive',
            title: 'Error removing finding',
            description: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } else {
      try {
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
        toast({ title: 'Finding saved' })
      } catch (error) {
        console.error('Save finding error:', error)
        toast({
          variant: 'destructive',
          title: 'Error saving finding',
          description: error instanceof Error ? error.message : 'Unknown error',
        })
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

  // Count by type
  const riverCount = searchResults.filter((f) => f.metadata?.siteType === 'River').length
  const lakeCount = searchResults.filter((f) => f.metadata?.siteType === 'Lake').length
  const catchmentCount = searchResults.filter((f) => f.metadata?.siteType === 'Catchment').length

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[340px] shrink-0 flex-col border-r">
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
              <SelectTrigger className="w-[120px]">
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
                  Search EPA
                </>
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{searchResults.length} features found</Badge>
                <Button variant="ghost" size="sm" onClick={performSearch} disabled={isSearching}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {riverCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {riverCount} river{riverCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {lakeCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {lakeCount} lake{lakeCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {catchmentCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {catchmentCount} catchment{catchmentCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
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
            emptyMessage="Search to find features"
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
            findings={searchResults.map((f) => ({
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
            onFindingClick={(f) =>
              setSelectedFinding(searchResults.find((r) => r.id === f.id) || null)
            }
          />

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

      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}
    </div>
  )
}
