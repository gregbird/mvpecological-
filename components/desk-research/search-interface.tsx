'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { FindingCard, type DeskResearchFinding, type FindingSource } from './finding-card'
import { FindingEditModal } from './finding-edit-modal'
import { ManualFindingForm } from './manual-finding-form'
import { SearchControls } from './search-controls'
import { SearchResultsList } from './search-results-list'
import { useSearchState } from '@/hooks/desk-research/use-search-state'
import { searchNPWS, searchGBIF, searchNBDC, searchEPA, searchFPO } from './search-sources'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
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

  const searchState = useSearchState(searchResults)

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

  const handleEditFinding = (finding: DeskResearchFinding) => {
    setEditingFinding(finding)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = (finding: DeskResearchFinding, notes: string, _relevance?: string) => {
    const updatedFinding = { ...finding, notes }
    setSearchResults((prev) => prev.map((f) => (f.id === finding.id ? updatedFinding : f)))
    if (finding.isSaved && onFindingSave) {
      onFindingSave(updatedFinding)
    }
  }

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

      const buffer = customRadius * 0.009
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
      if (selectedSources.includes('npws') && bbox) {
        await searchNPWS(bbox, results, savedFindings, calculateDistanceFromBoundary, toast)
      }
      if (selectedSources.includes('gbif') && bbox) {
        await searchGBIF(bbox, results, savedFindings, calculateDistanceFromBoundary, toast)
      }
      if (selectedSources.includes('nbdc') && bbox) {
        await searchNBDC(bbox, results, savedFindings, calculateDistanceFromBoundary, toast)
      }
      if (selectedSources.includes('epa') && bbox) {
        await searchEPA(bbox, results, savedFindings, calculateDistanceFromBoundary, toast)
      }
      if (selectedSources.includes('fpo')) {
        await searchFPO(customGridRef || calculatedGridRef, results, savedFindings, toast)
      }
      setSearchResults(results)
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
          <SearchControls
            selectedSources={selectedSources}
            onSourcesChange={setSelectedSources}
            isSearching={isSearching}
            customGridRef={customGridRef}
            onCustomGridRefChange={setCustomGridRef}
            calculatedGridRef={calculatedGridRef}
            customRadius={customRadius}
            onCustomRadiusChange={setCustomRadius}
            hasProjectBoundary={!!projectBoundary}
            onSearch={performSearch}
          />

          <SearchResultsList
            searchResults={searchResults}
            filteredResults={searchState.filteredResults}
            paginatedResults={searchState.paginatedResults}
            hasMoreResults={searchState.hasMoreResults}
            remainingCount={searchState.remainingCount}
            isSearching={isSearching}
            filterSource={searchState.filterSource}
            onFilterSourceChange={searchState.setFilterSource}
            filterType={searchState.filterType}
            onFilterTypeChange={searchState.setFilterType}
            availableSources={searchState.availableSources}
            availableTypes={searchState.availableTypes}
            sortBy={searchState.sortBy}
            onSortByChange={searchState.setSortBy}
            sortOrder={searchState.sortOrder}
            onToggleSortOrder={searchState.toggleSortOrder}
            onRefresh={performSearch}
            onLoadMore={searchState.loadMore}
            onFindingSave={onFindingSave}
            onViewOnMap={onViewOnMap}
          />
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
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
            <ScrollArea className="h-150">
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

      <FindingEditModal
        finding={editingFinding}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
