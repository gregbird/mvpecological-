'use client'

import { useMemo, useEffect, useRef } from 'react'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

/**
 * Computes a stable hash from project site boundaries and detects when
 * boundaries change (e.g. GIS re-edit). Clears sessionStorage caches
 * on boundary change so search substeps re-trigger.
 */
export function useBoundaryHash(
  projectId: string,
  projectSites: ProjectSiteWithGeoJSON[],
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>,
  isSitesLoading?: boolean
): {
  boundaryHash: string
  boundaryChanged: boolean
} {
  const boundaryChangedRef = useRef(false)

  const boundaryHash = useMemo(() => {
    if (isSitesLoading) return ''
    const siteBoundaries = projectSites
      .filter((s) => s.boundary)
      .map((s) => s.boundary as GeoJSON.Feature<GeoJSON.Polygon>)
    const boundaries =
      siteBoundaries.length > 0 ? siteBoundaries : projectBoundary ? [projectBoundary] : []
    if (boundaries.length === 0) return ''
    try {
      return boundaries
        .map((b) => {
          const coords = b.geometry.coordinates[0]
          const first = coords[0]
          const last = coords[coords.length - 1]
          return `${coords.length}:${first[0].toFixed(6)},${first[1].toFixed(6)}:${last[0].toFixed(6)},${last[1].toFixed(6)}`
        })
        .sort()
        .join('|')
    } catch {
      return ''
    }
  }, [projectSites, projectBoundary, isSitesLoading])

  useEffect(() => {
    boundaryChangedRef.current = false
    if (!boundaryHash) return
    const hashKey = `boundary-hash-${projectId}`
    const storedHash = sessionStorage.getItem(hashKey)

    if (storedHash && storedHash !== boundaryHash) {
      boundaryChangedRef.current = true
      // Clear search caches so substeps re-trigger
      sessionStorage.removeItem(`auto-search-triggered-${projectId}`)
      sessionStorage.removeItem(`npws-search-${projectId}`)
      sessionStorage.removeItem(`epa-search-${projectId}`)
      // Clear all resolution-dependent species caches (nbdc-report-{10km|2km|1km}-search-{projectId})
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('nbdc-report-') && key.endsWith(`-search-${projectId}`)) {
          sessionStorage.removeItem(key)
        }
      }
      // Clear all site-scoped habitat caches
      const habitatPrefix = `nlc-habitat-${projectId}`
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith(habitatPrefix)) sessionStorage.removeItem(key)
      }
    }

    sessionStorage.setItem(hashKey, boundaryHash)
  }, [boundaryHash, projectId])

  return { boundaryHash, boundaryChanged: boundaryChangedRef.current }
}
