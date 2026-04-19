'use client'

import * as React from 'react'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import { useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'
import type { DeskResearchFinding, Json, WorkflowStep } from '@/types/database'

/** Single-step cast for Supabase Json columns */
function toJson(value: Record<string, unknown> | GeoJSON.Geometry | null): Json {
  return value as Json
}

interface UseHabitatAiParams {
  cacheKey: string
  results: HabitatResult[]
  totalArea: number
  selectedBuffer: number
  projectName: string
  workflowStep?: WorkflowStep
  getSavedFinding: (nlcId: string) => DeskResearchFinding | undefined
}

export function useHabitatAi({
  cacheKey,
  results,
  totalArea,
  selectedBuffer,
  projectName,
  workflowStep,
  getSavedFinding,
}: UseHabitatAiParams) {
  const updateFinding = useUpdateFinding()
  const updateWorkflowStep = useUpdateWorkflowStep()

  const [aiSummaries, setAiSummaries] = useSessionStorage<Record<string, string>>(
    `${cacheKey}-summaries`,
    {}
  )
  const [loadingSummaries, setLoadingSummaries] = React.useState<Set<string>>(new Set())
  const [overallAi, setOverallAi] = React.useState<string>(() => {
    const meta = workflowStep?.metadata as Record<string, unknown> | null
    return (meta?.habitatOverallAnalysis as string) || ''
  })
  const [isOverallLoading, setIsOverallLoading] = React.useState(false)

  // Persist AI summaries to sessionStorage
  React.useEffect(() => {
    if (Object.keys(aiSummaries).length === 0) return
    try {
      sessionStorage.setItem(`${cacheKey}-summaries`, JSON.stringify(aiSummaries))
    } catch {
      // noop
    }
  }, [aiSummaries, cacheKey])

  /** Fetch AI summary for a single habitat type */
  const fetchAiSummary = async (r: HabitatResult) => {
    setLoadingSummaries((prev) => new Set(prev).add(r.nlcId))
    try {
      const pct = totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
      const res = await fetch('/api/ai/habitat-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fossittCode: r.fossittCode,
          fossittName: r.fossittName,
          nlcLabel: r.nlcLabel,
          areaHectares: r.areaHectares,
          percentCover: pct,
          bufferKm: selectedBuffer,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummaries((prev) => ({ ...prev, [r.nlcId]: data.summary }))
        // Persist to DB if finding is already saved. Dual-write to the typed
        // ai_summary column AND raw_data.aiSummary so neither read path goes
        // stale (habitat rows store aiSummary at the top level, not nested
        // under metadata — matches the buildPayload shape).
        const existing = getSavedFinding(r.nlcId)
        if (existing) {
          const existingRaw = (existing.raw_data as Record<string, unknown>) || {}
          updateFinding.mutate({
            findingId: existing.id,
            updates: {
              content: data.summary,
              ai_summary: data.summary,
              raw_data: toJson({ ...existingRaw, aiSummary: data.summary }),
            },
          })
        }
      }
    } finally {
      setLoadingSummaries((prev) => {
        const next = new Set(prev)
        next.delete(r.nlcId)
        return next
      })
    }
  }

  /** Generate overall habitat analysis for all results */
  const generateOverallAnalysis = async () => {
    if (results.length === 0) return
    setIsOverallLoading(true)
    try {
      const res = await fetch('/api/ai/habitat-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitats: results.map((r) => ({
            fossittCode: r.fossittCode,
            fossittName: r.fossittName,
            nlcLabel: r.nlcLabel,
            areaHectares: r.areaHectares,
          })),
          projectName,
          bufferKm: selectedBuffer,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOverallAi(data.analysis)
        // Persist to workflow step metadata
        if (workflowStep) {
          const existingMeta = (workflowStep.metadata as Record<string, unknown>) || {}
          updateWorkflowStep.mutate({
            stepId: workflowStep.id,
            updates: {
              metadata: toJson({
                ...existingMeta,
                habitatOverallAnalysis: data.analysis,
                habitatOverallAnalysisUpdatedAt: new Date().toISOString(),
              }),
            },
          })
        }
      }
    } finally {
      setIsOverallLoading(false)
    }
  }

  return {
    aiSummaries,
    loadingSummaries,
    overallAi,
    isOverallLoading,
    fetchAiSummary,
    generateOverallAnalysis,
  }
}
