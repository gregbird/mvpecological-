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
    try {
      for (const r of unsavedResults) {
        await createFinding.mutateAsync(buildPayload(r, params))
        savedCount++
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
