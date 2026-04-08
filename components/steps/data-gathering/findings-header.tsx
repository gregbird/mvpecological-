'use client'

import * as React from 'react'
import {
  Loader2,
  ArrowUpDown,
  Shield,
  Sparkles,
  Check,
  Save,
  AlertCircle,
  AlertTriangle,
  LayoutList,
  Table2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { DeskResearchFinding } from '@/types/database'
import {
  SITE_TYPE_FILTER_COLORS,
  FALLBACK_SITE_TYPE_FILTER_COLORS,
} from '@/lib/config/finding-colors'
import { getUnsavedFindings } from '@/hooks/data-gathering/use-findings-filters'

type SourceFilter = 'all' | 'protected' | 'invasive' | 'threatened'
type DistanceFilter = 'all' | '0-1' | '1-5' | '5-10' | '10+'
type SortField = 'distance' | 'title' | 'type' | 'last_recorded' | 'records'

/** Reusable toggle badge for species filter categories */
function SpeciesBadge({
  count,
  label,
  filterKey,
  activeFilter,
  onToggle,
  activeClass,
  inactiveClass,
  icon: Icon,
}: {
  count: number
  label: string
  filterKey: SourceFilter
  activeFilter?: SourceFilter
  onToggle?: (filter: SourceFilter) => void
  activeClass: string
  inactiveClass: string
  icon: React.ComponentType<{ className?: string }>
}) {
  if (count <= 0) return null
  const isActive = activeFilter === filterKey
  return (
    <button
      onClick={() => onToggle?.(isActive ? 'all' : filterKey)}
      title={`${count} ${label}`}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${isActive ? activeClass : inactiveClass}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {count}
    </button>
  )
}

interface FindingsHeaderProps {
  filteredFindings: FindingDisplay[]
  sortedFindings: FindingDisplay[]
  savedFindings: DeskResearchFinding[]
  savedCount: number
  siteTypeCounts: Record<string, number> | null

  // Species header
  showSpeciesHeader?: boolean
  speciesCounts?: {
    total: number
    protected: number
    invasive: number
    threatened?: number
    enriched: number
  }
  enrichmentStatus?: { isEnriching: boolean; current: number; total: number } | null
  sourceFilter?: SourceFilter
  onSourceFilterChange?: (filter: SourceFilter) => void

  // Saved filter
  showSavedOnly: boolean
  onShowSavedOnlyChange: (value: boolean) => void
  onSavedFilterChange?: (showSavedOnly: boolean) => void

  // Site type filter
  showSiteTypeFilter?: boolean
  siteTypeFilterConfig?: Record<string, { active: string; inactive: string }>
  siteTypeFilterOrder?: string[]
  activeSiteTypeFilter: string | null
  onActiveSiteTypeFilterChange: (value: string | null) => void
  onSiteTypeFilterChange?: (siteType: string | null) => void

  // Distance filter
  distanceFilter?: DistanceFilter
  onDistanceFilterChange?: (filter: DistanceFilter) => void

  // Species group filter (species only)
  taxonGroupFilter?: string | null
  onTaxonGroupFilterChange?: (group: string | null) => void
  taxonGroupOptions?: Array<{ value: string; count: number }>

  // Sort
  sortBy: SortField
  onSortByChange: (value: SortField) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderToggle: () => void

  // AI Summarize
  onSummarizeAll?: () => void
  onStopSummarize?: () => void
  isSummarizing?: boolean

  // View mode
  viewMode: 'cards' | 'table'
  onViewModeChange: (mode: 'cards' | 'table') => void

  // Save all
  onSaveAll?: (findings: FindingDisplay[]) => void
  isSavingAll?: boolean
}

export function FindingsHeader({
  filteredFindings,
  sortedFindings,
  savedFindings,
  savedCount,
  siteTypeCounts,
  showSpeciesHeader,
  speciesCounts,
  enrichmentStatus,
  sourceFilter,
  onSourceFilterChange,
  showSavedOnly,
  onShowSavedOnlyChange,
  onSavedFilterChange,
  showSiteTypeFilter,
  siteTypeFilterConfig,
  siteTypeFilterOrder,
  activeSiteTypeFilter,
  onActiveSiteTypeFilterChange,
  onSiteTypeFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  taxonGroupFilter,
  onTaxonGroupFilterChange,
  taxonGroupOptions,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  onSummarizeAll,
  onStopSummarize,
  isSummarizing,
  viewMode,
  onViewModeChange,
  onSaveAll,
  isSavingAll,
}: FindingsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
      {/* Species header: enrichment status + count + filter badges */}
      {showSpeciesHeader ? (
        <>
          {enrichmentStatus?.isEnriching ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              <span className="text-blue-600">
                NBDC {enrichmentStatus.current}/{enrichmentStatus.total}
              </span>
            </span>
          ) : (
            <button
              className={`shrink-0 text-sm font-medium ${showSavedOnly || sourceFilter !== 'all' || (distanceFilter && distanceFilter !== 'all') ? 'text-blue-600 hover:underline' : ''}`}
              onClick={() => {
                if (
                  showSavedOnly ||
                  (sourceFilter && sourceFilter !== 'all') ||
                  (distanceFilter && distanceFilter !== 'all')
                ) {
                  onShowSavedOnlyChange(false)
                  onSavedFilterChange?.(false)
                  onSourceFilterChange?.('all')
                  onDistanceFilterChange?.('all')
                }
              }}
            >
              {filteredFindings.length !== sortedFindings.length
                ? `${filteredFindings.length} / ${sortedFindings.length}`
                : sortedFindings.length}{' '}
              results
            </button>
          )}
          <SpeciesBadge
            count={speciesCounts?.protected ?? 0}
            label="Protected species"
            filterKey="protected"
            activeFilter={sourceFilter}
            onToggle={onSourceFilterChange}
            activeClass="bg-red-600 text-white"
            inactiveClass="bg-red-100 text-red-700 hover:bg-red-200"
            icon={Shield}
          />
          <SpeciesBadge
            count={speciesCounts?.invasive ?? 0}
            label="Invasive species"
            filterKey="invasive"
            activeFilter={sourceFilter}
            onToggle={onSourceFilterChange}
            activeClass="bg-orange-600 text-white"
            inactiveClass="bg-orange-100 text-orange-700 hover:bg-orange-200"
            icon={AlertCircle}
          />
          <SpeciesBadge
            count={speciesCounts?.threatened ?? 0}
            label="Threatened species"
            filterKey="threatened"
            activeFilter={sourceFilter}
            onToggle={onSourceFilterChange}
            activeClass="bg-amber-600 text-white"
            inactiveClass="bg-amber-100 text-amber-700 hover:bg-amber-200"
            icon={AlertTriangle}
          />
          {savedCount > 0 && (
            <button
              onClick={() => {
                const next = !showSavedOnly
                onShowSavedOnlyChange(next)
                onSavedFilterChange?.(next)
              }}
              title={`${savedCount} Saved species`}
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                showSavedOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
              {savedCount}
            </button>
          )}
          {/* Save All button -- saves all currently filtered (unsaved) findings */}
          {onSaveAll &&
            filteredFindings.length > 0 &&
            (() => {
              const unsaved = getUnsavedFindings(filteredFindings, savedFindings)
              return (
                <button
                  onClick={() => {
                    if (unsaved.length > 0) onSaveAll(unsaved)
                  }}
                  disabled={isSavingAll}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
                  title={`Save all ${filteredFindings.length} filtered results`}
                >
                  <Save className="h-2.5 w-2.5" />
                  {isSavingAll ? 'Saving...' : `Save All (${unsaved.length})`}
                </button>
              )
            })()}
        </>
      ) : (
        <>
          <button
            className={`shrink-0 text-sm font-medium ${activeSiteTypeFilter || showSavedOnly ? 'text-blue-600 hover:underline' : ''}`}
            onClick={() => {
              if (activeSiteTypeFilter || showSavedOnly) {
                onActiveSiteTypeFilterChange(null)
                onShowSavedOnlyChange(false)
                onSiteTypeFilterChange?.(null)
                onSavedFilterChange?.(false)
              }
            }}
          >
            {filteredFindings.length !== sortedFindings.length
              ? `${filteredFindings.length} / ${sortedFindings.length}`
              : sortedFindings.length}{' '}
            results
          </button>
          {savedCount > 0 && (
            <button
              onClick={() => {
                const next = !showSavedOnly
                onShowSavedOnlyChange(next)
                onSavedFilterChange?.(next)
              }}
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                showSavedOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
              Saved {savedCount}
            </button>
          )}
          {/* Site type filter buttons */}
          {showSiteTypeFilter && siteTypeCounts && Object.keys(siteTypeCounts).length > 0 && (
            <>
              {(siteTypeFilterOrder || ['SAC', 'SPA', 'NHA', 'pNHA']).map((siteType) => {
                const count = siteTypeCounts[siteType]
                if (!count) return null
                const isActive = activeSiteTypeFilter === siteType
                const config = siteTypeFilterConfig || SITE_TYPE_FILTER_COLORS
                const colors = config[siteType] || FALLBACK_SITE_TYPE_FILTER_COLORS
                return (
                  <button
                    key={siteType}
                    onClick={() => {
                      const newValue = isActive ? null : siteType
                      onActiveSiteTypeFilterChange(newValue)
                      onSiteTypeFilterChange?.(newValue)
                    }}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${isActive ? colors.active : colors.inactive}`}
                  >
                    {siteType} {count}
                  </button>
                )
              })}
            </>
          )}
        </>
      )}
      {onSummarizeAll && (
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${isSummarizing ? 'text-red-600 hover:text-red-700' : 'text-purple-600 hover:text-purple-700'}`}
          onClick={isSummarizing ? onStopSummarize : onSummarizeAll}
        >
          {isSummarizing ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Stop
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              AI
            </>
          )}
        </Button>
      )}
      {/* Source filter dropdown for species */}
      {onSourceFilterChange && (
        <Select
          value={sourceFilter || 'all'}
          onValueChange={(v) =>
            onSourceFilterChange(v as 'all' | 'protected' | 'invasive' | 'threatened')
          }
        >
          <SelectTrigger className="h-7 w-auto min-w-[80px] border-0 bg-transparent px-1.5 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Species</SelectItem>
            <SelectItem value="protected">Protected Only</SelectItem>
            <SelectItem value="invasive">Invasive Only</SelectItem>
            <SelectItem value="threatened">Threatened Only</SelectItem>
          </SelectContent>
        </Select>
      )}
      {/* Distance/proximity filter dropdown */}
      {onDistanceFilterChange && (
        <Select
          value={distanceFilter || 'all'}
          onValueChange={(v) => onDistanceFilterChange(v as 'all' | '0-1' | '1-5' | '5-10' | '10+')}
        >
          <SelectTrigger className="h-7 w-auto min-w-[70px] border-0 bg-transparent px-1.5 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Distances</SelectItem>
            <SelectItem value="0-1">&lt; 1 km</SelectItem>
            <SelectItem value="1-5">1-5 km</SelectItem>
            <SelectItem value="5-10">5-10 km</SelectItem>
            <SelectItem value="10+">10+ km</SelectItem>
          </SelectContent>
        </Select>
      )}
      {/* Species group filter + sort dropdowns — hidden for species table view
          because SpeciesTableView provides interactive column headers instead */}
      {!(showSpeciesHeader && viewMode === 'table') && (
        <>
          {showSpeciesHeader &&
            onTaxonGroupFilterChange &&
            (taxonGroupOptions?.length ?? 0) > 0 && (
              <Select
                value={taxonGroupFilter || 'all'}
                onValueChange={(v) => onTaxonGroupFilterChange(v === 'all' ? null : v)}
              >
                <SelectTrigger className="h-7 w-auto min-w-[90px] border-0 bg-transparent px-1.5 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {taxonGroupOptions?.map(({ value, count }) => (
                    <SelectItem key={value} value={value}>
                      {value} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          <Select value={sortBy} onValueChange={(v) => onSortByChange(v as typeof sortBy)}>
            <SelectTrigger className="h-7 w-auto min-w-[80px] border-0 bg-transparent px-1.5 text-xs shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              {showSpeciesHeader && <SelectItem value="records">Records</SelectItem>}
              {showSpeciesHeader && <SelectItem value="last_recorded">Last Recorded</SelectItem>}
            </SelectContent>
          </Select>
          <button
            className="text-muted-foreground hover:text-foreground p-0.5"
            onClick={onSortOrderToggle}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {/* Card/Table view toggle (only for species) */}
      {showSpeciesHeader && (
        <div className="ml-1 flex items-center rounded-md border">
          <button
            className={`p-1 ${viewMode === 'cards' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            onClick={() => onViewModeChange('cards')}
            title="Card view"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            className={`p-1 ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            onClick={() => onViewModeChange('table')}
            title="Table view"
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
