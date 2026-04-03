'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import type { DeskResearchFinding, Json } from '@/types/database'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'

interface UseShellAiParams {
  config: SubstepShellConfig
  savedFindings: DeskResearchFinding[]
  searchResults: FindingDisplay[]
  setSearchResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  aiSummaryTriggerRef?: React.MutableRefObject<((finding: FindingDisplay) => void) | null>
}

interface UseShellAiReturn {
  handleFetchAiSummary: (finding: FindingDisplay) => Promise<void>
  handleSummarizeAll: () => Promise<void>
  handleStopSummarize: () => void
  isSummarizing: boolean
}

export function useShellAi({
  config,
  savedFindings,
  searchResults,
  setSearchResults,
  aiSummaryTriggerRef,
}: UseShellAiParams): UseShellAiReturn {
  const updateFinding = useUpdateFinding()
  const [isSummarizing, setIsSummarizing] = React.useState(false)
  const summarizeCancelRef = React.useRef(false)

  const handleFetchAiSummary = React.useCallback(
    async (finding: FindingDisplay) => {
      if (config.canFetchAiSummary && !config.canFetchAiSummary(finding)) return

      // Set loading state
      setSearchResults((prev) =>
        prev.map((f) =>
          f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: true } } : f
        )
      )

      try {
        const response = await fetch(config.aiSummaryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.buildAiSummaryBody(finding)),
        })

        if (!response.ok) throw new Error('Failed to fetch summary')

        const data = await response.json()

        setSearchResults((prev) =>
          prev.map((f) =>
            f.id === finding.id
              ? {
                  ...f,
                  metadata: {
                    ...f.metadata,
                    aiSummary: data.summary,
                    aiSummaryLoading: false,
                  },
                }
              : f
          )
        )

        // Persist AI summary to DB if finding is already saved
        const existingSaved = savedFindings.find((f) => config.matchPredicate(f, finding))
        if (existingSaved) {
          const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}
          const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}
          updateFinding
            .mutateAsync({
              findingId: existingSaved.id,
              updates: {
                raw_data: {
                  ...existingRawData,
                  metadata: { ...existingMetadata, aiSummary: data.summary },
                } as unknown as Json,
              },
            })
            .catch((err) => console.error('Failed to persist AI summary:', err))
        }
      } catch (error) {
        console.error('AI summary error:', error)
        setSearchResults((prev) =>
          prev.map((f) =>
            f.id === finding.id
              ? {
                  ...f,
                  metadata: {
                    ...f.metadata,
                    aiSummary: 'Failed to generate summary. Try again later.',
                    aiSummaryLoading: false,
                  },
                }
              : f
          )
        )
      }
    },
    [config, savedFindings, setSearchResults, updateFinding]
  )

  // Expose AI summary trigger to parent substep components
  if (aiSummaryTriggerRef) {
    aiSummaryTriggerRef.current = handleFetchAiSummary
  }

  const handleSummarizeAll = React.useCallback(async () => {
    const filter =
      config.summarizeFilter ||
      ((f: FindingDisplay) => !f.metadata?.aiSummary && !f.metadata?.aiSummaryLoading)
    const candidates = searchResults.filter(filter)
    if (candidates.length === 0) return

    summarizeCancelRef.current = false
    setIsSummarizing(true)
    for (const candidate of candidates) {
      if (summarizeCancelRef.current) break
      await handleFetchAiSummary(candidate)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setIsSummarizing(false)
  }, [config.summarizeFilter, searchResults, handleFetchAiSummary])

  const handleStopSummarize = React.useCallback(() => {
    summarizeCancelRef.current = true
  }, [])

  return { handleFetchAiSummary, handleSummarizeAll, handleStopSummarize, isSummarizing }
}
