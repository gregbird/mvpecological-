'use client'

import * as React from 'react'
import { ChevronDown, Loader2, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DeepResearchResult } from '@/hooks/queries/use-deep-research-hooks'
import type { AquaticResearchResult } from '@/lib/supabase/queries/aquatic-research'
import type {
  BatchProgress,
  UnresearchedSite,
  UnresearchedSpecies,
  UnresearchedAquatic,
} from '@/hooks/steps/use-deep-research'
import type { DeskResearchFinding as DbFinding } from '@/types/database'

/* ------------------------------------------------------------------ */
/*  Panel Header                                                       */
/* ------------------------------------------------------------------ */

interface ResearchPanelHeaderProps {
  totalResearched: number
  unresearchedSites: UnresearchedSite[]
  unresearchedSpecies: UnresearchedSpecies[]
  unresearchedAquatic: UnresearchedAquatic[]
  batchProgress: BatchProgress | null
  resultsByType: {
    byType: Record<string, DeepResearchResult[]>
    sortedTypes: string[]
  }
  aquaticResults: AquaticResearchResult[]
  speciesWithResearch: DbFinding[]
  habitatsWithResearch: DbFinding[]
  onBatchResearch: () => void
  onBatchResearchSpecies: () => void
  onBatchResearchAquatic: () => void
  /** Per-finding loading state for the single-research popover. */
  singleResearchingIds: Set<string>
  onResearchSingleSite: (site: UnresearchedSite) => void
  onResearchSingleSpecies: (species: UnresearchedSpecies) => void
  onResearchSingleAquatic: (aquatic: UnresearchedAquatic) => void
}

export function ResearchPanelHeader({
  totalResearched,
  unresearchedSites,
  unresearchedSpecies,
  unresearchedAquatic,
  batchProgress,
  resultsByType,
  aquaticResults,
  speciesWithResearch,
  habitatsWithResearch,
  onBatchResearch,
  onBatchResearchSpecies,
  onBatchResearchAquatic,
  singleResearchingIds,
  onResearchSingleSite,
  onResearchSingleSpecies,
  onResearchSingleAquatic,
}: ResearchPanelHeaderProps) {
  const { byType, sortedTypes } = resultsByType

  return (
    <div className="space-y-2 border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Deep Research</h3>
          <p className="text-muted-foreground text-xs">
            {totalResearched} item{totalResearched !== 1 ? 's' : ''} researched
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {sortedTypes.map((type) => (
            <Badge key={type} variant="outline" className="text-[10px]">
              {byType[type].length} {type}
            </Badge>
          ))}
          {aquaticResults.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {aquaticResults.length} Aquatic
            </Badge>
          )}
          {speciesWithResearch.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {speciesWithResearch.length} Species
            </Badge>
          )}
          {habitatsWithResearch.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {habitatsWithResearch.length} Habitat
            </Badge>
          )}
        </div>
      </div>
      {(unresearchedSites.length > 0 ||
        unresearchedSpecies.length > 0 ||
        unresearchedAquatic.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {unresearchedSites.length > 0 && (
            <BatchResearchSplitButton
              label={`Research ${unresearchedSites.length} Site${unresearchedSites.length !== 1 ? 's' : ''}`}
              batchProgress={batchProgress}
              onBatch={onBatchResearch}
              items={unresearchedSites.map((s) => ({
                id: s.findingId,
                primary: s.siteName,
                secondary: s.siteType,
                onResearch: () => onResearchSingleSite(s),
              }))}
              singleResearchingIds={singleResearchingIds}
            />
          )}
          {unresearchedSpecies.length > 0 && (
            <BatchResearchSplitButton
              label={`Research ${unresearchedSpecies.length} Species`}
              batchProgress={batchProgress}
              onBatch={onBatchResearchSpecies}
              items={unresearchedSpecies.map((s) => ({
                id: s.findingId,
                primary: s.scientificName,
                secondary: [s.commonName, s.taxonGroup].filter(Boolean).join(' · '),
                onResearch: () => onResearchSingleSpecies(s),
              }))}
              singleResearchingIds={singleResearchingIds}
            />
          )}
          {unresearchedAquatic.length > 0 && (
            <BatchResearchSplitButton
              label={`Research ${unresearchedAquatic.length} Water Bod${unresearchedAquatic.length !== 1 ? 'ies' : 'y'}`}
              batchProgress={batchProgress}
              onBatch={onBatchResearchAquatic}
              items={unresearchedAquatic.map((a) => ({
                id: a.findingId,
                primary: a.waterBodyName,
                secondary: [a.waterBodyType, a.catchmentName].filter(Boolean).join(' · '),
                onResearch: () => onResearchSingleAquatic(a),
              }))}
              singleResearchingIds={singleResearchingIds}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Split Button — batch on left, "pick one" popover on right caret    */
/* ------------------------------------------------------------------ */

interface SplitButtonItem {
  id: string
  primary: string
  secondary?: string
  onResearch: () => void
}

interface BatchResearchSplitButtonProps {
  label: string
  batchProgress: BatchProgress | null
  onBatch: () => void
  items: SplitButtonItem[]
  singleResearchingIds: Set<string>
}

function BatchResearchSplitButton({
  label,
  batchProgress,
  onBatch,
  items,
  singleResearchingIds,
}: BatchResearchSplitButtonProps) {
  const [open, setOpen] = React.useState(false)
  const isBatchRunning = !!batchProgress?.running

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border">
      <Button
        size="sm"
        variant="outline"
        onClick={onBatch}
        disabled={isBatchRunning}
        className="rounded-none border-0 text-xs"
      >
        {isBatchRunning ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {batchProgress.current}/{batchProgress.total}
          </>
        ) : (
          label
        )}
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={isBatchRunning}
            aria-label="Pick one to research"
            className="rounded-none border-0 border-l px-1.5"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b px-3 py-2 text-xs font-medium">
            Pick one to research ({items.length})
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.map((item) => {
              const itemRunning = singleResearchingIds.has(item.id)
              return (
                <div
                  key={item.id}
                  className="hover:bg-muted/50 flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{item.primary}</div>
                    {item.secondary && (
                      <div className="text-muted-foreground truncate text-[11px]">
                        {item.secondary}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={itemRunning}
                    onClick={() => {
                      item.onResearch()
                    }}
                    className="h-7 shrink-0 px-2 text-[11px]"
                  >
                    {itemRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Research'}
                  </Button>
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Batch Research Button                                              */
/* ------------------------------------------------------------------ */

interface BatchResearchButtonProps {
  unresearchedCount: number
  batchProgress: BatchProgress | null
  onResearch: () => void
  /** Optional custom label (overrides default "Research N More/Sites") */
  label?: string
  size?: 'sm' | 'default'
}

function BatchResearchButton({
  unresearchedCount,
  batchProgress,
  onResearch,
  label,
  size = 'default',
}: BatchResearchButtonProps) {
  const isRunning = batchProgress?.running

  return (
    <Button
      size={size}
      variant={size === 'sm' ? 'outline' : 'default'}
      onClick={onResearch}
      disabled={!!isRunning}
      className={size === 'sm' ? 'text-xs' : ''}
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {batchProgress.current}/{batchProgress.total}
          {size === 'default' && ` — ${batchProgress.currentSite}`}
        </>
      ) : label ? (
        label
      ) : size === 'sm' ? (
        `Research ${unresearchedCount} More`
      ) : (
        `Research All ${unresearchedCount} Sites`
      )}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  unresearchedSites: UnresearchedSite[]
  batchProgress: BatchProgress | null
  onBatchResearch: () => void
}

export function ResearchEmptyState({
  unresearchedSites,
  batchProgress,
  onBatchResearch,
}: EmptyStateProps) {
  return (
    <div className="border-border bg-background flex min-w-0 flex-1 flex-col items-center justify-center border-l p-6 text-center">
      <MapPin className="mb-3 h-12 w-12 text-gray-300" />
      <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Deep Research Yet</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {unresearchedSites.length > 0
          ? `${unresearchedSites.length} designated sites available for research.`
          : 'Save designated sites in Step 2 (Data Gathering) first.'}
      </p>
      {unresearchedSites.length > 0 && (
        <div className="mt-4">
          <BatchResearchButton
            unresearchedCount={unresearchedSites.length}
            batchProgress={batchProgress}
            onResearch={onBatchResearch}
          />
        </div>
      )}
    </div>
  )
}
