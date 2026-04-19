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
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import {
  buildSiteBufferCache,
  resolveTouchingSites,
  type SiteWithBuffer,
} from '@/lib/data-gathering/resolve-touching-sites'

interface UseShellSaveParams {
  config: SubstepShellConfig
  projectId: string
  userId: string
  siteId?: string | null
  savedFindings: DeskResearchFinding[]
  setSavingIds: React.Dispatch<React.SetStateAction<Set<string>>>
  onAfterSave?: (finding: FindingDisplay) => void
  /**
   * All project sites with boundary. Used in "All Sites" mode to spatially
   * distribute each finding across every site whose (boundary + buffer)
   * intersects the finding's location — so a SAC touching two sites becomes
   * two rows (one per site_id) instead of a single `site_id=null` orphan.
   */
  projectSites?: ProjectSiteWithGeoJSON[]
  /** Buffer distance (km) currently selected in the UI — used for intersection. */
  selectedBuffer?: number
}

/**
 * Build the per-site payloads for one finding. When a finding's location
 * touches multiple project sites, returns one payload per site so the save
 * path inserts N rows. If no sites touch (or spatial data is unavailable),
 * falls back to a single payload with whatever siteId the UI provided.
 */
function expandPayloadsForFinding(
  finding: FindingDisplay,
  config: SubstepShellConfig,
  projectId: string,
  userId: string,
  siteId: string | null | undefined,
  siteCache: SiteWithBuffer[] | null,
  savedFindings: DeskResearchFinding[]
): InsertTables<'desk_research_findings'>[] {
  // Specific site mode — no spatial distribution, keep legacy behaviour.
  if (siteId) {
    return [
      config.buildCreatePayload(finding, {
        projectId,
        userId,
        siteId,
      }) as InsertTables<'desk_research_findings'>,
    ]
  }

  // "All Sites" mode — distribute across touching sites. Without a site
  // cache we can't spatially distribute, so fall back to a null-site row.
  if (!siteCache || siteCache.length === 0) {
    return [
      config.buildCreatePayload(finding, {
        projectId,
        userId,
        siteId: null,
      }) as InsertTables<'desk_research_findings'>,
    ]
  }

  const touching = resolveTouchingSites(finding.location ?? null, siteCache)
  if (touching.length === 0) {
    // No site's buffer intersects this finding — keep it as a project-wide row
    // rather than silently dropping it (e.g. tiny catchment far from every site).
    return [
      config.buildCreatePayload(finding, {
        projectId,
        userId,
        siteId: null,
      }) as InsertTables<'desk_research_findings'>,
    ]
  }

  // One payload per touching site; skip sites that already have an equivalent
  // saved row so re-clicks don't produce duplicates.
  const out: InsertTables<'desk_research_findings'>[] = []
  for (const site of touching) {
    const alreadySaved = savedFindings.some(
      (sf) => sf.site_id === site.id && config.matchPredicate(sf, finding)
    )
    if (alreadySaved) continue
    out.push(
      config.buildCreatePayload(finding, {
        projectId,
        userId,
        siteId: site.id,
      }) as InsertTables<'desk_research_findings'>
    )
  }
  return out
}

interface UseShellSaveReturn {
  handleSaveFinding: (finding: FindingDisplay) => Promise<void>
  handleSaveAll: (findings: FindingDisplay[]) => Promise<void>
  handleStopSaveAll: () => void
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
  projectSites,
  selectedBuffer,
}: UseShellSaveParams): UseShellSaveReturn {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const bulkSaveFindings = useBulkSaveFindings()
  const [isSavingAll, setIsSavingAll] = React.useState(false)
  // Abort handle for the post-save AI summary loop. The bulk INSERT itself
  // runs atomically on the server and cannot be cancelled mid-flight, but the
  // trailing `onAfterSave` fan-out (which fires AI summary requests + DB
  // updates for every saved finding) can add minutes of work and needs a
  // visible Stop. When the user clicks Stop, this controller aborts the loop
  // so the UI unfreezes and no more OpenAI calls fire.
  const saveAllAbortRef = React.useRef<AbortController | null>(null)

  // Config is recreated every render by the substep — keep it behind a ref
  // so the returned callbacks remain stable across renders.
  const configRef = React.useRef(config)
  configRef.current = config

  // Memoize the per-site buffer cache. Rebuilds only when the set of sites
  // or the selected buffer changes; the intersection checks themselves are
  // O(sites) but do not dominate even for 20+ site projects.
  const siteCache = React.useMemo<SiteWithBuffer[] | null>(() => {
    if (!projectSites || projectSites.length === 0 || !selectedBuffer) return null
    return buildSiteBufferCache(projectSites, selectedBuffer)
  }, [projectSites, selectedBuffer])

  const handleSaveFinding = React.useCallback(
    async (finding: FindingDisplay) => {
      const config = configRef.current
      setSavingIds((prev) => new Set(prev).add(finding.id))
      try {
        // Toggle: if any matching finding already exists (any site), unsave
        // all of them so the UI's "already saved" marker has a symmetric
        // delete path across the multi-site rows.
        const matchingSaved = savedFindings.filter((f) => config.matchPredicate(f, finding))

        if (matchingSaved.length > 0) {
          for (const sf of matchingSaved) {
            await deleteFinding.mutateAsync(sf.id)
          }
        } else {
          const payloads = expandPayloadsForFinding(
            finding,
            config,
            projectId,
            userId,
            siteId,
            siteCache,
            savedFindings
          )
          if (payloads.length === 0) {
            // Every touching site already had an equivalent row — nothing to do.
            return
          }
          if (payloads.length === 1) {
            await createFinding.mutateAsync(
              payloads[0] as Parameters<typeof createFinding.mutateAsync>[0]
            )
          } else {
            // Multiple touching sites → single bulk INSERT to avoid N round
            // trips and keep cascade + AI summary firing just once per batch.
            await bulkSaveFindings.mutateAsync(payloads)
          }

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
      bulkSaveFindings,
      siteCache,
      toast,
      onAfterSave,
    ]
  )

  const handleSaveAll = React.useCallback(
    async (findings: FindingDisplay[]) => {
      const config = configRef.current

      // Large batches like 2000+ species from an NBDC search can flood the DB
      // and then run the AI summary loop for ~20 minutes. Confirm before we
      // let that happen — this is the guard rail the original Save All button
      // was missing. Also surface the AI-summary count separately so the
      // user knows Save All isn't going to fire 2500 OpenAI requests when
      // the substep filters them down to ~250.
      if (findings.length >= 100 && typeof window !== 'undefined') {
        const aiCount = config.autoAiSummaryFilter
          ? findings.filter(config.autoAiSummaryFilter).length
          : findings.length
        const aiLine =
          aiCount === findings.length
            ? `AI summaries will be generated for all ${findings.length} — this can take several minutes.`
            : aiCount === 0
              ? `No AI summaries will be generated automatically.`
              : `AI summaries will be generated for ${aiCount} findings (the rest are skipped to save time and cost).`
        const ok = window.confirm(
          `Save ${findings.length} findings to the project?\n\n${aiLine}\n\nYou can still trigger more summaries later with "Summarize All".`
        )
        if (!ok) return
      }

      // Arm a fresh abort controller so the trailing AI summary loop can be
      // stopped by the user. Any previous in-flight batch is cancelled first.
      saveAllAbortRef.current?.abort()
      const controller = new AbortController()
      saveAllAbortRef.current = controller
      const { signal } = controller

      setIsSavingAll(true)

      // Build all payloads up-front so we can hand them to a single bulk
      // INSERT — this avoids the per-row PostgREST round trip + audit_log
      // trigger overhead that was tripping the Postgres statement_timeout
      // when saving 18+ species at once.
      //
      // In "All Sites" mode each finding may expand to N rows (one per
      // touching site). A finding with a saved match per site is skipped so
      // re-running Save All doesn't produce duplicates.
      const payloads: InsertTables<'desk_research_findings'>[] = []
      for (const finding of findings) {
        payloads.push(
          ...expandPayloadsForFinding(
            finding,
            config,
            projectId,
            userId,
            siteId,
            siteCache,
            savedFindings
          )
        )
      }

      let savedCount = 0
      const justSaved: FindingDisplay[] = []

      try {
        try {
          const inserted = await bulkSaveFindings.mutateAsync(payloads)
          savedCount = inserted.length
          justSaved.push(...findings)
        } catch (bulkError) {
          if (signal.aborted) return
          // Bulk insert failed (e.g. one row violated a constraint). Fall
          // back to per-row inserts so the rest still get saved and we
          // surface a clear partial-success state to the user. We still
          // respect spatial distribution: each finding may write N rows.
          console.error('Bulk save failed, falling back to per-row:', bulkError)
          for (const finding of findings) {
            if (signal.aborted) break
            const expanded = expandPayloadsForFinding(
              finding,
              config,
              projectId,
              userId,
              siteId,
              siteCache,
              savedFindings
            )
            let rowOk = false
            for (const payload of expanded) {
              if (signal.aborted) break
              try {
                await createFinding.mutateAsync(
                  payload as Parameters<typeof createFinding.mutateAsync>[0]
                )
                rowOk = true
              } catch {
                // Skip individual failures so a single bad row doesn't stop the batch
              }
            }
            if (rowOk) {
              savedCount++
              justSaved.push(finding)
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
        // limiter so the OpenAI API doesn't get hammered. Abort-aware: the
        // user can click Stop to break the loop without waiting minutes.
        //
        // Substeps with huge result sets (e.g. NBDC species → 2000+ rows)
        // should configure `autoAiSummaryFilter` to narrow auto-AI to the
        // findings that actually earn their summary cost (protected /
        // invasive / threatened). Without a filter we keep the old
        // behaviour of summarising everything that was just saved.
        const autoAiFilter = configRef.current.autoAiSummaryFilter
        for (const finding of justSaved) {
          if (signal.aborted) break
          if (autoAiFilter && !autoAiFilter(finding)) continue
          if (!finding.metadata?.aiSummary && !finding.metadata?.aiSummaryLoading) {
            onAfterSave?.(finding)
            // Brief cancel-aware stagger so the queue fills naturally rather
            // than all at once.
            await new Promise<void>((resolve) => {
              if (signal.aborted) {
                resolve()
                return
              }
              const timer = setTimeout(() => {
                signal.removeEventListener('abort', onAbort)
                resolve()
              }, 100)
              const onAbort = () => {
                clearTimeout(timer)
                resolve()
              }
              signal.addEventListener('abort', onAbort, { once: true })
            })
          }
        }
      } finally {
        if (saveAllAbortRef.current === controller) {
          saveAllAbortRef.current = null
        }
        setIsSavingAll(false)
      }
    },
    [
      projectId,
      userId,
      siteId,
      savedFindings,
      siteCache,
      bulkSaveFindings,
      createFinding,
      toast,
      onAfterSave,
    ]
  )

  const handleStopSaveAll = React.useCallback(() => {
    saveAllAbortRef.current?.abort()
    saveAllAbortRef.current = null
    setIsSavingAll(false)
  }, [])

  return { handleSaveFinding, handleSaveAll, handleStopSaveAll, isSavingAll }
}
