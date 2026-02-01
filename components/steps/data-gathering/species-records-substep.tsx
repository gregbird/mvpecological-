'use client'

import * as React from 'react'
import {
  Search,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useCreateFinding, useDeleteFinding } from '@/hooks/use-project-data'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { enrichSpeciesFromNBDC, type NBDCEnrichedSpecies } from '@/lib/external-apis/nbdc'
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

  // Cache key for sessionStorage
  const cacheKey = `species-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [enrichWithNBDC, setEnrichWithNBDC] = React.useState(true)
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
  const [enrichmentStats, setEnrichmentStats] = React.useState<{
    total: number
    enriched: number
    protected: number
    invasive: number
  } | null>(null)

  // Save to sessionStorage when results change
  React.useEffect(() => {
    if (searchResults.length > 0) sessionStorage.setItem(cacheKey, JSON.stringify(searchResults))
  }, [searchResults, cacheKey])

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

  // Enrich GBIF results with NBDC data
  const enrichResultsWithNBDC = async (findings: FindingDisplay[]): Promise<FindingDisplay[]> => {
    if (!enrichWithNBDC || findings.length === 0) return findings

    setIsEnriching(true)
    let enrichedCount = 0
    let protectedCount = 0
    let invasiveCount = 0

    const enrichedFindings = await Promise.all(
      findings.map(async (finding, index) => {
        const scientificName = finding.metadata?.scientificName
        if (!scientificName) return finding

        // Add small delay to respect NBDC rate limits
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        try {
          const nbdcData = await enrichSpeciesFromNBDC(scientificName)

          if (nbdcData) {
            enrichedCount++
            if (nbdcData.isProtected) protectedCount++
            if (nbdcData.isInvasive) invasiveCount++

            // Build enriched content
            const contentParts = [finding.content]
            if (nbdcData.designations) {
              contentParts.push(`🛡️ ${nbdcData.designations}`)
            }
            if (nbdcData.totalRecordsInIreland > 0) {
              contentParts.push(
                `📊 ${nbdcData.totalRecordsInIreland.toLocaleString()} Irish records (${nbdcData.gridSquares10km} 10km squares)`
              )
            }

            return {
              ...finding,
              title: nbdcData.commonName || finding.title,
              content: contentParts.join(' '),
              sourceUrl: nbdcData.nbdcUrl,
              metadata: {
                ...finding.metadata,
                commonName: nbdcData.commonName || finding.metadata?.commonName,
                isProtected: nbdcData.isProtected,
                isInvasive: nbdcData.isInvasive,
                isThreatened: nbdcData.isThreatened,
                nbdcTaxonId: nbdcData.taxonId,
                totalIrishRecords: nbdcData.totalRecordsInIreland,
                gridSquares10km: nbdcData.gridSquares10km,
                designations: nbdcData.designations || undefined,
                nbdcEnriched: true,
              },
              rawData: {
                ...finding.rawData,
                nbdcData,
              },
            }
          }

          return finding
        } catch (error) {
          console.warn(`Failed to enrich ${scientificName}:`, error)
          return finding
        }
      })
    )

    setEnrichmentStats({
      total: findings.length,
      enriched: enrichedCount,
      protected: protectedCount,
      invasive: invasiveCount,
    })

    setIsEnriching(false)
    return enrichedFindings
  }

  // Search GBIF and optionally enrich with NBDC
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
    setEnrichmentStats(null)

    try {
      // Step 1: Search GBIF for occurrences
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

      // Create findings from GBIF data
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
          content: `${count} record${count > 1 ? 's' : ''} found. Family: ${firstRecord.family || 'Unknown'}.`,
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

      // Step 2: Enrich with NBDC data (if enabled)
      let finalFindings = findings
      if (enrichWithNBDC && findings.length > 0) {
        toast({
          title: 'Enriching with NBDC data...',
          description: `Found ${findings.length} species from GBIF. Checking Irish protection status...`,
        })
        finalFindings = await enrichResultsWithNBDC(findings)
      }

      setSearchResults(finalFindings)

      // Show result toast
      const protectedCount = finalFindings.filter((f) => f.metadata?.isProtected).length
      const invasiveCount = finalFindings.filter((f) => f.metadata?.isInvasive).length

      let description = `Found ${finalFindings.length} species`
      if (enrichWithNBDC && enrichmentStats) {
        description += `. ${enrichmentStats.enriched} enriched with Irish data`
      }
      if (protectedCount > 0) {
        description += `. ⚠️ ${protectedCount} protected species!`
      }
      if (invasiveCount > 0) {
        description += `. 🚨 ${invasiveCount} invasive species!`
      }

      toast({
        title: 'Search complete',
        description,
      })
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch species occurrence data.',
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
        // Determine source - if enriched with NBDC, use 'nbdc' to indicate Irish data
        const source = finding.metadata?.nbdcEnriched ? 'nbdc' : 'gbif'

        await createFinding.mutateAsync({
          project_id: project.id,
          source: source as 'gbif' | 'nbdc',
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

  // Count protected and invasive species
  const protectedCount = searchResults.filter((f) => f.metadata?.isProtected).length
  const invasiveCount = searchResults.filter((f) => f.metadata?.isInvasive).length
  const enrichedCount = searchResults.filter((f) => f.metadata?.nbdcEnriched).length

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[340px] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-2 font-semibold">Species Records</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Search GBIF for species occurrences and enrich with Irish protection status from NBDC.
          </p>

          {/* Buffer Selection */}
          <div className="mb-3 flex items-center gap-2">
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

            <Button
              onClick={performSearch}
              disabled={isSearching || isEnriching}
              className="flex-1"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching GBIF...
                </>
              ) : isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Species
                </>
              )}
            </Button>
          </div>

          {/* NBDC Enrichment Toggle */}
          <div className="bg-muted/50 mb-3 flex items-center justify-between rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enrich-nbdc"
                checked={enrichWithNBDC}
                onCheckedChange={(checked) => setEnrichWithNBDC(checked === true)}
              />
              <label
                htmlFor="enrich-nbdc"
                className="flex cursor-pointer items-center gap-1.5 text-sm font-medium"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                Enrich with NBDC
              </label>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Adds Irish protection status, designation info, and national record counts from
                    the National Biodiversity Data Centre.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Results Summary */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{searchResults.length} species</Badge>
                {enrichedCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-amber-600">
                    <Sparkles className="h-3 w-3" />
                    {enrichedCount} enriched
                  </Badge>
                )}
              </div>

              {(protectedCount > 0 || invasiveCount > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {protectedCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <Shield className="h-3 w-3" />
                      {protectedCount} Protected
                    </Badge>
                  )}
                  {invasiveCount > 0 && (
                    <Badge className="gap-1 bg-orange-500 hover:bg-orange-600">
                      <AlertCircle className="h-3 w-3" />
                      {invasiveCount} Invasive
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={performSearch}
                  disabled={isSearching || isEnriching}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-hidden">
          <FindingsList
            findings={searchResults}
            savedFindings={savedFindings}
            isLoading={isSearching || isEnriching}
            onSave={handleSaveFinding}
            onViewOnMap={(f) => setSelectedFinding(f)}
            emptyMessage="Click 'Search Species' to find occurrence records"
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
              source: f.metadata?.nbdcEnriched ? 'nbdc' : ('gbif' as FindingSource),
              dataType: f.dataType as FindingType,
              title: f.title,
              content: f.content,
              location: f.location,
              isSaved: savedFindings.some(
                (sf) =>
                  (sf.raw_data as Record<string, unknown>)?.scientificName ===
                  f.metadata?.scientificName
              ),
            }))}
            selectedFinding={
              selectedFinding
                ? {
                    id: selectedFinding.id,
                    source: selectedFinding.metadata?.nbdcEnriched
                      ? 'nbdc'
                      : (selectedFinding.source as FindingSource),
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
