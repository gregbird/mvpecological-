'use client'

import * as React from 'react'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type mapboxgl from 'mapbox-gl'
import { Pencil, Square, Trash2, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DrawControlsProps {
  map: mapboxgl.Map | null
  onDrawCreate?: (features: GeoJSON.Feature[]) => void
  onDrawUpdate?: (features: GeoJSON.Feature[]) => void
  onDrawDelete?: (features: GeoJSON.Feature[]) => void
  onSave?: (features: GeoJSON.FeatureCollection) => void
  initialData?: GeoJSON.FeatureCollection
  mode?: 'boundary' | 'habitat'
}

// Custom styles for draw controls
const drawStyles = [
  // Polygon fill
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': '#22c55e',
      'fill-outline-color': '#22c55e',
      'fill-opacity': 0.2,
    },
  },
  // Polygon outline - active
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#22c55e',
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },
  // Polygon outline - static
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#16a34a',
      'line-width': 3,
    },
  },
  // Vertex points
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 6,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#22c55e',
      'circle-stroke-width': 2,
    },
  },
  // Midpoints
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#22c55e',
    },
  },
]

export function DrawControls({
  map,
  onDrawCreate,
  onDrawUpdate,
  onDrawDelete,
  onSave,
  initialData,
  mode = 'boundary',
}: DrawControlsProps) {
  const draw = React.useRef<MapboxDraw | null>(null)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Initialize draw control
  React.useEffect(() => {
    if (!map) return

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: drawStyles,
      defaultMode: 'simple_select',
    })

    map.addControl(draw.current as unknown as mapboxgl.IControl)

    // Load initial data
    if (initialData && initialData.features.length > 0) {
      draw.current.set(initialData)
    }

    // Event handlers
    const handleCreate = (e: { features: GeoJSON.Feature[] }) => {
      setHasChanges(true)
      setIsDrawing(false)
      onDrawCreate?.(e.features)
    }

    const handleUpdate = (e: { features: GeoJSON.Feature[] }) => {
      setHasChanges(true)
      onDrawUpdate?.(e.features)
    }

    const handleDelete = (e: { features: GeoJSON.Feature[] }) => {
      setHasChanges(true)
      onDrawDelete?.(e.features)
    }

    map.on('draw.create', handleCreate)
    map.on('draw.update', handleUpdate)
    map.on('draw.delete', handleDelete)

    return () => {
      map.off('draw.create', handleCreate)
      map.off('draw.update', handleUpdate)
      map.off('draw.delete', handleDelete)

      if (draw.current) {
        map.removeControl(draw.current as unknown as mapboxgl.IControl)
      }
    }
  }, [map, onDrawCreate, onDrawUpdate, onDrawDelete])

  // Start drawing polygon
  const startDrawPolygon = () => {
    if (!draw.current) return
    setIsDrawing(true)
    draw.current.changeMode('draw_polygon')
  }

  // Delete selected features
  const deleteSelected = () => {
    if (!draw.current) return
    const selected = draw.current.getSelectedIds()
    if (selected.length > 0) {
      draw.current.delete(selected)
      setHasChanges(true)
    }
  }

  // Delete all features
  const deleteAll = () => {
    if (!draw.current) return
    draw.current.deleteAll()
    setHasChanges(true)
  }

  // Save current state
  const handleSave = () => {
    if (!draw.current) return
    const data = draw.current.getAll()
    onSave?.(data)
    setHasChanges(false)
  }

  // Cancel drawing
  const cancelDrawing = () => {
    if (!draw.current) return
    setIsDrawing(false)
    draw.current.changeMode('simple_select')
  }

  return (
    <TooltipProvider>
      <div className="bg-background/90 absolute bottom-4 left-4 flex items-center gap-2 rounded-lg p-2 shadow-lg backdrop-blur-sm">
        {/* Draw Polygon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isDrawing ? 'default' : 'secondary'}
              size="icon"
              onClick={isDrawing ? cancelDrawing : startDrawPolygon}
            >
              {isDrawing ? <Square className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDrawing
              ? 'Cancel drawing'
              : mode === 'boundary'
                ? 'Draw project boundary'
                : 'Draw habitat polygon'}
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected</TooltipContent>
        </Tooltip>

        {/* Save */}
        {onSave && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={hasChanges ? 'default' : 'secondary'}
                size="icon"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save changes</TooltipContent>
          </Tooltip>
        )}

        {/* Drawing instructions */}
        {isDrawing && (
          <div className="text-muted-foreground ml-2 text-sm">
            Click to add points. Double-click to finish.
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
