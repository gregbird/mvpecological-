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

  // --- Auto-search effect ---
  const autoSearchHandledRef = React.useRef(false)
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
  const restoredRef = React.useRef(false)
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

    const restored: FindingDisplay[] = relevant.map((f) => ({
      id: f.id,
      source: f.source,
      dataType: f.data_type,
      title: f.title,
      content: f.content || undefined,
      location: f.location as GeoJSON.Geometry | undefined,
      isSaved: true,
      metadata: {
        siteCode: (f.raw_data as Record<string, unknown>)?.siteCode as string | undefined,
        siteType: (f.raw_data as Record<string, unknown>)?.siteType as string | undefined,
        scientificName: (f.raw_data as Record<string, unknown>)?.scientificName as
          | string
          | undefined,
        commonName: (f.raw_data as Record<string, unknown>)?.commonName as string | undefined,
        distance: f.distance_from_boundary_km ?? undefined,
        isProtected: f.is_protected ?? undefined,
      },
    }))

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

  // --- Restore location data from savedFindings when cache is missing geometries ---
  React.useEffect(() => {
    if (searchResults.length === 0 || savedFindings.length === 0) return
    const needsRestore = searchResults.some((r) => !r.location)
    if (!needsRestore) return

    setSearchResults((prev) =>
      prev.map((result) => {
        if (result.location) return result
        const match = savedFindings.find((sf) => matchPredicate(sf, result))
        if (match?.location) {
          return { ...result, location: match.location as GeoJSON.Geometry }
        }
        return result
      })
    )
  }, [savedFindings])

  // --- Debounced sessionStorage write ---
  const cacheTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (searchResults.length === 0) return

    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      try {
        // Strip rawData and location to reduce storage size
        const cacheableResults = searchResults.map(({ rawData: _rawData, location, ...rest }) => ({
          ...rest,
          locationCenter: location
            ? location.type === 'Point'
              ? location.coordinates
              : undefined
            : undefined,
        }))
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheableResults))
      } catch (e) {
        console.warn('Failed to cache search results:', e)
        try {
          // Evict other caches to free space
          const keysToRemove: string[] = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (
              key &&
              (key.startsWith('npws-') || key.startsWith('gbif-') || key.startsWith('epa-'))
            ) {
              if (key !== cacheKey) keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((k) => sessionStorage.removeItem(k))
          const minimalResults = searchResults.map(({ id, title, source, dataType, metadata }) => ({
            id,
            title,
            source,
            dataType,
            metadata: Object.fromEntries(
              minimalMetadataKeys
                .filter((k) => (metadata as Record<string, unknown>)?.[k] !== undefined)
                .map((k) => [k, (metadata as Record<string, unknown>)?.[k]])
            ),
          }))
          sessionStorage.setItem(cacheKey, JSON.stringify(minimalResults))
        } catch {
          // Give up caching
        }
      }
    }, 1000)

    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [searchResults, cacheKey, minimalMetadataKeys])

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
