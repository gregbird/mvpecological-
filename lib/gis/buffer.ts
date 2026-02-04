/**
 * Buffer Zone Utilities
 *
 * Faz 2.1: Buffer Zone Preview
 */

import buffer from '@turf/buffer'
import length from '@turf/length'
import area from '@turf/area'
import type { Feature, Polygon, MultiPolygon, LineString } from 'geojson'

export interface BufferOptions {
  distance: number // in kilometers
  units?: 'kilometers' | 'meters' | 'miles'
}

export interface BufferResult {
  original: Feature<Polygon>
  buffer: Feature<Polygon>
  distance: number
  units: string
}

// Standard buffer distances for ecological assessments in Ireland
export const STANDARD_BUFFER_DISTANCES = [
  {
    value: 0.5,
    label: '500m',
    description: 'Immediate surroundings - direct impacts on habitats and species',
  },
  {
    value: 1,
    label: '1km',
    description: 'Local area - searches NPWS designated sites within this radius',
  },
  {
    value: 2,
    label: '2km',
    description:
      'Standard buffer - searches all NPWS sites (SAC, SPA, NHA, pNHA) within this radius',
  },
  {
    value: 5,
    label: '5km',
    description: 'Extended buffer - recommended for mobile species and hydrological connections',
  },
  {
    value: 10,
    label: '10km',
    description: 'Wide area - searches NPWS Natura 2000 sites (SAC, SPA) within this radius',
  },
  {
    value: 15,
    label: '15km',
    description: 'Zone of influence - required for AA Screening of Natura 2000 sites',
  },
] as const

/**
 * Create a buffer zone around a polygon
 */
export function createBuffer(
  feature: Feature<Polygon | MultiPolygon>,
  distance: number,
  units: 'kilometers' | 'meters' = 'kilometers'
): Feature<Polygon> | null {
  try {
    const buffered = buffer(feature, distance, { units })

    if (!buffered) {
      console.error('Buffer creation returned null')
      return null
    }

    // Ensure we return a Polygon (buffer might return MultiPolygon for complex shapes)
    if (buffered.geometry.type === 'MultiPolygon') {
      return {
        type: 'Feature',
        properties: {
          ...buffered.properties,
          bufferDistance: distance,
          bufferUnits: units,
        },
        geometry: {
          type: 'Polygon',
          coordinates: buffered.geometry.coordinates[0],
        },
      }
    }

    return {
      ...buffered,
      properties: {
        ...buffered.properties,
        bufferDistance: distance,
        bufferUnits: units,
      },
    } as Feature<Polygon>
  } catch (error) {
    console.error('Error creating buffer:', error)
    return null
  }
}

/**
 * Create multiple buffer zones at once
 */
export function createMultipleBuffers(
  feature: Feature<Polygon | MultiPolygon>,
  distances: number[],
  units: 'kilometers' | 'meters' = 'kilometers'
): Map<number, Feature<Polygon>> {
  const buffers = new Map<number, Feature<Polygon>>()

  for (const distance of distances) {
    const buffered = createBuffer(feature, distance, units)
    if (buffered) {
      buffers.set(distance, buffered)
    }
  }

  return buffers
}

/**
 * Calculate the perimeter of a polygon in kilometers
 */
export function calculatePerimeter(feature: Feature<Polygon | MultiPolygon>): number {
  try {
    // Convert polygon to LineString for length calculation
    const coords =
      feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0][0]

    const lineString: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    }

    return length(lineString, { units: 'kilometers' })
  } catch (error) {
    console.error('Error calculating perimeter:', error)
    return 0
  }
}

/**
 * Calculate the area of a polygon in hectares
 */
export function calculateAreaHa(feature: Feature<Polygon | MultiPolygon>): number {
  try {
    const areaM2 = area(feature)
    return areaM2 / 10000 // Convert m² to hectares
  } catch (error) {
    console.error('Error calculating area:', error)
    return 0
  }
}

/**
 * Get buffer zone style based on distance
 */
export function getBufferStyle(distance: number): {
  color: string
  fillColor: string
  fillOpacity: number
  weight: number
  dashArray?: string
} {
  // Color scheme: closer = more opaque, further = less opaque
  const baseColor = '#3b82f6' // Blue

  if (distance <= 1) {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.15,
      weight: 2,
    }
  } else if (distance <= 2) {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '5, 5',
    }
  } else if (distance <= 5) {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '10, 5',
    }
  } else {
    return {
      color: baseColor,
      fillColor: baseColor,
      fillOpacity: 0.02,
      weight: 1,
      dashArray: '15, 10',
    }
  }
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km}km`
}
