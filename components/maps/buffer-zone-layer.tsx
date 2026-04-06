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

interface BufferEntry {
  key: string
  data: GeoJSON.Feature
  distance: number
  kind: 'primary' | 'other'
}

// Style objects declared at module scope so every <GeoJSON> layer receives
// the exact same reference on every render — Leaflet diffs the style prop
// by identity and would otherwise recompute canvas fills on each parent
// re-render.
const PRIMARY_BUFFER_STYLE_BASE = {
  weight: 2,
  fillOpacity: 0.05,
  dashArray: '5, 5',
}
const OTHER_BUFFER_STYLE = {
  color: '#94a3b8',
  weight: 1,
  fillColor: '#94a3b8',
  fillOpacity: 0.03,
  dashArray: '4, 6',
}
/** Reuse the same primary-style object per distance (one allocation total). */
const PRIMARY_STYLE_CACHE = new Map<number, Record<string, unknown>>()
function getPrimaryStyle(distance: number) {
  const cached = PRIMARY_STYLE_CACHE.get(distance)
  if (cached) return cached
  const color = BUFFER_COLORS[distance] || '#6b7280'
  const style = {
    ...PRIMARY_BUFFER_STYLE_BASE,
    color,
    fillColor: color,
  }
  PRIMARY_STYLE_CACHE.set(distance, style)
  return style
}

/**
 * Renders turf.js buffer zones around primary and other-site boundaries.
 * Largest buffers are rendered first (underneath).
 *
 * Performance: for multi-site projects (20+ boundaries × 3 buffer distances)
 * this component used to run `turf.buffer` on every render — dominating the
 * cost of pan/zoom, filter changes, or any parent re-render. The geometry is
 * now memoized against the actual inputs so turf work only runs when the
 * boundary set or buffer distances actually change.
 */
export function BufferZoneLayer({
  boundary,
  allBoundaries,
  otherBoundaries,
  bufferDistances,
  GeoJSON,
}: BufferZoneLayerProps) {
  const primaryBoundaries = React.useMemo(
    () => (allBoundaries && allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : []),
    [allBoundaries, boundary]
  )

  const { primaryBuffers, otherBuffers } = React.useMemo(() => {
    if (!bufferDistances || bufferDistances.length === 0) {
      return { primaryBuffers: [] as BufferEntry[], otherBuffers: [] as BufferEntry[] }
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')
    const sorted = [...bufferDistances].sort((a, b) => b - a)

    const primary: BufferEntry[] = []
    for (const distance of sorted) {
      for (let i = 0; i < primaryBoundaries.length; i++) {
        try {
          const buffered = turf.buffer(primaryBoundaries[i], distance, {
            units: 'kilometers',
          }) as GeoJSON.Feature
          primary.push({
            key: `buffer-${distance}-${i}-${boundaryKey(primaryBoundaries[i])}`,
            data: buffered,
            distance,
            kind: 'primary',
          })
        } catch {
          // Skip geometries that can't be buffered
        }
      }
    }

    const other: BufferEntry[] = []
    for (const distance of sorted) {
      for (let i = 0; i < otherBoundaries.length; i++) {
        try {
          const buffered = turf.buffer(otherBoundaries[i], distance, {
            units: 'kilometers',
          }) as GeoJSON.Feature
          other.push({
            key: `other-buffer-${distance}-${i}-${boundaryKey(otherBoundaries[i])}`,
            data: buffered,
            distance,
            kind: 'other',
          })
        } catch {
          // Skip
        }
      }
    }

    return { primaryBuffers: primary, otherBuffers: other }
  }, [primaryBoundaries, otherBoundaries, bufferDistances])

  if (primaryBuffers.length === 0 && otherBuffers.length === 0) {
    return null
  }

  return (
    <>
      {primaryBuffers.map((entry) => (
        <GeoJSON key={entry.key} data={entry.data} style={getPrimaryStyle(entry.distance)} />
      ))}
      {otherBuffers.map((entry) => (
        <GeoJSON key={entry.key} data={entry.data} style={OTHER_BUFFER_STYLE} />
      ))}
    </>
  )
}
