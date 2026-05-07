'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  useCreateFinding,
  useDeleteFinding,
  useUpdateFinding,
} from '@/hooks/queries/use-finding-hooks'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'
import type { DeskResearchFinding, Json } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

/** Single-step cast for Supabase Json columns */
function toJson(value: Record<string, unknown> | GeoJSON.Geometry | null): Json {
  return value as Json
}

interface UseHabitatSaveParams {
  projectId: string
  siteId?: string | null
  userId: string
  totalArea: number
  selectedBuffer: number
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  aiSummaries: Record<string, string>
  notes: Record<string, string>
  getHabitatGeometry: (nlcId: string) => GeoJSON.Geometry | null
  getSavedFinding: (nlcId: string) => DeskResearchFinding | undefined
  fetchAiSummary: (r: HabitatResult) => void
  /** All project sites — used to save per-site when in "All Sites" mode */
  projectSites?: ProjectSiteWithGeoJSON[]
  /** Habitat polygon features — used to determine which site each habitat belongs to */
  habitatPolygons?: GeoJSON.FeatureCollection | null
  /** All saved habitat findings — needed to delete every site's row when the
   *  user toggles a habitat off in "All Sites" mode (otherwise N-1 orphans
   *  would be left behind). */
  savedFindings?: DeskResearchFinding[]
}

/** Build the finding payload for a habitat result (shared by save, saveAll, deepResearch) */
function buildPayload(
  r: HabitatResult,
  params: {
    projectId: string
    siteId?: string | null
    userId: string
    totalArea: number
    selectedBuffer: number
    projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
    aiSummaries: Record<string, string>
    notes: Record<string, string>
    getHabitatGeometry: (nlcId: string) => GeoJSON.Geometry | null
  },
  extraRawData?: Record<string, unknown>
) {
  const pct = params.totalArea > 0 ? ((r.areaHectares / params.totalArea) * 100).toFixed(1) : '0'
  const geometry = params.getHabitatGeometry(r.nlcId)
  const distKm = calculateDistanceFromBoundary(
    geometry ?? undefined,
    params.projectBoundary ?? undefined
  )
  return {
    project_id: params.projectId,
    site_id: params.siteId ?? null,
    created_by: params.userId,
    source: 'manual' as const,
    data_type: 'habitat' as const,
    include_in_report: true,
    title: `${r.fossittCode} — ${r.fossittName}`,
    content:
      params.aiSummaries[r.nlcId] || `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
    is_saved: true,
    notes: params.notes[r.nlcId] || null,
    location: toJson(geometry),
    distance_from_boundary_km: distKm ?? null,
    fossitt_code: r.fossittCode || null,
    ai_summary: params.aiSummaries[r.nlcId] || null,
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
      aiSummary: params.aiSummaries[r.nlcId] || null,
      bufferKm: params.selectedBuffer,
      distance_from_boundary_km: distKm ?? null,
      ...extraRawData,
    }),
  }
}

/**
 * Build one or more finding payloads for a single habitat result.
 *
 * - Specific site selected → one payload with that site_id.
 * - "All Sites" mode + we have polygons + multi-site project → one payload
 *   per site whose buffered boundary intersects this habitat's parcels;
 *   each payload carries only the in-site geometry and area. If no site
 *   touches, falls back to a single project-wide row (`site_id: null`)
 *   instead of silently dropping the habitat.
 * - Anything else (no projectSites / no polygons / single-site project) →
 *   one project-wide payload (`site_id: null`).
 */
function buildHabitatPayloadsForFinding(
  r: HabitatResult,
  params: UseHabitatSaveParams
): ReturnType<typeof buildPayload>[] {
  // Specific site mode — keep legacy single-payload behaviour.
  if (params.siteId) {
    return [buildPayload(r, params)]
  }

  const sitesWithBoundary =
    params.projectSites && params.projectSites.length > 1
      ? params.projectSites.filter((s) => s.boundary)
      : null

  if (!sitesWithBoundary || sitesWithBoundary.length === 0 || !params.habitatPolygons) {
    return [buildPayload(r, params)] // site_id: null fallback
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const turf = require('@turf/turf')
  const siteBuffers = sitesWithBoundary.map((site) => ({
    site,
    buffer: turf.buffer(site.boundary, params.selectedBuffer, { units: 'kilometers' }),
  }))

  const nlcFeatures = params.habitatPolygons.features.filter(
    (f) => f.properties?.nlc_id && String(f.properties.nlc_id).trim() === r.nlcId
  )

  const payloads: ReturnType<typeof buildPayload>[] = []
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
      siteGeom ?? undefined,
      site.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
    )
    const pct =
      siteArea > 0 && params.totalArea > 0 ? ((siteArea / params.totalArea) * 100).toFixed(1) : '0'
    const roundedArea = Math.round(siteArea * 100) / 100

    payloads.push({
      project_id: params.projectId,
      site_id: site.id,
      created_by: params.userId,
      source: 'manual' as const,
      data_type: 'habitat' as const,
      include_in_report: true,
      title: `${r.fossittCode} — ${r.fossittName}`,
      content: params.aiSummaries[r.nlcId] || `${r.fossittName} (${roundedArea} ha, ${pct}% cover)`,
      is_saved: true,
      notes: params.notes[r.nlcId] || null,
      location: toJson(siteGeom),
      distance_from_boundary_km: distKm ?? null,
      fossitt_code: r.fossittCode || null,
      ai_summary: params.aiSummaries[r.nlcId] || null,
      raw_data: toJson({
        habitatFinding: true,
        nlcId: r.nlcId,
        nlcLabel: r.nlcLabel,
        nlcLevel1: r.nlcLevel1,
        fossittCode: r.fossittCode,
        fossittName: r.fossittName,
        areaHectares: roundedArea,
        polygonCount: siteFeatures.length,
        percentCover: pct,
        aiSummary: params.aiSummaries[r.nlcId] || null,
        bufferKm: params.selectedBuffer,
        distance_from_boundary_km: distKm ?? null,
      }),
    })
  }

  // No site's buffer intersected this habitat — keep the habitat saved as a
  // project-wide row rather than silently dropping it.
  if (payloads.length === 0) {
    return [buildPayload(r, params)]
  }
  return payloads
}

/** Find every saved row that represents this nlcId (across all sites). Used
 *  on the toggle-off path so a single click clears the whole distribution. */
function findAllSavedForHabitat(
  nlcId: string,
  savedFindings: DeskResearchFinding[] | undefined
): DeskResearchFinding[] {
  if (!savedFindings || savedFindings.length === 0) return []
  return savedFindings.filter((f) => {
    const raw = f.raw_data as Record<string, unknown> | null
    return raw?.nlcId === nlcId && raw?.habitatFinding === true
  })
}

export function useHabitatSave(params: UseHabitatSaveParams) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()

  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set())
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  const handleSave = async (r: HabitatResult) => {
    setSavingIds((prev) => new Set(prev).add(r.nlcId))
    try {
      // Toggle off: delete every saved row for this habitat (a single click
      // should clear the whole "All Sites" distribution, not just one).
      const matchingSaved = findAllSavedForHabitat(r.nlcId, params.savedFindings)
      if (matchingSaved.length > 0) {
        for (const sf of matchingSaved) {
          await deleteFinding.mutateAsync(sf.id)
        }
        toast({ title: 'Removed', description: `${r.fossittCode} removed from findings.` })
        return
      }

      // Fallback for projects whose savedFindings prop wasn't passed through —
      // preserves the old single-row toggle so we never silently no-op.
      if (!params.savedFindings) {
        const existing = params.getSavedFinding(r.nlcId)
        if (existing) {
          await deleteFinding.mutateAsync(existing.id)
          toast({ title: 'Removed', description: `${r.fossittCode} removed from findings.` })
          return
        }
      }

      const payloads = buildHabitatPayloadsForFinding(r, params)
      for (const payload of payloads) {
        await createFinding.mutateAsync(payload)
      }
      toast({ title: 'Saved', description: `${r.fossittCode} saved to findings.` })
      if (!params.aiSummaries[r.nlcId]) params.fetchAiSummary(r)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save finding.' })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(r.nlcId)
        return next
      })
    }
  }

  const handleSaveAll = async (unsavedResults: HabitatResult[]) => {
    if (unsavedResults.length === 0) return
    setIsSavingAll(true)
    let savedCount = 0

    try {
      for (const r of unsavedResults) {
        const payloads = buildHabitatPayloadsForFinding(r, params)
        for (const payload of payloads) {
          await createFinding.mutateAsync(payload)
          savedCount++
        }
        if (!params.aiSummaries[r.nlcId]) params.fetchAiSummary(r)
      }
      toast({
        title: 'All habitats saved',
        description: `${savedCount} habitat${savedCount > 1 ? 's' : ''} saved to findings.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Saved ${savedCount} of ${unsavedResults.length}. Some failed.`,
      })
    } finally {
      setIsSavingAll(false)
    }
  }

  const handleSaveDeepResearch = async (
    deepResearchSite: HabitatResult,
    data: { aiAnalysis: string },
    results: HabitatResult[]
  ) => {
    const r = deepResearchSite
    const existing = params.getSavedFinding(r.nlcId)
    if (existing) {
      const existingRaw = (existing.raw_data as Record<string, unknown>) || {}
      updateFinding.mutate({
        findingId: existing.id,
        updates: {
          raw_data: toJson({
            ...existingRaw,
            deepResearch: { aiAnalysis: data.aiAnalysis },
          }),
        },
      })
    } else {
      await createFinding.mutateAsync(
        buildPayload(r, params, { deepResearch: { aiAnalysis: data.aiAnalysis } })
      )
    }
    if (!params.aiSummaries[r.nlcId]) {
      const habitat = results.find((h) => h.nlcId === r.nlcId)
      if (habitat) params.fetchAiSummary(habitat)
    }
  }

  return {
    savingIds,
    isSavingAll,
    setIsSavingAll,
    handleSave,
    handleSaveAll,
    handleSaveDeepResearch,
  }
}
