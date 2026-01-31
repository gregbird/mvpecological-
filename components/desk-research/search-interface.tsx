'use client'

import * as React from 'react'
import { Search, Loader2, MapPin, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { FindingCard, type DeskResearchFinding, type FindingSource } from './finding-card'
import { SourceSelector } from './source-selector'
import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'

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

            results.push({
              id: `npws-${site.SITECODE}`,
              source: 'npws',
              dataType: 'designated_site',
              title: site.SITENAME,
              content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
              location: site.geometry,
              isSaved,
              rawData: site as unknown as Record<string, unknown>,
              metadata: {
                siteCode: site.SITECODE,
                siteType: site.SITE_TYPE,
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

            results.push({
              id: `gbif-${scientificName.replace(/\s+/g, '-')}`,
              source: 'gbif',
              dataType: 'species_record',
              title: firstRecord.vernacularName || scientificName,
              content: `${count} record${count > 1 ? 's' : ''} found within search area. Family: ${firstRecord.family || 'Unknown'}.`,
              location: locationGeometry,
              isSaved,
              rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
              metadata: {
                scientificName,
                commonName: firstRecord.vernacularName,
                recordCount: count,
                recordDate: firstRecord.eventDate,
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
                <h3 className="font-semibold">Results ({searchResults.length})</h3>
                <Button variant="ghost" size="sm" onClick={performSearch} disabled={isSearching}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-125">
                <div className="space-y-3 pr-4">
                  {searchResults.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onSave={onFindingSave}
                      onViewOnMap={onViewOnMap}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 font-semibold">No saved findings</h3>
              <p className="text-muted-foreground max-w-md">
                Search for data and save relevant findings to include them in your desk research
                report.
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
                    onEdit={() => {
                      // TODO: Open edit modal
                    }}
                    onViewOnMap={onViewOnMap}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
