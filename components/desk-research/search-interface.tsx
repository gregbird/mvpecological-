'use client'

import * as React from 'react'
import { Search, Loader2, MapPin, RefreshCw, Filter, ArrowUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { FindingCard, type DeskResearchFinding, type FindingSource } from './finding-card'
import { SourceSelector } from './source-selector'
import { FindingEditModal } from './finding-edit-modal'
import { ManualFindingForm } from './manual-finding-form'
import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import {
  searchRecordsByBbox,
  searchRecordsByGridRef,
  isProtectedSpecies,
  getRedListDisplayName,
  type NBDCRecord,
} from '@/lib/external-apis/nbdc'
import {
  searchAllAquaticFeatures,
  getWFDStatusDisplayName,
  type EPARiver,
  type EPALake,
  type EPACatchment,
} from '@/lib/external-apis/epa'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import * as turf from '@turf/turf'

interface SearchInterfaceProps {
  projectId: string
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  gridReference?: string
  searchRadius?: number // km
  onFindingSave?: (finding: DeskResearchFinding) => void
  onFindingRemove?: (finding: DeskResearchFinding) => void
  onViewOnMap?: (finding: DeskResearchFinding) => void
  savedFindings?: DeskResearchFinding[]
}

export function SearchInterface({
  projectId,
  projectBoundary,
  projectCenter,
  gridReference,
  searchRadius = 2,
  onFindingSave,
  onFindingRemove,
  onViewOnMap,
  savedFindings = [],
}: SearchInterfaceProps) {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<DeskResearchFinding[]>([])
  const [selectedSources, setSelectedSources] = React.useState<FindingSource[]>(['npws', 'gbif'])
  const [activeTab, setActiveTab] = React.useState('search')
  const [customGridRef, setCustomGridRef] = React.useState(gridReference || '')
  const [customRadius, setCustomRadius] = React.useState(searchRadius)
  const [editingFinding, setEditingFinding] = React.useState<DeskResearchFinding | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)

  // Filtering and sorting state
  const [filterSource, setFilterSource] = React.useState<FindingSource | 'all'>('all')
  const [filterType, setFilterType] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<'title' | 'source' | 'type' | 'distance'>('distance')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [displayLimit, setDisplayLimit] = React.useState(20)
  const RESULTS_PER_PAGE = 20

  // Filtered and sorted results
  const filteredResults = React.useMemo(() => {
    let results = [...searchResults]

    // Apply source filter
    if (filterSource !== 'all') {
      results = results.filter((r) => r.source === filterSource)
    }

    // Apply type filter
    if (filterType !== 'all') {
      results = results.filter((r) => r.dataType === filterType)
    }

    // Apply sorting
    results.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'source':
          comparison = a.source.localeCompare(b.source)
          break
        case 'type':
          comparison = a.dataType.localeCompare(b.dataType)
          break
        case 'distance':
          // Handle undefined distances - put them at the end
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          comparison = distA - distB
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return results
  }, [searchResults, filterSource, filterType, sortBy, sortOrder])

  // Paginated results (limited by displayLimit)
  const paginatedResults = React.useMemo(() => {
    return filteredResults.slice(0, displayLimit)
  }, [filteredResults, displayLimit])

  const hasMoreResults = filteredResults.length > displayLimit

  // Reset display limit when search results change
  React.useEffect(() => {
    setDisplayLimit(RESULTS_PER_PAGE)
  }, [searchResults])

  // Get unique sources and types from results for filter options
  const availableSources = React.useMemo(() => {
    return [...new Set(searchResults.map((r) => r.source))]
  }, [searchResults])

  const availableTypes = React.useMemo(() => {
    return [...new Set(searchResults.map((r) => r.dataType))]
  }, [searchResults])

  // Calculate distance from finding location to project boundary
  const calculateDistanceFromBoundary = React.useCallback(
    (location?: GeoJSON.Geometry): number | undefined => {
      if (!location || !projectBoundary) return undefined

      try {
        // Get centroid of the finding location
        let findingPoint: GeoJSON.Feature<GeoJSON.Point>

        if (location.type === 'Point') {
          findingPoint = turf.point(location.coordinates)
        } else if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
          findingPoint = turf.centroid(location as GeoJSON.Polygon | GeoJSON.MultiPolygon)
        } else if (location.type === 'GeometryCollection') {
          // For GeometryCollection, use the first geometry
          const firstGeom = location.geometries[0]
          if (firstGeom?.type === 'Point') {
            findingPoint = turf.point(firstGeom.coordinates)
          } else {
            return undefined
          }
        } else {
          return undefined
        }

        // Calculate distance from point to boundary polygon
        // First check if point is inside polygon
        if (turf.booleanPointInPolygon(findingPoint, projectBoundary)) {
          return 0 // Inside the boundary
        }

        // Calculate distance to nearest edge
        const nearestPoint = turf.nearestPointOnLine(
          turf.polygonToLine(projectBoundary) as GeoJSON.Feature<GeoJSON.LineString>,
          findingPoint
        )

        const distance = turf.distance(findingPoint, nearestPoint, { units: 'kilometers' })
        return Math.round(distance * 100) / 100 // Round to 2 decimal places
      } catch (error) {
        console.warn('Error calculating distance:', error)
        return undefined
      }
    },
    [projectBoundary]
  )

  // Handle edit finding
  const handleEditFinding = (finding: DeskResearchFinding) => {
    setEditingFinding(finding)
    setIsEditModalOpen(true)
  }

  // Handle save from edit modal
  const handleSaveEdit = (finding: DeskResearchFinding, notes: string, _relevance?: string) => {
    const updatedFinding = { ...finding, notes }

    // Update in search results if present
    setSearchResults((prev) => prev.map((f) => (f.id === finding.id ? updatedFinding : f)))

    // If it's saved, trigger the save callback with updated notes
    if (finding.isSaved && onFindingSave) {
      onFindingSave(updatedFinding)
    }

    toast({
      title: 'Notes saved',
      description: 'Finding notes have been updated.',
    })
  }

  // Get bounding box from project boundary or center point
  const getBoundingBox = React.useCallback(() => {
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

      // Add buffer (approx km to degrees)
      const buffer = customRadius * 0.009 // ~1km = 0.009 degrees
      return {
        minLng: minLng - buffer,
        maxLng: maxLng + buffer,
        minLat: minLat - buffer,
        maxLat: maxLat + buffer,
      }
    }

    if (projectCenter) {
      const buffer = customRadius * 0.009
      return {
        minLng: projectCenter.lng - buffer,
        maxLng: projectCenter.lng + buffer,
        minLat: projectCenter.lat - buffer,
        maxLat: projectCenter.lat + buffer,
      }
    }

    return null
  }, [projectBoundary, projectCenter, customRadius])

  // Perform search across selected sources
  const performSearch = async () => {
    const bbox = getBoundingBox()

    if (!bbox && !customGridRef) {
      toast({
        variant: 'destructive',
        title: 'Search area required',
        description: 'Please define a project boundary or enter a grid reference.',
      })
      return
    }

    setIsSearching(true)
    setSearchResults([])

    const results: DeskResearchFinding[] = []

    try {
      // Search NPWS designated sites
      if (selectedSources.includes('npws') && bbox) {
        try {
          const npwsResults = await queryDesignatedSites({
            bbox: {
              minX: bbox.minLng,
              minY: bbox.minLat,
              maxX: bbox.maxLng,
              maxY: bbox.maxLat,
            },
          })

          for (const site of npwsResults) {
            const isSaved = savedFindings.some((f) => f.metadata?.siteCode === site.SITECODE)

            // Generate NPWS site URL based on site type
            // NPWS URL format: https://www.npws.ie/protected-sites/sac/002122
            const siteTypeUrlMap: Record<string, string> = {
              SAC: 'protected-sites/sac',
              SPA: 'protected-sites/spa',
              NHA: 'protected-sites/nha',
              pNHA: 'protected-sites/pnha',
            }
            const urlPath = siteTypeUrlMap[site.SITE_TYPE || ''] || 'protected-sites'

            const distance = calculateDistanceFromBoundary(site.geometry)

            results.push({
              id: `npws-${site.SITECODE}`,
              source: 'npws',
              dataType: 'designated_site',
              title: site.SITENAME,
              content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
              location: site.geometry,
              isSaved,
              sourceUrl: `https://www.npws.ie/${urlPath}/${site.SITECODE}`,
              rawData: site as unknown as Record<string, unknown>,
              metadata: {
                siteCode: site.SITECODE,
                siteType: site.SITE_TYPE,
                distance,
              },
            })
          }
        } catch (error) {
          console.error('NPWS search error:', error)
          toast({
            variant: 'destructive',
            title: 'NPWS search failed',
            description: 'Could not fetch designated sites data.',
          })
        }
      }

      // Search GBIF species records
      if (selectedSources.includes('gbif') && bbox) {
        try {
          const gbifResults = await searchOccurrences({
            bbox: {
              minLat: bbox.minLat,
              maxLat: bbox.maxLat,
              minLng: bbox.minLng,
              maxLng: bbox.maxLng,
            },
            limit: 100,
            year: '2015,2025', // Last 10 years
          })

          // Group by species
          const speciesGroups = new Map<
            string,
            { count: number; records: typeof gbifResults.results }
          >()

          for (const record of gbifResults.results) {
            const key = record.scientificName || 'Unknown'
            if (!speciesGroups.has(key)) {
              speciesGroups.set(key, { count: 0, records: [] })
            }
            const group = speciesGroups.get(key)!
            group.count++
            group.records.push(record)
          }

          // Create findings for each species
          for (const [scientificName, { count, records }] of speciesGroups) {
            const firstRecord = records[0]
            const isSaved = savedFindings.some((f) => f.metadata?.scientificName === scientificName)

            // Create location geometry - use GeometryCollection for multiple points
            let locationGeometry: GeoJSON.Geometry
            if (count === 1) {
              locationGeometry = {
                type: 'Point',
                coordinates: [firstRecord.decimalLongitude, firstRecord.decimalLatitude],
              }
            } else {
              // Convert multiple records to a GeometryCollection of Points
              const geometries: GeoJSON.Point[] = records
                .filter((r) => r.decimalLatitude && r.decimalLongitude)
                .map((r) => ({
                  type: 'Point' as const,
                  coordinates: [r.decimalLongitude, r.decimalLatitude],
                }))
              locationGeometry = {
                type: 'GeometryCollection',
                geometries,
              }
            }

            const distance = calculateDistanceFromBoundary(locationGeometry)

            results.push({
              id: `gbif-${scientificName.replace(/\s+/g, '-')}`,
              source: 'gbif',
              dataType: 'species_record',
              title: firstRecord.vernacularName || scientificName,
              content: `${count} record${count > 1 ? 's' : ''} found within search area. Family: ${firstRecord.family || 'Unknown'}.`,
              location: locationGeometry,
              isSaved,
              sourceUrl: firstRecord.speciesKey
                ? `https://www.gbif.org/species/${firstRecord.speciesKey}`
                : `https://www.gbif.org/occurrence/search?scientificName=${encodeURIComponent(scientificName)}`,
              rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
              metadata: {
                scientificName,
                commonName: firstRecord.vernacularName,
                recordCount: count,
                recordDate: firstRecord.eventDate,
                distance,
              },
            })
          }
        } catch (error) {
          console.error('GBIF search error:', error)
          toast({
            variant: 'destructive',
            title: 'GBIF search failed',
            description: 'Could not fetch species occurrence data.',
          })
        }
      }

      // Search NBDC Irish biodiversity records
      if (selectedSources.includes('nbdc') && bbox) {
        try {
          const nbdcResults = await searchRecordsByBbox(
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

          // Group by species (Latin name)
          const speciesGroups = new Map<string, { count: number; records: NBDCRecord[] }>()

          for (const record of nbdcResults) {
            const key = record.LatinName || 'Unknown'
            if (!speciesGroups.has(key)) {
              speciesGroups.set(key, { count: 0, records: [] })
            }
            const group = speciesGroups.get(key)!
            group.count++
            group.records.push(record)
          }

          // Create findings for each species
          for (const [latinName, { count, records }] of speciesGroups) {
            const firstRecord = records[0]
            const isSaved = savedFindings.some(
              (f) => f.metadata?.scientificName === latinName && f.source === 'nbdc'
            )

            // Create location geometry
            let locationGeometry: GeoJSON.Geometry
            if (count === 1 && firstRecord.Latitude && firstRecord.Longitude) {
              locationGeometry = {
                type: 'Point',
                coordinates: [firstRecord.Longitude, firstRecord.Latitude],
              }
            } else {
              // Convert multiple records to a GeometryCollection of Points
              const geometries: GeoJSON.Point[] = records
                .filter((r) => r.Latitude && r.Longitude)
                .map((r) => ({
                  type: 'Point' as const,
                  coordinates: [r.Longitude!, r.Latitude!],
                }))
              locationGeometry = {
                type: 'GeometryCollection',
                geometries,
              }
            }

            const distance = calculateDistanceFromBoundary(locationGeometry)

            results.push({
              id: `nbdc-${latinName.replace(/\s+/g, '-')}-${firstRecord.TaxonId}`,
              source: 'nbdc',
              dataType: 'species_record',
              title: firstRecord.CommonName || latinName,
              content: `${count} Irish record${count > 1 ? 's' : ''} found. Taxon group: ${firstRecord.TaxonGroup || 'Unknown'}. ${firstRecord.GridReference ? `Grid ref: ${firstRecord.GridReference}` : ''}`,
              location: locationGeometry,
              isSaved,
              sourceUrl: `https://maps.biodiversityireland.ie/Species/${firstRecord.TaxonId}`,
              rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
              metadata: {
                scientificName: latinName,
                commonName: firstRecord.CommonName,
                recordCount: count,
                recordDate: firstRecord.Date,
                distance,
              },
            })
          }
        } catch (error) {
          console.error('NBDC search error:', error)
          toast({
            variant: 'destructive',
            title: 'NBDC search failed',
            description: 'Could not fetch Irish biodiversity records.',
          })
        }
      }

      // Search EPA water features
      if (selectedSources.includes('epa') && bbox) {
        try {
          const epaResults = await searchAllAquaticFeatures({
            bbox: {
              minLat: bbox.minLat,
              maxLat: bbox.maxLat,
              minLng: bbox.minLng,
              maxLng: bbox.maxLng,
            },
            limit: 50,
          })

          // Add rivers
          for (const river of epaResults.rivers) {
            const isSaved = savedFindings.some(
              (f) => f.metadata?.siteCode === river.RiverCode && f.source === 'epa'
            )
            const distance = calculateDistanceFromBoundary(river.geometry)

            results.push({
              id: `epa-river-${river.RiverCode || river.OBJECTID}`,
              source: 'epa',
              dataType: 'water_quality',
              title: river.RiverName,
              content: `River${river.Length_km ? ` (${river.Length_km.toFixed(1)} km)` : ''}. ${river.CatchmentName ? `Catchment: ${river.CatchmentName}.` : ''} ${river.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(river.WFD_Status)}` : ''}`,
              location: river.geometry,
              isSaved,
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
          for (const lake of epaResults.lakes) {
            const isSaved = savedFindings.some(
              (f) => f.metadata?.siteCode === lake.LakeCode && f.source === 'epa'
            )
            const distance = calculateDistanceFromBoundary(lake.geometry)

            results.push({
              id: `epa-lake-${lake.LakeCode || lake.OBJECTID}`,
              source: 'epa',
              dataType: 'water_quality',
              title: lake.LakeName,
              content: `Lake${lake.Area_ha ? ` (${lake.Area_ha.toFixed(1)} ha)` : ''}. ${lake.CatchmentName ? `Catchment: ${lake.CatchmentName}.` : ''} ${lake.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(lake.WFD_Status)}` : ''}`,
              location: lake.geometry,
              isSaved,
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
          for (const catchment of epaResults.catchments) {
            const isSaved = savedFindings.some(
              (f) => f.metadata?.siteCode === catchment.CatchmentId && f.source === 'epa'
            )
            const distance = calculateDistanceFromBoundary(catchment.geometry)

            results.push({
              id: `epa-catchment-${catchment.CatchmentId || catchment.OBJECTID}`,
              source: 'epa',
              dataType: 'catchment',
              title: catchment.CatchmentName,
              content: `Catchment${catchment.Area_km2 ? ` (${catchment.Area_km2.toFixed(1)} km²)` : ''}. ${catchment.RiverBasinDistrict ? `River Basin District: ${catchment.RiverBasinDistrict}` : ''}`,
              location: catchment.geometry,
              isSaved,
              sourceUrl: `https://www.catchments.ie/data/#/catchment/${catchment.CatchmentId}`,
              rawData: catchment as unknown as Record<string, unknown>,
              metadata: {
                siteCode: catchment.CatchmentId,
                siteType: 'Catchment',
                distance,
              },
            })
          }
        } catch (error) {
          console.error('EPA search error:', error)
          toast({
            variant: 'destructive',
            title: 'EPA search failed',
            description: 'Could not fetch water quality and catchment data.',
          })
        }
      }

      // Search FPO (Flora Protection Order) protected species
      if (selectedSources.includes('fpo')) {
        try {
          // Get grid reference from project center or custom input
          const gridRefToSearch = customGridRef || calculatedGridRef

          if (gridRefToSearch) {
            const fpoResults = await searchFPOByGridRef(gridRefToSearch)

            // Group by species
            const speciesGroups = new Map<string, { count: number; records: FPORecord[] }>()

            for (const record of fpoResults) {
              const key = record.latinName
              if (!speciesGroups.has(key)) {
                speciesGroups.set(key, { count: 0, records: [] })
              }
              const group = speciesGroups.get(key)!
              group.count++
              group.records.push(record)
            }

            // Create findings for each species
            for (const [latinName, { count, records }] of speciesGroups) {
              const firstRecord = records[0]
              const isSaved = savedFindings.some(
                (f) => f.metadata?.scientificName === latinName && f.source === 'fpo'
              )

              // FPO records have grid reference but not precise coordinates
              // So we don't have location geometry for now
              const locations = [...new Set(records.map((r) => r.locationName).filter(Boolean))]

              results.push({
                id: `fpo-${latinName.replace(/\s+/g, '-')}`,
                source: 'fpo',
                dataType: 'species_record',
                title: `${firstRecord.commonName || latinName} (Protected)`,
                content: `${count} FPO record${count > 1 ? 's' : ''} in this hectad. ${firstRecord.isSensitive ? '⚠️ Sensitive species.' : ''} ${locations.length > 0 ? `Recorded at: ${locations.slice(0, 3).join(', ')}${locations.length > 3 ? '...' : ''}` : ''}`,
                isSaved,
                sourceUrl: 'https://www.npws.ie/legislation/irish-law/flora-protection-order',
                rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
                metadata: {
                  scientificName: latinName,
                  commonName: firstRecord.commonName,
                  recordCount: count,
                  isProtected: true,
                  designation: 'Flora Protection Order 2022',
                },
              })
            }
          }
        } catch (error) {
          console.error('FPO search error:', error)
          toast({
            variant: 'destructive',
            title: 'FPO search failed',
            description: 'Could not fetch Flora Protection Order records.',
          })
        }
      }

      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try expanding your search radius or selecting more sources.',
        })
      } else {
        toast({
          title: 'Search complete',
          description: `Found ${results.length} result${results.length > 1 ? 's' : ''}.`,
        })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'An error occurred while searching.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Calculate grid reference from center if available
  const calculatedGridRef = React.useMemo(() => {
    if (projectCenter) {
      try {
        return wgs84ToGridRef(projectCenter.lat, projectCenter.lng, 4)
      } catch {
        return null
      }
    }
    return null
  }, [projectCenter])

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">
            Search
            {searchResults.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {searchResults.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved">
            Saved
            {savedFindings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {savedFindings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data Sources */}
              <div className="space-y-2">
                <Label>Data Sources</Label>
                <SourceSelector
                  selectedSources={selectedSources}
                  onSourcesChange={setSelectedSources}
                  disabled={isSearching}
                />
              </div>

              {/* Search Area */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gridRef">Grid Reference</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gridRef"
                      placeholder={calculatedGridRef || 'e.g., N 1234 5678'}
                      value={customGridRef}
                      onChange={(e) => setCustomGridRef(e.target.value)}
                      disabled={isSearching}
                    />
                    {calculatedGridRef && !customGridRef && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCustomGridRef(calculatedGridRef)}
                        title="Use calculated grid reference"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radius">Search Radius (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    min={0.5}
                    max={15}
                    step={0.5}
                    value={customRadius}
                    onChange={(e) => setCustomRadius(parseFloat(e.target.value) || 2)}
                    disabled={isSearching}
                  />
                </div>
              </div>

              {/* Search status */}
              {projectBoundary && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>Searching within project boundary + {customRadius}km buffer</span>
                </div>
              )}

              <Separator />

              {/* Search Button */}
              <Button
                onClick={performSearch}
                disabled={isSearching || selectedSources.length === 0}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Selected Sources
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Results ({filteredResults.length}
                  {filteredResults.length !== searchResults.length && ` of ${searchResults.length}`}
                  )
                </h3>
                <Button variant="ghost" size="sm" onClick={performSearch} disabled={isSearching}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              {/* Filters and Sorting */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Filter className="text-muted-foreground h-4 w-4" />

                {/* Source Filter */}
                <Select
                  value={filterSource}
                  onValueChange={(v) => setFilterSource(v as FindingSource | 'all')}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {availableSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {availableTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6" />

                <ArrowUpDown className="text-muted-foreground h-4 w-4" />

                {/* Sort By */}
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as 'title' | 'source' | 'type' | 'distance')}
                >
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Order */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortBy === 'distance'
                    ? sortOrder === 'asc'
                      ? 'Nearest'
                      : 'Farthest'
                    : sortOrder === 'asc'
                      ? 'A-Z'
                      : 'Z-A'}
                </Button>
              </div>

              <ScrollArea className="h-125">
                <div className="space-y-3 pr-4">
                  {paginatedResults.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onSave={onFindingSave}
                      onViewOnMap={onViewOnMap}
                    />
                  ))}

                  {/* Load More Button */}
                  {hasMoreResults && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setDisplayLimit((prev) => prev + RESULTS_PER_PAGE)}
                      >
                        Load More ({filteredResults.length - displayLimit} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {/* Manual Finding Button */}
          <div className="flex justify-end">
            <ManualFindingForm
              projectId={projectId}
              onSave={(finding) => {
                if (onFindingSave) {
                  onFindingSave(finding)
                }
              }}
            />
          </div>

          {savedFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 font-semibold">No saved findings</h3>
              <p className="text-muted-foreground max-w-md">
                Search for data and save relevant findings to include them in your desk research
                report. You can also add manual findings using the button above.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {savedFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onSave={onFindingSave}
                    onRemove={onFindingRemove}
                    onEdit={() => handleEditFinding(finding)}
                    onViewOnMap={onViewOnMap}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <FindingEditModal
        finding={editingFinding}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
