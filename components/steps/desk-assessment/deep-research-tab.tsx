'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Droplets, Bug, Layers } from 'lucide-react'

import { useDeepResearch } from '@/hooks/steps/use-deep-research'
import {
  SiteCard,
  AquaticCard,
  FindingResearchCard,
  SectionDivider,
} from '@/components/steps/desk-assessment/research-results'
import {
  ResearchPanelHeader,
  ResearchEmptyState,
} from '@/components/steps/desk-assessment/research-controls'
import { MapLegendOverlay, type MapLegendEntry } from '@/components/maps/map-legend-overlay'
import type { Project, DeskResearchFinding as DbFinding } from '@/types/database'

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  { ssr: false, loading: () => <MapSkeleton /> }
)

function MapSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}

interface DeepResearchTabProps {
  projectId: string
  project: Project
  findings: DbFinding[]
  siteId?: string | null
}

export function DeepResearchTab({ projectId, project, findings, siteId }: DeepResearchTabProps) {
  const {
    researchResults,
    aquaticResults,
    speciesWithResearch,
    habitatsWithResearch,
    totalResearched,
    isLoading,
    batchProgress,
    boundary,
    bufferDistances,
    otherBoundaries,
    allBoundaries,
    mapFindings,
    unresearchedSites,
    unresearchedSpecies,
    unresearchedAquatic,
    resultsByType,
    handleBatchResearch,
    handleBatchResearchSpecies,
    handleBatchResearchAquatic,
    singleResearchingIds,
    handleResearchSingleSite,
    handleResearchSingleSpecies,
    handleResearchSingleAquatic,
  } = useDeepResearch(projectId, project, findings, siteId)

  // Legend entries shown on the floating overlay. Only includes layers that
  // are actually rendered on the map below (boundary, buffer, designated
  // sites).
  const legendEntries = React.useMemo<MapLegendEntry[]>(() => {
    const entries: MapLegendEntry[] = []
    if (boundary) {
      entries.push({ id: 'boundary', label: 'Site Boundary', color: '#ef4444', type: 'line' })
    }
    if (bufferDistances && bufferDistances.length > 0) {
      entries.push({ id: 'buffer', label: 'Buffer Zone', color: '#3b82f6', type: 'fill' })
    }
    if (mapFindings.some((f) => f.dataType === 'designated_site')) {
      entries.push({
        id: 'designated-site',
        label: 'Designated Sites',
        color: '#22c55e',
        type: 'circle',
      })
    }
    return entries
  }, [boundary, bufferDistances, mapFindings])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (totalResearched === 0) {
    return (
      <div className="flex h-full">
        <div className="relative w-[40%] min-w-[300px]">
          <DynamicProjectMap
            boundary={boundary}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            bufferDistances={bufferDistances}
            findings={mapFindings}
            visibleFindingTypes={['designated_site']}
            zoom={13}
          />
          <MapLegendOverlay entries={legendEntries} />
        </div>
        <ResearchEmptyState
          unresearchedSites={unresearchedSites}
          batchProgress={batchProgress}
          onBatchResearch={handleBatchResearch}
        />
      </div>
    )
  }

  const { byType, sortedTypes } = resultsByType

  return (
    <div className="flex h-full">
      {/* Left: Map */}
      <div className="relative w-1/2 min-w-[300px]">
        <DynamicProjectMap
          boundary={boundary}
          bufferDistances={bufferDistances}
          findings={mapFindings}
          visibleFindingTypes={['designated_site']}
          zoom={13}
        />
        <MapLegendOverlay entries={legendEntries} />
      </div>

      {/* Right: Deep Research Panel */}
      <div className="border-border bg-background flex min-w-0 flex-1 flex-col border-l">
        <ResearchPanelHeader
          totalResearched={totalResearched}
          unresearchedSites={unresearchedSites}
          unresearchedSpecies={unresearchedSpecies}
          unresearchedAquatic={unresearchedAquatic}
          batchProgress={batchProgress}
          resultsByType={resultsByType}
          aquaticResults={aquaticResults}
          speciesWithResearch={speciesWithResearch}
          habitatsWithResearch={habitatsWithResearch}
          onBatchResearch={handleBatchResearch}
          onBatchResearchSpecies={handleBatchResearchSpecies}
          onBatchResearchAquatic={handleBatchResearchAquatic}
          singleResearchingIds={singleResearchingIds}
          onResearchSingleSite={handleResearchSingleSite}
          onResearchSingleSpecies={handleResearchSingleSpecies}
          onResearchSingleAquatic={handleResearchSingleAquatic}
        />

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {/* Designated Sites */}
          {sortedTypes.map((type) =>
            byType[type].map((site) => <SiteCard key={site.id} site={site} />)
          )}

          {/* Aquatic Research */}
          {aquaticResults.length > 0 && (
            <>
              {researchResults.length > 0 && (
                <SectionDivider
                  icon={Droplets}
                  iconColor="text-cyan-600"
                  label="Aquatic Features"
                  count={aquaticResults.length}
                />
              )}
              {aquaticResults.map((ar) => (
                <AquaticCard key={ar.id} result={ar} />
              ))}
            </>
          )}

          {/* Species Deep Research */}
          {speciesWithResearch.length > 0 && (
            <>
              <SectionDivider
                icon={Bug}
                iconColor="text-amber-600"
                label="Species"
                count={speciesWithResearch.length}
              />
              {speciesWithResearch.map((f) => (
                <FindingResearchCard key={f.id} finding={f} type="species" />
              ))}
            </>
          )}

          {/* Habitat Deep Research */}
          {habitatsWithResearch.length > 0 && (
            <>
              <SectionDivider
                icon={Layers}
                iconColor="text-green-600"
                label="Habitats"
                count={habitatsWithResearch.length}
              />
              {habitatsWithResearch.map((f) => (
                <FindingResearchCard key={f.id} finding={f} type="habitat" />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
