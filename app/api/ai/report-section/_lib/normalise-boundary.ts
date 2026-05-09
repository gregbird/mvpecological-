/**
 * Coerce a raw Supabase boundary value (Json | GeoJSON-like) into a Feature
 * suitable for turf. Supabase serialises boundaries as either a bare Geometry
 * (Polygon / MultiPolygon) or an already-wrapped Feature. We normalise here so
 * callers can blindly pass to turf.buffer / classifier.
 */
export function normaliseBoundary(
  raw: unknown
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as { type?: string; geometry?: unknown; coordinates?: unknown }

  if (obj.type === 'Feature' && obj.geometry) {
    const geom = obj.geometry as { type?: string }
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      return raw as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
    }
    return null
  }

  if (obj.type === 'Polygon' || obj.type === 'MultiPolygon') {
    return {
      type: 'Feature',
      properties: {},
      geometry: raw as GeoJSON.Polygon | GeoJSON.MultiPolygon,
    }
  }

  return null
}
