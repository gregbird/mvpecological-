'use client'

import * as React from 'react'
import { Layers, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'

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

// Ireland center coordinates
const IRELAND_CENTER: [number, number] = [53.1424, -7.6921]
const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'topo'

// Tile layer URLs (all free)
const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
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
}) {
  const { MapContainer, TileLayer, GeoJSON, FeatureGroup, useMap } = require('react-leaflet')
  const { EditControl } = require('react-leaflet-draw')

  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const [drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])

  // Refs for tracking internal map movements (to prevent infinite loops)
  const isInternalMoveRef = React.useRef(false)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

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

    React.useEffect(() => {
      if (boundary && featureGroupRef.current && map) {
        const L = require('leaflet')

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

        // Fit bounds - mark as internal to prevent onViewChange callback
        const bounds = geoJsonLayer.getBounds()
        if (bounds.isValid()) {
          isInternalMoveRef.current = true
          map.fitBounds(bounds, { padding: [50, 50] })
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
    const layers = e.layers
    const deletedIds: string[] = []

    layers.eachLayer((layer: L.Layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deletedIds.push((layer as any)._leaflet_id?.toString())
    })

    const remainingFeatures = drawnFeatures.filter(
      (_, index) => !deletedIds.includes(index.toString())
    )

    setDrawnFeatures(remainingFeatures)
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
    >
      <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
      <LoadExistingBoundary />

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
  visibleLayers = [],
  npwsSearchRadius = 5,
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('streets')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)

  // NPWS layer overlay
  const { sites: npwsSites, isLoading: npwsLoading } = useNPWSLayers(
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
        />
      </div>

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 z-1000 flex flex-col gap-2">
        {/* Style selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="shadow-md">
              <Layers className="mr-2 h-4 w-4" />
              Layers
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Map Style</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={currentStyle === 'streets'}
              onCheckedChange={() => setCurrentStyle('streets')}
            >
              Streets (OSM)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={currentStyle === 'satellite'}
              onCheckedChange={() => setCurrentStyle('satellite')}
            >
              Satellite (ESRI)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={currentStyle === 'topo'}
              onCheckedChange={() => setCurrentStyle('topo')}
            >
              Topographic
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen toggle */}
        <Button variant="secondary" size="icon" className="shadow-md" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {/* Measure tool */}
        {showMeasureTool && <MeasureControl map={mapRef.current} />}
      </div>

      {/* Zoom controls - bottom right */}
      <div className="absolute right-4 bottom-4 z-1000 flex flex-col gap-1">
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

      {/* NPWS loading/sites indicator - bottom left */}
      {visibleLayers.some((l) => ['sac', 'spa', 'nha', 'pnha', 'ramsar'].includes(l)) && (
        <div className="bg-background/90 absolute bottom-4 left-4 z-1000 rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
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
    </div>
  )
}
