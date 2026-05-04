'use client'

import * as React from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { fetchNlcPolygons } from '@/lib/external-apis/osi'
import { HabitatPolygonLayer } from '@/components/maps/habitat-polygon-layer'

interface ViewportHabitatDetailProps {
  /** Whether to fetch viewport-adaptive detail at all. */
  enabled: boolean
  /** Below this zoom we render nothing — the project layer is good enough. */
  minZoom?: number
  /** react-leaflet useMap hook — must be passed from a MapContainer parent. */
  useMap: () => LeafletMap
  /** react-leaflet GeoJSON component — passed through to HabitatPolygonLayer. */
  GeoJSON: React.ComponentType<Record<string, unknown>>
  /**
   * Fired whenever the layer goes active/inactive (zoom crosses minZoom).
   * Parent uses this to hide the coarse project layer at high zoom — that
   * layer's geometry was simplified for the project bbox so its TIN-like
   * triangulation is visible at z16+ and clashes with the detail polygons.
   */
  onActiveChange?: (active: boolean) => void
  /** Forwarded to HabitatPolygonLayer — toggles between Heritage and NLC. */
  useNativeColors?: boolean
  /** Forwarded — Heritage Council Appendix 6 hatch overlay. */
  useHatchPatterns?: boolean
  /**
   * FOSSITT code of the habitat the user selected in the list. When set, all
   * NLC parcels matching this code render at high opacity (0.85) and the rest
   * fade (0.05) — same convention HabitatPolygonLayer's makeHabitatStyle
   * already keys off `feature.properties.fillOpacity`. Without this, clicking
   * a habitat at high zoom only highlighted the coarse saved boundary while
   * the crisp NLC parcels stayed unchanged.
   */
  selectedFossittCode?: string | null
}

/**
 * Renders an overlay HabitatPolygonLayer that re-fetches the current viewport
 * with sub-meter tolerance whenever the user pans or zooms past `minZoom`.
 *
 * Why: the project-level fetch in `useHabitatSearch` runs once for the whole
 * project bbox with one tolerance value — quality plateaus around z16. Esri's
 * own viewer handles z17+ by re-querying per viewport with a finer grid; this
 * component does the same trick on top of our existing layer.
 *
 * Caching: results are kept in-memory keyed by zoom + binned bbox (~500m bins)
 * so panning around the same area doesn't re-hit the API. `latestKeyRef`
 * guards against stale fetches winning a race when the user keeps panning.
 *
 * Labels: this overlay passes `markLabelAnchors=false` to the fetcher so it
 * does NOT contribute FOSSITT tooltips. The base project layer keeps its own
 * labels — the overlay just adds visual sharpness.
 */
export function ViewportHabitatDetail({
  enabled,
  minZoom = 16,
  useMap,
  GeoJSON,
  onActiveChange,
  useNativeColors = false,
  useHatchPatterns = false,
  selectedFossittCode = null,
}: ViewportHabitatDetailProps) {
  const map = useMap()
  const [detailPolygons, setDetailPolygons] = React.useState<GeoJSON.FeatureCollection | null>(null)
  // FIFO-capped at 30 entries to bound heap. A long pan session at z18
  // through 100+ unique 500m bins would otherwise hold hundreds of MB
  // forever. JS Map preserves insertion order so first-key = oldest.
  const cacheRef = React.useRef<Map<string, GeoJSON.Feature[]>>(new Map())
  const CACHE_LIMIT = 30
  const latestKeyRef = React.useRef<string>('')
  // Track in-flight fetch so we can abort it when a newer viewport is
  // requested — saves bandwidth and avoids the rare race where a slow old
  // request resolves and gets through the latestKeyRef guard by accident.
  const inflightAbortRef = React.useRef<AbortController | null>(null)
  // Keep callback in a ref so the effect doesn't tear down/re-mount when
  // the parent re-renders with a fresh function identity.
  const onActiveChangeRef = React.useRef(onActiveChange)
  onActiveChangeRef.current = onActiveChange

  React.useEffect(() => {
    if (!enabled || !map) {
      setDetailPolygons(null)
      latestKeyRef.current = ''
      onActiveChangeRef.current?.(false)
      return
    }

    let timeout: ReturnType<typeof setTimeout> | null = null

    // Active flag flips on zoomend, not moveend, so the project layer
    // toggles instantly when the user crosses the zoom threshold instead of
    // waiting through the 400ms fetch debounce.
    const updateActive = () => {
      onActiveChangeRef.current?.(map.getZoom() >= minZoom)
    }

    const fetchForViewport = () => {
      const zoom = map.getZoom()
      if (zoom < minZoom) {
        latestKeyRef.current = ''
        setDetailPolygons(null)
        return
      }

      const bounds = map.getBounds()
      const bbox = {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      }

      // 0.005 deg ~ 500m bins so small pans land in the cache instead of
      // re-hitting the API. Coarser bins miss too many detail levels;
      // finer bins thrash the cache.
      const binSize = 0.005
      const cacheKey = [
        zoom,
        Math.round(bbox.minLat / binSize),
        Math.round(bbox.maxLat / binSize),
        Math.round(bbox.minLng / binSize),
        Math.round(bbox.maxLng / binSize),
      ].join('/')
      latestKeyRef.current = cacheKey

      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setDetailPolygons({ type: 'FeatureCollection', features: cached })
        return
      }

      // Cancel any older in-flight fetch — we know its bbox is stale.
      inflightAbortRef.current?.abort()
      const controller = new AbortController()
      inflightAbortRef.current = controller

      fetchNlcPolygons({
        bbox,
        // ~0.3m at lat 53° — pushes server quantization grid finer than the
        // 0.5m floor the project-level fetch uses, so individual buildings
        // and hedgerows render crisp at z17-18.
        minTolerance: 0.000003,
        // Project layer is hidden when the detail layer is active, so we
        // need our own labels here (one per habitat type within the
        // viewport) to keep FOSSITT codes visible.
        markLabelAnchors: true,
        // Palette is resolved at render time by HabitatPolygonLayer based on
        // the parent's useNativeColors prop, so we don't bake colours here.
      })
        .then((fc) => {
          // Stale-fetch guard: if the user moved on, drop this result.
          if (controller.signal.aborted || latestKeyRef.current !== cacheKey) return
          // FIFO eviction — drop the oldest entry when over the cap.
          if (cacheRef.current.size >= CACHE_LIMIT) {
            const oldestKey = cacheRef.current.keys().next().value
            if (oldestKey !== undefined) cacheRef.current.delete(oldestKey)
          }
          cacheRef.current.set(cacheKey, fc.features)
          setDetailPolygons(fc)
        })
        .catch(() => {
          // fetchNlcPolygons already logs internally; nothing actionable here.
        })
    }

    const handleMoveEnd = () => {
      if (timeout) clearTimeout(timeout)
      // 400ms debounce — long enough to ride out a fast scroll, short enough
      // that the detail layer feels responsive when the user stops moving.
      timeout = setTimeout(fetchForViewport, 400)
    }

    map.on('moveend', handleMoveEnd)
    map.on('zoomend', updateActive)
    // Trigger once on mount so the layer appears without requiring a pan.
    updateActive()
    fetchForViewport()

    return () => {
      if (timeout) clearTimeout(timeout)
      map.off('moveend', handleMoveEnd)
      map.off('zoomend', updateActive)
      inflightAbortRef.current?.abort()
      inflightAbortRef.current = null
      onActiveChangeRef.current?.(false)
    }
  }, [enabled, minZoom, map])

  // Apply selection-driven fillOpacity per feature so HabitatPolygonLayer's
  // existing fade logic emphasises matching parcels and dims the rest. Cheap
  // map; React.useMemo keeps the reference stable when selection / data
  // don't actually change so the GeoJSON layer doesn't churn.
  const styledPolygons = React.useMemo(() => {
    if (!detailPolygons) return null
    if (!selectedFossittCode) return detailPolygons
    return {
      ...detailPolygons,
      features: detailPolygons.features.map((f) => {
        const code = f.properties?.fossitt_code as string | undefined
        const isMatch = !!code && code === selectedFossittCode
        return {
          ...f,
          properties: {
            ...(f.properties ?? {}),
            fillOpacity: isMatch ? 0.85 : 0.05,
          },
        }
      }),
    }
  }, [detailPolygons, selectedFossittCode])

  if (!styledPolygons || !styledPolygons.features.length) return null

  return (
    <HabitatPolygonLayer
      habitatPolygons={styledPolygons}
      habitatSelectionKey={selectedFossittCode || undefined}
      GeoJSON={GeoJSON}
      useMap={useMap}
      useNativeColors={useNativeColors}
      useHatchPatterns={useHatchPatterns}
    />
  )
}
