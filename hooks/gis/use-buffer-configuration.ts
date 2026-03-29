'use client'

import * as React from 'react'
import { createBuffer, STANDARD_BUFFER_DISTANCES } from '@/lib/gis'
import union from '@turf/union'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import type { Project } from '@/types/database'

export function useBufferConfiguration(project: Project) {
  const [enabledBuffers, setEnabledBuffers] = React.useState<number[]>(() => {
    return (project.buffer_distances as number[] | null) ?? []
  })

  const [customBufferInput, setCustomBufferInput] = React.useState<string>('')

  const [customBuffers, setCustomBuffers] = React.useState<number[]>(() => {
    const saved = (project.buffer_distances as number[] | null) ?? []
    const standardValues = STANDARD_BUFFER_DISTANCES.map((b) => b.value) as number[]
    return saved.filter((d) => !standardValues.includes(d))
  })

  const [bufferZones, setBufferZones] = React.useState<
    Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  >(new Map())

  // Generate buffer zones for one or more boundaries.
  // For multiple boundaries, individual buffers at each distance are merged via turf.union.
  const regenerateBufferZones = React.useCallback(
    (
      boundaryOrBoundaries:
        | GeoJSON.Feature<GeoJSON.Polygon>
        | GeoJSON.Feature<GeoJSON.Polygon>[]
        | null
    ) => {
      if (!boundaryOrBoundaries) {
        setBufferZones(new Map())
        return
      }

      const boundaries = Array.isArray(boundaryOrBoundaries)
        ? boundaryOrBoundaries
        : [boundaryOrBoundaries]

      if (boundaries.length === 0) {
        setBufferZones(new Map())
        return
      }

      const newBuffers = new Map<number, GeoJSON.Feature<GeoJSON.Polygon>>()

      for (const distance of enabledBuffers) {
        // Create buffer for each boundary
        const individualBuffers: Feature<Polygon>[] = []
        for (const boundary of boundaries) {
          const buffered = createBuffer(boundary, distance, 'kilometers')
          if (buffered) individualBuffers.push(buffered)
        }

        if (individualBuffers.length === 0) continue

        if (individualBuffers.length === 1) {
          newBuffers.set(distance, individualBuffers[0])
        } else {
          // Merge all buffers at this distance into one feature via FeatureCollection
          try {
            const fc: FeatureCollection<Polygon | MultiPolygon> = {
              type: 'FeatureCollection',
              features: individualBuffers,
            }
            const merged = union(fc)
            if (merged) {
              // Cast — map component expects Polygon but union can return MultiPolygon
              newBuffers.set(distance, merged as GeoJSON.Feature<GeoJSON.Polygon>)
            } else {
              newBuffers.set(distance, individualBuffers[0])
            }
          } catch {
            // If union fails, fall back to first buffer
            newBuffers.set(distance, individualBuffers[0])
          }
        }
      }

      setBufferZones(newBuffers)
    },
    [enabledBuffers]
  )

  const handleBufferToggle = React.useCallback((distance: number) => {
    setEnabledBuffers((prev) =>
      prev.includes(distance) ? prev.filter((d) => d !== distance) : [...prev, distance]
    )
  }, [])

  const handleAddCustomBuffer = React.useCallback(() => {
    const value = parseFloat(customBufferInput)
    if (value > 0 && value <= 50) {
      const allDistances = [...STANDARD_BUFFER_DISTANCES.map((b) => b.value), ...customBuffers]
      if (!allDistances.includes(value)) {
        setCustomBuffers((prev) => [...prev, value].sort((a, b) => a - b))
        setEnabledBuffers((prev) => [...prev, value])
      }
      setCustomBufferInput('')
      return true
    }
    return false
  }, [customBufferInput, customBuffers])

  const handleRemoveCustomBuffer = React.useCallback((distance: number) => {
    setCustomBuffers((prev) => prev.filter((d) => d !== distance))
    setEnabledBuffers((prev) => prev.filter((d) => d !== distance))
  }, [])

  return {
    enabledBuffers,
    setEnabledBuffers,
    customBufferInput,
    setCustomBufferInput,
    customBuffers,
    bufferZones,
    regenerateBufferZones,
    handleBufferToggle,
    handleAddCustomBuffer,
    handleRemoveCustomBuffer,
  }
}
