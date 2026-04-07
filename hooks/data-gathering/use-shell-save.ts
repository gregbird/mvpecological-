'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import type { DeskResearchFinding, InsertTables } from '@/types/database'
import {
  useBulkSaveFindings,
  useCreateFinding,
  useDeleteFinding,
} from '@/hooks/queries/use-finding-hooks'
import { useToast } from '@/hooks/use-toast'

interface UseShellSaveParams {
  config: SubstepShellConfig
  projectId: string
  userId: string
  siteId?: string | null
  savedFindings: DeskResearchFinding[]
  setSavingIds: React.Dispatch<React.SetStateAction<Set<string>>>
  onAfterSave?: (finding: FindingDisplay) => void
}

interface UseShellSaveReturn {
  handleSaveFinding: (finding: FindingDisplay) => Promise<void>
  handleSaveAll: (findings: FindingDisplay[]) => Promise<void>
  isSavingAll: boolean
}

export function useShellSave({
  config,
  projectId,
  userId,
  siteId,
  savedFindings,
  setSavingIds,
  onAfterSave,
}: UseShellSaveParams): UseShellSaveReturn {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const bulkSaveFindings = useBulkSaveFindings()
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  // Config is recreated every render by the substep — keep it behind a ref
  // so the returned callbacks remain stable across renders.
  const configRef = React.useRef(config)
  configRef.current = config

  const handleSaveFinding = React.useCallback(
    async (finding: FindingDisplay) => {
      const config = configRef.current
      setSavingIds((prev) => new Set(prev).add(finding.id))
      try {
        const existingFinding = savedFindings.find((f) => config.matchPredicate(f, finding))

        if (existingFinding) {
          await deleteFinding.mutateAsync(existingFinding.id)
        } else {
          const payload = config.buildCreatePayload(finding, { projectId, userId, siteId })
          await createFinding.mutateAsync(
            payload as Parameters<typeof createFinding.mutateAsync>[0]
          )

          // Auto-trigger AI summary after saving
          if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
            onAfterSave?.(finding)
          }
        }
      } catch (error) {
        console.error('Save finding error:', error)
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: 'Could not save the finding. Please try again.',
        })
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev)
          next.delete(finding.id)
          return next
        })
      }
    },
    [
      projectId,
      userId,
      siteId,
      savedFindings,
      setSavingIds,
      createFinding,
      deleteFinding,
      toast,
      onAfterSave,
    ]
  )

  const handleSaveAll = React.useCallback(
    async (findings: FindingDisplay[]) => {
      const config = configRef.current
      setIsSavingAll(true)

      // Build all payloads up-front so we can hand them to a single bulk
      // INSERT — this avoids the per-row PostgREST round trip + audit_log
      // trigger overhead that was tripping the Postgres statement_timeout
      // when saving 18+ species at once.
      const payloads = findings.map(
        (finding) =>
          config.buildCreatePayload(finding, {
            projectId,
            userId,
            siteId,
          }) as InsertTables<'desk_research_findings'>
      )

      let savedCount = 0
      const justSaved: FindingDisplay[] = []

      try {
        try {
          const inserted = await bulkSaveFindings.mutateAsync(payloads)
          savedCount = inserted.length
          justSaved.push(...findings)
        } catch (bulkError) {
          // Bulk insert failed (e.g. one row violated a constraint). Fall
          // back to per-row inserts so the rest still get saved and we
          // surface a clear partial-success state to the user.
          console.error('Bulk save failed, falling back to per-row:', bulkError)
          for (const finding of findings) {
            try {
              const payload = config.buildCreatePayload(finding, { projectId, userId, siteId })
              await createFinding.mutateAsync(
                payload as Parameters<typeof createFinding.mutateAsync>[0]
              )
              savedCount++
              justSaved.push(finding)
            } catch {
              // Skip individual failures so a single bad row doesn't stop the batch
            }
          }
        }

        if (savedCount > 0) {
          toast({
            title: `Saved ${savedCount} ${savedCount === 1 ? 'item' : 'items'}`,
            description: `${savedCount} of ${findings.length} records saved. Generating AI summaries...`,
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Save failed',
            description: `Could not save any of the ${findings.length} records. Please try again.`,
          })
        }

        // Auto-trigger AI summaries for all saved findings. Fire-and-forget
        // requests are throttled by useShellAi's module-level concurrency
        // limiter so the OpenAI API doesn't get hammered.
        for (const finding of justSaved) {
          if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
            onAfterSave?.(finding)
            // Brief stagger so the queue fills naturally rather than all at once
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      } finally {
        setIsSavingAll(false)
      }
    },
    [projectId, userId, siteId, bulkSaveFindings, createFinding, toast, onAfterSave]
  )

  return { handleSaveFinding, handleSaveAll, isSavingAll }
}
