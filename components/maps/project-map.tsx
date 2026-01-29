'use client'

import * as React from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Layers, Maximize2, Minimize2 } from 'lucide-react'

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
const IRELAND_CENTER: [number, number] = [-7.6921, 53.1424]
const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'satellite-streets'

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  color?: string
}

interface ProjectMapProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  onBoundaryChange?: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onMapLoad?: (map: mapboxgl.Map) => void
  editable?: boolean
}

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
}

export function ProjectMap({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  habitatPolygons,
  observationPoints,
  onMapLoad,
  editable = false,
}: ProjectMapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('satellite-streets')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [layers, setLayers] = React.useState<MapLayer[]>([
    { id: 'boundary', name: 'Project Boundary', visible: true, color: '#ef4444' },
    { id: 'habitats', name: 'Habitat Polygons', visible: true },
    { id: 'observations', name: 'Species Observations', visible: true },
    { id: 'designated-sites', name: 'Designated Sites', visible: false },
  ])

  // Initialize map
  React.useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('Mapbox token is not set')
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[currentStyle],
      center: center,
      zoom: zoom,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
      'bottom-left'
    )

    // Add attribution
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

    map.current.on('load', () => {
      setMapLoaded(true)
      if (onMapLoad && map.current) {
        onMapLoad(map.current)
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Add boundary layer
  React.useEffect(() => {
    if (!map.current || !mapLoaded) return

    const boundaryLayer = layers.find((l) => l.id === 'boundary')
    if (!boundaryLayer?.visible) {
      if (map.current.getLayer('boundary-line')) {
        map.current.removeLayer('boundary-line')
      }
      if (map.current.getLayer('boundary-fill')) {
        map.current.removeLayer('boundary-fill')
      }
      if (map.current.getSource('boundary')) {
        map.current.removeSource('boundary')
      }
      return
    }

    if (boundary) {
      // Remove existing layers if any
      if (map.current.getLayer('boundary-line')) {
        map.current.removeLayer('boundary-line')
      }
      if (map.current.getLayer('boundary-fill')) {
        map.current.removeLayer('boundary-fill')
      }
      if (map.current.getSource('boundary')) {
        map.current.removeSource('boundary')
      }

      // Add boundary source
      map.current.addSource('boundary', {
        type: 'geojson',
        data: boundary,
      })

      // Add fill layer
      map.current.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.1,
        },
      })

      // Add line layer
      map.current.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary',
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
        },
      })

      // Fit map to boundary
      const bounds = new mapboxgl.LngLatBounds()
      const coords = boundary.geometry.coordinates[0]
      coords.forEach((coord) => {
        bounds.extend(coord as [number, number])
      })
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [boundary, mapLoaded, layers])

  // Add habitat polygons layer
  React.useEffect(() => {
    if (!map.current || !mapLoaded) return

    const habitatLayer = layers.find((l) => l.id === 'habitats')
    if (!habitatLayer?.visible) {
      if (map.current.getLayer('habitats-fill')) {
        map.current.removeLayer('habitats-fill')
      }
      if (map.current.getLayer('habitats-line')) {
        map.current.removeLayer('habitats-line')
      }
      if (map.current.getSource('habitats')) {
        map.current.removeSource('habitats')
      }
      return
    }

    if (habitatPolygons && habitatPolygons.features.length > 0) {
      if (map.current.getSource('habitats')) {
        ;(map.current.getSource('habitats') as mapboxgl.GeoJSONSource).setData(habitatPolygons)
      } else {
        map.current.addSource('habitats', {
          type: 'geojson',
          data: habitatPolygons,
        })

        map.current.addLayer({
          id: 'habitats-fill',
          type: 'fill',
          source: 'habitats',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.5,
          },
        })

        map.current.addLayer({
          id: 'habitats-line',
          type: 'line',
          source: 'habitats',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
          },
        })
      }
    }
  }, [habitatPolygons, mapLoaded, layers])

  // Add observation points layer
  React.useEffect(() => {
    if (!map.current || !mapLoaded) return

    const obsLayer = layers.find((l) => l.id === 'observations')
    if (!obsLayer?.visible) {
      if (map.current.getLayer('observations-points')) {
        map.current.removeLayer('observations-points')
      }
      if (map.current.getSource('observations')) {
        map.current.removeSource('observations')
      }
      return
    }

    if (observationPoints && observationPoints.features.length > 0) {
      if (map.current.getSource('observations')) {
        ;(map.current.getSource('observations') as mapboxgl.GeoJSONSource).setData(
          observationPoints
        )
      } else {
        map.current.addSource('observations', {
          type: 'geojson',
          data: observationPoints,
        })

        map.current.addLayer({
          id: 'observations-points',
          type: 'circle',
          source: 'observations',
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'case',
              ['get', 'is_protected'],
              '#ef4444', // Red for protected species
              '#22c55e', // Green for other species
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        })

        // Add click handler for popups
        map.current.on('click', 'observations-points', (e) => {
          if (!e.features || !e.features[0]) return

          const feature = e.features[0]
          const props = feature.properties
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
            number,
            number,
          ]

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
              `<div class="p-2">
                <h3 class="font-semibold">${props?.species_name_common || props?.species_name_scientific}</h3>
                <p class="text-sm text-gray-600">${props?.species_name_scientific}</p>
                ${props?.is_protected ? '<span class="text-xs bg-red-100 text-red-800 px-1 rounded">Protected</span>' : ''}
                ${props?.count ? `<p class="text-sm mt-1">Count: ${props.count}</p>` : ''}
              </div>`
            )
            .addTo(map.current!)
        })

        // Change cursor on hover
        map.current.on('mouseenter', 'observations-points', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', 'observations-points', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })
      }
    }
  }, [observationPoints, mapLoaded, layers])

  // Change map style
  const changeStyle = (style: MapStyle) => {
    if (!map.current) return
    setCurrentStyle(style)
    map.current.setStyle(MAP_STYLES[style])
  }

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
    )
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!mapContainer.current) return

    if (!isFullscreen) {
      mapContainer.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Map container */}
      <div ref={mapContainer} className="h-full min-h-[400px] w-full" />

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
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
              onCheckedChange={() => changeStyle('streets')}
            >
              Streets
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={currentStyle === 'satellite'}
              onCheckedChange={() => changeStyle('satellite')}
            >
              Satellite
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={currentStyle === 'satellite-streets'}
              onCheckedChange={() => changeStyle('satellite-streets')}
            >
              Satellite + Streets
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

      {/* Loading state */}
      {!mapLoaded && (
        <div className="bg-muted/50 absolute inset-0 flex items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      )}

      {/* No token warning */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="bg-muted absolute inset-0 flex items-center justify-center">
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Mapbox token not configured</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
