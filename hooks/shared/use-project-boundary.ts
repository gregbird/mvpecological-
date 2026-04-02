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
  /** All site boundaries (for multi-site search and display) */
  allBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
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

  return {
    projectBoundary,
    projectCenter,
    bufferDistances,
    effectiveSiteId,
    projectSites,
    allBoundaries,
    isSitesLoading,
  }
}
