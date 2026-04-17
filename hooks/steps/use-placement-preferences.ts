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

/** Categories of data the ecologist can designate placement for in Step 5. */
export type PlacementCategory =
  | 'releveSurveys'
  | 'findings'
  | 'habitats'
  | 'targetNotes'
  | 'surveys'

/**
 * Compact subset (3 values) for UIs where the existing include-toggle
 * Switch handles the "exclude" path. Dropdown only decides *where* to place
 * a record when it's included.
 */
export const PLACEMENT_INCLUDE_OPTIONS: { value: PlacementOption; label: string }[] = [
  { value: 'both', label: 'Body + Appendix' },
  { value: 'main', label: 'Body only' },
  { value: 'appendix', label: 'Appendix only' },
]

export const PLACEMENT_OPTIONS: { value: PlacementOption; label: string; description: string }[] = [
  {
    value: 'both',
    label: 'Main body + Appendix',
    description: 'Summarised in the relevant Results subsection, full data in Appendix',
  },
  {
    value: 'main',
    label: 'Main body only',
    description: 'Summarised in the Results section (no appendix entry)',
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
    findings?: Record<string, PlacementOption>
    habitats?: Record<string, PlacementOption>
    targetNotes?: Record<string, PlacementOption>
    surveys?: Record<string, PlacementOption>
  }
}

type CategoryMaps = NonNullable<PlacementPreferencesMetadata['placementPreferences']>

function readCategoryMap(
  metadata: WorkflowStep['metadata'],
  category: PlacementCategory
): Record<string, PlacementOption> {
  const meta = (metadata as PlacementPreferencesMetadata | null) || null
  return meta?.placementPreferences?.[category] ?? {}
}

/**
 * Server-side compatible getter — used in the report-section API route to
 * resolve a record's placement from workflow metadata without React.
 */
export function getPlacementFromMetadata(
  metadata: WorkflowStep['metadata'],
  category: PlacementCategory,
  recordId: string
): PlacementOption {
  return readCategoryMap(metadata, category)[recordId] ?? DEFAULT_PLACEMENT
}

interface UsePlacementPreferencesOptions {
  workflowStep: WorkflowStep
}

/**
 * Hook for managing placement preferences stored on Step 5 (Data Analysis)
 * workflow step metadata. Provides setters that optimistically update local
 * state and persist to Supabase via useUpdateWorkflowStep.
 *
 * Supports five categories: releveSurveys, findings, habitats, targetNotes, surveys.
 * Use the generic API: getPlacement('habitats', id), setPlacement('habitats', id, 'main').
 */
export function usePlacementPreferences({ workflowStep }: UsePlacementPreferencesOptions) {
  const updateWorkflowStep = useUpdateWorkflowStep()

  const metadataRef = React.useRef(workflowStep?.metadata)
  React.useEffect(() => {
    metadataRef.current = workflowStep?.metadata
  }, [workflowStep?.metadata])

  const [maps, setMaps] = React.useState<CategoryMaps>(() => ({
    releveSurveys: readCategoryMap(workflowStep.metadata, 'releveSurveys'),
    findings: readCategoryMap(workflowStep.metadata, 'findings'),
    habitats: readCategoryMap(workflowStep.metadata, 'habitats'),
    targetNotes: readCategoryMap(workflowStep.metadata, 'targetNotes'),
    surveys: readCategoryMap(workflowStep.metadata, 'surveys'),
  }))

  // Re-sync when the workflow step metadata changes from outside (e.g. on navigation)
  React.useEffect(() => {
    setMaps({
      releveSurveys: readCategoryMap(workflowStep.metadata, 'releveSurveys'),
      findings: readCategoryMap(workflowStep.metadata, 'findings'),
      habitats: readCategoryMap(workflowStep.metadata, 'habitats'),
      targetNotes: readCategoryMap(workflowStep.metadata, 'targetNotes'),
      surveys: readCategoryMap(workflowStep.metadata, 'surveys'),
    })
  }, [workflowStep.metadata])

  // Debounced persistence — collapse bursts of rapid dropdown changes into a
  // single Supabase write. The `pendingMapsRef` always holds the latest state
  // the UI has committed, so when the debounce timer fires we persist the
  // most-recent snapshot regardless of how many setPlacement calls happened.
  const pendingMapsRef = React.useRef<CategoryMaps | null>(null)
  const persistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const mutateRef = React.useRef(updateWorkflowStep)
  React.useEffect(() => {
    mutateRef.current = updateWorkflowStep
  }, [updateWorkflowStep])

  const flushPersist = React.useCallback(() => {
    const nextMaps = pendingMapsRef.current
    if (!nextMaps) return
    pendingMapsRef.current = null

    // Read latest metadata AT persist time — not from a stale closure —
    // so other unrelated metadata keys aren't clobbered by a late write.
    const existingMeta = ((metadataRef.current as PlacementPreferencesMetadata | null) ??
      {}) as PlacementPreferencesMetadata & Record<string, unknown>

    const nextMeta: PlacementPreferencesMetadata & Record<string, unknown> = {
      ...existingMeta,
      placementPreferences: nextMaps,
    }

    mutateRef.current
      .mutateAsync({
        stepId: workflowStep.id,
        updates: {
          metadata: nextMeta as Json,
        },
      })
      .catch((err) => console.error('Failed to persist placement preferences:', err))
  }, [workflowStep?.id])

  // Flush on unmount so pending changes aren't lost on navigation.
  React.useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        flushPersist()
      }
    }
  }, [flushPersist])

  const setPlacement = React.useCallback(
    (category: PlacementCategory, recordId: string, value: PlacementOption) => {
      setMaps((prev) => {
        const prevCategoryMap = prev[category] ?? {}
        const nextCategoryMap = { ...prevCategoryMap, [recordId]: value }
        const next: CategoryMaps = { ...prev, [category]: nextCategoryMap }
        pendingMapsRef.current = next
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
        persistTimerRef.current = setTimeout(flushPersist, 300)
        return next
      })
    },
    [flushPersist]
  )

  const getPlacement = React.useCallback(
    (category: PlacementCategory, recordId: string): PlacementOption =>
      maps[category]?.[recordId] ?? DEFAULT_PLACEMENT,
    [maps]
  )

  return {
    /** Generic getter — `getPlacement('habitats', id)`. */
    getPlacement,
    /** Generic setter — `setPlacement('habitats', id, 'main')`. */
    setPlacement,
    /** All category maps in their current in-memory state. */
    maps,
    /** Persist-in-progress flag for spinner UI. */
    isSaving: updateWorkflowStep.isPending,
  }
}
