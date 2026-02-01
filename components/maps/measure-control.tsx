'use client'

import * as React from 'react'
import { Ruler, X, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MeasureControlProps {
  map: L.Map | null
  className?: string
}

interface MeasurementPoint {
  latlng: L.LatLng
  marker: L.Marker
}

// Calculate distance between two lat/lng points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(2)} km`
}

export function MeasureControl({ map, className }: MeasureControlProps) {
  const [isActive, setIsActive] = React.useState(false)
  const [points, setPoints] = React.useState<MeasurementPoint[]>([])
  const [totalDistance, setTotalDistance] = React.useState(0)
  const polylineRef = React.useRef<L.Polyline | null>(null)
  const tempLineRef = React.useRef<L.Polyline | null>(null)

  // Clean up measurement
  const clearMeasurement = React.useCallback(() => {
    if (!map) return

    // Remove markers
    points.forEach((p) => {
      map.removeLayer(p.marker)
    })

    // Remove polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    // Remove temp line
    if (tempLineRef.current) {
      map.removeLayer(tempLineRef.current)
      tempLineRef.current = null
    }

    setPoints([])
    setTotalDistance(0)
  }, [map, points])

  // Toggle measurement mode
  const toggleMeasure = () => {
    if (isActive) {
      clearMeasurement()
    }
    setIsActive(!isActive)
  }

  // Handle map click during measurement
  React.useEffect(() => {
    if (!map || !isActive) return

    const L = require('leaflet')

    // Change cursor
    map.getContainer().style.cursor = 'crosshair'

    const handleClick = (e: L.LeafletMouseEvent) => {
      const latlng = e.latlng

      // Create marker with distance label
      const markerIcon = L.divIcon({
        className: 'measure-marker',
        html: `<div style="
          background: #10b981;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      const marker = L.marker(latlng, { icon: markerIcon }).addTo(map)

      const newPoint: MeasurementPoint = { latlng, marker }

      setPoints((prev) => {
        const updated = [...prev, newPoint]

        // Calculate total distance
        let dist = 0
        for (let i = 1; i < updated.length; i++) {
          dist += calculateDistance(
            updated[i - 1].latlng.lat,
            updated[i - 1].latlng.lng,
            updated[i].latlng.lat,
            updated[i].latlng.lng
          )
        }
        setTotalDistance(dist)

        // Update polyline
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current)
        }

        if (updated.length >= 2) {
          const coords = updated.map((p) => [p.latlng.lat, p.latlng.lng] as [number, number])
          polylineRef.current = L.polyline(coords, {
            color: '#10b981',
            weight: 3,
            dashArray: '10, 5',
          }).addTo(map)
        }

        return updated
      })
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (points.length === 0) return

      const L = require('leaflet')
      const lastPoint = points[points.length - 1]

      // Remove existing temp line
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current)
      }

      // Draw temp line from last point to cursor
      tempLineRef.current = L.polyline(
        [
          [lastPoint.latlng.lat, lastPoint.latlng.lng],
          [e.latlng.lat, e.latlng.lng],
        ],
        {
          color: '#10b981',
          weight: 2,
          dashArray: '5, 10',
          opacity: 0.6,
        }
      ).addTo(map)
    }

    map.on('click', handleClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('click', handleClick)
      map.off('mousemove', handleMouseMove)
      map.getContainer().style.cursor = ''

      // Clean up temp line
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current)
        tempLineRef.current = null
      }
    }
  }, [map, isActive, points])

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (map) {
        points.forEach((p) => {
          try {
            map.removeLayer(p.marker)
          } catch {
            // Ignore errors during cleanup
          }
        })
        if (polylineRef.current) {
          try {
            map.removeLayer(polylineRef.current)
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    }
  }, [])  

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Measure toggle button */}
      <Button
        variant={isActive ? 'default' : 'secondary'}
        size="sm"
        className={cn('shadow-md', isActive && 'bg-emerald-600 hover:bg-emerald-700')}
        onClick={toggleMeasure}
      >
        {isActive ? <X className="mr-2 h-4 w-4" /> : <Ruler className="mr-2 h-4 w-4" />}
        {isActive ? 'Exit' : 'Measure'}
      </Button>

      {/* Measurement display */}
      {isActive && (
        <div className="bg-background/95 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Distance</span>
            {points.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearMeasurement}
                title="Clear measurement"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {points.length === 0 ? (
            <p className="text-muted-foreground text-xs">Click on map to start measuring</p>
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-bold text-emerald-600">{formatDistance(totalDistance)}</p>
              <p className="text-muted-foreground text-xs">
                {points.length} point{points.length !== 1 ? 's' : ''} • Click to add more
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
