'use client'

import * as React from 'react'
import {
  parseShapefile,
  isShapefileType,
  validateBoundary,
  getLocationFromBoundary,
  type IrishLocationInfo,
} from '@/lib/gis'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { calculatePerimeter } from '@/lib/gis'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
import centroid from '@turf/centroid'
import type { Project } from '@/types/database'

export type { IrishLocationInfo }

export function useBoundaryManagement(project: Project) {
  const [boundary, setBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | null
  )
  const [selectedSource, setSelectedSource] = React.useState<string | null>(
    project.boundary ? 'manual' : null
  )
  const [locationInfo, setLocationInfo] = React.useState<IrishLocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch location info when boundary changes
  React.useEffect(() => {
    if (!boundary) {
      setLocationInfo(null)
      return
    }

    const fetchLocation = async () => {
      setIsLoadingLocation(true)
      try {
        const result = await getLocationFromBoundary(boundary)
        if (result.success && result.location) {
          setLocationInfo(result.location)
        }
      } catch (error) {
        console.error('Error fetching location:', error)
      } finally {
        setIsLoadingLocation(false)
      }
    }

    const timeoutId = setTimeout(fetchLocation, 500)
    return () => clearTimeout(timeoutId)
  }, [boundary])

  // Calculate boundary info
  const boundaryInfo = React.useMemo(() => {
    if (!boundary?.geometry) return null

    const coords = boundary.geometry.coordinates?.[0]
    if (!coords || coords.length < 3) return null

    // Use Turf.js centroid for accurate center point
    const center = centroid(boundary)
    const centerLng = center.geometry.coordinates[0]
    const centerLat = center.geometry.coordinates[1]

    return {
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area: calculateAreaHectares(boundary.geometry).toFixed(2),
      perimeter: calculatePerimeter(boundary).toFixed(2),
      gridRef: (() => {
        try {
          return wgs84ToGridRef(centerLat, centerLng, 3, true)
        } catch {
          return 'Outside Ireland'
        }
      })(),
      pointCount: coords.length - 1,
    }
  }, [boundary])

  // Handle map drawing changes
  const handleBoundaryChange = React.useCallback((features: GeoJSON.FeatureCollection) => {
    if (features.features.length > 0) {
      const feature = features.features[features.features.length - 1]
      if (feature?.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]?.length >= 4) {
        setBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
        return true
      }
    } else {
      setBoundary(null)
      return true
    }
    return false
  }, [])

  // File upload handler
  const handleFileUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return null

    setIsProcessing(true)

    try {
      const fileName = file.name.toLowerCase()

      if (isShapefileType(file)) {
        const result = await parseShapefile(file)
        if (!result.success || !result.feature) return null
        setBoundary(result.feature)
        setSelectedSource('upload')
        return 'upload' as const
      }

      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const text = await file.text()
        const geojson = JSON.parse(text)

        let feature: GeoJSON.Feature<GeoJSON.Polygon> | null = null

        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          feature = geojson.features.find(
            (f: GeoJSON.Feature) =>
              f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          )
        } else if (geojson.type === 'Feature') {
          feature = geojson
        } else if (geojson.type === 'Polygon') {
          feature = { type: 'Feature', geometry: geojson, properties: {} }
        }

        if (!feature) throw new Error('No polygon found in file')

        const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
        if (geom.type === 'MultiPolygon') {
          feature = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: geom.coordinates[0] },
            properties: feature.properties,
          } as GeoJSON.Feature<GeoJSON.Polygon>
        }

        const validation = validateBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
        if (!validation.valid) return null

        setBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
        setSelectedSource('upload')
        return 'upload' as const
      }

      throw new Error('Unsupported file format')
    } catch (error) {
      console.error('File parse error:', error)
      return null
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  return {
    boundary,
    setBoundary,
    selectedSource,
    setSelectedSource,
    locationInfo,
    isLoadingLocation,
    isProcessing,
    fileInputRef,
    boundaryInfo,
    handleBoundaryChange,
    handleFileUpload,
  }
}
