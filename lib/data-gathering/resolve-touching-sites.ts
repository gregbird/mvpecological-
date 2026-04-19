import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

export interface SiteWithBuffer {
  site: ProjectSiteWithGeoJSON
  buffer: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  bufferBbox: [number, number, number, number]
}

/**
 * Pre-compute a buffered polygon + bbox for every site with a boundary.
 * Call once per Save All / search loop and pass the result into
 * `resolveTouchingSites` — the cache saves ~O(N) turf.buffer calls per save.
 */
export function buildSiteBufferCache(
  sites: ProjectSiteWithGeoJSON[],
  bufferKm: number
): SiteWithBuffer[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const turf = require('@turf/turf')
  const out: SiteWithBuffer[] = []
  for (const site of sites) {
    if (!site.boundary) continue
    try {
      const buffer = turf.buffer(site.boundary, bufferKm, {
        units: 'kilometers',
      }) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      out.push({
        site,
        buffer,
        bufferBbox: turf.bbox(buffer) as [number, number, number, number],
      })
    } catch {
      // Ignore sites whose boundary turf can't buffer — they simply won't receive rows.
    }
  }
  return out
}

/**
 * Return the subset of sites whose (boundary + buffer) spatially intersects
 * the finding's geometry. Uses bbox pre-rejection to avoid full polygon
 * intersect work for obviously non-overlapping pairs.
 *
 * When a finding's geometry is unusable (null, invalid), returns an empty
 * array — the caller should decide whether to fall back to a project-wide
 * `site_id = null` row or skip.
 */
export function resolveTouchingSites(
  geometry: GeoJSON.Geometry | null | undefined,
  siteCache: SiteWithBuffer[]
): ProjectSiteWithGeoJSON[] {
  if (!geometry || siteCache.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const turf = require('@turf/turf')

  let geomBbox: [number, number, number, number] | null = null
  try {
    geomBbox = turf.bbox(geometry) as [number, number, number, number]
  } catch {
    // fall through; we'll still attempt booleanIntersects without bbox reject
  }

  const touching: ProjectSiteWithGeoJSON[] = []
  for (const { site, buffer, bufferBbox } of siteCache) {
    if (geomBbox) {
      const disjoint =
        geomBbox[2] < bufferBbox[0] ||
        geomBbox[0] > bufferBbox[2] ||
        geomBbox[3] < bufferBbox[1] ||
        geomBbox[1] > bufferBbox[3]
      if (disjoint) continue
    }
    try {
      if (geometry.type === 'Point') {
        if (turf.booleanPointInPolygon(geometry, buffer)) touching.push(site)
        continue
      }
      if (turf.booleanIntersects(geometry, buffer)) touching.push(site)
    } catch {
      // geometry shape issues — skip this site
    }
  }
  return touching
}
