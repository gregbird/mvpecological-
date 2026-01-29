'use client'

import * as React from 'react'
import { Layers, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap } from 'leaflet'

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
const IRELAND_CENTER: [number, number] = [53.1424, -7.6921] // Leaflet uses [lat, lng]
const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'topo'

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
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  onBoundaryChange?: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onMapReady?: () => void
  editable?: boolean
}

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

// The actual map component that uses react-leaflet
function MapComponent({
  center,
  zoom,
  boundary,
  habitatPolygons,
  observationPoints,
  currentStyle,
  layers,
  onMapReady,
  mapRef,
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  currentStyle: MapStyle
  layers: MapLayer[]
  onMapReady?: () => void
  mapRef: React.MutableRefObject<LeafletMap | null>
}) {
  const {
    MapContainer,
    TileLayer,
    GeoJSON,
    CircleMarker,
    Popup,
    useMap,
  } = require('react-leaflet')

  const boundaryLayer = layers.find((l) => l.id === 'boundary')
  const habitatLayer = layers.find((l) => l.id === 'habitats')
  const obsLayer = layers.find((l) => l.id === 'observations')
  const tileConfig = TILE_LAYERS[currentStyle]

  // Component to fit bounds
  function FitBounds({ boundary }: { boundary?: GeoJSON.Feature<GeoJSON.Polygon> }) {
    const map = useMap()

    React.useEffect(() => {
      if (boundary && map) {
        const L = require('leaflet')
        const geoJsonLayer = L.geoJSON(boundary)
        const bounds = geoJsonLayer.getBounds()
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }, [boundary, map])

    React.useEffect(() => {
      if (map) {
        mapRef.current = map
        onMapReady?.()
      }
    }, [map])

    return null
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full min-h-[400px] w-full"
      style={{ height: '100%', minHeight: '400px' }}
    >
      <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
      <FitBounds boundary={boundary} />

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
                    <span className="rounded bg-red-100 px-1 text-xs text-red-800">
                      Protected
                    </span>
                  )}
                  {props?.count && <p className="mt-1 text-sm">Count: {props.count}</p>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
    </MapContainer>
  )
}

// Dynamic import wrapper
const DynamicMapComponent = dynamic(
  () => Promise.resolve(MapComponent),
  { ssr: false }
)

export function ProjectMap({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  habitatPolygons,
  observationPoints,
  onMapReady,
  editable = false,
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
    { id: 'designated-sites', name: 'Designated Sites', visible: false },
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
        <div className="bg-muted/50 flex h-full min-h-[400px] w-full items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Map container */}
      <div className="h-full min-h-[400px] w-full">
        <DynamicMapComponent
          center={center}
          zoom={zoom}
          boundary={boundary}
          habitatPolygons={habitatPolygons}
          observationPoints={observationPoints}
          currentStyle={currentStyle}
          layers={layers}
          onMapReady={onMapReady}
          mapRef={mapRef}
        />
      </div>

      {/* Map controls overlay */}
      <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-2">
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
    </div>
  )
}
