'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { useCreateFinding } from '@/hooks/queries/use-finding-hooks'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'
import type { DeskResearchFinding, Json } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

/** Single-step cast for Supabase Json columns */
function toJson(value: Record<string, unknown> | GeoJSON.Geometry | null): Json {
  return value as Json
}

interface UseHabitatAutoSaveParams {
  results: HabitatResult[]
  habitatPolygons: GeoJSON.FeatureCollection | null
  isSearching: boolean
  projectId: string
  siteId?: string | null
  userId: string
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  selectedBuffer: number
  savedFindings: DeskResearchFinding[]
  getHabitatGeometry: (nlcId: string) => GeoJSON.Geometry | null
  projectSites?: ProjectSiteWithGeoJSON[]
}

export function useHabitatAutoSave({
  results,
  habitatPolygons,
  isSearching,
  projectId,
  siteId,
  userId,
  projectBoundary,
  selectedBuffer,
  savedFindings,
  getHabitatGeometry,
  projectSites,
}: UseHabitatAutoSaveParams) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  // Refs for latest values — prevents stale closures in auto-save effect
  const savedFindingsRef = React.useRef(savedFindings)
  savedFindingsRef.current = savedFindings
  const projectBoundaryRef = React.useRef(projectBoundary)
  projectBoundaryRef.current = projectBoundary
  const selectedBufferRef = React.useRef(selectedBuffer)
  selectedBufferRef.current = selectedBuffer
  const createFindingRef = React.useRef(createFinding)
  createFindingRef.current = createFinding
  const toastRef = React.useRef(toast)
  toastRef.current = toast

  /** Check if a habitat is already saved in DB.
   *  Match by nlcId only — site_id check removed to prevent duplicates
   *  when switching between "All Sites" (site_id=null) and specific sites.
   *  savedFindings from parent is already site-scoped via useSavedFindings query. */
  const getSavedFinding = React.useCallback(
    (nlcId: string): DeskResearchFinding | undefined =>
      savedFindingsRef.current.find((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        return raw?.nlcId === nlcId && raw?.habitatFinding === true
      }),
    []
  )

  // Auto-save: when search completes and results + polygons are ready, save all unsaved habitats
  const autoSaveTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (
      results.length === 0 ||
      !habitatPolygons ||
      habitatPolygons.features.length === 0 ||
      isSearching ||
      isSavingAll ||
      autoSaveTriggeredRef.current
    )
      return

    const unsaved = results.filter((r) => !getSavedFinding(r.nlcId))
    if (unsaved.length === 0) return

    autoSaveTriggeredRef.current = true
    setIsSavingAll(true)

    const total = results.reduce((sum, r) => sum + r.areaHectares, 0)
    const currentBoundary = projectBoundaryRef.current
    const currentBuffer = selectedBufferRef.current

    // "All Sites" mode: save per-site using spatial matching
    const sitesWithBoundary =
      !siteId && projectSites && projectSites.length > 1
        ? projectSites.filter((s) => s.boundary)
        : null

    const saveSequentially = async () => {
      let count = 0
      const failed: string[] = []

      if (sitesWithBoundary && habitatPolygons) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const turf = require('@turf/turf')
        const siteBuffers = sitesWithBoundary.map((site) => ({
          site,
          buffer: turf.buffer(site.boundary, currentBuffer, { units: 'kilometers' }),
        }))

        for (const r of unsaved) {
          const nlcFeatures = habitatPolygons.features.filter(
            (f) => f.properties?.nlc_id && String(f.properties.nlc_id).trim() === r.nlcId
          )
          for (const { site, buffer } of siteBuffers) {
            const siteFeatures = nlcFeatures.filter((f) => {
              try {
                return turf.booleanIntersects(f.geometry, buffer)
              } catch {
                return false
              }
            })
            if (siteFeatures.length === 0) continue
            const siteGeom: GeoJSON.Geometry =
              siteFeatures.length === 1
                ? siteFeatures[0].geometry
                : {
                    type: 'GeometryCollection' as const,
                    geometries: siteFeatures.map((f: GeoJSON.Feature) => f.geometry),
                  }
            const siteArea = siteFeatures.reduce((sum: number, f: GeoJSON.Feature) => {
              try {
                return sum + turf.area(f) / 10000
              } catch {
                return sum
              }
            }, 0)
            const distKm = calculateDistanceFromBoundary(
              siteGeom,
              site.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
            )
            const pct = siteArea > 0 && total > 0 ? ((siteArea / total) * 100).toFixed(1) : '0'
            try {
              await createFindingRef.current.mutateAsync({
                project_id: projectId,
                site_id: site.id,
                created_by: userId,
                source: 'manual' as const,
                data_type: 'habitat' as const,
                include_in_report: true,
                title: `${r.fossittCode} — ${r.fossittName}`,
                content: `${r.fossittName} (${Math.round(siteArea * 100) / 100} ha, ${pct}% cover)`,
                is_saved: true,
                notes: null,
                location: toJson(siteGeom),
                distance_from_boundary_km: distKm ?? null,
                raw_data: toJson({
                  habitatFinding: true,
                  nlcId: r.nlcId,
                  nlcLabel: r.nlcLabel,
                  nlcLevel1: r.nlcLevel1,
                  fossittCode: r.fossittCode,
                  fossittName: r.fossittName,
                  areaHectares: Math.round(siteArea * 100) / 100,
                  polygonCount: siteFeatures.length,
                  percentCover: pct,
                  aiSummary: null,
                  bufferKm: currentBuffer,
                  distance_from_boundary_km: distKm ?? null,
                }),
              })
              count++
            } catch {
              failed.push(r.fossittCode)
            }
          }
        }
      } else {
        // Single site mode
        for (const r of unsaved) {
          const pct = total > 0 ? ((r.areaHectares / total) * 100).toFixed(1) : '0'
          const geometry = getHabitatGeometry(r.nlcId)
          const distKm = calculateDistanceFromBoundary(
            geometry ?? undefined,
            currentBoundary ?? undefined
          )
          try {
            await createFindingRef.current.mutateAsync({
              project_id: projectId,
              site_id: siteId ?? null,
              created_by: userId,
              source: 'manual' as const,
              data_type: 'habitat' as const,
              include_in_report: true,
              title: `${r.fossittCode} — ${r.fossittName}`,
              content: `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
              is_saved: true,
              notes: null,
              location: toJson(geometry),
              distance_from_boundary_km: distKm ?? null,
              raw_data: toJson({
                habitatFinding: true,
                nlcId: r.nlcId,
                nlcLabel: r.nlcLabel,
                nlcLevel1: r.nlcLevel1,
                fossittCode: r.fossittCode,
                fossittName: r.fossittName,
                areaHectares: r.areaHectares,
                polygonCount: r.polygonCount,
                percentCover: pct,
                aiSummary: null,
                bufferKm: currentBuffer,
                distance_from_boundary_km: distKm ?? null,
              }),
            })
            count++
          } catch {
            failed.push(r.fossittCode)
          }
        }
      }
      if (count > 0) {
        const desc =
          failed.length > 0
            ? `${count} saved, ${failed.length} failed (${failed.join(', ')})`
            : `${count} habitat${count > 1 ? 's' : ''} automatically saved to findings.`
        toastRef.current({ title: 'Habitats auto-saved', description: desc })
      }
      setIsSavingAll(false)
    }

    saveSequentially()
    // Deps intentionally limited — refs provide latest values for captured closures.
    // Adding createFinding/toast/project.id would cause infinite re-runs since mutation
    // hooks return new references on every render.
  }, [results, habitatPolygons, isSearching, getSavedFinding])

  return {
    isSavingAll,
    setIsSavingAll,
    getSavedFinding,
    autoSaveTriggeredRef,
  }
}
