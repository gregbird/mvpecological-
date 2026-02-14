'use client'

import * as React from 'react'

/**
 * Hook for managing county and townland boundary data loading.
 * Extracted from project-map-with-draw.tsx to reduce duplication.
 * Handles:
 * - County GeoJSON loading (from static file)
 * - Townland loading (from API, on-demand based on viewport)
 * - Zoom tracking and bbox-based townland fetching
 */
export function useAdministrativeBoundaries(initialZoom: number) {
  // Counties
  const [showCounties, setShowCounties] = React.useState(false)
  const [countiesData, setCountiesData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [countiesLoading, setCountiesLoading] = React.useState(false)

  // Townlands
  const [showTownlands, setShowTownlands] = React.useState(false)
  const [townlandsData, setTownlandsData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [townlandsLoading, setTownlandsLoading] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(initialZoom)
  const currentZoomRef = React.useRef(initialZoom)
  const townlandsBboxRef = React.useRef<string | null>(null)
  const showTownlandsRef = React.useRef(showTownlands)
  showTownlandsRef.current = showTownlands

  // Load county boundaries when layer becomes visible
  React.useEffect(() => {
    if (showCounties && !countiesData && !countiesLoading) {
      setCountiesLoading(true)
      fetch('/data/counties-ireland.geojson')
        .then((res) => res.json())
        .then((data) => {
          setCountiesData(data)
          setCountiesLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load county boundaries:', err)
          setCountiesLoading(false)
        })
    }
  }, [showCounties, countiesData, countiesLoading])

  // Load townlands for current viewport
  const loadTownlandsForBbox = React.useCallback(
    async (bbox: string) => {
      if (townlandsLoading || bbox === townlandsBboxRef.current) return

      setTownlandsLoading(true)
      townlandsBboxRef.current = bbox

      try {
        const response = await fetch(`/api/boundaries/townlands?bbox=${bbox}&limit=300`)
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

  // Stable ref for use in callbacks
  const loadTownlandsForBboxRef = React.useRef(loadTownlandsForBbox)
  loadTownlandsForBboxRef.current = loadTownlandsForBbox

  // Handle zoom changes from map — loads townlands when appropriate
  const handleZoomChange = React.useCallback(
    (newZoom: number, bounds?: { west: number; south: number; east: number; north: number }) => {
      if (newZoom !== currentZoomRef.current) {
        currentZoomRef.current = newZoom
        setCurrentZoom(newZoom)
      }

      if (newZoom >= 12 && showTownlandsRef.current && bounds) {
        const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
        loadTownlandsForBboxRef.current(bbox)
      }
    },
    []
  )

  return {
    // Counties
    showCounties,
    setShowCounties,
    countiesData,
    countiesLoading,

    // Townlands
    showTownlands,
    setShowTownlands,
    townlandsData,
    townlandsLoading,
    currentZoom,

    // Handlers
    handleZoomChange,
  }
}
