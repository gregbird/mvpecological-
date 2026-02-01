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

  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<FindingDisplay[]>([])
  const [selectedBuffer, setSelectedBuffer] = React.useState<number>(bufferDistances[0] || 2)
  const [selectedFinding, setSelectedFinding] = React.useState<FindingDisplay | null>(null)

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

      const findings: FindingDisplay[] = results.map((site) => {
        const siteTypeUrlMap: Record<string, string> = {
          SAC: 'ProtectedSites/SAC',
          SPA: 'ProtectedSites/SPA',
          NHA: 'ProtectedSites/NHA',
          pNHA: 'ProtectedSites/pNHA',
        }
        const urlPath = siteTypeUrlMap[site.SITE_TYPE || ''] || 'ProtectedSites'
        const distance = calculateDistanceFromBoundary(site.geometry)

        return {
          id: `npws-${site.SITECODE}`,
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

      setSearchResults(findings)

      if (findings.length === 0) {
        toast({
          title: 'No sites found',
          description: `No designated sites found within ${selectedBuffer}km buffer.`,
        })
      } else {
        toast({
          title: 'Search complete',
          description: `Found ${findings.length} designated site${findings.length > 1 ? 's' : ''}.`,
        })
      }
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
  const handleSaveFinding = async (finding: FindingDisplay) => {
    if (finding.isSaved) {
      // Find and delete
      const existingFinding = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode ||
          f.id === finding.id
      )
      if (existingFinding) {
        try {
          await deleteFinding.mutateAsync(existingFinding.id)
          toast({ title: 'Finding removed' })
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error removing finding' })
        }
      }
    } else {
      // Save
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
        toast({ title: 'Finding saved' })
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error saving finding' })
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
      {/* Results Panel */}
      <div className="flex w-96 flex-col border-r">
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
            emptyMessage="Click 'Search NPWS' to find designated sites"
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
            findings={searchResults.map((f) => ({
              id: f.id,
              source: f.source as FindingSource,
              dataType: f.dataType as FindingType,
              title: f.title,
              content: f.content,
              location: f.location,
              isSaved: savedFindings.some(
                (sf) => (sf.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode
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
    </div>
  )
}
