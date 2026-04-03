'use client'

import * as React from 'react'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import type { Project } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

interface ProjectBoundaryResult {
  projectBoundary: GeoJSON.Feature<GeoJSON.Polygon> | undefined
  projectCenter: { lat: number; lng: number } | undefined
  bufferDistances: number[]
  /** The resolved site ID (selected site, or fallback site when project.boundary is null) */
  effectiveSiteId: string | null
  /** All project sites (from useProjectSites query) */
  projectSites: ProjectSiteWithGeoJSON[]
  /** All site boundaries (for multi-site search and display) — empty when a specific site is selected */
  allBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries regardless of selection (for merged bbox search) */
  allSiteBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** Other site boundaries excluding the effective site (for map overlay) */
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** Merged bounding box of all site boundaries (for multi-site search) — undefined if ≤1 site */
  searchBoundary: GeoJSON.Feature<GeoJSON.Polygon> | undefined
  /** Whether the project sites query is still loading */
  isSitesLoading: boolean
}

/**
 * Shared hook for resolving the active project boundary across all steps.
 *
 * Resolution order:
 * 1. If `selectedSite` is provided, use its boundary
 * 2. If `project.boundary` exists (single-site / legacy), use it
 * 3. Fall back to the first site with a boundary from project_sites
 */
export function useProjectBoundary(
  project: Project,
  selectedSite?: ProjectSiteWithGeoJSON | null
): ProjectBoundaryResult {
  const { data: projectSites = [], isLoading: isSitesLoading } = useProjectSites(project.id)

  // All site boundaries — only populated in "All Sites" mode (no specific site selected).
  // When a specific site is selected, this is empty so downstream components
  // correctly use `boundary` + `otherBoundaries` instead.
  const allBoundaries = React.useMemo(
    () =>
      selectedSite
        ? []
        : projectSites
            .filter((s) => s.boundary)
            .map((s) => s.boundary as GeoJSON.Feature<GeoJSON.Polygon>),
    [selectedSite, projectSites]
  )

  const fallbackSite = React.useMemo(() => {
    if (selectedSite || project.boundary) return null
    return projectSites.find((s) => s.boundary) ?? null
  }, [selectedSite, project.boundary, projectSites])

  const effectiveSite = selectedSite ?? fallbackSite

  const projectBoundary = (effectiveSite?.boundary ?? project.boundary) as
    | GeoJSON.Feature<GeoJSON.Polygon>
    | undefined

  const projectCenter = React.useMemo(() => {
    const cp = effectiveSite?.center_point ?? (project.center_point as GeoJSON.Point | null)
    if (!cp) return undefined
    return { lat: cp.coordinates[1], lng: cp.coordinates[0] }
  }, [effectiveSite?.center_point, project.center_point])

  const bufferDistances = React.useMemo(
    () =>
      (effectiveSite?.buffer_distances as number[] | null) ??
      (project.buffer_distances as number[] | null) ?? [2, 5],
    [effectiveSite?.buffer_distances, project.buffer_distances]
  )

  const effectiveSiteId = effectiveSite?.id ?? null

  // All site boundaries regardless of selection (for merged bbox search)
  const allSiteBoundaries = React.useMemo(
    () =>
      projectSites
        .filter((s) => s.boundary)
        .map((s) => s.boundary as GeoJSON.Feature<GeoJSON.Polygon>),
    [projectSites]
  )

  // Other site boundaries excluding the effective site (for map overlay)
  const isAllSites = !selectedSite && allBoundaries.length > 1
  const otherBoundaries = React.useMemo(
    () =>
      isAllSites
        ? []
        : projectSites
            .filter((s) => s.id !== effectiveSiteId && s.boundary)
            .map((s) => s.boundary as GeoJSON.Feature<GeoJSON.Polygon>),
    [projectSites, effectiveSiteId, isAllSites]
  )

  // Merged bounding box of all site boundaries for multi-site search
  const searchBoundary = React.useMemo(() => {
    if (allSiteBoundaries.length <= 1) return undefined
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity
    for (const b of allSiteBoundaries) {
      for (const coord of b.geometry.coordinates[0]) {
        minLng = Math.min(minLng, coord[0])
        maxLng = Math.max(maxLng, coord[0])
        minLat = Math.min(minLat, coord[1])
        maxLat = Math.max(maxLat, coord[1])
      }
    }
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      },
    } as GeoJSON.Feature<GeoJSON.Polygon>
  }, [allSiteBoundaries])

  return {
    projectBoundary,
    projectCenter,
    bufferDistances,
    effectiveSiteId,
    projectSites,
    allBoundaries,
    allSiteBoundaries,
    otherBoundaries,
    searchBoundary,
    isSitesLoading,
  }
}
