'use client'

import * as React from 'react'
import { useMap } from 'react-leaflet'
import type L from 'leaflet'

interface GeomanControlsProps {
  /** Called when a new polygon is drawn */
  onCreated?: (feature: GeoJSON.Feature<GeoJSON.Polygon>) => void
  /** Called when a polygon is edited */
  onEdited?: (features: GeoJSON.Feature[]) => void
  /** Called when a polygon is removed */
  onRemoved?: (feature: GeoJSON.Feature) => void
  /** Enable drawing mode */
  drawEnabled?: boolean
  /** Snapping distance in pixels */
  snapDistance?: number
  /** Allow self-intersection */
  allowSelfIntersection?: boolean
  /** Drawing color */
  pathOptions?: L.PathOptions
}

/**
 * Geoman integration for Leaflet maps.
 * Provides snapping, vertex editing, and polygon drawing.
 * Replaces leaflet-draw's EditControl.
 */
export function GeomanControls({
  onCreated,
  onEdited,
  onRemoved,
  drawEnabled = true,
  snapDistance = 15,
  allowSelfIntersection = false,
  pathOptions,
}: GeomanControlsProps) {
  const map = useMap()
  const initializedRef = React.useRef(false)

  React.useEffect(() => {
    if (initializedRef.current) return
    // Dynamically import geoman CSS and JS
    const initGeoman = async () => {
      try {
        await import('@geoman-io/leaflet-geoman-free')

        if (!map.pm) return

        // Global options
        map.pm.setGlobalOptions({
          snappable: true,
          snapDistance,
          snapMiddle: true,
          allowSelfIntersection,
          templineStyle: { color: '#3388ff', weight: 2 },
          hintlineStyle: { color: '#3388ff', weight: 2, dashArray: '5,5' },
          pathOptions: pathOptions ?? {
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.1,
            weight: 2,
          },
        })

        // Add toolbar controls
        map.pm.addControls({
          position: 'topleft',
          drawMarker: false,
          drawCircleMarker: false,
          drawPolyline: false,
          drawRectangle: false,
          drawCircle: false,
          drawText: false,
          drawPolygon: drawEnabled,
          editMode: true,
          dragMode: false,
          cutPolygon: true,
          removalMode: true,
          rotateMode: false,
        })

        // Event handlers
        map.on('pm:create', (e: { layer: L.Layer }) => {
          const layer = e.layer as L.Polygon
          if (layer.toGeoJSON && onCreated) {
            const feature = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>
            onCreated(feature)
          }
        })

        map.on('pm:edit', (e: { layer: L.Layer }) => {
          const layer = e.layer as L.Polygon
          if (layer.toGeoJSON && onEdited) {
            const feature = layer.toGeoJSON() as GeoJSON.Feature
            onEdited([feature])
          }
        })

        map.on('pm:remove', (e: { layer: L.Layer }) => {
          const layer = e.layer as L.Polygon
          if (layer.toGeoJSON && onRemoved) {
            const feature = layer.toGeoJSON() as GeoJSON.Feature
            onRemoved(feature)
          }
        })

        initializedRef.current = true
      } catch (error) {
        console.error('Failed to initialize Geoman:', error)
      }
    }

    initGeoman()

    return () => {
      if (map.pm) {
        try {
          map.pm.removeControls()
          map.off('pm:create')
          map.off('pm:edit')
          map.off('pm:remove')
        } catch {
          // ignore cleanup errors
        }
      }
      initializedRef.current = false
    }
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update draw enabled state
  React.useEffect(() => {
    if (!map.pm || !initializedRef.current) return
    map.pm.addControls({
      drawPolygon: drawEnabled,
    })
  }, [drawEnabled, map])

  return null
}
