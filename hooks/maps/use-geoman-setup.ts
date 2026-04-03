'use client'

import * as React from 'react'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'
import type L from 'leaflet'
import type { HabitatPolygonOverlay } from '@/components/maps/map-types'
import type { DrawMeasurement } from '@/components/maps/draw-measurement-overlay'

interface GeomanSetupConfig {
  map: LeafletMap | null
  editable: boolean
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>
  /** Whether to allow multiple drawn polygons (habitat mapping mode) */
  allowMultipleDrawings: boolean
  /** Existing habitat polygons for trace-along and overlap detection */
  habitatPolygons: HabitatPolygonOverlay[]
  /** Callback when boundary changes */
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
  /** Callback when overlap with existing habitat is detected */
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
  /** Ref to track whether the user is currently editing */
  isEditingRef: React.MutableRefObject<boolean>
  /** Ref to track the last loaded boundary key (prevents unnecessary reloads) */
  lastLoadedBoundaryRef: React.MutableRefObject<string | null>
  /** State setter for drawn features */
  setDrawnFeatures: React.Dispatch<React.SetStateAction<GeoJSON.Feature[]>>
  /** Pending delete layer ref for delete confirmation */
  pendingDeleteLayerRef: React.MutableRefObject<L.Layer | null>
  /** State setter for showing delete confirmation dialog */
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>
  /** Called when undo/redo history should be pushed */
  onHistoryPush: () => void
}

interface GeomanSetupResult {
  /** Live area/perimeter measurement during drawing */
  drawMeasurement: DrawMeasurement | null
  /** Collect all valid polygon features from the FeatureGroup */
  collectFeatures: () => GeoJSON.Feature[]
  /** Update state + notify parent of feature changes */
  notifyChange: (features: GeoJSON.Feature[], isEdit?: boolean) => void
}

/**
 * Initializes Geoman drawing controls on a Leaflet map.
 *
 * Handles:
 * - Container readiness check (waits for clientHeight > 0)
 * - Dynamic import of @geoman-io/leaflet-geoman-free
 * - Toolbar config (polygon, rectangle, edit, drag, cut, delete)
 * - pm:create with trace-along and overlap detection
 * - pm:remove (deferred to delete confirmation dialog)
 * - pm:cut, pm:globaleditmodetoggled, pm:globaldragmodetoggled
 * - pm:snap visualization
 * - Live area/perimeter measurement (pm:vertexadded)
 */
export function useGeomanSetup({
  map,
  editable,
  featureGroupRef,
  allowMultipleDrawings,
  habitatPolygons,
  onBoundaryChange,
  onOverlapDetected,
  isEditingRef,
  lastLoadedBoundaryRef,
  setDrawnFeatures,
  pendingDeleteLayerRef,
  setShowDeleteConfirm,
  onHistoryPush,
}: GeomanSetupConfig): GeomanSetupResult {
  const [drawMeasurement, setDrawMeasurement] = React.useState<DrawMeasurement | null>(null)

  // Geoman initialization flag -- persists across nested component re-renders
  const geomanReadyRef = React.useRef(false)

  // Stable refs to avoid stale closures in Geoman event handlers
  const onBoundaryChangeRef = React.useRef(onBoundaryChange)
  onBoundaryChangeRef.current = onBoundaryChange
  const allowMultipleDrawingsRef = React.useRef(allowMultipleDrawings)
  allowMultipleDrawingsRef.current = allowMultipleDrawings
  const onOverlapDetectedRef = React.useRef(onOverlapDetected)
  onOverlapDetectedRef.current = onOverlapDetected
  const habitatPolygonsRef = React.useRef(habitatPolygons)
  habitatPolygonsRef.current = habitatPolygons
  const onHistoryPushRef = React.useRef(onHistoryPush)
  onHistoryPushRef.current = onHistoryPush

  // Stable helpers exposed to consumers and used in event handlers
  const collectFeatures = React.useCallback((): GeoJSON.Feature[] => {
    const features: GeoJSON.Feature[] = []
    featureGroupRef.current?.eachLayer((layer: L.Layer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geo = (layer as any).toGeoJSON?.() as GeoJSON.Feature | undefined
      if (geo?.geometry?.type === 'Polygon' && geo.geometry.coordinates?.[0]?.length >= 4) {
        features.push(geo)
      }
    })
    return features
  }, [featureGroupRef])

  const notifyChange = React.useCallback(
    (features: GeoJSON.Feature[], isEdit = false) => {
      setDrawnFeatures(features)
      const geom = features[0]?.geometry
      lastLoadedBoundaryRef.current =
        features.length > 0 && geom && 'coordinates' in geom
          ? JSON.stringify(geom.coordinates)
          : null
      onBoundaryChangeRef.current?.({ type: 'FeatureCollection', features }, isEdit)
    },
    [setDrawnFeatures, lastLoadedBoundaryRef]
  )

  React.useEffect(() => {
    if (!editable || !map) return
    let cancelled = false

    const init = async () => {
      try {
        // Wait for map container to be fully visible using ResizeObserver
        await new Promise<void>((resolve) => {
          const container = map.getContainer()
          if (container?.clientHeight > 0) {
            resolve()
            return
          }
          // Use ResizeObserver for reliable detection of container becoming visible
          const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.contentRect.height > 0) {
                ro.disconnect()
                resolve()
                return
              }
            }
          })
          if (container) ro.observe(container)
          // Cleanup if cancelled or fallback after 5s (should never be needed)
          const fallback = setTimeout(() => {
            ro.disconnect()
            resolve()
          }, 5000)
          // Store cleanup refs so cancellation can clean up
          const checkCancelled = setInterval(() => {
            if (cancelled) {
              clearInterval(checkCancelled)
              clearTimeout(fallback)
              ro.disconnect()
              resolve()
            }
          }, 100)
        })
        if (cancelled) return
        await import('@geoman-io/leaflet-geoman-free')
        if (cancelled) return

        // Geoman uses L.Map.addInitHook to attach `map.pm` — but that only
        // fires for maps created AFTER the import.  When the map was created
        // before the dynamic import, `map.pm` is undefined.  Initialise it
        // manually so the toolbar works on the very first navigation.
        if (!map.pm) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const L = require('leaflet')
          if (L.PM?.Map) {
            map.pm = new L.PM.Map(map)
          }
        }
        if (!map.pm) return

        // Force Leaflet to recalculate container size so controls render correctly
        map.invalidateSize()
        // Wait one animation frame for the layout to stabilize after invalidateSize
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
        if (cancelled) return

        // Always ensure controls are visible (addControls is idempotent)
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
        map.pm.setLang(
          'custom' as Parameters<typeof map.pm.setLang>[0],
          {
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
          } as Record<string, unknown>
        )

        // Event handlers only need to be set up once
        if (geomanReadyRef.current) return

        // --- pm:create -- new polygon/rectangle drawn ---
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
          handleTraceAlong(
            map,
            layer,
            geoJSON,
            featureGroupRef,
            habitatPolygonsRef,
            allowMultipleDrawingsRef,
            notifyChange
          )

          notifyChange([geoJSON], false)

          // Check for overlap with existing habitat polygons
          handleOverlapDetection(
            geoJSON,
            habitatPolygonsRef,
            allowMultipleDrawingsRef,
            onOverlapDetectedRef
          )
        })

        // --- pm:remove -- show delete confirmation ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('pm:remove', (e: any) => {
          isEditingRef.current = false
          const layer = e.layer as L.Polygon
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((layer as any).setStyle) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(layer as any).setStyle({ opacity: 0.3, fillOpacity: 0.05, dashArray: '8, 4' })
          }
          layer.addTo(map)
          pendingDeleteLayerRef.current = layer
          setShowDeleteConfirm(true)
        })

        // --- pm:cut -- polygon clipped ---
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

        // --- Edit mode toggle -- collect features when exiting ---
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

        // --- Drag mode toggle -- persist position after drag ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('pm:globaldragmodetoggled', (e: any) => {
          isEditingRef.current = e.enabled
          if (!e.enabled) {
            notifyChange(collectFeatures(), true)
          }
        })

        // --- Snap visualization -- green dot at snap point ---
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
        map.on('pm:drawstart', () => {
          setDrawMeasurement(null)
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('pm:vertexadded', (e: any) => {
          try {
            const workingLayer = e.workingLayer
            if (!workingLayer?.getLatLngs) return
            const latlngs = workingLayer.getLatLngs()
            const flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs
            if (flat.length < 3) {
              setDrawMeasurement(null)
              return
            }
            import('@/lib/gis/draw-area-calculator').then(({ calculateDrawMeasurement }) => {
              const result = calculateDrawMeasurement(flat)
              setDrawMeasurement(result)
            })
          } catch {
            // ignore calculation errors during draw
          }
        })

        // Push history after create/remove/cut events
        map.on('pm:create', () => onHistoryPushRef.current())
        map.on('pm:remove', () => onHistoryPushRef.current())
        map.on('pm:cut', () => onHistoryPushRef.current())

        geomanReadyRef.current = true
      } catch (error) {
        console.error('Failed to initialize Geoman:', error)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [map, editable])

  return { drawMeasurement, collectFeatures, notifyChange }
}

// ── Private helpers ──────────────────────────────────────────────────────────

/** Align new polygon edges with existing habitat boundaries (trace-along) */
function handleTraceAlong(
  map: LeafletMap,
  layer: L.Polygon,
  geoJSON: GeoJSON.Feature,
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>,
  habitatPolygonsRef: React.RefObject<HabitatPolygonOverlay[]>,
  allowMultipleDrawingsRef: React.RefObject<boolean>,
  notifyChange: (features: GeoJSON.Feature[], isEdit: boolean) => void
) {
  if (
    !allowMultipleDrawingsRef.current ||
    habitatPolygonsRef.current.length === 0 ||
    geoJSON.geometry.type !== 'Polygon'
  ) {
    return
  }

  import('@/lib/gis/trace-along-feature').then(({ findNearestPolygonEdge, traceEdge }) => {
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
        const endResult = findNearestPolygonEdge(coords[i + 1], existingPolygons, 0.05)

        if (startResult && endResult && startResult.polygonIndex === endResult.polygonIndex) {
          const traced = traceEdge(
            existingPolygons[startResult.polygonIndex].geometry,
            startResult.point,
            endResult.point
          )
          if (traced.length > 2) {
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
        polyGeom.coordinates = [newCoords]
        if (featureGroupRef.current) {
          featureGroupRef.current.removeLayer(layer)
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const leaflet = require('leaflet')
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
      // Trace-along failed silently -- polygon stays as drawn
    }
  })
}

/** Check whether a newly drawn polygon overlaps an existing habitat polygon */
function handleOverlapDetection(
  geoJSON: GeoJSON.Feature,
  habitatPolygonsRef: React.RefObject<HabitatPolygonOverlay[]>,
  allowMultipleDrawingsRef: React.RefObject<boolean>,
  onOverlapDetectedRef: React.RefObject<
    | ((info: {
        overlapAreaM2: number
        habitatName: string
        newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
        overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
      }) => void)
    | undefined
  >
) {
  if (
    !allowMultipleDrawingsRef.current ||
    !onOverlapDetectedRef.current ||
    geoJSON.geometry.type !== 'Polygon'
  ) {
    return
  }

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
