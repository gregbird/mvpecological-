'use client'

import * as React from 'react'
import type { FeatureGroup as LeafletFeatureGroup } from 'leaflet'
import type L from 'leaflet'

interface DrawHistoryActions {
  /** Push current feature group state onto the history stack */
  pushHistory: () => void
  /** Undo to previous state */
  undo: () => void
  /** Redo to next state */
  redo: () => void
}

/**
 * Manages undo/redo history for drawn polygon features.
 * Each snapshot is an array of GeoJSON features captured from the FeatureGroup.
 */
export function useDrawHistory(
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>,
  notifyChange: (features: GeoJSON.Feature[], isEdit: boolean) => void
): DrawHistoryActions {
  const historyStackRef = React.useRef<GeoJSON.Feature[][]>([])
  const historyIndexRef = React.useRef(-1)

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

  const pushHistory = React.useCallback(() => {
    const snapshot = collectFeatures()
    // Trim future entries on new action
    historyStackRef.current.splice(historyIndexRef.current + 1)
    historyStackRef.current.push(snapshot)
    historyIndexRef.current = historyStackRef.current.length - 1
  }, [collectFeatures])

  const restoreSnapshot = React.useCallback(
    (features: GeoJSON.Feature[]) => {
      if (!featureGroupRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const leaflet = require('leaflet')
      featureGroupRef.current.clearLayers()
      for (const feat of features) {
        const layer = leaflet.geoJSON(feat, {
          style: { color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.1 },
        })
        layer.eachLayer((l: L.Layer) => featureGroupRef.current?.addLayer(l))
      }
      notifyChange(features, true)
    },
    [featureGroupRef, notifyChange]
  )

  const undo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    restoreSnapshot(historyStackRef.current[historyIndexRef.current])
  }, [restoreSnapshot])

  const redo = React.useCallback(() => {
    if (historyIndexRef.current >= historyStackRef.current.length - 1) return
    historyIndexRef.current++
    restoreSnapshot(historyStackRef.current[historyIndexRef.current])
  }, [restoreSnapshot])

  return { pushHistory, undo, redo }
}
