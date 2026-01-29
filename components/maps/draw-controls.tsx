'use client'

import * as React from 'react'
import { Pencil, Square, Save } from 'lucide-react'
import dynamic from 'next/dynamic'
import type * as L from 'leaflet'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Dynamic imports to avoid SSR issues
const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
)
const EditControl = dynamic(
  () => import('react-leaflet-draw').then((mod) => mod.EditControl),
  { ssr: false }
)

// Define draw event types since @types/leaflet-draw doesn't export them properly
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

interface DrawControlsProps {
  onDrawCreate?: (features: GeoJSON.Feature[]) => void
  onDrawUpdate?: (features: GeoJSON.Feature[]) => void
  onDrawDelete?: (features: GeoJSON.Feature[]) => void
  onSave?: (features: GeoJSON.FeatureCollection) => void
  initialData?: GeoJSON.FeatureCollection
  mode?: 'boundary' | 'habitat'
}

export function DrawControls({
  onDrawCreate,
  onDrawUpdate,
  onDrawDelete,
  onSave,
  initialData,
  mode = 'boundary',
}: DrawControlsProps) {
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])
  const featureGroupRef = React.useRef<L.FeatureGroup | null>(null)

  // Load initial data
  React.useEffect(() => {
    if (initialData && initialData.features.length > 0) {
      setDrawnFeatures(initialData.features)
    }
  }, [initialData])

  const handleCreated = (e: DrawCreatedEvent) => {
    const layer = e.layer as L.Polygon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature

    setDrawnFeatures((prev) => [...prev, geoJSON])
    setHasChanges(true)
    setIsDrawing(false)
    onDrawCreate?.([geoJSON])
  }

  const handleEdited = (e: DrawEditedEvent) => {
    const layers = e.layers
    const features: GeoJSON.Feature[] = []

    layers.eachLayer((layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature
      features.push(geoJSON)
    })

    setHasChanges(true)
    onDrawUpdate?.(features)
  }

  const handleDeleted = (e: DrawDeletedEvent) => {
    const layers = e.layers
    const features: GeoJSON.Feature[] = []

    layers.eachLayer((layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature
      features.push(geoJSON)
    })

    setDrawnFeatures((prev) =>
      prev.filter((f) => !features.some((df) => JSON.stringify(df) === JSON.stringify(f)))
    )
    setHasChanges(true)
    onDrawDelete?.(features)
  }

  const handleSave = () => {
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: drawnFeatures,
    }
    onSave?.(featureCollection)
    setHasChanges(false)
  }

  // Draw color based on mode
  const drawColor = mode === 'boundary' ? '#ef4444' : '#22c55e'

  return (
    <TooltipProvider>
      {/* Leaflet Draw Control */}
      <FeatureGroup
        ref={(ref) => {
          featureGroupRef.current = ref as L.FeatureGroup | null
        }}
      >
        <EditControl
          position="bottomleft"
          onCreated={handleCreated}
          onEdited={handleEdited}
          onDeleted={handleDeleted}
          onDrawStart={() => setIsDrawing(true)}
          onDrawStop={() => setIsDrawing(false)}
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
                color: drawColor,
                fillColor: drawColor,
                fillOpacity: 0.2,
                weight: 2,
              },
            },
          }}
          edit={{
            remove: true,
          }}
        />
      </FeatureGroup>

      {/* Custom Controls Overlay */}
      <div className="bg-background/90 absolute bottom-4 left-4 z-[1000] flex items-center gap-2 rounded-lg p-2 shadow-lg backdrop-blur-sm">
        {/* Save Button */}
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

        {/* Feature count */}
        {drawnFeatures.length > 0 && !isDrawing && (
          <div className="text-muted-foreground ml-2 text-sm">
            {drawnFeatures.length} {mode === 'boundary' ? 'boundary' : 'habitat'}
            {drawnFeatures.length !== 1 ? ' polygons' : ' polygon'}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Simpler version without EditControl for basic display
export function SimpleDrawControls({
  onStartDraw,
  onCancelDraw,
  onSave,
  isDrawing,
  hasChanges,
  mode = 'boundary',
}: {
  onStartDraw: () => void
  onCancelDraw: () => void
  onSave?: () => void
  isDrawing: boolean
  hasChanges: boolean
  mode?: 'boundary' | 'habitat'
}) {
  return (
    <TooltipProvider>
      <div className="bg-background/90 absolute bottom-4 left-4 z-[1000] flex items-center gap-2 rounded-lg p-2 shadow-lg backdrop-blur-sm">
        {/* Draw Polygon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isDrawing ? 'default' : 'secondary'}
              size="icon"
              onClick={isDrawing ? onCancelDraw : onStartDraw}
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

        {/* Save */}
        {onSave && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={hasChanges ? 'default' : 'secondary'}
                size="icon"
                onClick={onSave}
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
