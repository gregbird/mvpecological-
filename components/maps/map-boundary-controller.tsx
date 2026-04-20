'use client'

import * as React from 'react'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'
import type L from 'leaflet'
import type { HabitatPolygonOverlay } from '@/components/maps/map-types'
import type { DrawMeasurement } from '@/components/maps/draw-measurement-overlay'
import { useGeomanSetup } from '@/hooks/maps/use-geoman-setup'
import { useDrawHistory } from '@/hooks/maps/use-draw-history'
import { useDrawShortcuts } from '@/hooks/maps/use-draw-shortcuts'

interface MapBoundaryControllerProps {
  /** useMap() instance passed from parent that renders inside MapContainer */
  map: LeafletMap
  mapRef: React.MutableRefObject<LeafletMap | null>
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  editable: boolean
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
  onViewChange?: (center: [number, number], zoom: number) => void
  onZoomChange?: (
    zoom: number,
    bounds?: { west: number; south: number; east: number; north: number }
  ) => void
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  allowMultipleDrawings: boolean
  habitatPolygons: HabitatPolygonOverlay[]
  /** Other site boundaries also usable as trace-along targets (step 2 multi-site) */
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
  onMapReady?: (map: LeafletMap) => void
  /** Called when delete confirmation dialog should open/close */
  onDeleteConfirmChange: React.Dispatch<React.SetStateAction<boolean>>
  /** Pending delete layer ref shared with parent for confirmation */
  pendingDeleteLayerRef: React.MutableRefObject<L.Layer | null>
  /** Called with live draw measurement data */
  onDrawMeasurementChange: (measurement: DrawMeasurement | null) => void
  /** Called when collectFeatures is available (for delete confirmation) */
  onCollectFeaturesReady: (fn: () => GeoJSON.Feature[]) => void
  /** Buffer distances (km). When provided, initial fit expands to the
   * largest buffer ring so users see buffer context on first load. */
  bufferDistances?: number[]
}

/**
 * Inner component that runs inside <MapContainer> and manages:
 * - Map instance registration (mapRef, onMapReady)
 * - Scale control
 * - View change tracking (moveend, zoomend)
 * - Boundary loading into FeatureGroup
 * - flyToLocation animation
 * - Geoman drawing tools (via useGeomanSetup)
 * - Undo/redo history (via useDrawHistory)
 * - Keyboard shortcuts (via useDrawShortcuts)
 *
 * Returns null -- all side effects are via hooks and refs.
 */
export function MapBoundaryController({
  map,
  mapRef,
  featureGroupRef,
  boundary,
  editable,
  onBoundaryChange,
  onViewChange,
  onZoomChange,
  flyToLocation,
  allowMultipleDrawings,
  habitatPolygons,
  otherBoundaries,
  onOverlapDetected,
  onMapReady,
  onDeleteConfirmChange,
  pendingDeleteLayerRef,
  onDrawMeasurementChange,
  onCollectFeaturesReady,
  bufferDistances,
}: MapBoundaryControllerProps) {
  // Register map instance
  React.useEffect(() => {
    if (map) {
      mapRef.current = map
      onMapReady?.(map)
    }
  }, [map, mapRef, onMapReady])

  // Scale control
  React.useEffect(() => {
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const leaflet = require('leaflet')
    const scale = leaflet.control.scale({ metric: true, imperial: false, position: 'bottomleft' })
    scale.addTo(map)
    return () => {
      scale.remove()
    }
  }, [map])

  // View change tracking
  const isInternalMoveRef = React.useRef(false)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (!map || !onViewChange) return
    const handleMoveEnd = () => {
      if (isInternalMoveRef.current) {
        isInternalMoveRef.current = false
        const c = map.getCenter()
        onViewChange([c.lat, c.lng], map.getZoom())
        return
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        const c = map.getCenter()
        onViewChange([c.lat, c.lng], map.getZoom())
      }, 100)
    }
    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [map, onViewChange])

  // Zoom tracking for townlands loading
  const initialZoomReportedRef = React.useRef(false)
  const onZoomChangeRef = React.useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange

  React.useEffect(() => {
    if (!map) return
    const handleZoomEnd = () => {
      if (!onZoomChangeRef.current) return
      const bounds = map.getBounds()
      onZoomChangeRef.current(map.getZoom(), {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      })
    }
    map.on('zoomend', handleZoomEnd)
    map.on('moveend', handleZoomEnd)
    if (!initialZoomReportedRef.current) {
      initialZoomReportedRef.current = true
      handleZoomEnd()
    }
    return () => {
      map.off('zoomend', handleZoomEnd)
      map.off('moveend', handleZoomEnd)
    }
  }, [map])

  // Boundary loading into FeatureGroup
  const hasFitToBoundaryRef = React.useRef(false)
  const isEditingRef = React.useRef(false)
  const lastLoadedBoundaryRef = React.useRef<string | null>(null)
  const [_drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])

  React.useEffect(() => {
    if (boundary) setDrawnFeatures([boundary])
    else setDrawnFeatures([])
  }, [boundary])

  React.useEffect(() => {
    if (boundary && featureGroupRef.current && map) {
      if (isEditingRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet')
      const boundaryKey = JSON.stringify(boundary.geometry?.coordinates)
      if (boundaryKey === lastLoadedBoundaryRef.current) return
      lastLoadedBoundaryRef.current = boundaryKey

      featureGroupRef.current.clearLayers()
      // Explicitly mark the layer as a snap target — without these flags,
      // vertex dragging in edit mode does not snap to the polygon's other
      // edges/vertices because Leaflet's default GeoJSON layer is not
      // registered as a snap candidate.
      const geoJsonLayer = L.geoJSON(boundary, {
        style: { color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.1 },
        pmIgnore: false,
        snapIgnore: false,
      } as L.GeoJSONOptions)
      geoJsonLayer.eachLayer((layer: L.Layer) => {
        featureGroupRef.current?.addLayer(layer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyLayer = layer as any
        // Force snap options on the layer itself so it's picked up as a
        // snap target even when editing its own vertices (self-snap).
        if (anyLayer.options) {
          anyLayer.options.pmIgnore = false
          anyLayer.options.snapIgnore = false
        }
        if (anyLayer.pm) {
          anyLayer.pm.setOptions({
            snappable: true,
            snapDistance: 20,
            snapSegment: true,
            snapVertex: true,
            snapMiddle: true,
          })
        }
      })
      // For the initial fit, expand the extent by the largest buffer so
      // users see the buffer rings on load. Subsequent re-fits (site switch)
      // use the raw boundary bounds for a precise zoom.
      let bounds = geoJsonLayer.getBounds()
      const maxBufferKm =
        bufferDistances && bufferDistances.length > 0 ? Math.max(...bufferDistances) : 0
      if (!hasFitToBoundaryRef.current && maxBufferKm > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const turf = require('@turf/turf')
          const buffered = turf.buffer(boundary, maxBufferKm, {
            units: 'kilometers',
          }) as GeoJSON.Feature
          const bufferedLayer = L.geoJSON(buffered)
          const bufferedBounds = bufferedLayer.getBounds()
          if (bufferedBounds.isValid()) bounds = bufferedBounds
        } catch {
          // Fall back to the boundary bounds
        }
      }
      if (bounds.isValid()) {
        isInternalMoveRef.current = true
        if (hasFitToBoundaryRef.current) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 0.6 })
        } else {
          map.fitBounds(bounds, { padding: [30, 30] })
        }
        hasFitToBoundaryRef.current = true
      }
    }
  }, [boundary, map, featureGroupRef, bufferDistances])

  // flyToLocation
  const lastFlyToKeyRef = React.useRef<string | null>(null)

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
      map.flyTo(flyToLocation.center, flyToLocation.zoom, { duration: 0.8 })
    }
  }, [map, flyToLocation])

  // Geoman setup
  const { drawMeasurement, collectFeatures, notifyChange } = useGeomanSetup({
    map,
    editable,
    featureGroupRef,
    allowMultipleDrawings,
    habitatPolygons,
    otherBoundaries,
    boundary,
    onBoundaryChange,
    onOverlapDetected,
    isEditingRef,
    lastLoadedBoundaryRef,
    setDrawnFeatures,
    pendingDeleteLayerRef,
    setShowDeleteConfirm: onDeleteConfirmChange,
    onHistoryPush: () => pushHistory(),
  })

  // Expose collectFeatures to parent for delete confirmation
  React.useEffect(() => {
    onCollectFeaturesReady(collectFeatures)
  }, [collectFeatures, onCollectFeaturesReady])

  // Propagate draw measurement to parent
  React.useEffect(() => {
    onDrawMeasurementChange(drawMeasurement)
  }, [drawMeasurement, onDrawMeasurementChange])

  // Draw history
  const { pushHistory, undo, redo } = useDrawHistory(featureGroupRef, notifyChange)

  // Keyboard shortcuts
  useDrawShortcuts({ map, enabled: editable, onUndo: undo, onRedo: redo })

  return null
}
