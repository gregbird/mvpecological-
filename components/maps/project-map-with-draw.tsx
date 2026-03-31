'use client'

import * as React from 'react'
import { Info, Maximize2, Minimize2, Pentagon, Square } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'
import type L from 'leaflet'

import { Button } from '@/components/ui/button'
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
import { useIWebsLayers } from './iwebs-layer-overlay'
import { useAdministrativeBoundaries } from '@/hooks/maps/use-administrative-boundaries'
import { MapLayersDropdown } from '@/components/maps/map-layers-dropdown'
export type { FindingMarker, HabitatPolygonOverlay } from '@/components/maps/map-types'
import type {
  FindingMarker,
  HabitatPolygonOverlay,
  BufferColorConfig,
} from '@/components/maps/map-types'
import { getBufferZoneStyle } from '@/components/maps/map-types'

interface ProjectMapWithDrawProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
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
  /** Other site boundaries to display as non-editable dimmed overlays */
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
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
  /** Called when a newly drawn polygon overlaps an existing habitat */
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
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
  otherBoundaries = [],
  findings = [],
  onFindingClick,
  habitatPolygons = [],
  selectedHabitatId,
  onHabitatClick,
  allowMultipleDrawings = false,
  onMapReady,
  showBatRecords,
  onOverlapDetected,
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  currentStyle: MapStyle
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
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
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  findings?: FindingMarker[]
  onFindingClick?: (finding: FindingMarker) => void
  habitatPolygons?: HabitatPolygonOverlay[]
  selectedHabitatId?: string
  onHabitatClick?: (id: string) => void
  allowMultipleDrawings?: boolean
  onMapReady?: (map: LeafletMap) => void
  showBatRecords?: boolean
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rl = require('react-leaflet')
  const {
    MapContainer,
    TileLayer,
    WMSTileLayer,
    GeoJSON,
    FeatureGroup,
    useMap,
    CircleMarker,
    Popup,
  } = rl
  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const [_drawnFeatures, setDrawnFeatures] = React.useState<GeoJSON.Feature[]>([])
  // Delete confirmation: layer pending user confirmation
  const pendingDeleteLayerRef = React.useRef<L.Layer | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  // Live area/perimeter during drawing
  const [drawMeasurement, setDrawMeasurement] = React.useState<{
    areaHa: number
    perimeterM: number
  } | null>(null)

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
  // Geoman initialization flag — persists across nested component re-renders
  const geomanReadyRef = React.useRef(false)
  // Stable refs for values used in Geoman event handlers (avoid stale closures)
  const onBoundaryChangeRef = React.useRef(onBoundaryChange)
  onBoundaryChangeRef.current = onBoundaryChange
  const allowMultipleDrawingsRef = React.useRef(allowMultipleDrawings)
  allowMultipleDrawingsRef.current = allowMultipleDrawings
  const onOverlapDetectedRef = React.useRef(onOverlapDetected)
  onOverlapDetectedRef.current = onOverlapDetected
  const habitatPolygonsRef = React.useRef(habitatPolygons)
  habitatPolygonsRef.current = habitatPolygons

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

    // Add scale control
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
          // Enable Geoman editing on loaded layers so vertex edit/cut works
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((layer as any).pm) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(layer as any).pm.setOptions({ snappable: true, snapDistance: 15 })
          }
        })

        // Fly to boundary bounds whenever boundary changes
        const bounds = geoJsonLayer.getBounds()

        if (bounds.isValid()) {
          isInternalMoveRef.current = true
          if (hasFitToBoundaryRef.current) {
            // Subsequent boundary changes: animate with flyToBounds
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.6 })
          } else {
            // First load: instant fitBounds (no animation)
            map.fitBounds(bounds, { padding: [50, 50] })
          }
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

    // Geoman initialization — snapping (A3.1), cut (A3.3), vertex edit (A3.4)
    // Uses geomanReadyRef from parent scope so it persists across re-renders
    React.useEffect(() => {
      if (!editable || geomanReadyRef.current || !map) return

      const init = async () => {
        try {
          await import('@geoman-io/leaflet-geoman-free')
          // Guard: check again after async import in case of race condition
          if (!map.pm || geomanReadyRef.current) return

          // Global options — snapping, keyboard shortcuts
          map.pm.setGlobalOptions({
            snappable: true,
            snapDistance: 15,
            snapMiddle: true,
            allowSelfIntersection: false,
            finishOn: 'dblclick' as unknown as null,
            templineStyle: { color: '#ef4444', weight: 2 },
            hintlineStyle: { color: '#ef4444', weight: 2, dashArray: '5,5' },
            pathOptions: {
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.1,
              weight: 3,
            },
          })

          // Toolbar: polygon, rectangle, edit, drag, cut, delete
          map.pm.addControls({
            position: 'topright',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: true,
            drawCircle: false,
            drawText: false,
            drawPolygon: true,
            editMode: true,
            dragMode: true,
            cutPolygon: true,
            removalMode: true,
            rotateMode: false,
          })

          // Toolbar button tooltips
          map.pm.setLang('custom', {
            tooltips: {
              placeMarker: 'Click to place',
              firstVertex: 'Click to start',
              continueLine: 'Click to continue',
              finishLine: 'Double-click to finish',
              finishPoly: 'Double-click to finish',
              finishRect: 'Click to finish',
            },
            buttonTitles: {
              drawPolyButton: 'Draw polygon boundary',
              drawRectButton: 'Draw rectangle boundary',
              editButton: 'Edit vertices (drag corners)',
              dragButton: 'Move entire polygon',
              cutButton: 'Cut / clip polygon',
              deleteButton: 'Delete polygon',
            },
          } as Record<string, unknown>)

          // Helper: collect all valid polygon features from FeatureGroup
          const collectFeatures = (): GeoJSON.Feature[] => {
            const features: GeoJSON.Feature[] = []
            featureGroupRef.current?.eachLayer((layer: L.Layer) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const geo = (layer as any).toGeoJSON?.() as GeoJSON.Feature | undefined
              if (geo?.geometry?.type === 'Polygon' && geo.geometry.coordinates?.[0]?.length >= 4) {
                features.push(geo)
              }
            })
            return features
          }

          // Helper: update state + notify parent
          // isEdit=true for vertex edits and cuts, false for new draws
          const notifyChange = (features: GeoJSON.Feature[], isEdit = false) => {
            setDrawnFeatures(features)
            const geom = features[0]?.geometry
            lastLoadedBoundaryRef.current =
              features.length > 0 && geom && 'coordinates' in geom
                ? JSON.stringify(geom.coordinates)
                : null
            onBoundaryChangeRef.current?.({ type: 'FeatureCollection', features }, isEdit)
          }

          // --- pm:create — new polygon/rectangle drawn ---
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:create', (e: any) => {
            const layer = e.layer as L.Polygon
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const geoJSON = (layer as any).toGeoJSON() as GeoJSON.Feature

            if (
              !geoJSON?.geometry ||
              (geoJSON.geometry.type === 'Polygon' &&
                (!geoJSON.geometry.coordinates?.[0] || geoJSON.geometry.coordinates[0].length < 4))
            ) {
              map.removeLayer(layer)
              return
            }

            // Move layer from map into FeatureGroup
            map.removeLayer(layer)
            if (!allowMultipleDrawingsRef.current && featureGroupRef.current) {
              featureGroupRef.current.clearLayers()
            }
            featureGroupRef.current?.addLayer(layer)

            // Trace-along: align new polygon edges with existing habitat boundaries
            if (
              allowMultipleDrawingsRef.current &&
              habitatPolygonsRef.current.length > 0 &&
              geoJSON.geometry.type === 'Polygon'
            ) {
              import('@/lib/gis/trace-along-feature').then(
                ({ findNearestPolygonEdge, traceEdge }) => {
                  try {
                    const existingPolygons = habitatPolygonsRef.current
                      .filter((hp) => hp.geometry.type === 'Polygon')
                      .map((hp) => ({
                        type: 'Feature' as const,
                        geometry: hp.geometry as GeoJSON.Polygon,
                        properties: {},
                      }))
                    if (existingPolygons.length === 0) return

                    const polyGeom = geoJSON.geometry as GeoJSON.Polygon
                    const coords = polyGeom.coordinates[0] as [number, number][]
                    let modified = false
                    const newCoords: [number, number][] = [coords[0]]

                    for (let i = 0; i < coords.length - 1; i++) {
                      const startResult = findNearestPolygonEdge(coords[i], existingPolygons, 0.05)
                      const endResult = findNearestPolygonEdge(
                        coords[i + 1],
                        existingPolygons,
                        0.05
                      )

                      if (
                        startResult &&
                        endResult &&
                        startResult.polygonIndex === endResult.polygonIndex
                      ) {
                        // Both vertices near same polygon — trace along its edge
                        const traced = traceEdge(
                          existingPolygons[startResult.polygonIndex].geometry,
                          startResult.point,
                          endResult.point
                        )
                        if (traced.length > 2) {
                          // Replace straight line with traced edge (skip first, it's already added)
                          for (let t = 1; t < traced.length; t++) {
                            newCoords.push(traced[t])
                          }
                          modified = true
                          continue
                        }
                      }
                      newCoords.push(coords[i + 1])
                    }

                    if (modified) {
                      // Update the polygon geometry with traced edges
                      polyGeom.coordinates = [newCoords]
                      // Update the layer in FeatureGroup
                      if (featureGroupRef.current) {
                        featureGroupRef.current.removeLayer(layer)
                        const updatedLayer = leaflet.geoJSON(geoJSON, {
                          style: {
                            color: '#ef4444',
                            weight: 3,
                            fillColor: '#ef4444',
                            fillOpacity: 0.1,
                          },
                        })
                        updatedLayer.eachLayer((l: L.Layer) => featureGroupRef.current?.addLayer(l))
                      }
                      notifyChange([geoJSON], false)
                    }
                  } catch {
                    // Trace-along failed silently — polygon stays as drawn
                  }
                }
              )
            }

            notifyChange([geoJSON], false)

            // Check for overlap with existing habitat polygons
            if (
              allowMultipleDrawingsRef.current &&
              onOverlapDetectedRef.current &&
              geoJSON.geometry.type === 'Polygon'
            ) {
              import('@/lib/gis/polygon-operations').then(({ polygonsOverlap, getOverlapArea }) => {
                const newPoly = geoJSON as GeoJSON.Feature<GeoJSON.Polygon>
                for (const hp of habitatPolygonsRef.current) {
                  if (hp.geometry.type !== 'Polygon') continue
                  const existingPoly: GeoJSON.Feature<GeoJSON.Polygon> = {
                    type: 'Feature',
                    geometry: hp.geometry as GeoJSON.Polygon,
                    properties: {},
                  }
                  if (polygonsOverlap(newPoly, existingPoly)) {
                    const overlapM2 = getOverlapArea(newPoly, existingPoly)
                    if (overlapM2 > 1) {
                      onOverlapDetectedRef.current?.({
                        overlapAreaM2: overlapM2,
                        habitatName: `${hp.fossittCode} — ${hp.fossittName}`,
                        newPolygon: newPoly,
                        overlappingPolygon: existingPoly,
                      })
                      break // Report first overlap
                    }
                  }
                }
              })
            }
          })

          // --- pm:remove — show delete confirmation ---
          // Geoman removes the layer from map on click. We re-add it dimmed,
          // then ask for confirmation before permanently deleting.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:remove', (e: any) => {
            isEditingRef.current = false
            const layer = e.layer as L.Polygon
            // Re-add layer to map with dimmed style (pending confirmation)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((layer as any).setStyle) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(layer as any).setStyle({ opacity: 0.3, fillOpacity: 0.05, dashArray: '8, 4' })
            }
            layer.addTo(map)
            pendingDeleteLayerRef.current = layer
            setShowDeleteConfirm(true)
          })

          // --- pm:cut — polygon clipped (A3.3) ---
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:cut', (e: any) => {
            if (e.originalLayer && featureGroupRef.current?.hasLayer(e.originalLayer)) {
              featureGroupRef.current.removeLayer(e.originalLayer)
            }
            if (e.layer) {
              map.removeLayer(e.layer)
              featureGroupRef.current?.addLayer(e.layer)
            }
            notifyChange(collectFeatures(), true)
          })

          // --- Edit mode toggle — collect features when exiting (A3.4) ---
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:globaleditmodetoggled', (e: any) => {
            isEditingRef.current = e.enabled
            if (!e.enabled) {
              notifyChange(collectFeatures(), true)
            }
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:globalremovalmodetoggled', (e: any) => {
            isEditingRef.current = e.enabled
          })

          // --- Drag mode toggle — persist position after drag ---
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:globaldragmodetoggled', (e: any) => {
            isEditingRef.current = e.enabled
            if (!e.enabled) {
              notifyChange(collectFeatures(), true)
            }
          })

          // --- Snap visualization — show green dot at snap point ---
          let snapMarker: L.CircleMarker | null = null
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const leaflet = require('leaflet')

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:snap', (e: any) => {
            if (!snapMarker) {
              snapMarker = leaflet
                .circleMarker(e.snapLatLng || e.latlng, {
                  radius: 6,
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.8,
                  weight: 2,
                  pane: 'markerPane',
                })
                .addTo(map)
            } else {
              snapMarker.setLatLng(e.snapLatLng || e.latlng)
            }
          })

          map.on('pm:unsnap', () => {
            if (snapMarker) {
              map.removeLayer(snapMarker)
              snapMarker = null
            }
          })

          // Clean up snap marker and area overlay when drawing ends
          map.on('pm:drawend', () => {
            if (snapMarker) {
              map.removeLayer(snapMarker)
              snapMarker = null
            }
            setDrawMeasurement(null)
          })

          // --- Live area/perimeter calculation during drawing ---
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:drawstart', () => {
            setDrawMeasurement(null)
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('pm:vertexadded', (e: any) => {
            try {
              const workingLayer = e.workingLayer
              if (!workingLayer?.getLatLngs) return
              const latlngs = workingLayer.getLatLngs()
              // Flatten nested arrays (Geoman may nest them)
              const flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs
              if (flat.length < 3) {
                setDrawMeasurement(null)
                return
              }
              // Dynamic import to keep init fast
              import('@/lib/gis/draw-area-calculator').then(({ calculateDrawMeasurement }) => {
                const result = calculateDrawMeasurement(flat)
                setDrawMeasurement(result)
              })
            } catch {
              // ignore calculation errors during draw
            }
          })

          // --- Undo/Redo history stack ---
          const historyStack: GeoJSON.Feature[][] = []
          let historyIndex = -1

          const pushHistory = () => {
            const snapshot = collectFeatures()
            // Trim future entries on new action
            historyStack.splice(historyIndex + 1)
            historyStack.push(snapshot)
            historyIndex = historyStack.length - 1
          }

          const restoreSnapshot = (features: GeoJSON.Feature[]) => {
            if (!featureGroupRef.current) return
            featureGroupRef.current.clearLayers()
            for (const feat of features) {
              const layer = leaflet.geoJSON(feat, {
                style: { color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.1 },
              })
              layer.eachLayer((l: L.Layer) => featureGroupRef.current?.addLayer(l))
            }
            notifyChange(features, true)
          }

          const undo = () => {
            if (historyIndex <= 0) return
            historyIndex--
            restoreSnapshot(historyStack[historyIndex])
          }

          const redo = () => {
            if (historyIndex >= historyStack.length - 1) return
            historyIndex++
            restoreSnapshot(historyStack[historyIndex])
          }

          // Push initial state
          pushHistory()

          // Wrap notifyChange to auto-push history
          const originalNotifyChange = notifyChange
          const notifyChangeWithHistory = (features: GeoJSON.Feature[], isEdit = false) => {
            originalNotifyChange(features, isEdit)
            pushHistory()
          }

          // Re-bind events to use history-aware notifyChange
          // (the previously bound events use the original notifyChange via closure,
          //  so we override by adding history push after each event)
          map.on('pm:create', () => pushHistory())
          map.on('pm:remove', () => pushHistory())
          map.on('pm:cut', () => pushHistory())

          // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z = redo, Escape = cancel
          const container = map.getContainer()
          const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.includes('Mac')
            const mod = isMac ? e.metaKey : e.ctrlKey

            if (mod && !e.shiftKey && e.key === 'z') {
              e.preventDefault()
              undo()
            } else if (mod && e.shiftKey && e.key === 'z') {
              e.preventDefault()
              redo()
            } else if (e.key === 'Escape') {
              // Cancel any active draw/edit mode
              if (map.pm.globalDrawModeEnabled()) {
                map.pm.disableDraw()
              }
              if (map.pm.globalEditModeEnabled()) {
                map.pm.disableGlobalEditMode()
              }
              if (map.pm.globalRemovalModeEnabled()) {
                map.pm.disableGlobalRemovalMode()
              }
              if (map.pm.globalDragModeEnabled()) {
                map.pm.disableGlobalDragMode()
              }
              if (map.pm.globalCutModeEnabled()) {
                map.pm.disableGlobalCutMode()
              }
            }
          }
          container.addEventListener('keydown', handleKeyDown)
          // Make container focusable for keyboard events
          if (!container.getAttribute('tabindex')) {
            container.setAttribute('tabindex', '0')
          }

          geomanReadyRef.current = true
        } catch (error) {
          console.error('Failed to initialize Geoman:', error)
        }
      }

      init()
      // No cleanup — Geoman controls persist for the map's lifetime
    }, [map, editable]) // eslint-disable-line react-hooks/exhaustive-deps

    return null
  }

  // Delete confirmation handlers
  const confirmDelete = React.useCallback(() => {
    const layer = pendingDeleteLayerRef.current
    if (layer && mapRef.current) {
      mapRef.current.removeLayer(layer)
      if (featureGroupRef.current?.hasLayer(layer)) {
        featureGroupRef.current.removeLayer(layer)
      }
    }
    pendingDeleteLayerRef.current = null
    setShowDeleteConfirm(false)
    // Notify parent with remaining features
    const features: GeoJSON.Feature[] = []
    featureGroupRef.current?.eachLayer((l: L.Layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geo = (l as any).toGeoJSON?.() as GeoJSON.Feature | undefined
      if (geo?.geometry?.type === 'Polygon' && geo.geometry.coordinates?.[0]?.length >= 4) {
        features.push(geo)
      }
    })
    setDrawnFeatures(features)
    const geom = features[0]?.geometry
    lastLoadedBoundaryRef.current =
      features.length > 0 && geom && 'coordinates' in geom ? JSON.stringify(geom.coordinates) : null
    onBoundaryChangeRef.current?.({ type: 'FeatureCollection', features }, false)
  }, [])

  const cancelDelete = React.useCallback(() => {
    const layer = pendingDeleteLayerRef.current
    if (layer) {
      // Restore original style and add back to FeatureGroup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((layer as any).setStyle) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(layer as any).setStyle({ opacity: 1, fillOpacity: 0.1, dashArray: '' })
      }
      if (mapRef.current) {
        mapRef.current.removeLayer(layer)
      }
      featureGroupRef.current?.addLayer(layer)
    }
    pendingDeleteLayerRef.current = null
    setShowDeleteConfirm(false)
  }, [])

  // Convert buffer zones Map to array for rendering
  const bufferZonesArray = React.useMemo(() => {
    if (!bufferZones) return []
    return Array.from(bufferZones.entries()).sort((a, b) => b[0] - a[0]) // Sort by distance descending (larger first)
  }, [bufferZones])

  return (
    <>
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <div className="bg-background mx-4 max-w-sm rounded-lg border p-6 shadow-xl">
            <h3 className="text-foreground mb-2 text-lg font-semibold">Delete polygon?</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              This will permanently remove the polygon from the map. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Live area/perimeter overlay during polygon drawing */}
      {drawMeasurement && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
          className="bg-background/95 text-foreground rounded-lg border px-4 py-2 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 text-sm font-medium">
            <span>
              Area:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {drawMeasurement.areaHa < 0.01
                  ? `${(drawMeasurement.areaHa * 10000).toFixed(0)} m²`
                  : `${drawMeasurement.areaHa.toFixed(2)} ha`}
              </strong>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              Perimeter:{' '}
              <strong className="text-blue-600 dark:text-blue-400">
                {drawMeasurement.perimeterM < 1000
                  ? `${drawMeasurement.perimeterM.toFixed(0)} m`
                  : `${(drawMeasurement.perimeterM / 1000).toFixed(2)} km`}
              </strong>
            </span>
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full min-h-100 w-full"
        style={{ height: '100%', minHeight: '400px' }}
        zoomControl={false}
      >
        {/* Base map — WMS, TMS, or regular tile depending on style */}
        {tileConfig.wms && tileConfig.wms.transparent && (
          <TileLayer
            key="base-streets"
            url={TILE_LAYERS.streets.url}
            attribution={TILE_LAYERS.streets.attribution}
          />
        )}
        {tileConfig.wms ? (
          <WMSTileLayer
            key={currentStyle}
            url={tileConfig.url}
            params={tileConfig.wms}
            maxZoom={tileConfig.maxZoom}
            attribution={tileConfig.attribution}
          />
        ) : (
          <TileLayer key={currentStyle} url={tileConfig.url} attribution={tileConfig.attribution} />
        )}
        {/* Labels overlay for hybrid mode */}
        {currentStyle === 'hybrid' && (
          <TileLayer
            key="hybrid-labels"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            pane="overlayPane"
          />
        )}
        {/* GBIF bat records overlay */}
        {showBatRecords && (
          <TileLayer
            key="gbif-bats"
            url="https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=734&country=IE&style=orange.point"
            attribution="Bat records &copy; GBIF"
            pane="overlayPane"
            tileSize={512}
            zoomOffset={-1}
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

        {/* Other site boundaries (inactive sites — dimmed, non-interactive) */}
        {otherBoundaries.map((feat, idx) => (
          <GeoJSON
            key={`other-boundary-${idx}-${feat.geometry.coordinates[0]?.[0]?.[0]}`}
            data={feat}
            style={() => ({
              color: '#94a3b8',
              weight: 2,
              fillColor: '#94a3b8',
              fillOpacity: 0.08,
              dashArray: '6, 4',
            })}
          />
        ))}

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
          />
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
    </>
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
  otherBoundaries = [],
  findings = [],
  onFindingClick,
  habitatPolygons = [],
  selectedHabitatId,
  onHabitatClick,
  allowMultipleDrawings = false,
  npwsSites: externalNpwsSites,
  onOverlapDetected,
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

  // GBIF bat records overlay
  const [showBatRecords, setShowBatRecords] = React.useState(false)

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

  // All boundaries: active + others (for per-site layer queries)
  const allBoundaries = React.useMemo(() => {
    const bounds = [boundary, ...(otherBoundaries ?? [])].filter(
      Boolean
    ) as GeoJSON.Feature<GeoJSON.Polygon>[]
    return bounds
  }, [boundary, otherBoundaries])

  // NPWS layer overlay — queries per-site, merges results
  const { sites: npwsSitesRaw, isLoading: npwsLoading } = useNPWSLayers(
    mapInstance,
    allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : [],
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

  // EPA layer overlay — queries per-site, merges results
  const { counts: epaCounts, isLoading: epaLoading } = useEPALayers(
    mapInstance,
    allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : [],
    visibleLayers,
    npwsSearchRadius,
    ignoredItems,
    deletedItems
  )

  // BirdWatch Ireland I-WEBS layer overlay
  const [iwebsVisibleLayers, setIwebsVisibleLayers] = React.useState<string[]>([])
  useIWebsLayers(mapInstance, boundary ?? null, iwebsVisibleLayers)

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

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
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
          otherBoundaries={otherBoundaries}
          findings={findings}
          onFindingClick={onFindingClick}
          habitatPolygons={habitatPolygons}
          selectedHabitatId={selectedHabitatId}
          onHabitatClick={onHabitatClick}
          allowMultipleDrawings={allowMultipleDrawings}
          onMapReady={setMapInstance}
          showBatRecords={showBatRecords}
          onOverlapDetected={onOverlapDetected}
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
        {/* Layers dropdown */}
        {showLayersControl && (
          <MapLayersDropdown
            currentStyle={currentStyle}
            setCurrentStyle={setCurrentStyle}
            mapRef={mapRef}
            portalContainer={containerRef.current}
            showCounties={showCounties}
            onToggleCounties={() => setShowCounties(!showCounties)}
            showTownlands={showTownlands}
            onToggleTownlands={() => setShowTownlands(!showTownlands)}
            showBatRecords={showBatRecords}
            onToggleBatRecords={setShowBatRecords}
            iwebsVisibleLayers={iwebsVisibleLayers}
            onToggleIwebsLayer={(layerId, checked) =>
              setIwebsVisibleLayers((prev) =>
                checked ? [...prev, layerId] : prev.filter((id) => id !== layerId)
              )
            }
          />
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
