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
  handleFetchAiSummary: (finding: FindingDisplay, signal?: AbortSignal) => Promise<void>
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
  const summarizeAbortRef = React.useRef<AbortController | null>(null)

  // Config is recreated every render by the substep — keep it behind a ref
  // so the returned callbacks remain stable across renders.
  const configRef = React.useRef(config)
  configRef.current = config

  const handleFetchAiSummary = React.useCallback(
    async (finding: FindingDisplay, signal?: AbortSignal) => {
      const config = configRef.current
      if (config.canFetchAiSummary && !config.canFetchAiSummary(finding)) return
      if (signal?.aborted) return

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
          signal,
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
        // Aborted requests should silently clear loading state without surfacing
        // a "Failed to generate" message — the user explicitly stopped the batch.
        const aborted =
          (error instanceof DOMException && error.name === 'AbortError') || signal?.aborted
        setSearchResults((prev) =>
          prev.map((f) =>
            f.id === finding.id
              ? {
                  ...f,
                  metadata: {
                    ...f.metadata,
                    aiSummary: aborted
                      ? f.metadata?.aiSummary
                      : 'Failed to generate summary. Try again later.',
                    aiSummaryLoading: false,
                  },
                }
              : f
          )
        )
        if (!aborted) {
          console.error('AI summary error:', error)
        }
      }
    },
    [savedFindings, setSearchResults, updateFinding]
  )

  // Expose AI summary trigger to parent substep components
  if (aiSummaryTriggerRef) {
    aiSummaryTriggerRef.current = handleFetchAiSummary
  }

  const handleSummarizeAll = React.useCallback(async () => {
    const config = configRef.current
    const filter =
      config.summarizeFilter ||
      ((f: FindingDisplay) => !f.metadata?.aiSummary && !f.metadata?.aiSummaryLoading)
    const candidates = searchResults.filter(filter)
    if (candidates.length === 0) return

    // Abort any in-flight batch before starting a new one
    summarizeAbortRef.current?.abort()
    const controller = new AbortController()
    summarizeAbortRef.current = controller
    const { signal } = controller

    setIsSummarizing(true)
    try {
      for (const candidate of candidates) {
        if (signal.aborted) break
        await handleFetchAiSummary(candidate, signal)
        if (signal.aborted) break
        // Cancel-aware delay between requests
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve()
            return
          }
          let timer: ReturnType<typeof setTimeout> | null = null
          const onAbort = () => {
            if (timer) clearTimeout(timer)
            resolve()
          }
          timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort)
            resolve()
          }, 500)
          signal.addEventListener('abort', onAbort, { once: true })
        })
      }
    } finally {
      if (summarizeAbortRef.current === controller) {
        summarizeAbortRef.current = null
      }
      setIsSummarizing(false)
    }
  }, [searchResults, handleFetchAiSummary])

  const handleStopSummarize = React.useCallback(() => {
    // Abort the in-flight fetch and the rest of the batch immediately, then
    // flip UI state right away so the button reflects the stop without
    // waiting for the loop to unwind.
    summarizeAbortRef.current?.abort()
    summarizeAbortRef.current = null
    setIsSummarizing(false)
  }, [])

  return { handleFetchAiSummary, handleSummarizeAll, handleStopSummarize, isSummarizing }
}
