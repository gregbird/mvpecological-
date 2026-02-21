'use client'

import * as React from 'react'
import { Info, Layers, Maximize2, Minimize2, Pentagon, Square } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'
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
import {
  IRELAND_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYERS,
  FINDING_TYPE_COLORS,
} from '@/lib/config/map-constants'
export type { MapStyle } from '@/lib/config/map-constants'
import type { MapStyle } from '@/lib/config/map-constants'
import { MeasureControl } from './measure-control'
import { useNPWSLayers } from './npws-layer-overlay'
import { useEPALayers } from './epa-layer-overlay'
import { useAdministrativeBoundaries } from '@/hooks/maps/use-administrative-boundaries'

interface BufferColorConfig {
  fill: string
  stroke: string
  name: string
}

// Finding marker interface for displaying desk research findings on map
export interface FindingMarker {
  id: string
  title: string
  dataType: 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
  location: { coordinates: [number, number] } | null // [lng, lat] GeoJSON format
  isProtected?: boolean
  source?: string
}

/** Saved habitat polygon for display on map */
export interface HabitatPolygonOverlay {
  id: string
  geometry: GeoJSON.Geometry
  fossittCode: string
  fossittName: string
  condition: string | null
  color?: string
}

interface ProjectMapWithDrawProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  onBoundaryChange?: (features: GeoJSON.FeatureCollection) => void
  onViewChange?: (center: [number, number], zoom: number) => void
  editable?: boolean
  showMeasureTool?: boolean
  showLayersControl?: boolean
  visibleLayers?: string[]
  npwsSearchRadius?: number
  /** Base map style - controlled externally for persistence across wizard steps */
  baseMapStyle?: MapStyle
  /** Callback when base map style changes */
  onBaseMapStyleChange?: (style: MapStyle) => void
  /** Items to hide from map (ignored) - format: "npws-SAC-001234" */
  ignoredItems?: Set<string>
  /** Items to remove completely (deleted) - format: "npws-SAC-001234" */
  deletedItems?: Set<string>
  /** Override NPWS site count for display (from parent's filtered data) */
  npwsSiteCount?: number
  /** Fly to a specific location with animation - [lat, lng, zoom] */
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  /** Desk research findings to display as markers on the map */
  findings?: FindingMarker[]
  /** Callback when a finding marker is clicked */
  onFindingClick?: (finding: FindingMarker) => void
  /** Saved habitat polygons to display on the map */
  habitatPolygons?: HabitatPolygonOverlay[]
  /** Currently selected habitat polygon ID (highlighted on map) */
  selectedHabitatId?: string
  /** Callback when a habitat polygon is clicked on the map */
  onHabitatClick?: (id: string) => void
  /** Allow multiple drawn polygons (for habitat mapping). Default false (single boundary) */
  allowMultipleDrawings?: boolean
  /** Pre-fetched NPWS sites from useLayerData — avoids duplicate fetch */
  npwsSites?: import('@/lib/external-apis/npws').NPWSDesignatedSite[]
}

// Define event types for leaflet-draw
interface DrawCreatedEvent {
  layer: L.Layer
  layerType: string
}

interface DrawEditedEvent {
  layers: L.LayerGroup
}

interface DrawDeletedEvent {
  layers: L.LayerGroup
}

// Buffer zone styles with custom colors
function getBufferZoneStyle(distance: number, colorConfig?: BufferColorConfig) {
  const fillColor = colorConfig?.fill || '#3b82f6'
  const strokeColor = colorConfig?.stroke || '#2563eb'

  // Opacity decreases with distance for better visibility
  const fillOpacity = distance <= 1 ? 0.2 : distance <= 2 ? 0.15 : distance <= 5 ? 0.1 : 0.08
  const weight = distance <= 2 ? 2 : 1.5

  return {
    color: strokeColor,
    fillColor: fillColor,
    fillOpacity,
    weight,
    dashArray: distance > 2 ? '8, 4' : undefined,
  }
}

// Internal map component
function MapComponentWithDraw({
  center,
  zoom,
  boundary,
  bufferZones,
  bufferColors,
  currentStyle,
  onBoundaryChange,
  onViewChange,
  editable,
  mapRef,
  visibleLayers: _visibleLayers = [],
  countiesData,
  showCounties,
  townlandsData,
  showTownlands,
  currentZoom = 7,
  onZoomChange,
  flyToLocation,
  findings = [],
  onFindingClick,
  habitatPolygons = [],
  selectedHabitatId,
  onHabitatClick,
  allowMultipleDrawings = false,
  onMapReady,
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  currentStyle: MapStyle
  onBoundaryChange?: (features: GeoJSON.FeatureCollection) => void
  onViewChange?: (center: [number, number], zoom: number) => void
  editable: boolean
  mapRef: React.MutableRefObject<LeafletMap | null>
  visibleLayers?: string[]
  countiesData?: GeoJSON.FeatureCollection | null
  showCounties?: boolean
  townlandsData?: GeoJSON.FeatureCollection | null
  showTownlands?: boolean
  currentZoom?: number
  onZoomChange?: (
    zoom: number,
    bounds?: { west: number; south: number; east: number; north: number }
  ) => void
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  findings?: FindingMarker[]
  onFindingClick?: (finding: FindingMarker) => void
  habitatPolygons?: HabitatPolygonOverlay[]
  selectedHabitatId?: string
  onHabitatClick?: (id: string) => void
  allowMultipleDrawings?: boolean
  onMapReady?: (map: LeafletMap) => void
}) {
  const {
    MapContainer,
    TileLayer,
    GeoJSON,
    FeatureGroup,
    useMap,
    CircleMarker,
    Popup,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require('react-leaflet')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EditControl } = require('react-leaflet-draw')

  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const [_drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])

  // Refs for tracking internal map movements (to prevent infinite loops)
  const isInternalMoveRef = React.useRef(false)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  // Track if we've EVER fit to a boundary in this component instance
  const hasFitToBoundaryRef = React.useRef(false)
  // Track if we're currently in edit mode to prevent boundary reload during editing
  const isEditingRef = React.useRef(false)
  // Track the last loaded boundary to prevent unnecessary reloads
  const lastLoadedBoundaryRef = React.useRef<string | null>(null)
  // Track the last flyTo key to prevent re-triggering
  const lastFlyToKeyRef = React.useRef<string | null>(null)

  // Initialize with existing boundary or reset when boundary is cleared
  React.useEffect(() => {
    if (boundary) {
      setDrawnFeatures([boundary])
    } else {
      setDrawnFeatures([])
    }
  }, [boundary])

  // Load existing boundary into FeatureGroup
  function LoadExistingBoundary() {
    const map = useMap()

    React.useEffect(() => {
      if (map) {
        mapRef.current = map
        onMapReady?.(map)
      }
    }, [map, onMapReady])

    React.useEffect(() => {
      if (!map || !onViewChange) return

      const handleMoveEnd = () => {
        if (isInternalMoveRef.current) {
          isInternalMoveRef.current = false
          // Still report the new position to parent so it persists across step changes
          const center = map.getCenter()
          const zoom = map.getZoom()
          onViewChange([center.lat, center.lng], zoom)
          return
        }

        // Debounce to prevent rapid updates
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          const center = map.getCenter()
          const zoom = map.getZoom()
          onViewChange([center.lat, center.lng], zoom)
        }, 100)
      }

      map.on('moveend', handleMoveEnd)

      return () => {
        map.off('moveend', handleMoveEnd)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
      }
    }, [map, onViewChange])

    // Track zoom changes for townlands loading
    const initialZoomReportedRef = React.useRef(false)
    const onZoomChangeRef = React.useRef(onZoomChange)
    onZoomChangeRef.current = onZoomChange

    React.useEffect(() => {
      if (!map) return

      const handleZoomEnd = () => {
        if (!onZoomChangeRef.current) return
        const newZoom = map.getZoom()
        const bounds = map.getBounds()
        onZoomChangeRef.current(newZoom, {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        })
      }

      map.on('zoomend', handleZoomEnd)
      map.on('moveend', handleZoomEnd)

      // Initial call - only once
      if (!initialZoomReportedRef.current) {
        initialZoomReportedRef.current = true
        handleZoomEnd()
      }

      return () => {
        map.off('zoomend', handleZoomEnd)
        map.off('moveend', handleZoomEnd)
      }
    }, [map])

    React.useEffect(() => {
      if (boundary && featureGroupRef.current && map) {
        // Skip reload if we're currently editing
        if (isEditingRef.current) {
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet')

        // Create a unique key for this boundary to detect actual changes
        const boundaryKey = JSON.stringify(boundary.geometry?.coordinates)

        // Skip if this boundary was already loaded
        if (boundaryKey === lastLoadedBoundaryRef.current) {
          return
        }
        lastLoadedBoundaryRef.current = boundaryKey

        // Clear existing layers
        featureGroupRef.current.clearLayers()

        // Add boundary as editable layer
        const geoJsonLayer = L.geoJSON(boundary, {
          style: {
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.1,
          },
        })

        geoJsonLayer.eachLayer((layer: L.Layer) => {
          featureGroupRef.current?.addLayer(layer)
        })

        // SIMPLE RULE: Only fit bounds ONCE per component lifecycle
        // AND only if no saved view position was provided (center is at default)
        const bounds = geoJsonLayer.getBounds()

        // Check if center is at default position (IRELAND_CENTER = [53.1424, -7.6921])
        // If center is NOT at default, user has a saved view position - respect it
        const isDefaultCenter =
          Math.abs(center[0] - 53.1424) < 0.0001 && Math.abs(center[1] - -7.6921) < 0.0001

        if (bounds.isValid() && !hasFitToBoundaryRef.current && isDefaultCenter) {
          hasFitToBoundaryRef.current = true
          isInternalMoveRef.current = true
          map.fitBounds(bounds, { padding: [50, 50] })
        } else {
          // Mark as fit even if we didn't actually fit (to prevent future fits)
          hasFitToBoundaryRef.current = true
        }
      }
    }, [boundary, map])

    // Handle flyToLocation prop changes
    React.useEffect(() => {
      if (
        map &&
        flyToLocation &&
        flyToLocation.center &&
        Array.isArray(flyToLocation.center) &&
        flyToLocation.center.length >= 2 &&
        typeof flyToLocation.center[0] === 'number' &&
        typeof flyToLocation.center[1] === 'number' &&
        !isNaN(flyToLocation.center[0]) &&
        !isNaN(flyToLocation.center[1]) &&
        flyToLocation.key !== lastFlyToKeyRef.current
      ) {
        lastFlyToKeyRef.current = flyToLocation.key
        isInternalMoveRef.current = true
        map.flyTo(flyToLocation.center, flyToLocation.zoom, {
          duration: 0.8,
        })
      }
    }, [map, flyToLocation])

    return null
  }

  const handleCreated = (e: DrawCreatedEvent) => {
    const layer = e.layer as L.Polygon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature

    // Validate the geometry before accepting
    if (
      !geoJSON?.geometry ||
      (geoJSON.geometry.type === 'Polygon' &&
        (!geoJSON.geometry.coordinates?.[0] || geoJSON.geometry.coordinates[0].length < 4))
    ) {
      return
    }

    if (allowMultipleDrawings) {
      // Habitat mapping mode: keep existing drawings, just add new layer
      if (featureGroupRef.current) {
        featureGroupRef.current.addLayer(layer)
      }
    } else {
      // Single boundary mode (Step 1): clear previous drawings
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers()
        featureGroupRef.current.addLayer(layer)
      }
    }

    const newFeatures = [geoJSON]
    setDrawnFeatures(newFeatures)

    onBoundaryChange?.({
      type: 'FeatureCollection',
      features: newFeatures,
    })
  }

  const handleEditStart = () => {
    isEditingRef.current = true
  }

  const handleEditStop = () => {
    isEditingRef.current = false
  }

  const handleDeleteStart = () => {
    isEditingRef.current = true
  }

  const handleDeleteStop = () => {
    isEditingRef.current = false
  }

  const handleEdited = (e: DrawEditedEvent) => {
    isEditingRef.current = false
    const layers = e.layers
    const features: GeoJSON.Feature[] = []

    layers.eachLayer((layer: L.Layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature
      // Validate geometry before accepting
      if (geoJSON?.geometry?.type === 'Polygon' && geoJSON.geometry.coordinates?.[0]?.length >= 4) {
        features.push(geoJSON)
      }
    })

    if (features.length > 0) {
      setDrawnFeatures(features)
      // Update the last loaded boundary ref so we don't reload the same boundary
      const geometry = features[0]?.geometry
      lastLoadedBoundaryRef.current = JSON.stringify(
        geometry && 'coordinates' in geometry ? geometry.coordinates : null
      )
      onBoundaryChange?.({
        type: 'FeatureCollection',
        features,
      })
    }
  }

  const handleDeleted = (_e: DrawDeletedEvent) => {
    isEditingRef.current = false

    // Get remaining features from the FeatureGroup
    const remainingFeatures: GeoJSON.Feature[] = []
    if (featureGroupRef.current) {
      featureGroupRef.current.eachLayer((layer: L.Layer) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geoJSON = (layer as any).toGeoJSON?.() as GeoJSON.Feature | undefined
        if (
          geoJSON?.geometry?.type === 'Polygon' &&
          geoJSON.geometry.coordinates?.[0]?.length >= 4
        ) {
          remainingFeatures.push(geoJSON)
        }
      })
    }

    setDrawnFeatures(remainingFeatures)
    const geom = remainingFeatures[0]?.geometry
    lastLoadedBoundaryRef.current =
      remainingFeatures.length > 0 && geom && 'coordinates' in geom
        ? JSON.stringify(geom.coordinates)
        : null
    onBoundaryChange?.({
      type: 'FeatureCollection',
      features: remainingFeatures,
    })
  }

  // Convert buffer zones Map to array for rendering
  const bufferZonesArray = React.useMemo(() => {
    if (!bufferZones) return []
    return Array.from(bufferZones.entries()).sort((a, b) => b[0] - a[0]) // Sort by distance descending (larger first)
  }, [bufferZones])

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full min-h-100 w-full"
      style={{ height: '100%', minHeight: '400px' }}
      zoomControl={false}
    >
      <TileLayer key={currentStyle} url={tileConfig.url} attribution={tileConfig.attribution} />
      {/* Labels overlay for hybrid mode - roads, places, boundaries */}
      {currentStyle === 'hybrid' && (
        <TileLayer
          key="hybrid-labels"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          pane="overlayPane"
        />
      )}
      <LoadExistingBoundary />

      {/* County Boundaries - render at bottom as reference layer */}
      {showCounties && countiesData && (
        <GeoJSON
          key="county-boundaries"
          data={countiesData}
          style={(feature: GeoJSON.Feature | undefined) => {
            const province = feature?.properties?.province as string | undefined
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

      {/* Townland Boundaries - only at zoom 12+ */}
      {showTownlands && townlandsData && currentZoom >= 12 && (
        <GeoJSON
          key={`townlands-${townlandsData.features?.length || 0}`}
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

      {/* Render buffer zones (larger first so smaller ones appear on top) */}
      {bufferZonesArray.map(([distance, bufferFeature]) => (
        <GeoJSON
          key={`buffer-${distance}`}
          data={bufferFeature}
          style={() => getBufferZoneStyle(distance, bufferColors?.[distance])}
        />
      ))}

      {/* Finding markers from desk research */}
      {findings.map((finding) => {
        if (!finding.location?.coordinates) return null

        // Parse coordinates - handle various formats
        const coords = finding.location.coordinates
        let lat: number | undefined
        let lng: number | undefined

        if (Array.isArray(coords) && coords.length >= 2) {
          // Standard GeoJSON [lng, lat] format
          const parsedLng =
            typeof coords[0] === 'number' ? coords[0] : parseFloat(String(coords[0]))
          const parsedLat =
            typeof coords[1] === 'number' ? coords[1] : parseFloat(String(coords[1]))
          if (!isNaN(parsedLng) && !isNaN(parsedLat)) {
            lng = parsedLng
            lat = parsedLat
          }
        }

        // Skip if we couldn't parse valid coordinates
        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
          return null
        }

        const color = FINDING_TYPE_COLORS[finding.dataType] || FINDING_TYPE_COLORS.other
        return (
          <CircleMarker
            key={finding.id}
            center={[lat, lng]}
            radius={8}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onFindingClick?.(finding),
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{finding.title}</strong>
                <br />
                <span className="text-gray-500 capitalize">
                  {finding.dataType.replace('_', ' ')}
                </span>
                {finding.isProtected && (
                  <>
                    <br />
                    <span className="font-medium text-red-600">Protected</span>
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Saved habitat polygons */}
      {habitatPolygons.map((hp) => {
        const isSelected = hp.id === selectedHabitatId
        const fillColor = hp.color || '#22c55e'
        return (
          <GeoJSON
            key={`habitat-${hp.id}`}
            data={{ type: 'Feature', geometry: hp.geometry, properties: {} } as GeoJSON.Feature}
            style={() => ({
              color: isSelected ? '#facc15' : fillColor,
              weight: isSelected ? 4 : 2,
              fillColor: fillColor,
              fillOpacity: isSelected ? 0.35 : 0.2,
            })}
            onEachFeature={(_feature: GeoJSON.Feature, layer: L.Layer) => {
              ;(layer as L.GeoJSON).bindPopup(`
                <div style="min-width: 160px;">
                  <strong>${hp.fossittCode}</strong> — ${hp.fossittName}
                  ${hp.condition ? `<br/><span style="color: #666;">Condition: ${hp.condition}</span>` : ''}
                </div>
              `)
              layer.on('click', () => onHabitatClick?.(hp.id))
            }}
          />
        )
      })}

      {editable ? (
        <FeatureGroup
          ref={(ref: LeafletFeatureGroup | null) => {
            featureGroupRef.current = ref
          }}
        >
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            onEditStart={handleEditStart}
            onEditStop={handleEditStop}
            onDeleteStart={handleDeleteStart}
            onDeleteStop={handleDeleteStop}
            draw={{
              rectangle: {
                showArea: true,
                shapeOptions: {
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  weight: 3,
                },
              },
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                showArea: true,
                showLength: true,
                shapeOptions: {
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  weight: 3,
                },
              },
            }}
            edit={{
              remove: true,
              edit: true,
            }}
          />
        </FeatureGroup>
      ) : (
        // Display-only mode
        boundary && (
          <GeoJSON
            data={boundary}
            style={{
              color: '#ef4444',
              weight: 3,
              fillColor: '#ef4444',
              fillOpacity: 0.1,
            }}
          />
        )
      )}
    </MapContainer>
  )
}

// Dynamic import wrapper
const DynamicMapComponentWithDraw = dynamic(() => Promise.resolve(MapComponentWithDraw), {
  ssr: false,
})

export function ProjectMapWithDraw({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  bufferZones,
  bufferColors,
  onBoundaryChange,
  onViewChange,
  editable = true,
  showMeasureTool = true,
  showLayersControl = true,
  visibleLayers = [],
  npwsSearchRadius = 5,
  baseMapStyle,
  onBaseMapStyleChange,
  ignoredItems = new Set(),
  deletedItems = new Set(),
  npwsSiteCount,
  flyToLocation,
  findings = [],
  onFindingClick,
  habitatPolygons = [],
  selectedHabitatId,
  onHabitatClick,
  allowMultipleDrawings = false,
  npwsSites: externalNpwsSites,
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  // Use controlled style if provided, otherwise use local state
  const [internalStyle, setInternalStyle] = React.useState<MapStyle>('satellite')
  const currentStyle = baseMapStyle ?? internalStyle
  const setCurrentStyle = onBaseMapStyleChange ?? setInternalStyle
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const [mapInstance, setMapInstance] = React.useState<LeafletMap | null>(null)

  // Auto-hide drawing hint after 5 seconds
  const [showDrawingHint, setShowDrawingHint] = React.useState(true)
  React.useEffect(() => {
    if (!editable || boundary) return
    const timer = setTimeout(() => setShowDrawingHint(false), 5000)
    return () => clearTimeout(timer)
  }, [editable, boundary])

  // Administrative boundaries (counties + townlands)
  const {
    showCounties,
    setShowCounties,
    countiesData,
    showTownlands,
    setShowTownlands,
    townlandsData,
    currentZoom,
    handleZoomChange,
  } = useAdministrativeBoundaries(zoom)

  // NPWS layer overlay
  const { sites: npwsSitesRaw, isLoading: npwsLoading } = useNPWSLayers(
    mapInstance,
    boundary ?? null,
    visibleLayers,
    npwsSearchRadius,
    ignoredItems,
    deletedItems,
    externalNpwsSites
  )

  // Filter out ignored and deleted sites
  const npwsSites = React.useMemo(() => {
    return npwsSitesRaw.filter((site) => {
      const siteKey = `npws-${site.SITE_TYPE}-${site.SITECODE}`
      return !ignoredItems.has(siteKey) && !deletedItems.has(siteKey)
    })
  }, [npwsSitesRaw, ignoredItems, deletedItems])

  // EPA layer overlay (rivers, lakes, catchments) - fetched within buffer zone
  const { counts: epaCounts, isLoading: epaLoading } = useEPALayers(
    mapInstance,
    boundary ?? null,
    visibleLayers,
    npwsSearchRadius,
    ignoredItems,
    deletedItems
  )

  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

  // Invalidate map size when container resizes (fixes collapsible panel issues)
  React.useEffect(() => {
    if (!containerRef.current) return

    const handleResize = () => {
      // Small delay to let the DOM settle
      setTimeout(() => {
        try {
          mapRef.current?.invalidateSize()
        } catch {
          // Ignore Leaflet internal errors during resize
        }
      }, 100)
    }

    // Listen for window resize events (triggered by collapsible panels)
    window.addEventListener('resize', handleResize)

    // Also use ResizeObserver for direct container size changes
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [mapLoaded])

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
      <div className="h-full min-h-100 w-full">
        <DynamicMapComponentWithDraw
          center={center}
          zoom={zoom}
          boundary={boundary}
          bufferZones={bufferZones}
          bufferColors={bufferColors}
          currentStyle={currentStyle}
          onBoundaryChange={onBoundaryChange}
          onViewChange={onViewChange}
          editable={editable}
          mapRef={mapRef}
          visibleLayers={visibleLayers}
          countiesData={countiesData}
          showCounties={showCounties}
          townlandsData={townlandsData}
          showTownlands={showTownlands}
          currentZoom={currentZoom}
          onZoomChange={handleZoomChange}
          flyToLocation={flyToLocation}
          findings={findings}
          onFindingClick={onFindingClick}
          habitatPolygons={habitatPolygons}
          selectedHabitatId={selectedHabitatId}
          onHabitatClick={onHabitatClick}
          allowMultipleDrawings={allowMultipleDrawings}
          onMapReady={setMapInstance}
        />
      </div>

      {/* Drawing instructions panel - auto-hides after 5 seconds */}
      {editable && !boundary && showDrawingHint && (
        <div
          data-map-control="true"
          className="bg-card/95 absolute top-4 right-20 z-1000 max-w-xs rounded-lg border p-3 shadow-lg backdrop-blur transition-opacity duration-500"
        >
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            Draw Site Boundary
          </h4>
          <div className="text-muted-foreground space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <Pentagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                <strong>Polygon:</strong> Click points to draw, double-click to finish
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span>
                <strong>Rectangle:</strong> Click and drag to create
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      <div data-map-control="true" className="absolute top-4 left-4 z-1000 flex flex-col gap-2">
        {/* Style selector */}
        {showLayersControl && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-md">
                <Layers className="mr-2 h-4 w-4" />
                Layers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-9999">
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
              <DropdownMenuCheckboxItem
                checked={showCounties}
                onCheckedChange={() => setShowCounties(!showCounties)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
                  County Boundaries
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showTownlands}
                onCheckedChange={() => setShowTownlands(!showTownlands)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                  Townlands (zoom 12+)
                </div>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Fullscreen toggle */}
        <Button variant="secondary" size="icon" className="shadow-md" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {/* Measure tool */}
        {showMeasureTool && <MeasureControl map={mapRef.current} />}
      </div>

      {/* Zoom controls - bottom right */}
      <div data-map-control="true" className="absolute right-4 bottom-4 z-1000 flex flex-col gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <span className="text-lg font-bold">+</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <span className="text-lg font-bold">−</span>
        </Button>
      </div>

      {/* Data layers info indicator - bottom left */}
      {(visibleLayers.some((l) => ['sac', 'spa', 'nha', 'pnha'].includes(l)) ||
        visibleLayers.some((l) =>
          ['rivers', 'lakes', 'catchments', 'wfd_river_status'].includes(l)
        )) && (
        <div
          data-map-control="true"
          className="bg-background/90 absolute bottom-4 left-4 z-1000 space-y-1 rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
        >
          {/* NPWS Sites */}
          {visibleLayers.some((l) => ['sac', 'spa', 'nha', 'pnha'].includes(l)) && (
            <div>
              {npwsLoading ? (
                <span className="text-muted-foreground">Loading NPWS sites...</span>
              ) : (npwsSiteCount ?? npwsSites.length) > 0 ? (
                <span className="text-emerald-600">
                  {npwsSiteCount ?? npwsSites.length} designated site
                  {(npwsSiteCount ?? npwsSites.length) !== 1 ? 's' : ''} found
                </span>
              ) : boundary ? (
                <span className="text-muted-foreground">No designated sites nearby</span>
              ) : null}
            </div>
          )}
          {/* EPA Data */}
          {visibleLayers.some((l) =>
            ['rivers', 'lakes', 'catchments', 'wfd_river_status'].includes(l)
          ) && (
            <div>
              {epaLoading ? (
                <span className="text-muted-foreground">Loading EPA data...</span>
              ) : epaCounts.total > 0 ? (
                <span className="text-sky-600">
                  {epaCounts.rivers > 0 &&
                    `${epaCounts.rivers} river${epaCounts.rivers !== 1 ? 's' : ''}`}
                  {epaCounts.rivers > 0 && epaCounts.lakes > 0 && ', '}
                  {epaCounts.lakes > 0 &&
                    `${epaCounts.lakes} lake${epaCounts.lakes !== 1 ? 's' : ''}`}
                  {(epaCounts.rivers > 0 || epaCounts.lakes > 0) &&
                    epaCounts.catchments > 0 &&
                    ', '}
                  {epaCounts.catchments > 0 &&
                    `${epaCounts.catchments} catchment${epaCounts.catchments !== 1 ? 's' : ''}`}
                </span>
              ) : boundary ? (
                <span className="text-muted-foreground">No EPA features nearby</span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
