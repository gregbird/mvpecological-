'use client'

import * as React from 'react'

import type { DeskResearchFinding, FindingSource } from '@/components/desk-research/finding-card'

type SortField = 'title' | 'source' | 'type' | 'distance'
type SortOrder = 'asc' | 'desc'

const RESULTS_PER_PAGE = 20

export function useSearchState(searchResults: DeskResearchFinding[]) {
  // Filtering and sorting state
  const [filterSource, setFilterSource] = React.useState<FindingSource | 'all'>('all')
  const [filterType, setFilterType] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<SortField>('distance')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc')
  const [displayLimit, setDisplayLimit] = React.useState(RESULTS_PER_PAGE)

  // Reset display limit when search results change
  React.useEffect(() => {
    setDisplayLimit(RESULTS_PER_PAGE)
  }, [searchResults])

  // Filtered and sorted results
  const filteredResults = React.useMemo(() => {
    let results = [...searchResults]

    if (filterSource !== 'all') {
      results = results.filter((r) => r.source === filterSource)
    }

    if (filterType !== 'all') {
      results = results.filter((r) => r.dataType === filterType)
    }

    results.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'source':
          comparison = a.source.localeCompare(b.source)
          break
        case 'type':
          comparison = a.dataType.localeCompare(b.dataType)
          break
        case 'distance': {
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          comparison = distA - distB
          break
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return results
  }, [searchResults, filterSource, filterType, sortBy, sortOrder])

  const paginatedResults = React.useMemo(() => {
    return filteredResults.slice(0, displayLimit)
  }, [filteredResults, displayLimit])

  const hasMoreResults = filteredResults.length > displayLimit

  const availableSources = React.useMemo(() => {
    return [...new Set(searchResults.map((r) => r.source))]
  }, [searchResults])

  const availableTypes = React.useMemo(() => {
    return [...new Set(searchResults.map((r) => r.dataType))]
  }, [searchResults])

  const loadMore = React.useCallback(() => {
    setDisplayLimit((prev) => prev + RESULTS_PER_PAGE)
  }, [])

  const toggleSortOrder = React.useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  return {
    filterSource,
    setFilterSource,
    filterType,
    setFilterType,
    sortBy,
    setSortBy: setSortBy as (value: SortField) => void,
    sortOrder,
    toggleSortOrder,
    filteredResults,
    paginatedResults,
    hasMoreResults,
    remainingCount: filteredResults.length - displayLimit,
    availableSources,
    availableTypes,
    loadMore,
  }
}
