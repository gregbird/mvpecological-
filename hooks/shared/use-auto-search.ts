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
    if (sessionStorage.getItem(autoSearchKey)) return

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
    setAutoSearchStatus({
      triggered: true,
      sites: hasSitesCache ? 'skipped' : 'searching',
      species: hasSpeciesCache ? 'skipped' : 'searching',
      aquatic: hasAquaticCache ? 'skipped' : 'searching',
      habitats: hasHabitatCache ? 'skipped' : 'searching',
    })
    setShowAutoSearchBanner(true)
  }, [boundary, projectId, autoSearchStatus.triggered, isStepCompleted, viewMode])

  // Auto-hide banner 5 seconds after all searches complete
  useEffect(() => {
    if (!showAutoSearchBanner) return
    const { sites, species, aquatic, habitats: habitatStatus } = autoSearchStatus
    const allDone =
      ['done', 'skipped', 'error'].includes(sites) &&
      ['done', 'skipped', 'error'].includes(species) &&
      ['done', 'skipped', 'error'].includes(aquatic) &&
      ['done', 'skipped', 'error'].includes(habitatStatus)

    if (!allDone) return
    const timer = setTimeout(() => setShowAutoSearchBanner(false), 5000)
    return () => clearTimeout(timer)
  }, [autoSearchStatus, showAutoSearchBanner])

  const isAutoSearchRunning =
    autoSearchStatus.triggered &&
    !(
      ['done', 'skipped', 'error'].includes(autoSearchStatus.sites) &&
      ['done', 'skipped', 'error'].includes(autoSearchStatus.species) &&
      ['done', 'skipped', 'error'].includes(autoSearchStatus.aquatic) &&
      ['done', 'skipped', 'error'].includes(autoSearchStatus.habitats)
    )

  return {
    autoSearchStatus,
    setAutoSearchStatus,
    showAutoSearchBanner,
    isAutoSearchRunning,
  }
}
