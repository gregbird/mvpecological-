'use client'

import { Loader2, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
            <BatchResearchButton
              unresearchedCount={unresearchedSites.length}
              batchProgress={batchProgress}
              onResearch={onBatchResearch}
              label={`Research ${unresearchedSites.length} Site${unresearchedSites.length !== 1 ? 's' : ''}`}
              size="sm"
            />
          )}
          {unresearchedSpecies.length > 0 && (
            <BatchResearchButton
              unresearchedCount={unresearchedSpecies.length}
              batchProgress={batchProgress}
              onResearch={onBatchResearchSpecies}
              label={`Research ${unresearchedSpecies.length} Species`}
              size="sm"
            />
          )}
          {unresearchedAquatic.length > 0 && (
            <BatchResearchButton
              unresearchedCount={unresearchedAquatic.length}
              batchProgress={batchProgress}
              onResearch={onBatchResearchAquatic}
              label={`Research ${unresearchedAquatic.length} Water Bod${unresearchedAquatic.length !== 1 ? 'ies' : 'y'}`}
              size="sm"
            />
          )}
        </div>
      )}
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
