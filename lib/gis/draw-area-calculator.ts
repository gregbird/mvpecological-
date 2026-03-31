/**
 * Live area and perimeter calculation during polygon drawing.
 * Uses turf.js for accurate geodesic calculations.
 */

import turfArea from '@turf/area'
import turfLength from '@turf/length'
import { polygon as turfPolygon, lineString } from '@turf/helpers'

interface DrawMeasurement {
  /** Area in hectares */
  areaHa: number
  /** Perimeter in meters */
  perimeterM: number
}

/**
 * Calculate area and perimeter from an array of LatLng-like objects.
 * Requires 3+ points. Automatically closes the ring for area calculation.
 *
 * @param latlngs Array of {lat, lng} objects (from Leaflet's getLatLngs())
 * @returns Measurement or null if fewer than 3 points
 */
export function calculateDrawMeasurement(
  latlngs: { lat: number; lng: number }[]
): DrawMeasurement | null {
  if (latlngs.length < 3) return null

  // Convert to GeoJSON coordinates [lng, lat]
  const coords = latlngs.map((ll) => [ll.lng, ll.lat] as [number, number])
  // Close the ring
  const ring = [...coords, coords[0]]

  try {
    const poly = turfPolygon([ring])
    const areaM2 = turfArea(poly)
    const areaHa = areaM2 / 10000

    const line = lineString(ring)
    const perimeterKm = turfLength(line, { units: 'kilometers' })
    const perimeterM = perimeterKm * 1000

    return { areaHa, perimeterM }
  } catch {
    return null
  }
}
