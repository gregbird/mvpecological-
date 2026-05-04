'use client'

import * as React from 'react'

import type { useCreateHabitatsBulk } from '@/hooks/queries/use-habitat-hooks'
import type { useToast } from '@/hooks/use-toast'
import type { DeskResearchFinding, HabitatPolygon, InsertTables, Json } from '@/types/database'

/**
 * Persist the set of finding IDs that have already been auto-imported into
 * habitat_polygons. Without this, deleting an imported habitat causes the
 * next tab visit to silently recreate it (the DB-level dedupe key
 * `fossittCode::site_id` loses its match the moment the polygon is deleted).
 *
 * localStorage is scoped per project per browser. Cross-device the re-import
 * still happens — acceptable for now; a DB-level dismissal flag is the
 * durable fix (tracked as R1 in the risk review).
 */
function loadImportedFindingIds(projectId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(`habitat-imported-findings:${projectId}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveImportedFindingIds(projectId: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      `habitat-imported-findings:${projectId}`,
      JSON.stringify(Array.from(ids))
    )
  } catch {
    // Quota exceeded / unavailable — skip persistence
  }
}

/**
 * Normalize any incoming geometry to Polygon or MultiPolygon, preserving every
 * parcel. The DB column `habitat_polygons.boundary` is a generic PostGIS
 * `geometry` (no per-row type constraint) so MultiPolygon is fully supported.
 *
 * Earlier this function picked "the largest polygon by coordinate count" and
 * dropped the rest — that silently truncated habitats with hundreds of NLC
 * parcels (a single Improved Grassland finding can be 3000+ fields). Users
 * saw a list entry but nothing on the map for the missing parcels. Now we
 * keep them all: a single Polygon stays a Polygon, anything else becomes a
 * MultiPolygon.
 */
function toPolygon(geo: unknown): Json | null {
  if (!geo || typeof geo !== 'object') return null
  const g = geo as GeoJSON.Geometry
  if (g.type === 'Polygon') return g as unknown as Json
  const polys: GeoJSON.Polygon[] = []
  if (g.type === 'MultiPolygon') {
    for (const coords of (g as GeoJSON.MultiPolygon).coordinates) {
      polys.push({ type: 'Polygon', coordinates: coords })
    }
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
  if (polys.length === 1) return polys[0] as unknown as Json
  const multi: GeoJSON.MultiPolygon = {
    type: 'MultiPolygon',
    coordinates: polys.map((p) => p.coordinates),
  }
  return multi as unknown as Json
}

interface UseAutoImportHabitatsParams {
  projectId: string
  savedFindings: DeskResearchFinding[]
  habitats: HabitatPolygon[]
  isLoading: boolean
  findingsLoading: boolean
  createHabitatsBulk: ReturnType<typeof useCreateHabitatsBulk>
  toast: ReturnType<typeof useToast>['toast']
}

/**
 * D2.3: Auto-pull habitat findings from data gathering into habitat_polygons.
 * Detects habitat findings with habitatFinding=true + fossittCode, checks for
 * duplicate (fossittCode + site_id), and creates habitat_polygons with normalized boundary.
 *
 * Uses a single bulk insert + single invalidation so switching to the Habitat
 * Mapping tab with N unimported findings takes 1 round-trip instead of N
 * sequential inserts + N map re-renders (which felt like a freeze).
 */
export function useAutoImportHabitats({
  projectId,
  savedFindings,
  habitats,
  isLoading,
  findingsLoading,
  createHabitatsBulk,
  toast,
}: UseAutoImportHabitatsParams) {
  // Refs keep mutation stable so the effect only re-runs on real data changes
  const createHabitatsBulkRef = React.useRef(createHabitatsBulk)
  createHabitatsBulkRef.current = createHabitatsBulk
  const toastRef = React.useRef(toast)
  toastRef.current = toast
  // Hydrate the in-memory dedupe set from localStorage on mount so findings
  // imported in a previous session (and since deleted) are not re-imported.
  const importedFindingIds = React.useRef<Set<string>>(new Set())
  const hydrated = React.useRef(false)
  if (!hydrated.current) {
    importedFindingIds.current = loadImportedFindingIds(projectId)
    hydrated.current = true
  }
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
      // Once a finding has been imported (even if the user later deleted
      // the resulting polygon), never auto-reimport it. The user deleted
      // it intentionally — respect that decision.
      if (importedFindingIds.current.has(f.id)) return false
      const raw = f.raw_data as Record<string, unknown>
      const key = `${raw.fossittCode as string}::${f.site_id ?? ''}`
      return !existingKeys.has(key)
    })
    if (newFindings.length === 0) return

    // Mark as importing immediately to prevent duplicate runs
    isPulling.current = true
    for (const f of newFindings) importedFindingIds.current.add(f.id)
    saveImportedFindingIds(projectId, importedFindingIds.current)

    // Build the bulk payload and insert in one round-trip.
    const importBulk = async () => {
      const payload: InsertTables<'habitat_polygons'>[] = newFindings.map((f) => {
        const raw = f.raw_data as Record<string, unknown>
        return {
          project_id: projectId,
          site_id: f.site_id ?? null,
          fossitt_code: raw.fossittCode as string,
          fossitt_name: raw.fossittName as string,
          boundary: toPolygon(f.location),
          area_hectares: (raw.areaHectares as number) ?? null,
          // Condition is intentionally null for auto-imports — NLC 2018 is a
          // remote-sensing source, not a field condition survey. Hardcoding
          // 'moderate' fabricated a value that flowed straight into AI prose.
          // Ecologists must set condition manually after field verification.
          condition: null,
          notes: 'Auto-imported from Data Gathering (NLC)',
          include_in_report: true,
        }
      })

      try {
        const created = await createHabitatsBulkRef.current.mutateAsync({
          habitats: payload,
          projectId,
        })
        if (created.length > 0) {
          toastRef.current({
            title: 'Habitats imported',
            description: `${created.length} habitat${created.length > 1 ? 's' : ''} auto-imported from Data Gathering.`,
          })
        }
      } catch {
        // Roll back the imported flag so a future render can retry.
        // Persist the rolled-back set so localStorage matches in-memory state.
        for (const f of newFindings) importedFindingIds.current.delete(f.id)
        saveImportedFindingIds(projectId, importedFindingIds.current)
      } finally {
        isPulling.current = false
      }
    }

    importBulk()
  }, [isLoading, findingsLoading, savedFindings, habitats, projectId])
}
