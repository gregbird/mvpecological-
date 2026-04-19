'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import type { DeskResearchFinding, Json } from '@/types/database'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'

// Module-level concurrency limiter shared across all useShellAi instances.
// Without this, fire-and-forget batches (e.g. Save All on 27 invasive
// species) spawn 10+ in-flight OpenAI requests, which trips OpenAI rate
// limits and surfaces as a generic "Failed to fetch summary" toast.
const MAX_CONCURRENT_AI_SUMMARIES = 3
let aiSummaryInFlight = 0
const aiSummaryWaiters: Array<() => void> = []

const acquireAiSlot = (): Promise<void> =>
  new Promise((resolve) => {
    if (aiSummaryInFlight < MAX_CONCURRENT_AI_SUMMARIES) {
      aiSummaryInFlight++
      resolve()
      return
    }
    aiSummaryWaiters.push(() => {
      aiSummaryInFlight++
      resolve()
    })
  })

const releaseAiSlot = (): void => {
  aiSummaryInFlight = Math.max(0, aiSummaryInFlight - 1)
  const next = aiSummaryWaiters.shift()
  if (next) next()
}

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

      // Throttle concurrent OpenAI calls — without this, batch flows like
      // Save All saturate the OpenAI rate limit and surface as generic
      // "Failed to fetch summary" errors.
      await acquireAiSlot()

      try {
        if (signal?.aborted) return

        const response = await fetch(config.aiSummaryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.buildAiSummaryBody(finding)),
          signal,
        })

        if (!response.ok) {
          let detail = `HTTP ${response.status}`
          try {
            const errorBody = await response.json()
            if (errorBody?.error) detail += `: ${errorBody.error}`
          } catch {
            // body wasn't JSON — fall back to status code only
          }
          throw new Error(`Failed to fetch summary (${detail})`)
        }

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

        // Persist AI summary to DB if finding is already saved. Dual-write to
        // the typed `ai_summary` column AND `raw_data.metadata.aiSummary` so
        // neither the Aşama 2 read path nor any remaining raw_data consumer
        // goes stale.
        const existingSaved = savedFindings.find((f) => config.matchPredicate(f, finding))
        if (existingSaved) {
          const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}
          const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}
          updateFinding
            .mutateAsync({
              findingId: existingSaved.id,
              updates: {
                ai_summary: data.summary,
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
      } finally {
        releaseAiSlot()
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
