'use client'

import * as React from 'react'
import { useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import type { Json, WorkflowStep } from '@/types/database'

/**
 * Placement designation — controls where a piece of data appears in the
 * AI-generated draft report. Matches the EWIC Relevé sample report pattern:
 *   - Main body = concise prose summary + charts/maps
 *   - Appendix  = full raw data tables
 */
export type PlacementOption = 'main' | 'appendix' | 'both' | 'exclude'

export const PLACEMENT_OPTIONS: { value: PlacementOption; label: string; description: string }[] = [
  {
    value: 'both',
    label: 'Main body + Appendix',
    description: 'Summarised in Survey Results section, full data in Appendix',
  },
  {
    value: 'main',
    label: 'Main body only',
    description: 'Summarised in Survey Results section (no appendix entry)',
  },
  {
    value: 'appendix',
    label: 'Appendix only',
    description: 'Full data in Appendix (not referenced in main body)',
  },
  {
    value: 'exclude',
    label: 'Exclude from report',
    description: 'Skip this record entirely in the AI draft',
  },
]

export const DEFAULT_PLACEMENT: PlacementOption = 'both'

/** Shape persisted on the Data Analysis (Step 5) workflow step metadata JSON. */
export interface PlacementPreferencesMetadata {
  placementPreferences?: {
    releveSurveys?: Record<string, PlacementOption>
    // Future: speciesRecords?, habitats?, targetNotes?, findings?
  }
}

function readReleveMap(metadata: WorkflowStep['metadata']): Record<string, PlacementOption> {
  const meta = (metadata as PlacementPreferencesMetadata | null) || null
  return meta?.placementPreferences?.releveSurveys ?? {}
}

export function getRelevePlacement(
  metadata: WorkflowStep['metadata'],
  releveId: string
): PlacementOption {
  return readReleveMap(metadata)[releveId] ?? DEFAULT_PLACEMENT
}

interface UsePlacementPreferencesOptions {
  workflowStep: WorkflowStep
}

/**
 * Hook for managing placement preferences stored on Step 5 (Data Analysis)
 * workflow step metadata. Provides setters that optimistically update local
 * state and persist to Supabase via useUpdateWorkflowStep.
 */
export function usePlacementPreferences({ workflowStep }: UsePlacementPreferencesOptions) {
  const updateWorkflowStep = useUpdateWorkflowStep()

  const metadataRef = React.useRef(workflowStep?.metadata)
  React.useEffect(() => {
    metadataRef.current = workflowStep?.metadata
  }, [workflowStep?.metadata])

  const [releveMap, setReleveMap] = React.useState<Record<string, PlacementOption>>(() =>
    readReleveMap(workflowStep.metadata)
  )

  // Re-sync when the workflow step metadata changes from outside (e.g. on navigation)
  React.useEffect(() => {
    setReleveMap(readReleveMap(workflowStep.metadata))
  }, [workflowStep.metadata])

  const persist = React.useCallback(
    async (nextReleveMap: Record<string, PlacementOption>) => {
      const existingMeta = ((metadataRef.current as PlacementPreferencesMetadata | null) ??
        {}) as PlacementPreferencesMetadata & Record<string, unknown>
      const existingPrefs = existingMeta.placementPreferences ?? {}

      const nextMeta: PlacementPreferencesMetadata & Record<string, unknown> = {
        ...existingMeta,
        placementPreferences: {
          ...existingPrefs,
          releveSurveys: nextReleveMap,
        },
      }

      await updateWorkflowStep.mutateAsync({
        stepId: workflowStep.id,
        updates: {
          metadata: nextMeta as unknown as Json,
        },
      })
    },
    [workflowStep?.id, updateWorkflowStep]
  )

  const setRelevePlacement = React.useCallback(
    (releveId: string, value: PlacementOption) => {
      setReleveMap((prev) => {
        const next = { ...prev, [releveId]: value }
        // Persist in background — errors logged but UI stays responsive
        persist(next).catch((err) =>
          console.error('Failed to persist relevé placement preference:', err)
        )
        return next
      })
    },
    [persist]
  )

  const getPlacement = React.useCallback(
    (releveId: string): PlacementOption => releveMap[releveId] ?? DEFAULT_PLACEMENT,
    [releveMap]
  )

  return {
    releveMap,
    getPlacement,
    setRelevePlacement,
    isSaving: updateWorkflowStep.isPending,
  }
}
