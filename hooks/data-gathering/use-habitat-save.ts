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
      const existing = params.getSavedFinding(r.nlcId)
      if (existing) {
        await deleteFinding.mutateAsync(existing.id)
        toast({ title: 'Removed', description: `${r.fossittCode} removed from findings.` })
      } else {
        await createFinding.mutateAsync(buildPayload(r, params))
        toast({ title: 'Saved', description: `${r.fossittCode} saved to findings.` })
        if (!params.aiSummaries[r.nlcId]) params.fetchAiSummary(r)
      }
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

    // "All Sites" mode: save a finding per site for each habitat
    const sitesWithBoundary =
      !params.siteId && params.projectSites && params.projectSites.length > 1
        ? params.projectSites.filter((s) => s.boundary)
        : null

    try {
      if (sitesWithBoundary && params.habitatPolygons) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const turf = require('@turf/turf')
        // Build buffered boundary per site once
        const siteBuffers = sitesWithBoundary.map((site) => ({
          site,
          buffer: turf.buffer(site.boundary, params.selectedBuffer, { units: 'kilometers' }),
        }))

        for (const r of unsavedResults) {
          // Find polygon features matching this nlcId
          const nlcFeatures = params.habitatPolygons.features.filter(
            (f) => f.properties?.nlc_id && String(f.properties.nlc_id).trim() === r.nlcId
          )

          for (const { site, buffer } of siteBuffers) {
            // Check if any polygon for this habitat intersects this site's buffer
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
              siteArea > 0 && params.totalArea > 0
                ? ((siteArea / params.totalArea) * 100).toFixed(1)
                : '0'

            await createFinding.mutateAsync({
              project_id: params.projectId,
              site_id: site.id,
              created_by: params.userId,
              source: 'manual' as const,
              data_type: 'habitat' as const,
              include_in_report: true,
              title: `${r.fossittCode} — ${r.fossittName}`,
              content:
                params.aiSummaries[r.nlcId] ||
                `${r.fossittName} (${Math.round(siteArea * 100) / 100} ha, ${pct}% cover)`,
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
                areaHectares: Math.round(siteArea * 100) / 100,
                polygonCount: siteFeatures.length,
                percentCover: pct,
                aiSummary: params.aiSummaries[r.nlcId] || null,
                bufferKm: params.selectedBuffer,
                distance_from_boundary_km: distKm ?? null,
              }),
            })
            savedCount++
          }
          if (!params.aiSummaries[r.nlcId]) params.fetchAiSummary(r)
        }
      } else {
        // Single site mode — save as before
        for (const r of unsavedResults) {
          await createFinding.mutateAsync(buildPayload(r, params))
          savedCount++
          if (!params.aiSummaries[r.nlcId]) params.fetchAiSummary(r)
        }
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
