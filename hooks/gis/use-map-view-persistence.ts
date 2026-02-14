'use client'

import * as React from 'react'
import type { MapStyle } from '@/lib/config/map-constants'

export function useMapViewPersistence(projectId: string) {
  const [mapCenter, setMapCenter] = React.useState<[number, number] | undefined>(undefined)
  const [mapZoom, setMapZoom] = React.useState<number | undefined>(undefined)
  const [baseMapStyle, setBaseMapStyle] = React.useState<MapStyle>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(`gis-map-style-${projectId}`) as MapStyle) || 'satellite'
    }
    return 'satellite'
  })

  // Persist base map style to sessionStorage
  React.useEffect(() => {
    sessionStorage.setItem(`gis-map-style-${projectId}`, baseMapStyle)
  }, [baseMapStyle, projectId])

  const handleViewChange = React.useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }, [])

  const [flyToLocation, setFlyToLocation] = React.useState<
    { center: [number, number]; zoom: number; key: string } | undefined
  >(undefined)

  return {
    mapCenter,
    mapZoom,
    baseMapStyle,
    setBaseMapStyle,
    handleViewChange,
    flyToLocation,
    setFlyToLocation,
  }
}
