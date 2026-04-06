'use client'

import * as React from 'react'
import type { DeskResearchFinding } from '@/types/database'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'

export interface UseSubstepSearchConfig {
  /** Search results state (from useSessionStorage) */
  searchResults: FindingDisplay[]
  setSearchResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  /** SessionStorage cache key */
  cacheKey: string
  /** Saved findings from the DB */
  savedFindings: DeskResearchFinding[]
  /** Whether auto-search should fire */
  autoSearchTrigger?: boolean
  /** Callback after auto-search completes */
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void
  /** Whether this substep tab is currently active/visible */
  isActive?: boolean
  /** Project boundary (needed to decide if auto-search should run) */
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  /** Ref to the search function (use React.useRef to avoid hoisting issues) */
  performSearchRef: React.RefObject<(() => Promise<void>) | null>
  /** Match predicate: given a saved finding and a search result, return true if they represent the same entity */
  matchPredicate: (saved: DeskResearchFinding, result: FindingDisplay) => boolean
  /** Keys to keep in minimal sessionStorage fallback (e.g., ['siteCode', 'siteType']) */
  minimalMetadataKeys: string[]
  /** Source values to filter savedFindings for this substep (e.g., ['npws'] or ['gbif', 'nbdc']) */
  sourceFilter?: string[]
  /** Active site ID — used to reset state when site changes */
  siteId?: string | null
}

export interface UseSubstepSearchReturn {
  selectedFinding: FindingDisplay | null
  setSelectedFinding: React.Dispatch<React.SetStateAction<FindingDisplay | null>>
  selectedBuffer: number
  setSelectedBuffer: React.Dispatch<React.SetStateAction<number>>
  hiddenIds: Set<string>
  handleToggleVisibility: (findingId: string) => void
  savingIds: Set<string>
  setSavingIds: React.Dispatch<React.SetStateAction<Set<string>>>
  showSavedOnMap: boolean
  setShowSavedOnMap: React.Dispatch<React.SetStateAction<boolean>>
}

export function useSubstepSearch(
  config: UseSubstepSearchConfig,
  defaultBuffer: number
): UseSubstepSearchReturn {
  const {
    searchResults,
    setSearchResults,
    cacheKey,
    savedFindings,
    autoSearchTrigger,
    onAutoSearchComplete,
    isActive,
    projectBoundary,
    performSearchRef,
    matchPredicate,
    minimalMetadataKeys,
    sourceFilter,
    siteId,
  } = config

  const [selectedFinding, setSelectedFinding] = React.useState<FindingDisplay | null>(null)
  const [selectedBuffer, setSelectedBuffer] = React.useState<number>(defaultBuffer)
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set())
  const [showSavedOnMap, setShowSavedOnMap] = React.useState(false)

  // Use refs for callbacks to avoid stale closures in effects
  const onAutoSearchCompleteRef = React.useRef(onAutoSearchComplete)
  onAutoSearchCompleteRef.current = onAutoSearchComplete
  const searchResultsRef = React.useRef(searchResults)
  searchResultsRef.current = searchResults

  // --- Refs for auto-search and restore guards ---
  const autoSearchHandledRef = React.useRef(false)
  const restoredRef = React.useRef(false)

  // --- Reset UI state when site changes ---
  const prevSiteIdRef = React.useRef(siteId)
  React.useEffect(() => {
    if (prevSiteIdRef.current === siteId) return
    prevSiteIdRef.current = siteId
    // Clear selection state — search results stay in project-level cache,
    // spatial filter handles per-site display
    setSelectedFinding(null)
    setHiddenIds(new Set())
    setShowSavedOnMap(false)
  }, [siteId])

  // --- Auto-search effect ---
  React.useEffect(() => {
    if (!autoSearchTrigger || autoSearchHandledRef.current) return
    autoSearchHandledRef.current = true

    if (searchResultsRef.current.length > 0) {
      onAutoSearchCompleteRef.current?.('skipped')
      return
    }
    if (!projectBoundary) {
      onAutoSearchCompleteRef.current?.('skipped')
      return
    }

    performSearchRef
      .current?.()
      .then(() => onAutoSearchCompleteRef.current?.('done'))
      .catch(() => onAutoSearchCompleteRef.current?.('error'))
  }, [autoSearchTrigger, projectBoundary])

  // --- Restore saved findings from DB when sessionStorage cache is empty ---
  React.useEffect(() => {
    if (restoredRef.current) return
    if (searchResults.length > 0) return
    if (savedFindings.length === 0) return
    if (!sourceFilter || sourceFilter.length === 0) return

    // Only restore if sessionStorage cache is truly empty
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
    if (cached) return

    restoredRef.current = true

    const relevant = savedFindings.filter((f) => sourceFilter.includes(f.source))
    if (relevant.length === 0) return

    const restored: FindingDisplay[] = relevant.map((f) => {
      const rawData = f.raw_data as Record<string, unknown> | undefined
      const rawMetadata = rawData?.metadata as Record<string, unknown> | undefined
      return {
        id: f.id,
        source: f.source,
        dataType: f.data_type,
        title: f.title,
        content: f.content || undefined,
        location: f.location as GeoJSON.Geometry | undefined,
        isSaved: true,
        notes: f.notes ?? undefined,
        metadata: {
          siteCode: rawData?.siteCode as string | undefined,
          siteType: rawData?.siteType as string | undefined,
          scientificName: rawData?.scientificName as string | undefined,
          commonName: rawData?.commonName as string | undefined,
          distance: f.distance_from_boundary_km ?? undefined,
          isProtected: f.is_protected ?? undefined,
          aiSummary: rawMetadata?.aiSummary as string | undefined,
        },
      }
    })

    setSearchResults(restored)
  }, [searchResults.length, savedFindings, sourceFilter, cacheKey, setSearchResults])

  // --- Toggle finding visibility on map ---
  const handleToggleVisibility = React.useCallback((findingId: string) => {
    setHiddenIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(findingId)) {
        newSet.delete(findingId)
      } else {
        newSet.add(findingId)
      }
      return newSet
    })
  }, [])

  // --- Invalidate Leaflet map size when substep becomes visible ---
  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // --- Restore location data when cache is missing geometries ---
  // Full geometry is now preserved in cache, but some older caches may still have locationCenter
  React.useEffect(() => {
    if (searchResults.length === 0) return
    const needsRestore = searchResults.some((r) => !r.location)
    if (!needsRestore) return

    setSearchResults((prev) =>
      prev.map((result) => {
        if (result.location) return result
        // Try to restore full geometry from saved findings
        if (savedFindings.length > 0) {
          const match = savedFindings.find(
            (sf) => sf.id === result.id || matchPredicate(sf, result)
          )
          if (match?.location) {
            return { ...result, location: match.location as GeoJSON.Geometry }
          }
        }
        // Legacy fallback: convert cached locationCenter to Point geometry
        const lc = (result as unknown as Record<string, unknown>).locationCenter as
          | number[]
          | undefined
        if (lc && lc.length >= 2) {
          return {
            ...result,
            location: { type: 'Point' as const, coordinates: lc } as GeoJSON.Point,
          }
        }
        return result
      })
    )
  }, [savedFindings, searchResults.length])

  // --- Sync notes from savedFindings into searchResults when notes change ---
  React.useEffect(() => {
    if (searchResults.length === 0 || savedFindings.length === 0) return

    setSearchResults((prev) =>
      prev.map((result) => {
        const match = savedFindings.find((sf) => sf.id === result.id || matchPredicate(sf, result))
        if (!match) return result
        const newNotes = match.notes ?? undefined
        if (newNotes === result.notes) return result
        return { ...result, notes: newNotes }
      })
    )
  }, [savedFindings])

  // --- Debounced sessionStorage write ---
  // CRITICAL: this cache MUST survive unmount. During auto-search the substep can
  // unmount as soon as all four searches complete — if the debounced timer is still
  // pending at that point, a naive clearTimeout on cleanup would cancel the write
  // and the cache stays empty (which caused species/aquatic results to vanish).
  //
  // Fix: keep searchResults in a ref and flush the write synchronously both
  // (a) when the timer fires normally and (b) when the component unmounts with a
  // pending write.
  const cacheTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cacheGaveUpRef = React.useRef(false)
  const latestSearchResultsRef = React.useRef(searchResults)
  latestSearchResultsRef.current = searchResults

  const writeCacheNow = React.useCallback(
    (resultsToWrite: FindingDisplay[]) => {
      if (resultsToWrite.length === 0) return
      if (cacheGaveUpRef.current) return
      try {
        // Strip rawData and AI summaries to reduce cache size
        const cacheableResults = resultsToWrite.map(({ rawData: _rawData, ...rest }) => {
          if (rest.metadata?.aiSummary) {
            const { aiSummary: _ai, ...metaRest } = rest.metadata
            return { ...rest, metadata: metaRest }
          }
          return rest
        })
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheableResults))
      } catch {
        try {
          // Evict other caches to free space
          const keysToRemove: string[] = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (
              key &&
              (key.startsWith('npws-') ||
                key.startsWith('gbif-') ||
                key.startsWith('epa-') ||
                key.startsWith('nbdc-report-'))
            ) {
              if (key !== cacheKey) keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((k) => sessionStorage.removeItem(k))
          const minimalResults = resultsToWrite.map(
            ({ id, title, source, dataType, metadata }) => ({
              id,
              title,
              source,
              dataType,
              metadata: Object.fromEntries(
                minimalMetadataKeys
                  .filter((k) => (metadata as Record<string, unknown>)?.[k] !== undefined)
                  .map((k) => [k, (metadata as Record<string, unknown>)?.[k]])
              ),
            })
          )
          sessionStorage.setItem(cacheKey, JSON.stringify(minimalResults))
        } catch {
          // Permanently give up caching for this key — stop retrying
          cacheGaveUpRef.current = true
        }
      }
    },
    [cacheKey, minimalMetadataKeys]
  )

  // Keep a ref to the latest writeCacheNow so the unmount effect can always
  // call the current version (cacheKey / minimalMetadataKeys may have changed)
  const writeCacheNowRef = React.useRef(writeCacheNow)
  writeCacheNowRef.current = writeCacheNow

  React.useEffect(() => {
    if (searchResults.length === 0) return
    if (cacheGaveUpRef.current) return

    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      writeCacheNowRef.current(latestSearchResultsRef.current)
      cacheTimerRef.current = null
    }, 300)
  }, [searchResults])

  // Flush on unmount — write synchronously using the latest writeCacheNow so
  // results survive a navigation away from the substep during auto-search.
  // Empty deps → cleanup runs ONLY on actual unmount (not on cacheKey changes).
  React.useEffect(() => {
    return () => {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current)
        cacheTimerRef.current = null
      }
      writeCacheNowRef.current(latestSearchResultsRef.current)
    }
  }, [])

  return {
    selectedFinding,
    setSelectedFinding,
    selectedBuffer,
    setSelectedBuffer,
    hiddenIds,
    handleToggleVisibility,
    savingIds,
    setSavingIds,
    showSavedOnMap,
    setShowSavedOnMap,
  }
}
