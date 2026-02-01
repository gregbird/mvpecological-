'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, RefreshCw, AlertCircle, Shield } from 'lucide-react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useCreateFinding, useDeleteFinding } from '@/hooks/use-project-data'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { searchRecordsByBbox, isProtectedSpecies, type NBDCRecord } from '@/lib/external-apis/nbdc'
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

interface SpeciesRecordsSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
}

export function SpeciesRecordsSubStep({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
  userId,
  savedFindings,
  showMap,
  onToggleMap,
}: SpeciesRecordsSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()

  const [activeTab, setActiveTab] = React.useState<'gbif' | 'nbdc'>('gbif')
  const [isSearching, setIsSearching] = React.useState(false)
  const [gbifResults, setGbifResults] = React.useState<FindingDisplay[]>([])
  const [nbdcResults, setNbdcResults] = React.useState<FindingDisplay[]>([])
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
        } else if (location.type === 'GeometryCollection') {
          const firstGeom = location.geometries[0]
          if (firstGeom?.type === 'Point') {
            findingPoint = turf.point(firstGeom.coordinates)
          } else {
            return undefined
          }
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

  // Search GBIF
  const searchGBIF = async () => {
    const bbox = getBoundingBox()
    if (!bbox) return

    setIsSearching(true)
    setGbifResults([])

    try {
      const results = await searchOccurrences({
        bbox: {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        limit: 100,
        year: '2015,2025',
      })

      // Group by species
      const speciesGroups = new Map<string, { count: number; records: typeof results.results }>()

      for (const record of results.results) {
        const key = record.scientificName || 'Unknown'
        if (!speciesGroups.has(key)) {
          speciesGroups.set(key, { count: 0, records: [] })
        }
        const group = speciesGroups.get(key)!
        group.count++
        group.records.push(record)
      }

      // Create findings
      const findings: FindingDisplay[] = []
      for (const [scientificName, { count, records }] of speciesGroups) {
        const firstRecord = records[0]

        let locationGeometry: GeoJSON.Geometry
        if (count === 1) {
          locationGeometry = {
            type: 'Point',
            coordinates: [firstRecord.decimalLongitude, firstRecord.decimalLatitude],
          }
        } else {
          const geometries: GeoJSON.Point[] = records
            .filter((r) => r.decimalLatitude && r.decimalLongitude)
            .map((r) => ({
              type: 'Point' as const,
              coordinates: [r.decimalLongitude, r.decimalLatitude],
            }))
          locationGeometry = { type: 'GeometryCollection', geometries }
        }

        const distance = calculateDistanceFromBoundary(locationGeometry)

        findings.push({
          id: `gbif-${scientificName.replace(/\s+/g, '-')}`,
          source: 'gbif',
          dataType: 'species_record',
          title: firstRecord.vernacularName || scientificName,
          content: `${count} record${count > 1 ? 's' : ''} found within search area. Family: ${firstRecord.family || 'Unknown'}.`,
          location: locationGeometry,
          isSaved: false,
          sourceUrl: firstRecord.speciesKey
            ? `https://www.gbif.org/species/${firstRecord.speciesKey}`
            : `https://www.gbif.org/occurrence/search?scientificName=${encodeURIComponent(scientificName)}`,
          rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
          metadata: {
            scientificName,
            commonName: firstRecord.vernacularName,
            recordCount: count,
            distance,
          },
        })
      }

      setGbifResults(findings)
      toast({
        title: 'GBIF search complete',
        description: `Found ${findings.length} species.`,
      })
    } catch (error) {
      console.error('GBIF search error:', error)
      toast({
        variant: 'destructive',
        title: 'GBIF search failed',
        description: 'Could not fetch species occurrence data.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Search NBDC
  const searchNBDC = async () => {
    const bbox = getBoundingBox()
    if (!bbox) return

    setIsSearching(true)
    setNbdcResults([])

    try {
      const results = await searchRecordsByBbox(
        {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        {
          startYear: 2015,
          endYear: new Date().getFullYear(),
          limit: 100,
        }
      )

      // Group by species
      const speciesGroups = new Map<string, { count: number; records: NBDCRecord[] }>()

      for (const record of results) {
        const key = record.LatinName || 'Unknown'
        if (!speciesGroups.has(key)) {
          speciesGroups.set(key, { count: 0, records: [] })
        }
        const group = speciesGroups.get(key)!
        group.count++
        group.records.push(record)
      }

      // Create findings
      const findings: FindingDisplay[] = []
      for (const [latinName, { count, records }] of speciesGroups) {
        const firstRecord = records[0]
        const protectedStatus = isProtectedSpecies(firstRecord)

        let locationGeometry: GeoJSON.Geometry
        if (count === 1 && firstRecord.Latitude && firstRecord.Longitude) {
          locationGeometry = {
            type: 'Point',
            coordinates: [firstRecord.Longitude, firstRecord.Latitude],
          }
        } else {
          const geometries: GeoJSON.Point[] = records
            .filter((r) => r.Latitude && r.Longitude)
            .map((r) => ({
              type: 'Point' as const,
              coordinates: [r.Longitude!, r.Latitude!],
            }))
          locationGeometry = { type: 'GeometryCollection', geometries }
        }

        const distance = calculateDistanceFromBoundary(locationGeometry)

        findings.push({
          id: `nbdc-${latinName.replace(/\s+/g, '-')}-${firstRecord.TaxonId}`,
          source: 'nbdc',
          dataType: 'species_record',
          title: firstRecord.CommonName || latinName,
          content: `${count} Irish record${count > 1 ? 's' : ''} found. Taxon group: ${firstRecord.TaxonGroup || 'Unknown'}.`,
          location: locationGeometry,
          isSaved: false,
          sourceUrl: `https://maps.biodiversityireland.ie/Species/${firstRecord.TaxonId}`,
          rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
          metadata: {
            scientificName: latinName,
            commonName: firstRecord.CommonName,
            recordCount: count,
            distance,
            isProtected: protectedStatus,
          },
        })
      }

      setNbdcResults(findings)
      toast({
        title: 'NBDC search complete',
        description: `Found ${findings.length} species.`,
      })
    } catch (error) {
      console.error('NBDC search error:', error)
      toast({
        variant: 'destructive',
        title: 'NBDC search failed',
        description: 'Could not fetch Irish biodiversity records.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Perform search based on active tab
  const performSearch = () => {
    if (activeTab === 'gbif') {
      searchGBIF()
    } else {
      searchNBDC()
    }
  }

  // Handle saving a finding
  const handleSaveFinding = async (finding: FindingDisplay) => {
    if (finding.isSaved) {
      const existingFinding = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.scientificName ===
            finding.metadata?.scientificName && f.source === finding.source
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
      try {
        await createFinding.mutateAsync({
          project_id: project.id,
          source: finding.source as 'gbif' | 'nbdc',
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

  const currentResults = activeTab === 'gbif' ? gbifResults : nbdcResults

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-96 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-3 font-semibold">Species Records</h3>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'gbif' | 'nbdc')}>
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="gbif" className="flex-1">
                GBIF
                {gbifResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">
                    {gbifResults.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="nbdc" className="flex-1">
                NBDC
                {nbdcResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">
                    {nbdcResults.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gbif" className="m-0">
              <p className="text-muted-foreground mb-3 text-sm">
                Global species occurrence records from GBIF.
              </p>
            </TabsContent>
            <TabsContent value="nbdc" className="m-0">
              <p className="text-muted-foreground mb-3 text-sm">
                Irish biodiversity records with protected species flags.
              </p>
            </TabsContent>
          </Tabs>

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
                  Search {activeTab.toUpperCase()}
                </>
              )}
            </Button>
          </div>

          {currentResults.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{currentResults.length} species</Badge>
                {currentResults.some((f) => f.metadata?.isProtected) && (
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Protected
                  </Badge>
                )}
              </div>
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
            findings={currentResults}
            savedFindings={savedFindings}
            isLoading={isSearching}
            onSave={handleSaveFinding}
            onViewOnMap={(f) => setSelectedFinding(f)}
            emptyMessage={`Click 'Search ${activeTab.toUpperCase()}' to find species records`}
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
            findings={currentResults.map((f) => ({
              id: f.id,
              source: f.source as FindingSource,
              dataType: f.dataType as FindingType,
              title: f.title,
              content: f.content,
              location: f.location,
              isSaved: savedFindings.some(
                (sf) =>
                  (sf.raw_data as Record<string, unknown>)?.scientificName ===
                    f.metadata?.scientificName && sf.source === f.source
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
              setSelectedFinding(currentResults.find((r) => r.id === f.id) || null)
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
