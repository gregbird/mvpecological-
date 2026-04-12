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
  /** Other site boundaries (step 2 multi-site) also usable as trace-along targets */
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** The active site's current boundary — also a valid trace target when
      drawing a neighbor, since siteMgmt may create a new site on completion */
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
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
  otherBoundaries,
  boundary,
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
  const otherBoundariesRef = React.useRef(otherBoundaries)
  otherBoundariesRef.current = otherBoundaries
  const onHistoryPushRef = React.useRef(onHistoryPush)
  onHistoryPushRef.current = onHistoryPush

  // Stable callback ref for trace-along: pm:create event handler is attached
  // once (guarded by geomanReadyRef) so it captures the ref object at attach
  // time. Under React StrictMode (Next.js dev), the hook may remount and
  // create fresh ref objects, leaving the event handler holding a stale ref.
  // The callback ref below is re-written on every render with the CURRENT
  // prop values (see assignment after notifyChange is defined), and the
  // event handler invokes it indirectly, so the trace implementation always
  // sees fresh data regardless of which hook instance originally attached the
  // handler.
  const traceCallbackRef = React.useRef<(layer: L.Polygon, geoJSON: GeoJSON.Feature) => void>(
    () => {}
  )

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

  // Refresh trace callback on every render with latest closure values.
  // Event handler (pm:create) calls this indirectly via traceCallbackRef.current
  // so it is immune to stale-closure issues from React StrictMode remounts.
  // Include the currently active site's boundary as an additional trace
  // target: when `active.boundary` already exists and the user draws a new
  // polygon, siteMgmt auto-creates a new site (shifting the current boundary
  // into "other"), but that shift happens AFTER pm:create fires. Treating
  // the current `boundary` prop as a trace candidate lets the new polygon
  // snap to its edges regardless of siteMgmt timing.
  traceCallbackRef.current = (layer, geoJSON) => {
    if (!map) return
    const traceTargets: GeoJSON.Feature<GeoJSON.Polygon>[] = [...otherBoundaries]
    if (boundary?.geometry?.type === 'Polygon') {
      traceTargets.push(boundary)
    }
    handleTraceAlong(
      map,
      layer,
      geoJSON,
      featureGroupRef,
      habitatPolygons,
      traceTargets,
      notifyChange
    )
  }

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
        // Snap-related options are important for edit-mode vertex dragging:
        // - snapDistance 20 matches Geoman default (generous snap radius)
        // - snapSegment: snap to polygon edges (enables "touch neighbor")
        // - snapVertex:  snap to existing vertices (enables "share corner")
        // - snapMiddle:  snap to middle-markers (enables "split segment cleanly")
        map.pm.setGlobalOptions({
          snappable: true,
          snapDistance: 20,
          snapSegment: true,
          snapVertex: true,
          snapMiddle: true,
          allowSelfIntersection: true,
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

          // Ensure the freshly drawn polygon is itself a valid snap target
          // so subsequent edits (vertex drag) can snap to its own edges.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyDrawn = layer as any
          if (anyDrawn.options) {
            anyDrawn.options.pmIgnore = false
            anyDrawn.options.snapIgnore = false
          }
          if (anyDrawn.pm) {
            anyDrawn.pm.setOptions({
              snappable: true,
              snapDistance: 20,
              snapSegment: true,
              snapVertex: true,
              snapMiddle: true,
            })
          }

          // Trace-along: align new polygon edges with existing habitat
          // boundaries (step 4) or with other site boundaries (step 2 multi-site).
          // Routed through traceCallbackRef so the LATEST prop values are
          // used (StrictMode-safe).
          // notifyChange is called INSIDE handleTraceAlong (both modified and
          // unmodified paths) to avoid double-notification that creates ghost sites.
          traceCallbackRef.current(layer, geoJSON)

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
          const layer = e.layer as L.Polygon

          // If the removed layer is NOT in the FeatureGroup, it's a
          // non-editable layer (e.g., another site's boundary rendered by
          // React-Leaflet). Re-add it silently and skip the delete flow —
          // otherwise onBoundaryChange would receive the active boundary
          // and create a ghost site.
          if (!featureGroupRef.current?.hasLayer(layer)) {
            layer.addTo(map)
            return
          }

          isEditingRef.current = false
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
          // If the cut target is NOT in the FeatureGroup (e.g., another
          // site's boundary), undo the cut silently — otherwise the cut
          // result gets added to the FeatureGroup and creates a ghost site.
          if (e.originalLayer && !featureGroupRef.current?.hasLayer(e.originalLayer)) {
            if (e.layer) map.removeLayer(e.layer)
            e.originalLayer.addTo(map)
            return
          }
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
          if (e.enabled) {
            // Disable editing on layers outside the FeatureGroup (e.g. other
            // site boundaries managed by React-Leaflet). Without this, Geoman
            // adds vertex markers to those layers and React-Leaflet re-renders
            // corrupt Geoman's internal state, causing vertex edits to revert.
            // The layers remain snap targets (pmIgnore is NOT set).
            disableEditOnNonFeatureGroupLayers(map, featureGroupRef)
          }
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
          if (e.enabled) {
            disableEditOnNonFeatureGroupLayers(map, featureGroupRef)
          }
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

/**
 * Align new polygon edges with any existing neighboring polygon (trace-along).
 * Trace targets come from two sources:
 *   - habitatPolygons  — Step 4 field-research habitat mapping neighbors
 *   - otherBoundaries  — Step 2 multi-site boundary neighbors
 * If both are empty, tracing is skipped silently.
 */
function handleTraceAlong(
  map: LeafletMap,
  layer: L.Polygon,
  geoJSON: GeoJSON.Feature,
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>,
  habitatPolygons: HabitatPolygonOverlay[],
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[],
  notifyChange: (features: GeoJSON.Feature[], isEdit: boolean) => void
) {
  if (geoJSON.geometry.type !== 'Polygon') {
    notifyChange([geoJSON], false)
    return
  }

  // Combine habitat polygons + other site boundaries as trace candidates
  const habitatCandidates = habitatPolygons
    .filter((hp) => hp.geometry.type === 'Polygon')
    .map((hp) => ({
      type: 'Feature' as const,
      geometry: hp.geometry as GeoJSON.Polygon,
      properties: {},
    }))
  const otherCandidates = otherBoundaries.filter((f) => f.geometry?.type === 'Polygon')
  const existingPolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [
    ...habitatCandidates,
    ...otherCandidates,
  ]
  if (existingPolygons.length === 0) {
    notifyChange([geoJSON], false)
    return
  }

  import('@/lib/gis/trace-along-feature').then(({ findNearestPolygonEdge, traceEdge }) => {
    try {
      const polyGeom = geoJSON.geometry as GeoJSON.Polygon
      const coords = polyGeom.coordinates[0] as [number, number][]
      let modified = false
      const newCoords: [number, number][] = [coords[0]]

      // Snap radius for trace: 0.2 km (200 m). Previously 50 m was too strict
      // for boundary drawing — users naturally click 100-200 m off the edge at
      // typical zoom levels. Habitat mapping (smaller polygons) may be served
      // better by a lower value in the future; tune per context if needed.
      const TRACE_SNAP_KM = 0.2
      for (let i = 0; i < coords.length - 1; i++) {
        const startResult = findNearestPolygonEdge(coords[i], existingPolygons, TRACE_SNAP_KM)
        const endResult = findNearestPolygonEdge(coords[i + 1], existingPolygons, TRACE_SNAP_KM)

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
            pmIgnore: false,
            snapIgnore: false,
          })
          updatedLayer.eachLayer((l: L.Layer) => {
            featureGroupRef.current?.addLayer(l)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyL = l as any
            if (anyL.options) {
              anyL.options.pmIgnore = false
              anyL.options.snapIgnore = false
            }
            if (anyL.pm) {
              anyL.pm.setOptions({
                snappable: true,
                snapDistance: 20,
                snapSegment: true,
                snapVertex: true,
                snapMiddle: true,
              })
            }
          })
        }
      }
      // Notify exactly once — whether trace modified the polygon or not.
      // The pm:create handler no longer calls notifyChange to prevent double
      // notification that caused ghost site creation in multi-site mode.
      notifyChange([geoJSON], false)
    } catch (err) {
      console.error('[trace] error:', err)
      // On error, notify with the original (unmodified) geoJSON so the
      // polygon is still saved — partial coordinate mutation cannot happen
      // because polyGeom.coordinates is only reassigned inside `if (modified)`.
      notifyChange([geoJSON], false)
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

/**
 * After Geoman enters global edit/drag mode, disable editing on every layer
 * that is NOT part of the drawing FeatureGroup. This prevents Geoman from
 * adding vertex markers to other-site boundary layers (managed by
 * React-Leaflet), which would corrupt Geoman's internal edit state and
 * cause vertex edits on the active polygon to revert on release.
 *
 * These layers keep pmIgnore=false so they remain valid snap targets.
 */
function disableEditOnNonFeatureGroupLayers(
  map: LeafletMap,
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>
) {
  map.eachLayer((layer: L.Layer) => {
    // Skip the FeatureGroup itself and its child layers — those should stay editable
    if (layer === featureGroupRef.current) return
    if (featureGroupRef.current?.hasLayer(layer)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pm = (layer as any).pm
    if (pm?.enabled?.()) {
      pm.disable()
    }
  })
}
