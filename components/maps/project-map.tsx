'use client'

import * as React from 'react'
import { Layers, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, Layer as LeafletLayer } from 'leaflet'
import type L from 'leaflet'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { DeskResearchFinding } from '@/components/desk-research/finding-card'

// Ireland center coordinates
const IRELAND_CENTER: [number, number] = [53.1424, -7.6921] // Leaflet uses [lat, lng]
const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'hybrid' | 'topo'

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  color?: string
}

interface ProjectMapProps {
  className?: string
  center?: [number, number] // [lat, lng] for Leaflet
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferDistances?: number[] // Buffer zones in km to display
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  findings?: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  visibleFindingTypes?: string[]
  onBoundaryChange?: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onFindingClick?: (finding: DeskResearchFinding) => void
  onMapClick?: () => void // Called when clicking on the map (not on a finding)
  onMapReady?: () => void
  editable?: boolean
  showControls?: boolean
}

// Buffer zone colors (matching GIS mapping step)
const BUFFER_COLORS: Record<number, string> = {
  2: '#f59e0b', // amber
  5: '#3b82f6', // blue
  10: '#8b5cf6', // purple
  15: '#ec4899', // pink
}

// Tile layer URLs (all free, no API key required)
const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; label: string }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Streets (OSM)',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: 'Satellite (ESRI)',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Labels &copy; OpenStreetMap contributors',
    label: 'Hybrid (Satellite + Labels)',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Topographic',
  },
}

// Finding type colors
const FINDING_TYPE_COLORS: Record<string, string> = {
  designated_site: '#22c55e', // Green for protected sites
  species_record: '#3b82f6', // Blue for species
  water_quality: '#06b6d4', // Cyan for water
  catchment: '#8b5cf6', // Purple for catchments
  other: '#6b7280', // Gray for other
}

// Finding source colors
const FINDING_SOURCE_COLORS: Record<string, string> = {
  npws: '#22c55e', // Green
  gbif: '#3b82f6', // Blue
  nbdc: '#8b5cf6', // Purple
  epa: '#06b6d4', // Cyan
  manual: '#f59e0b', // Amber
}

// The actual map component that uses react-leaflet
function MapComponent({
  center,
  zoom,
  boundary,
  bufferDistances,
  habitatPolygons,
  observationPoints,
  findings,
  selectedFinding,
  visibleFindingTypes,
  currentStyle,
  layers,
  onMapReady,
  onFindingClick,
  onMapClick,
  mapRef,
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferDistances?: number[]
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  findings?: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  visibleFindingTypes?: string[]
  currentStyle: MapStyle
  layers: MapLayer[]
  onMapReady?: () => void
  onFindingClick?: (finding: DeskResearchFinding) => void
  onMapClick?: () => void
  mapRef: React.MutableRefObject<LeafletMap | null>
}) {
  const {
    MapContainer,
    TileLayer,
    GeoJSON,
    CircleMarker,
    Popup,
    useMap,
    ZoomControl,
  } = require('react-leaflet')

  const boundaryLayer = layers.find((l) => l.id === 'boundary')
  const habitatLayer = layers.find((l) => l.id === 'habitats')
  const obsLayer = layers.find((l) => l.id === 'observations')
  const countiesLayer = layers.find((l) => l.id === 'counties')
  const townlandsLayer = layers.find((l) => l.id === 'townlands')
  const tileConfig = TILE_LAYERS[currentStyle]

  // County boundaries data
  const [countiesData, setCountiesData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [countiesLoading, setCountiesLoading] = React.useState(false)

  // Townlands data (loaded on-demand based on viewport)
  const [townlandsData, setTownlandsData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [townlandsLoading, setTownlandsLoading] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(zoom)
  const townlandsBboxRef = React.useRef<string | null>(null)

  // Load county boundaries when layer becomes visible
  React.useEffect(() => {
    if (countiesLayer?.visible && !countiesData && !countiesLoading) {
      setCountiesLoading(true)
      fetch('/data/counties-ireland.geojson')
        .then((res) => res.json())
        .then((data) => {
          setCountiesData(data)
          setCountiesLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load county boundaries:', err)
          setCountiesLoading(false)
        })
    }
  }, [countiesLayer?.visible, countiesData, countiesLoading])

  // Function to load townlands for a given bbox
  const loadTownlandsForBbox = React.useCallback(
    async (bbox: string) => {
      if (townlandsLoading || bbox === townlandsBboxRef.current) return

      setTownlandsLoading(true)
      townlandsBboxRef.current = bbox

      try {
        const response = await fetch(`/api/boundaries/townlands?bbox=${bbox}&limit=500`)
        if (response.ok) {
          const data = await response.json()
          setTownlandsData(data)
        } else {
          console.error('Failed to load townlands:', response.status)
        }
      } catch (err) {
        console.error('Failed to load townlands:', err)
      } finally {
        setTownlandsLoading(false)
      }
    },
    [townlandsLoading]
  )

  // Track if we've EVER fit to a boundary in this component instance
  // This ref is at MapComponent level so it persists when MapController re-renders
  const hasFitToBoundaryRef = React.useRef(false)

  // Component to fit bounds and handle zoom to selected finding
  function MapController({
    boundary,
    selectedFinding,
    onMapClick,
  }: {
    boundary?: GeoJSON.Feature<GeoJSON.Polygon>
    selectedFinding?: DeskResearchFinding | null
    onMapClick?: () => void
  }) {
    const map = useMap()

    // Handle map click to clear selection
    React.useEffect(() => {
      if (!map || !onMapClick) return

      const handleClick = () => {
        onMapClick()
      }

      map.on('click', handleClick)

      return () => {
        map.off('click', handleClick)
      }
    }, [map, onMapClick])

    // Re-enable dragging when popup closes (fixes Leaflet bug where dragging stays disabled)
    React.useEffect(() => {
      if (!map) return

      const handlePopupClose = () => {
        // Small delay to ensure popup is fully closed
        setTimeout(() => {
          if (!map.dragging.enabled()) {
            map.dragging.enable()
          }
          if (!map.scrollWheelZoom.enabled()) {
            map.scrollWheelZoom.enable()
          }
        }, 10)
      }

      map.on('popupclose', handlePopupClose)

      return () => {
        map.off('popupclose', handlePopupClose)
      }
    }, [map])

    // Fit to boundary on initial load ONLY
    // Uses hasFitToBoundaryRef from parent scope so it persists across re-renders
    React.useEffect(() => {
      if (boundary && map && !hasFitToBoundaryRef.current) {
        // Check if center is at default position (user hasn't panned)
        // IRELAND_CENTER = [53.1424, -7.6921]
        const isDefaultCenter =
          Math.abs(center[0] - 53.1424) < 0.0001 && Math.abs(center[1] - -7.6921) < 0.0001

        // Only fit bounds if we haven't done it AND center is at default
        if (isDefaultCenter) {
          const L = require('leaflet')
          const geoJsonLayer = L.geoJSON(boundary)
          const bounds = geoJsonLayer.getBounds()
          map.fitBounds(bounds, { padding: [50, 50] })
        }
        // Mark as done regardless of whether we actually fit
        hasFitToBoundaryRef.current = true
      }
    }, [boundary, map])

    // Store map reference
    React.useEffect(() => {
      if (map) {
        mapRef.current = map
        onMapReady?.()
      }
    }, [map])

    // Track last zoomed finding ID to prevent re-zoom on data changes
    const lastZoomedFindingId = React.useRef<string | null>(null)

    // Zoom to selected finding - use setView instead of flyTo to avoid animation conflicts
    // Only zoom when the finding ID changes, not when other properties change
    React.useEffect(() => {
      if (selectedFinding?.location && map) {
        // Skip if we already zoomed to this finding
        if (lastZoomedFindingId.current === selectedFinding.id) {
          return
        }
        lastZoomedFindingId.current = selectedFinding.id

        const L = require('leaflet')
        try {
          const location = selectedFinding.location

          if (location.type === 'Point') {
            const [lng, lat] = location.coordinates as [number, number]
            map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
          } else if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
            const geoJsonLayer = L.geoJSON(location)
            const bounds = geoJsonLayer.getBounds()
            map.fitBounds(bounds, { padding: [50, 50], animate: true })
          } else if (location.type === 'GeometryCollection') {
            // For GeometryCollection, zoom to first geometry
            const firstGeom = (location as GeoJSON.GeometryCollection).geometries[0]
            if (firstGeom?.type === 'Point') {
              const [lng, lat] = (firstGeom as GeoJSON.Point).coordinates
              map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
            }
          } else if (location.type === 'LineString') {
            const geoJsonLayer = L.geoJSON(location)
            const bounds = geoJsonLayer.getBounds()
            map.fitBounds(bounds, { padding: [50, 50], animate: true })
          }
        } catch (error) {
          console.warn('Error zooming to finding:', error)
        }
      } else if (!selectedFinding) {
        // Reset tracking when selection is cleared
        lastZoomedFindingId.current = null
      }
    }, [selectedFinding, map])

    // Track zoom level and load townlands when appropriate
    React.useEffect(() => {
      if (!map) return

      const handleZoomEnd = () => {
        const newZoom = map.getZoom()
        setCurrentZoom(newZoom)

        // Load townlands only at zoom 12+ and when layer is visible
        if (newZoom >= 12 && townlandsLayer?.visible) {
          const bounds = map.getBounds()
          const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
          loadTownlandsForBbox(bbox)
        }
      }

      const handleMoveEnd = () => {
        const currentZoomLevel = map.getZoom()
        // Reload townlands when panning at high zoom
        if (currentZoomLevel >= 12 && townlandsLayer?.visible) {
          const bounds = map.getBounds()
          const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
          loadTownlandsForBbox(bbox)
        }
      }

      map.on('zoomend', handleZoomEnd)
      map.on('moveend', handleMoveEnd)

      // Initial check
      handleZoomEnd()

      return () => {
        map.off('zoomend', handleZoomEnd)
        map.off('moveend', handleMoveEnd)
      }
    }, [map, townlandsLayer?.visible, loadTownlandsForBbox])

    return null
  }

  // Helper to get center point from geometry
  const getGeometryCenter = (geometry: GeoJSON.Geometry): [number, number] | null => {
    try {
      if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates as [number, number]
        return [lat, lng]
      } else if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates[0]
        const sumLat = coords.reduce((sum, c) => sum + c[1], 0)
        const sumLng = coords.reduce((sum, c) => sum + c[0], 0)
        return [sumLat / coords.length, sumLng / coords.length]
      } else if (geometry.type === 'GeometryCollection') {
        const firstGeom = geometry.geometries[0]
        if (firstGeom) return getGeometryCenter(firstGeom)
      } else if (geometry.type === 'LineString') {
        const coords = geometry.coordinates
        const midIndex = Math.floor(coords.length / 2)
        return [coords[midIndex][1], coords[midIndex][0]]
      }
    } catch {
      return null
    }
    return null
  }

  // Filter findings by visible types
  const visibleFindings = React.useMemo(() => {
    if (!findings) return []
    if (!visibleFindingTypes || visibleFindingTypes.length === 0) return findings
    return findings.filter((f) => visibleFindingTypes.includes(f.dataType))
  }, [findings, visibleFindingTypes])

  const findingsLayer = layers.find((l) => l.id === 'findings')

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full min-h-100 w-full"
      style={{ height: '100%', minHeight: '400px' }}
      zoomControl={false}
    >
      <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
      {/* Labels overlay for hybrid mode - roads, places, boundaries */}
      {currentStyle === 'hybrid' && (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          pane="overlayPane"
        />
      )}
      <MapController
        boundary={boundary}
        selectedFinding={selectedFinding}
        onMapClick={onMapClick}
      />

      {/* County Boundaries - render at bottom as reference layer */}
      {countiesLayer?.visible && countiesData && (
        <GeoJSON
          key="county-boundaries"
          data={countiesData}
          style={(feature: GeoJSON.Feature | undefined) => {
            const province = feature?.properties?.province as string | undefined
            // Province-based coloring
            const provinceColors: Record<string, string> = {
              Leinster: '#3b82f6',
              Munster: '#22c55e',
              Connacht: '#f59e0b',
              Ulster: '#ef4444',
            }
            const color = province ? provinceColors[province] || '#f97316' : '#f97316'
            return {
              color: color,
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.03,
              dashArray: '4, 4',
            }
          }}
          onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
            const props = feature.properties as Record<string, string> | null
            if (props) {
              ;(layer as L.GeoJSON).bindPopup(`
                <div style="min-width: 150px;">
                  <strong>${props.name || 'Unknown'}</strong>
                  ${props.nameIrish ? `<br/><em>${props.nameIrish}</em>` : ''}
                  <br/><span style="color: #666;">Province: ${props.province || 'Unknown'}</span>
                  <br/><small style="color: #999;">© Tailte Éireann (CC-BY 4.0)</small>
                </div>
              `)
            }
          }}
        />
      )}

      {/* Townland Boundaries - render only at high zoom levels */}
      {townlandsLayer?.visible && townlandsData && currentZoom >= 12 && (
        <GeoJSON
          key={`townlands-${townlandsBboxRef.current}`}
          data={townlandsData}
          style={() => ({
            color: '#a855f7',
            weight: 1,
            fillColor: '#a855f7',
            fillOpacity: 0.02,
            dashArray: '2, 2',
          })}
          onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
            const props = feature.properties as Record<string, string | number | null> | null
            if (props) {
              ;(layer as L.GeoJSON).bindPopup(`
                <div style="min-width: 180px;">
                  <strong>${props.name || 'Unknown Townland'}</strong>
                  ${props.nameIrish ? `<br/><em>${props.nameIrish}</em>` : ''}
                  ${props.areaHectares ? `<br/><span style="color: #666;">Area: ${props.areaHectares} ha</span>` : ''}
                  <br/><small style="color: #999;">© Tailte Éireann (CC-BY 4.0)</small>
                </div>
              `)
            }
          }}
        />
      )}

      {/* Townlands loading indicator */}
      {townlandsLayer?.visible && townlandsLoading && currentZoom >= 12 && (
        <div className="absolute top-4 right-4 z-[1000] rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Loading townlands...
        </div>
      )}

      {/* Townlands zoom hint */}
      {townlandsLayer?.visible && currentZoom < 12 && (
        <div className="absolute top-4 right-4 z-[1000] rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Zoom in to see townlands (zoom 12+)
        </div>
      )}

      {/* Buffer Zones - render largest first (underneath) */}
      {boundary &&
        bufferDistances &&
        bufferDistances.length > 0 &&
        [...bufferDistances]
          .sort((a, b) => b - a) // Largest first so they render underneath
          .map((distance) => {
            const turf = require('@turf/turf')
            try {
              const buffered = turf.buffer(boundary, distance, { units: 'kilometers' })
              const color = BUFFER_COLORS[distance] || '#6b7280'
              return (
                <GeoJSON
                  key={`buffer-${distance}`}
                  data={buffered}
                  style={{
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.05,
                    dashArray: '5, 5',
                  }}
                />
              )
            } catch (error) {
              console.warn(`Error creating buffer for ${distance}km:`, error)
              return null
            }
          })}

      {/* Project Boundary */}
      {boundary && boundaryLayer?.visible && (
        <GeoJSON
          key={`boundary-${JSON.stringify(boundary).slice(0, 100)}`}
          data={boundary}
          style={{
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.1,
          }}
        />
      )}

      {/* Habitat Polygons */}
      {habitatPolygons &&
        habitatPolygons.features.length > 0 &&
        habitatLayer?.visible &&
        habitatPolygons.features.map((feature, index) => (
          <GeoJSON
            key={`habitat-${index}`}
            data={feature}
            style={{
              color: (feature.properties?.color as string) || '#22c55e',
              weight: 2,
              fillColor: (feature.properties?.color as string) || '#22c55e',
              fillOpacity: 0.5,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{feature.properties?.fossitt_name}</h3>
                <p className="text-sm text-gray-600">{feature.properties?.fossitt_code}</p>
                {feature.properties?.condition && (
                  <p className="mt-1 text-sm">Condition: {feature.properties.condition}</p>
                )}
                {feature.properties?.area_hectares && (
                  <p className="text-sm">Area: {feature.properties.area_hectares} ha</p>
                )}
              </div>
            </Popup>
          </GeoJSON>
        ))}

      {/* Observation Points */}
      {observationPoints &&
        observationPoints.features.length > 0 &&
        obsLayer?.visible &&
        observationPoints.features.map((feature, index) => {
          const coords = (feature.geometry as GeoJSON.Point).coordinates
          const props = feature.properties
          const isProtected = props?.is_protected

          return (
            <CircleMarker
              key={`obs-${index}`}
              center={[coords[1], coords[0]]} // Leaflet uses [lat, lng]
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: isProtected ? '#ef4444' : '#22c55e',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">
                    {props?.species_name_common || props?.species_name_scientific}
                  </h3>
                  <p className="text-sm text-gray-600">{props?.species_name_scientific}</p>
                  {isProtected && (
                    <span className="rounded bg-red-100 px-1 text-xs text-red-800">Protected</span>
                  )}
                  {props?.count && <p className="mt-1 text-sm">Count: {props.count}</p>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {/* Desk Research Findings */}
      {visibleFindings.length > 0 &&
        findingsLayer?.visible &&
        visibleFindings.map((finding) => {
          if (!finding.location) return null

          const isSelected = selectedFinding?.id === finding.id
          const color = FINDING_TYPE_COLORS[finding.dataType] || FINDING_TYPE_COLORS.other
          const sourceColor = FINDING_SOURCE_COLORS[finding.source] || '#6b7280'

          // Render based on geometry type
          if (finding.location.type === 'Point') {
            const [lng, lat] = finding.location.coordinates as [number, number]
            return (
              <CircleMarker
                key={`finding-${finding.id}`}
                center={[lat, lng]}
                radius={isSelected ? 12 : 8}
                pathOptions={{
                  color: isSelected ? '#fbbf24' : '#ffffff',
                  weight: isSelected ? 3 : 2,
                  fillColor: color,
                  fillOpacity: isSelected ? 1 : 0.8,
                }}
                eventHandlers={{
                  click: (e: L.LeafletMouseEvent) => {
                    const L = require('leaflet')
                    L.DomEvent.stopPropagation(e)
                    onFindingClick?.(finding)
                  },
                }}
              >
                <Popup>
                  <div className="max-w-xs p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {finding.source.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {finding.dataType.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-semibold">{finding.title}</h3>
                    {finding.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                    )}
                    {finding.metadata?.distance !== undefined && (
                      <p className="mt-1 text-xs text-gray-500">
                        {finding.metadata.distance === 0
                          ? 'Within boundary'
                          : `${finding.metadata.distance.toFixed(1)} km from boundary`}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          } else if (
            finding.location.type === 'Polygon' ||
            finding.location.type === 'MultiPolygon'
          ) {
            return (
              <GeoJSON
                key={`finding-${finding.id}`}
                data={finding.location}
                style={{
                  color: isSelected ? '#fbbf24' : color,
                  weight: isSelected ? 3 : 2,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                }}
                eventHandlers={{
                  click: (e: L.LeafletMouseEvent) => {
                    const L = require('leaflet')
                    L.DomEvent.stopPropagation(e)
                    onFindingClick?.(finding)
                  },
                }}
              >
                <Popup>
                  <div className="max-w-xs p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {finding.source.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold">{finding.title}</h3>
                    {finding.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                    )}
                  </div>
                </Popup>
              </GeoJSON>
            )
          } else if (finding.location.type === 'LineString') {
            return (
              <GeoJSON
                key={`finding-${finding.id}`}
                data={finding.location}
                style={{
                  color: isSelected ? '#fbbf24' : color,
                  weight: isSelected ? 4 : 3,
                }}
                eventHandlers={{
                  click: (e: L.LeafletMouseEvent) => {
                    const L = require('leaflet')
                    L.DomEvent.stopPropagation(e)
                    onFindingClick?.(finding)
                  },
                }}
              >
                <Popup>
                  <div className="max-w-xs p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {finding.source.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold">{finding.title}</h3>
                    {finding.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                    )}
                  </div>
                </Popup>
              </GeoJSON>
            )
          } else if (finding.location.type === 'GeometryCollection') {
            // Render first point from GeometryCollection
            const geoms = (finding.location as GeoJSON.GeometryCollection).geometries
            const firstPoint = geoms.find((g) => g.type === 'Point') as GeoJSON.Point | undefined
            if (!firstPoint) return null

            const [lng, lat] = firstPoint.coordinates
            const recordCount = finding.metadata?.recordCount || geoms.length

            return (
              <CircleMarker
                key={`finding-${finding.id}`}
                center={[lat, lng]}
                radius={isSelected ? 12 : 8}
                pathOptions={{
                  color: isSelected ? '#fbbf24' : '#ffffff',
                  weight: isSelected ? 3 : 2,
                  fillColor: color,
                  fillOpacity: isSelected ? 1 : 0.8,
                }}
                eventHandlers={{
                  click: (e: L.LeafletMouseEvent) => {
                    const L = require('leaflet')
                    L.DomEvent.stopPropagation(e)
                    onFindingClick?.(finding)
                  },
                }}
              >
                <Popup>
                  <div className="max-w-xs p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {finding.source.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {recordCount} location{recordCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="font-semibold">{finding.title}</h3>
                    {finding.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          }

          return null
        })}
    </MapContainer>
  )
}

// Dynamic import wrapper
const DynamicMapComponent = dynamic(() => Promise.resolve(MapComponent), { ssr: false })

export function ProjectMap({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  bufferDistances,
  habitatPolygons,
  observationPoints,
  findings,
  selectedFinding,
  visibleFindingTypes,
  onBoundaryChange,
  onFindingClick,
  onMapClick,
  onMapReady,
  editable = false,
  showControls = true,
}: ProjectMapProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('streets')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const [layers, setLayers] = React.useState<MapLayer[]>([
    { id: 'boundary', name: 'Project Boundary', visible: true, color: '#ef4444' },
    { id: 'habitats', name: 'Habitat Polygons', visible: true },
    { id: 'observations', name: 'Species Observations', visible: true },
    { id: 'findings', name: 'Desk Research Findings', visible: true, color: '#3b82f6' },
    { id: 'counties', name: 'County Boundaries', visible: false, color: '#f97316' },
    { id: 'townlands', name: 'Townlands (zoom 12+)', visible: false, color: '#a855f7' },
  ])

  // Set map loaded on mount
  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
    )
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  if (!mapLoaded) {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        <div className="bg-muted/50 flex h-full min-h-100 w-full items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Map container */}
      <div className="h-full min-h-100 w-full">
        <DynamicMapComponent
          center={center}
          zoom={zoom}
          boundary={boundary}
          bufferDistances={bufferDistances}
          habitatPolygons={habitatPolygons}
          observationPoints={observationPoints}
          findings={findings}
          selectedFinding={selectedFinding}
          visibleFindingTypes={visibleFindingTypes}
          currentStyle={currentStyle}
          layers={layers}
          onMapReady={onMapReady}
          onFindingClick={onFindingClick}
          onMapClick={onMapClick}
          mapRef={mapRef}
        />
      </div>

      {/* Map controls overlay */}
      {showControls && (
        <div className="pointer-events-auto absolute top-4 left-4 z-[9999] flex flex-col gap-2">
          {/* Style selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-md">
                <Layers className="mr-2 h-4 w-4" />
                Layers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[9999]">
              <DropdownMenuLabel>Base Map</DropdownMenuLabel>
              {(Object.keys(TILE_LAYERS) as MapStyle[]).map((style) => (
                <DropdownMenuCheckboxItem
                  key={style}
                  checked={currentStyle === style}
                  onCheckedChange={() => setCurrentStyle(style)}
                >
                  {TILE_LAYERS[style].label}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Data Layers</DropdownMenuLabel>
              {layers.map((layer) => (
                <DropdownMenuCheckboxItem
                  key={layer.id}
                  checked={layer.visible}
                  onCheckedChange={() => toggleLayer(layer.id)}
                >
                  <div className="flex items-center gap-2">
                    {layer.color && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                    {layer.name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <Button variant="secondary" size="icon" className="shadow-md" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
