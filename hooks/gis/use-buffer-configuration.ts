'use client'

import * as React from 'react'
import { createBuffer, STANDARD_BUFFER_DISTANCES } from '@/lib/gis'
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

  // Generate buffer zones when boundary or enabled buffers change
  const regenerateBufferZones = React.useCallback(
    (boundary: GeoJSON.Feature<GeoJSON.Polygon> | null) => {
      if (!boundary) {
        setBufferZones(new Map())
        return
      }
      const newBuffers = new Map<number, GeoJSON.Feature<GeoJSON.Polygon>>()
      for (const distance of enabledBuffers) {
        const buffered = createBuffer(boundary, distance, 'kilometers')
        if (buffered) {
          newBuffers.set(distance, buffered)
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
