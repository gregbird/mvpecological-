'use client'

import * as React from 'react'

import { BUFFER_COLORS } from '@/components/maps/map-types'

interface BufferZoneLayerProps {
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  bufferDistances?: number[]
  /** react-leaflet GeoJSON component (passed to avoid duplicate require) */
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

/** Stable key fragment from a boundary's first coordinate */
function boundaryKey(b: GeoJSON.Feature<GeoJSON.Polygon>): string {
  const c = b.geometry.coordinates[0]?.[0]
  return c ? `${c[0].toFixed(4)}_${c[1].toFixed(4)}` : ''
}

/**
 * Renders turf.js buffer zones around primary and other-site boundaries.
 * Largest buffers are rendered first (underneath).
 */
export function BufferZoneLayer({
  boundary,
  allBoundaries,
  otherBoundaries,
  bufferDistances,
  GeoJSON,
}: BufferZoneLayerProps) {
  const primaryBoundaries =
    allBoundaries && allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : []

  if (primaryBoundaries.length === 0 || !bufferDistances || bufferDistances.length === 0) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const turf = require('@turf/turf')
  const sorted = [...bufferDistances].sort((a, b) => b - a)

  return (
    <>
      {/* Primary buffers */}
      {sorted.map((distance) => {
        const color = BUFFER_COLORS[distance] || '#6b7280'
        return primaryBoundaries.map((b, bIdx) => {
          try {
            const buffered = turf.buffer(b, distance, { units: 'kilometers' })
            return (
              <GeoJSON
                key={`buffer-${distance}-${bIdx}-${boundaryKey(b)}`}
                data={buffered}
                style={{
                  color: color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.05,
                  dashArray: '5, 5',
                }}
              />
            )
          } catch {
            return null
          }
        })
      })}

      {/* Other site buffers (dimmed) */}
      {otherBoundaries.length > 0 &&
        sorted.map((distance) =>
          otherBoundaries.map((b, bIdx) => {
            try {
              const buffered = turf.buffer(b, distance, { units: 'kilometers' })
              return (
                <GeoJSON
                  key={`other-buffer-${distance}-${bIdx}-${boundaryKey(b)}`}
                  data={buffered}
                  style={{
                    color: '#94a3b8',
                    weight: 1,
                    fillColor: '#94a3b8',
                    fillOpacity: 0.03,
                    dashArray: '4, 6',
                  }}
                />
              )
            } catch {
              return null
            }
          })
        )}
    </>
  )
}
