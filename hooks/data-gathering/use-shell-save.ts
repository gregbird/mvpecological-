'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import type { DeskResearchFinding } from '@/types/database'
import { useCreateFinding, useDeleteFinding } from '@/hooks/queries/use-finding-hooks'
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
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  const handleSaveFinding = React.useCallback(
    async (finding: FindingDisplay) => {
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
      config,
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
      setIsSavingAll(true)
      let savedCount = 0
      const justSaved: FindingDisplay[] = []
      try {
        for (const finding of findings) {
          try {
            const payload = config.buildCreatePayload(finding, { projectId, userId, siteId })
            await createFinding.mutateAsync(
              payload as Parameters<typeof createFinding.mutateAsync>[0]
            )
            savedCount++
            justSaved.push(finding)
          } catch {
            // Skip individual failures
          }
        }
        toast({
          title: `Saved ${savedCount} species`,
          description: `${savedCount} of ${findings.length} species records saved. Generating AI summaries...`,
        })

        // Auto-trigger AI summaries for all saved findings (fire-and-forget)
        for (const finding of justSaved) {
          if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
            onAfterSave?.(finding)
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        }
      } finally {
        setIsSavingAll(false)
      }
    },
    [config, projectId, userId, siteId, createFinding, toast, onAfterSave]
  )

  return { handleSaveFinding, handleSaveAll, isSavingAll }
}
