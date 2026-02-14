/**
 * Calculate a bounding box around a project boundary or center point,
 * expanded by a buffer distance in kilometers.
 *
 * Used by data gathering substeps (designated sites, species records, aquatic features)
 * to define the search area for external API queries.
 */
export function getBoundingBox(
  projectBoundary: GeoJSON.Feature<GeoJSON.Polygon> | null | undefined,
  projectCenter: { lat: number; lng: number } | null | undefined,
  bufferKm: number
): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  if (!projectBoundary && !projectCenter) return null

  if (projectBoundary) {
    const coords = projectBoundary.geometry.coordinates[0]
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity

    for (const coord of coords) {
      minLng = Math.min(minLng, coord[0])
      maxLng = Math.max(maxLng, coord[0])
      minLat = Math.min(minLat, coord[1])
      maxLat = Math.max(maxLat, coord[1])
    }

    // 1 degree latitude ≈ 111km; longitude varies with cos(latitude)
    const midLat = (minLat + maxLat) / 2
    const latBuffer = bufferKm / 111
    const lngBuffer = bufferKm / (111 * Math.cos((midLat * Math.PI) / 180))
    return {
      minLng: minLng - lngBuffer,
      maxLng: maxLng + lngBuffer,
      minLat: minLat - latBuffer,
      maxLat: maxLat + latBuffer,
    }
  }

  if (projectCenter) {
    const latBuffer = bufferKm / 111
    const lngBuffer = bufferKm / (111 * Math.cos((projectCenter.lat * Math.PI) / 180))
    return {
      minLng: projectCenter.lng - lngBuffer,
      maxLng: projectCenter.lng + lngBuffer,
      minLat: projectCenter.lat - latBuffer,
      maxLat: projectCenter.lat + latBuffer,
    }
  }

  return null
}
