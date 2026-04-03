'use client'

import * as React from 'react'

/**
 * Loads townland boundaries from the API on demand when zoom >= 12.
 * Tracks the current bbox to avoid duplicate requests.
 */
export function useTownlandsLoader(initialZoom: number) {
  const [townlandsData, setTownlandsData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [townlandsLoading, setTownlandsLoading] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(initialZoom)
  const townlandsBboxRef = React.useRef<string | null>(null)

  const loadTownlandsForBbox = React.useCallback(
    async (bbox: string) => {
      if (townlandsLoading || bbox === townlandsBboxRef.current) return

      setTownlandsLoading(true)
      townlandsBboxRef.current = bbox

      try {
        const response = await fetch(`/api/boundaries/townlands?bbox=${bbox}&limit=500`)
        if (response.ok) {
          const data = await response.json()
          setTownlandsData(data)
        } else {
          console.error('Failed to load townlands:', response.status)
        }
      } catch (err) {
        console.error('Failed to load townlands:', err)
      } finally {
        setTownlandsLoading(false)
      }
    },
    [townlandsLoading]
  )

  return {
    townlandsData,
    townlandsLoading,
    currentZoom,
    setCurrentZoom,
    townlandsBboxRef,
    loadTownlandsForBbox,
  }
}
