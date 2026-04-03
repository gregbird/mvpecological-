'use client'

import * as React from 'react'

import type { useCreateHabitat } from '@/hooks/queries/use-habitat-hooks'
import type { useToast } from '@/hooks/use-toast'
import type { DeskResearchFinding, HabitatPolygon, Json } from '@/types/database'

/**
 * Normalize any geometry to a single Polygon (DB column type is strictly Polygon).
 * For GeometryCollection / MultiPolygon, pick the largest polygon by coordinate count.
 */
function toPolygon(geo: unknown): Json | null {
  if (!geo || typeof geo !== 'object') return null
  const g = geo as GeoJSON.Geometry
  if (g.type === 'Polygon') return g as unknown as Json
  let polys: GeoJSON.Polygon[] = []
  if (g.type === 'MultiPolygon') {
    polys = (g as GeoJSON.MultiPolygon).coordinates.map((coords) => ({
      type: 'Polygon',
      coordinates: coords,
    }))
  } else if (g.type === 'GeometryCollection') {
    for (const sub of (g as GeoJSON.GeometryCollection).geometries) {
      if (sub.type === 'Polygon') polys.push(sub as GeoJSON.Polygon)
      else if (sub.type === 'MultiPolygon') {
        for (const coords of (sub as GeoJSON.MultiPolygon).coordinates) {
          polys.push({ type: 'Polygon', coordinates: coords })
        }
      }
    }
  }
  if (polys.length === 0) return null
  const largest = polys.reduce((a, b) =>
    (a.coordinates[0]?.length ?? 0) >= (b.coordinates[0]?.length ?? 0) ? a : b
  )
  return largest as unknown as Json
}

interface UseAutoImportHabitatsParams {
  projectId: string
  savedFindings: DeskResearchFinding[]
  habitats: HabitatPolygon[]
  isLoading: boolean
  findingsLoading: boolean
  createHabitat: ReturnType<typeof useCreateHabitat>
  toast: ReturnType<typeof useToast>['toast']
}

/**
 * D2.3: Auto-pull habitat findings from data gathering into habitat_polygons.
 * Detects habitat findings with habitatFinding=true + fossittCode, checks for
 * duplicate (fossittCode + site_id), and creates habitat_polygons with normalized boundary.
 */
export function useAutoImportHabitats({
  projectId,
  savedFindings,
  habitats,
  isLoading,
  findingsLoading,
  createHabitat,
  toast,
}: UseAutoImportHabitatsParams) {
  // Refs keep mutation stable so the effect only re-runs on real data changes
  const createHabitatRef = React.useRef(createHabitat)
  createHabitatRef.current = createHabitat
  const toastRef = React.useRef(toast)
  toastRef.current = toast
  const importedFindingIds = React.useRef(new Set<string>())
  const isPulling = React.useRef(false)

  React.useEffect(() => {
    if (isPulling.current || isLoading || findingsLoading) return

    const habitatFindings = savedFindings.filter((f) => {
      if (f.data_type !== 'habitat') return false
      const raw = f.raw_data as Record<string, unknown> | null
      return raw?.habitatFinding === true && raw?.fossittCode
    })
    if (habitatFindings.length === 0) return

    // Check which FOSSITT code + site_id combos already exist as habitat_polygons
    const existingKeys = new Set(habitats.map((h) => `${h.fossitt_code}::${h.site_id ?? ''}`))

    const newFindings = habitatFindings.filter((f) => {
      if (importedFindingIds.current.has(f.id)) return false
      const raw = f.raw_data as Record<string, unknown>
      const key = `${raw.fossittCode as string}::${f.site_id ?? ''}`
      return !existingKeys.has(key)
    })
    if (newFindings.length === 0) return

    // Mark as importing immediately to prevent duplicate runs
    isPulling.current = true
    for (const f of newFindings) importedFindingIds.current.add(f.id)

    // Use sequential creation to avoid N parallel invalidations.
    const importSequentially = async () => {
      let imported = 0
      for (const f of newFindings) {
        const raw = f.raw_data as Record<string, unknown>
        try {
          await createHabitatRef.current.mutateAsync({
            project_id: projectId,
            site_id: f.site_id ?? null,
            fossitt_code: raw.fossittCode as string,
            fossitt_name: raw.fossittName as string,
            boundary: toPolygon(f.location),
            area_hectares: (raw.areaHectares as number) ?? null,
            condition: 'moderate',
            notes: 'Auto-imported from Data Gathering (NLC)',
            include_in_report: true,
          })
          imported++
        } catch {
          importedFindingIds.current.delete(f.id)
        }
      }
      if (imported > 0) {
        toastRef.current({
          title: 'Habitats imported',
          description: `${imported} habitat${imported > 1 ? 's' : ''} auto-imported from Data Gathering.`,
        })
      }
      isPulling.current = false
    }

    importSequentially()
  }, [isLoading, findingsLoading, savedFindings, habitats, projectId])
}
