'use client'

import * as React from 'react'
import { Layers, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type {
  Map as LeafletMap,
  FeatureGroup as LeafletFeatureGroup,
  Layer as LeafletLayer,
} from 'leaflet'
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
import { MeasureControl } from './measure-control'
import { useNPWSLayers } from './npws-layer-overlay'
import { useEPALayers } from './epa-layer-overlay'

// Ireland center coordinates
const IRELAND_CENTER: [number, number] = [53.1424, -7.6921]
const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'hybrid' | 'topo'

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

interface BufferColorConfig {
  fill: string
  stroke: string
  name: string
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
  visibleLayers = [],
  countiesData,
  showCounties,
  townlandsData,
  showTownlands,
  currentZoom = 7,
  onZoomChange,
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
}) {
  const { MapContainer, TileLayer, GeoJSON, FeatureGroup, useMap, ZoomControl } = require('react-leaflet')
  const { EditControl } = require('react-leaflet-draw')

  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const [drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])

  // Refs for tracking internal map movements (to prevent infinite loops)
  const isInternalMoveRef = React.useRef(false)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  // Track if we've EVER fit to a boundary in this component instance
  const hasFitToBoundaryRef = React.useRef(false)

  // Initialize with existing boundary
  React.useEffect(() => {
    if (boundary) {
      setDrawnFeatures([boundary])
    }
  }, [boundary])

  // Load existing boundary into FeatureGroup
  function LoadExistingBoundary() {
    const map = useMap()

    React.useEffect(() => {
      if (map) {
        mapRef.current = map
      }
    }, [map])

    React.useEffect(() => {
      if (!map || !onViewChange) return

      const handleMoveEnd = () => {
        // Skip if this was triggered by fitBounds or other internal operations
        if (isInternalMoveRef.current) {
          isInternalMoveRef.current = false
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
    React.useEffect(() => {
      if (!map || !onZoomChange) return

      const handleZoomEnd = () => {
        const newZoom = map.getZoom()
        const bounds = map.getBounds()
        onZoomChange(newZoom, {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        })
      }

      map.on('zoomend', handleZoomEnd)
      map.on('moveend', handleZoomEnd)

      // Initial call
      handleZoomEnd()

      return () => {
        map.off('zoomend', handleZoomEnd)
        map.off('moveend', handleZoomEnd)
      }
    }, [map, onZoomChange])

    React.useEffect(() => {
      if (boundary && featureGroupRef.current && map) {
        const L = require('leaflet')

        // Create a unique key for this boundary to detect actual changes
        const boundaryKey = JSON.stringify(boundary.geometry?.coordinates)

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

    return null
  }

  const handleCreated = (e: DrawCreatedEvent) => {
    const layer = e.layer as L.Polygon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature

    const newFeatures = [...drawnFeatures, geoJSON]
    setDrawnFeatures(newFeatures)

    onBoundaryChange?.({
      type: 'FeatureCollection',
      features: newFeatures,
    })
  }

  const handleEdited = (e: DrawEditedEvent) => {
    const layers = e.layers
    const features: GeoJSON.Feature[] = []

    layers.eachLayer((layer: L.Layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature
      features.push(geoJSON)
    })

    if (features.length > 0) {
      setDrawnFeatures(features)
      onBoundaryChange?.({
        type: 'FeatureCollection',
        features,
      })
    }
  }

  const handleDeleted = (e: DrawDeletedEvent) => {
    // Count how many layers were deleted
    let deletedCount = 0
    e.layers.eachLayer(() => {
      deletedCount++
    })

    // If all features were deleted, clear everything
    if (deletedCount >= drawnFeatures.length) {
      setDrawnFeatures([])
      onBoundaryChange?.({
        type: 'FeatureCollection',
        features: [],
      })
    } else {
      // Get remaining features from the FeatureGroup
      const remainingFeatures: GeoJSON.Feature[] = []
      if (featureGroupRef.current) {
        featureGroupRef.current.eachLayer((layer: L.Layer) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const geoJSON = (layer as any).toGeoJSON?.() as GeoJSON.Feature | undefined
          if (geoJSON) {
            remainingFeatures.push(geoJSON)
          }
        })
      }
      setDrawnFeatures(remainingFeatures)
      onBoundaryChange?.({
        type: 'FeatureCollection',
        features: remainingFeatures,
      })
    }
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
      <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
      {/* Labels overlay for hybrid mode - roads, places, boundaries */}
      {currentStyle === 'hybrid' && (
        <TileLayer
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
            draw={{
              rectangle: false,
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
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('streets')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)

  // Data layers state
  const [showCounties, setShowCounties] = React.useState(false)
  const [countiesData, setCountiesData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [countiesLoading, setCountiesLoading] = React.useState(false)

  // Townlands state
  const [showTownlands, setShowTownlands] = React.useState(false)
  const [townlandsData, setTownlandsData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [townlandsLoading, setTownlandsLoading] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(zoom)
  const townlandsBboxRef = React.useRef<string | null>(null)

  // Load county boundaries when layer becomes visible
  React.useEffect(() => {
    if (showCounties && !countiesData && !countiesLoading) {
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
  }, [showCounties, countiesData, countiesLoading])

  // Function to load townlands for current viewport
  const loadTownlandsForBbox = React.useCallback(
    async (bbox: string) => {
      if (townlandsLoading || bbox === townlandsBboxRef.current) return

      setTownlandsLoading(true)
      townlandsBboxRef.current = bbox

      try {
        const response = await fetch(`/api/boundaries/townlands?bbox=${bbox}&limit=300`)
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

  // Track zoom level changes from map
  const handleZoomChange = React.useCallback(
    (newZoom: number, bounds?: { west: number; south: number; east: number; north: number }) => {
      setCurrentZoom(newZoom)

      // Load townlands when zoom >= 12 and layer is visible
      if (newZoom >= 12 && showTownlands && bounds) {
        const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
        loadTownlandsForBbox(bbox)
      }
    },
    [showTownlands, loadTownlandsForBbox]
  )

  // NPWS layer overlay
  const { sites: npwsSites, isLoading: npwsLoading } = useNPWSLayers(
    mapRef.current,
    boundary ?? null,
    visibleLayers,
    npwsSearchRadius
  )

  // EPA layer overlay (rivers, lakes, catchments) - fetched within buffer zone
  const { counts: epaCounts, isLoading: epaLoading } = useEPALayers(
    mapRef.current,
    boundary ?? null,
    visibleLayers,
    npwsSearchRadius
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
        mapRef.current?.invalidateSize()
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
        />
      </div>

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Style selector */}
        {showLayersControl && (
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
      <div className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-1">
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
        <div className="bg-background/90 absolute bottom-4 left-4 z-[1000] space-y-1 rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          {/* NPWS Sites */}
          {visibleLayers.some((l) => ['sac', 'spa', 'nha', 'pnha'].includes(l)) && (
            <div>
              {npwsLoading ? (
                <span className="text-muted-foreground">Loading NPWS sites...</span>
              ) : npwsSites.length > 0 ? (
                <span className="text-emerald-600">
                  {npwsSites.length} designated site{npwsSites.length !== 1 ? 's' : ''} found
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
