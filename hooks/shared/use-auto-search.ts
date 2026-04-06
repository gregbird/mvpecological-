'use client'

import { useState, useEffect } from 'react'
import type { AutoSearchStatus } from '@/components/steps/data-gathering/auto-search-banner'

interface AutoSearchState {
  triggered: boolean
  sites: AutoSearchStatus
  species: AutoSearchStatus
  aquatic: AutoSearchStatus
  habitats: AutoSearchStatus
}

/** Sequential execution order: designated sites first (user lands there),
 *  then species, aquatic, and finally habitats (heaviest payload). */
const SEQUENCE = ['sites', 'species', 'aquatic', 'habitats'] as const
type SequenceKey = (typeof SEQUENCE)[number]

const TERMINAL_STATUSES: AutoSearchStatus[] = ['done', 'skipped', 'error']

const INITIAL_STATE: AutoSearchState = {
  triggered: false,
  sites: 'idle',
  species: 'idle',
  aquatic: 'idle',
  habitats: 'idle',
}

interface UseAutoSearchOptions {
  projectId: string
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  isStepCompleted: boolean
  viewMode: string
  boundaryChanged: boolean
}

interface UseAutoSearchReturn {
  autoSearchStatus: AutoSearchState
  setAutoSearchStatus: React.Dispatch<React.SetStateAction<AutoSearchState>>
  showAutoSearchBanner: boolean
  isAutoSearchRunning: boolean
}

/**
 * Manages auto-search orchestration for data-gathering substeps.
 * Triggers sequential search on first load, skips cached substeps,
 * re-triggers on boundary change, and auto-hides the banner.
 */
export function useAutoSearch({
  projectId,
  boundary,
  isStepCompleted,
  viewMode,
  boundaryChanged,
}: UseAutoSearchOptions): UseAutoSearchReturn {
  const [autoSearchStatus, setAutoSearchStatus] = useState<AutoSearchState>(INITIAL_STATE)
  const [showAutoSearchBanner, setShowAutoSearchBanner] = useState(false)

  // Reset when boundary changes (GIS re-edited)
  useEffect(() => {
    if (boundaryChanged) {
      setAutoSearchStatus(INITIAL_STATE)
    }
  }, [boundaryChanged])

  // Trigger auto-search when boundary exists and no prior auto-search in this session
  useEffect(() => {
    if (autoSearchStatus.triggered) return
    if (!boundary) return
    if (isStepCompleted) return
    if (viewMode !== 'wizard') return

    const autoSearchKey = `auto-search-triggered-${projectId}`
    const hasSitesCache = !!sessionStorage.getItem(`npws-search-${projectId}`)
    // Species cache key is resolution-dependent: nbdc-report-{10km|2km|1km}-search-{projectId}
    let hasSpeciesCache = false
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(`nbdc-report-`) && key.endsWith(`-search-${projectId}`)) {
        hasSpeciesCache = true
        break
      }
    }
    const hasAquaticCache = !!sessionStorage.getItem(`epa-search-${projectId}`)
    const habitatPrefix = `nlc-habitat-${projectId}`
    let hasHabitatCache = false
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (
        key?.startsWith(habitatPrefix) &&
        !key.includes('-notes') &&
        !key.includes('-summaries')
      ) {
        hasHabitatCache = true
        break
      }
    }

    if (hasSitesCache && hasSpeciesCache && hasAquaticCache && hasHabitatCache) return

    sessionStorage.setItem(autoSearchKey, 'true')
    // Queue everything as 'idle' (cached sources are marked 'skipped'
    // immediately). The sequential orchestration effect below flips the
    // first non-skipped source to 'searching', and advances one at a time
    // as each one completes.
    setAutoSearchStatus({
      triggered: true,
      sites: hasSitesCache ? 'skipped' : 'idle',
      species: hasSpeciesCache ? 'skipped' : 'idle',
      aquatic: hasAquaticCache ? 'skipped' : 'idle',
      habitats: hasHabitatCache ? 'skipped' : 'idle',
    })
    setShowAutoSearchBanner(true)
  }, [boundary, projectId, autoSearchStatus.triggered, isStepCompleted, viewMode])

  // Sequential orchestration: only ONE source may be 'searching' at a time.
  // When the current source reaches a terminal state (done/skipped/error),
  // this effect advances to the next pending source in SEQUENCE.
  //
  // Why sequential instead of parallel?
  //   - Projects with 20+ sites used to fire 4 sources × 3 concurrent = 12+
  //     parallel external HTTP requests, easily overwhelming browser TCP
  //     pools and external API rate limits (NPWS timeouts, EPA throttling).
  //   - Users land on "Designated Sites" first, so that tab finishing first
  //     is the most valuable user-perceived speedup. They read those while
  //     the rest trickle in.
  useEffect(() => {
    if (!autoSearchStatus.triggered) return

    const anyRunning = SEQUENCE.some((k) => autoSearchStatus[k] === 'searching')
    if (anyRunning) return

    const nextIdle: SequenceKey | undefined = SEQUENCE.find((k) => autoSearchStatus[k] === 'idle')
    if (!nextIdle) return

    setAutoSearchStatus((prev) => ({ ...prev, [nextIdle]: 'searching' }))
  }, [autoSearchStatus])

  // Auto-hide banner 5 seconds after all searches complete
  useEffect(() => {
    if (!showAutoSearchBanner) return
    const allDone = SEQUENCE.every((k) => TERMINAL_STATUSES.includes(autoSearchStatus[k]))

    if (!allDone) return
    const timer = setTimeout(() => setShowAutoSearchBanner(false), 5000)
    return () => clearTimeout(timer)
  }, [autoSearchStatus, showAutoSearchBanner])

  const isAutoSearchRunning =
    autoSearchStatus.triggered &&
    !SEQUENCE.every((k) => TERMINAL_STATUSES.includes(autoSearchStatus[k]))

  return {
    autoSearchStatus,
    setAutoSearchStatus,
    showAutoSearchBanner,
    isAutoSearchRunning,
  }
}
