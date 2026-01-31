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

interface ProjectMapWithDrawProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  onBoundaryChange?: (features: GeoJSON.FeatureCollection) => void
  editable?: boolean
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

// Buffer zone styles
function getBufferZoneStyle(distance: number) {
  const baseColor = '#3b82f6' // Blue
  if (distance <= 1) {
    return { color: baseColor, fillColor: baseColor, fillOpacity: 0.15, weight: 2 }
  } else if (distance <= 2) {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '5, 5',
    }
  } else if (distance <= 5) {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '10, 5',
    }
  }
  return {
    color: baseColor,
    fillColor: baseColor,
    fillOpacity: 0.02,
    weight: 1,
    dashArray: '15, 10',
  }
}

// Internal map component
function MapComponentWithDraw({
  center,
  zoom,
  boundary,
  bufferZones,
  currentStyle,
  onBoundaryChange,
  editable,
  mapRef,
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  currentStyle: MapStyle
  onBoundaryChange?: (features: GeoJSON.FeatureCollection) => void
  editable: boolean
  mapRef: React.MutableRefObject<LeafletMap | null>
}) {
  const { MapContainer, TileLayer, GeoJSON, FeatureGroup, useMap } = require('react-leaflet')
  const { EditControl } = require('react-leaflet-draw')

  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const [drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])

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

        // Fit bounds
        const bounds = geoJsonLayer.getBounds()
        if (bounds.isValid()) {
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
      className="h-full min-h-[400px] w-full"
      style={{ height: '100%', minHeight: '400px' }}
    >
      <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
      <LoadExistingBoundary />

      {/* Render buffer zones (larger first so smaller ones appear on top) */}
      {bufferZonesArray.map(([distance, bufferFeature]) => (
        <GeoJSON
          key={`buffer-${distance}`}
          data={bufferFeature}
          style={getBufferZoneStyle(distance)}
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
  onBoundaryChange,
  editable = true,
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('streets')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)

  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

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
        <div className="bg-muted/50 flex h-full min-h-[400px] w-full items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-lg', className)}>
      <div className="h-full min-h-[400px] w-full">
        <DynamicMapComponentWithDraw
          center={center}
          zoom={zoom}
          boundary={boundary}
          bufferZones={bufferZones}
          currentStyle={currentStyle}
          onBoundaryChange={onBoundaryChange}
          editable={editable}
          mapRef={mapRef}
        />
      </div>

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
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
      </div>

      {/* Drawing instructions */}
      {editable && (
        <div className="bg-background/90 absolute bottom-4 left-4 z-[1000] rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          Use the polygon tool (top right) to draw the project boundary
        </div>
      )}
    </div>
  )
}
