'use client'

import * as React from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type L from 'leaflet'

import type { DeskResearchFinding } from '@/components/desk-research/finding-card'
import type { MapLayer } from '@/components/maps/map-types'
import { useIWebsLayers } from '@/components/maps/iwebs-layer-overlay'
import { useNPWSLayers } from '@/components/maps/npws-layer-overlay'

export interface MapControllerProps {
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  selectedFinding?: DeskResearchFinding | null
  onMapClick?: (latlng?: { lat: number; lng: number }) => void
  onMapReady?: () => void
  mapRef: React.MutableRefObject<LeafletMap | null>
  skipFitBounds?: boolean
  /** Whether initial fit-to-bounds has already happened (shared ref from parent) */
  hasFitToBoundaryRef: React.MutableRefObject<boolean>
  /** Townlands layer config */
  townlandsLayer?: MapLayer
  loadTownlandsForBbox: (bbox: string) => void
  setCurrentZoom: React.Dispatch<React.SetStateAction<number>>
  /** I-WEBS overlay config */
  iwebsVisibleLayers: string[]
  /** NPWS overlay config */
  npwsVisibleLayers: string[]
  /** react-leaflet useMap hook — must be called in the component using it */
  useMap: () => LeafletMap
  /** Buffer distances (km). When provided, the initial fit expands to the
   * largest buffer ring so users see the full buffer context on load. */
  bufferDistances?: number[]
}

/**
 * Inner controller rendered inside <MapContainer>.
 * Handles scale control, fit-bounds, finding zoom, townlands fetch,
 * click handler, and popup-close fix.
 */
export function MapController({
  boundary,
  allBoundaries,
  selectedFinding,
  onMapClick,
  onMapReady,
  mapRef,
  skipFitBounds,
  hasFitToBoundaryRef,
  townlandsLayer,
  loadTownlandsForBbox,
  setCurrentZoom,
  iwebsVisibleLayers,
  npwsVisibleLayers,
  useMap,
  bufferDistances,
}: MapControllerProps) {
  const map = useMap()

  // ── Scale control ────────────────────────────────────────────────────────
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

  // ── Map click → clear selection / pass coordinates ───────────────────────
  React.useEffect(() => {
    if (!map || !onMapClick) return

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, onMapClick])

  // ── Popup-close drag fix ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!map) return

    const handlePopupClose = () => {
      setTimeout(() => {
        if (!map.dragging.enabled()) {
          map.dragging.enable()
        }
        if (!map.scrollWheelZoom.enabled()) {
          map.scrollWheelZoom.enable()
        }
      }, 10)
    }

    map.on('popupclose', handlePopupClose)
    return () => {
      map.off('popupclose', handlePopupClose)
    }
  }, [map])

  // ── Fit to boundary on initial load ONLY ─────────────────────────────────
  React.useEffect(() => {
    if (!map || hasFitToBoundaryRef.current || skipFitBounds) return

    const boundariesToFit =
      allBoundaries && allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : []

    if (boundariesToFit.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')

    // Expand fit extent by the largest buffer so users see buffer context
    // on first load. Without this the initial zoom clips the buffer rings.
    const maxBufferKm =
      bufferDistances && bufferDistances.length > 0 ? Math.max(...bufferDistances) : 0
    let featuresToFit: GeoJSON.Feature[] = boundariesToFit
    if (maxBufferKm > 0) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const turf = require('@turf/turf')
      featuresToFit = boundariesToFit.map((b) => {
        try {
          return turf.buffer(b, maxBufferKm, { units: 'kilometers' }) as GeoJSON.Feature
        } catch {
          return b
        }
      })
    }

    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: featuresToFit,
    }
    const geoJsonLayer = L.geoJSON(featureCollection)
    const bounds = geoJsonLayer.getBounds()
    if (!bounds.isValid()) return

    const tryFit = () => {
      const size = map.getSize()
      // Container is 0×0 when the map is mounted inside a hidden tab. Fit
      // would center on an arbitrary point. Retry once the container has
      // real dimensions (invalidateSize fires a 'resize' event).
      if (size.x <= 0 || size.y <= 0) return false
      map.fitBounds(bounds, { padding: [30, 30] })
      hasFitToBoundaryRef.current = true
      return true
    }

    if (tryFit()) return

    const onResize = () => {
      if (tryFit()) {
        map.off('resize', onResize)
      }
    }
    map.on('resize', onResize)
    return () => {
      map.off('resize', onResize)
    }
  }, [boundary, allBoundaries, bufferDistances, map, hasFitToBoundaryRef, skipFitBounds])

  // ── Store map reference ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (map) {
      mapRef.current = map
      onMapReady?.()
    }
  }, [map, mapRef, onMapReady])

  // ── Zoom to selected finding ─────────────────────────────────────────────
  const lastZoomedFindingId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (selectedFinding?.location && map) {
      if (lastZoomedFindingId.current === selectedFinding.id) return
      lastZoomedFindingId.current = selectedFinding.id

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet')
      try {
        const location = selectedFinding.location

        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates as [number, number]
          map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
        } else if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
          const geoJsonLayer = L.geoJSON(location)
          const bounds = geoJsonLayer.getBounds()
          map.fitBounds(bounds, { padding: [50, 50], animate: true })
        } else if (location.type === 'GeometryCollection') {
          const firstGeom = (location as GeoJSON.GeometryCollection).geometries[0]
          if (firstGeom?.type === 'Point') {
            const [lng, lat] = (firstGeom as GeoJSON.Point).coordinates
            map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
          }
        } else if (location.type === 'LineString' || location.type === 'MultiLineString') {
          const geoJsonLayer = L.geoJSON(location)
          const bounds = geoJsonLayer.getBounds()
          map.fitBounds(bounds, { padding: [50, 50], animate: true })
        }
      } catch (error) {
        console.warn('Error zooming to finding:', error)
      }
    } else if (!selectedFinding) {
      lastZoomedFindingId.current = null
    }
  }, [selectedFinding, map])

  // ── Track zoom level and load townlands ──────────────────────────────────
  React.useEffect(() => {
    if (!map) return

    const handleZoomEnd = () => {
      const newZoom = map.getZoom()
      setCurrentZoom(newZoom)

      if (newZoom >= 12 && townlandsLayer?.visible) {
        const bounds = map.getBounds()
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
        loadTownlandsForBbox(bbox)
      }
    }

    const handleMoveEnd = () => {
      const currentZoomLevel = map.getZoom()
      if (currentZoomLevel >= 12 && townlandsLayer?.visible) {
        const bounds = map.getBounds()
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
        loadTownlandsForBbox(bbox)
      }
    }

    map.on('zoomend', handleZoomEnd)
    map.on('moveend', handleMoveEnd)

    // Initial check
    handleZoomEnd()

    return () => {
      map.off('zoomend', handleZoomEnd)
      map.off('moveend', handleMoveEnd)
    }
  }, [map, townlandsLayer?.visible, loadTownlandsForBbox, setCurrentZoom])

  // ── I-WEBS & NPWS overlays ──────────────────────────────────────────────
  useIWebsLayers(map, boundary ?? null, iwebsVisibleLayers)

  const npwsBoundaries =
    allBoundaries && allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : []
  useNPWSLayers(map, npwsBoundaries, npwsVisibleLayers)

  return null
}
