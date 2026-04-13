import { getHeritageColor } from '@/lib/config/map-constants'
import type { DeskResearchFinding } from '@/types/database'

/**
 * Build a GeoJSON FeatureCollection of habitat polygons from saved desk
 * research findings. Only findings with `data_type === 'habitat'` and a
 * valid `location` are included; each feature carries the properties that
 * `HabitatPolygonLayer` expects (`fossitt_code`, `fossitt_name`, `color`,
 * `nlc_label`, `area_hectares`) so the map layer can render the polygon
 * with Heritage Council styling and popup details.
 *
 * Returns `undefined` when there are no habitat findings so parents can
 * conditionally skip rendering the layer.
 */
export function buildHabitatPolygonsFromFindings(
  findings: DeskResearchFinding[]
): GeoJSON.FeatureCollection | undefined {
  const habitatFindings = findings.filter((f) => f.data_type === 'habitat' && f.location != null)
  if (habitatFindings.length === 0) return undefined

  const features: GeoJSON.Feature[] = habitatFindings.map((f) => {
    const raw = f.raw_data as Record<string, unknown> | null
    const fossittCode = String(raw?.fossittCode ?? '')
    const fossittName = String(raw?.fossittName ?? f.title)
    const nlcLabel = String(raw?.nlcLabel ?? '')
    const areaHa = Number(raw?.areaHectares) || 0
    const color = getHeritageColor(fossittCode)

    return {
      type: 'Feature',
      geometry: f.location as GeoJSON.Geometry,
      properties: {
        fossitt_name: fossittName,
        fossitt_code: fossittCode,
        nlc_label: nlcLabel,
        area_hectares: areaHa,
        color,
      },
    }
  })

  return { type: 'FeatureCollection', features }
}
