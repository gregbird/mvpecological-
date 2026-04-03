'use client'

import * as React from 'react'
import { RefreshCw, Filter, ArrowUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FindingCard, type DeskResearchFinding, type FindingSource } from './finding-card'

interface SearchResultsListProps {
  searchResults: DeskResearchFinding[]
  filteredResults: DeskResearchFinding[]
  paginatedResults: DeskResearchFinding[]
  hasMoreResults: boolean
  remainingCount: number
  isSearching: boolean
  // Filter state
  filterSource: FindingSource | 'all'
  onFilterSourceChange: (value: FindingSource | 'all') => void
  filterType: string
  onFilterTypeChange: (value: string) => void
  availableSources: FindingSource[]
  availableTypes: string[]
  // Sort state
  sortBy: 'title' | 'source' | 'type' | 'distance'
  onSortByChange: (value: 'title' | 'source' | 'type' | 'distance') => void
  sortOrder: 'asc' | 'desc'
  onToggleSortOrder: () => void
  // Actions
  onRefresh: () => void
  onLoadMore: () => void
  onFindingSave?: (finding: DeskResearchFinding) => void
  onViewOnMap?: (finding: DeskResearchFinding) => void
}

export function SearchResultsList({
  searchResults,
  filteredResults,
  paginatedResults,
  hasMoreResults,
  remainingCount,
  isSearching,
  filterSource,
  onFilterSourceChange,
  filterType,
  onFilterTypeChange,
  availableSources,
  availableTypes,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  onRefresh,
  onLoadMore,
  onFindingSave,
  onViewOnMap,
}: SearchResultsListProps) {
  if (searchResults.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Results ({filteredResults.length}
          {filteredResults.length !== searchResults.length && ` of ${searchResults.length}`})
        </h3>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isSearching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
        <Filter className="text-muted-foreground h-4 w-4" />

        {/* Source Filter */}
        <Select
          value={filterSource}
          onValueChange={(v) => onFilterSourceChange(v as FindingSource | 'all')}
        >
          <SelectTrigger className="h-8 w-32.5">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {availableSources.map((source) => (
              <SelectItem key={source} value={source}>
                {source.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={filterType} onValueChange={onFilterTypeChange}>
          <SelectTrigger className="h-8 w-37.5">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        <ArrowUpDown className="text-muted-foreground h-4 w-4" />

        {/* Sort By */}
        <Select
          value={sortBy}
          onValueChange={(v) => onSortByChange(v as 'title' | 'source' | 'type' | 'distance')}
        >
          <SelectTrigger className="h-8 w-27.5">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Distance</SelectItem>
            <SelectItem value="source">Source</SelectItem>
            <SelectItem value="type">Type</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onToggleSortOrder}>
          {sortBy === 'distance'
            ? sortOrder === 'asc'
              ? 'Nearest'
              : 'Farthest'
            : sortOrder === 'asc'
              ? 'A-Z'
              : 'Z-A'}
        </Button>
      </div>

      <ScrollArea className="h-125">
        <div className="space-y-3 pr-4">
          {paginatedResults.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onSave={onFindingSave}
              onViewOnMap={onViewOnMap}
            />
          ))}

          {/* Load More Button */}
          {hasMoreResults && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={onLoadMore}>
                Load More ({remainingCount} remaining)
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
