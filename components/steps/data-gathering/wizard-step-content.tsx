'use client'

import { cn } from '@/lib/utils'
import type { AutoSearchStatus } from './auto-search-banner'
import type { Project, WorkflowStep, DeskResearchFinding, TargetNote } from '@/types/database'

import { ProjectInfoSubStep } from './project-info-substep'
import { DesignatedSitesSubStep } from './designated-sites-substep'
import { SpeciesRecordsSubStep } from './species-records-substep'
import { AquaticFeaturesSubStep } from './aquatic-features-substep'
import { ReviewExportSubStep } from './review-export-substep'
import { CompanyReportsSubStep } from './company-reports-substep'
import { HabitatDataSubStep } from './habitat-data-substep'

interface FindingsStatsResult {
  total: number
  saved: number
  bySource: { source: string; count: number }[]
  byType: { type: string; count: number }[]
}

export interface WizardStepContentProps {
  project: Project
  workflowStep: WorkflowStep
  currentStep: string
  userId: string
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId: string | null
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[] | undefined
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNote[]
  findingsStats: FindingsStatsResult | undefined
  showMap: boolean
  onToggleMap: () => void
  isAutoSearchRunning: boolean
  autoSearchStatus: {
    sites: AutoSearchStatus
    species: AutoSearchStatus
    aquatic: AutoSearchStatus
    habitats: AutoSearchStatus
  }
  onAutoSearchComplete: (
    key: 'sites' | 'species' | 'aquatic' | 'habitats',
    status: AutoSearchStatus
  ) => void
  onComplete: () => void
  isCompleting: boolean
  isComplete: boolean
}

/** Renders the active substep content for the data-gathering wizard. */
export function WizardStepContent({
  project,
  workflowStep,
  currentStep,
  userId,
  projectBoundary,
  searchBoundary,
  projectCenter,
  bufferDistances,
  siteId,
  otherBoundaries,
  allBoundaries,
  savedFindings,
  targetNotes,
  findingsStats,
  showMap,
  onToggleMap,
  isAutoSearchRunning,
  autoSearchStatus,
  onAutoSearchComplete,
  onComplete,
  isCompleting,
  isComplete,
}: WizardStepContentProps) {
  return (
    <div className="relative min-h-0 flex-1">
      {/* Step 1: Project Info */}
      {currentStep === 'info' && (
        <ProjectInfoSubStep
          project={project}
          projectBoundary={projectBoundary}
          bufferDistances={bufferDistances}
          savedFindingsCount={savedFindings.length}
        />
      )}

      {/* Step 2: Designated Sites (NPWS) */}
      {(currentStep === 'sites' || isAutoSearchRunning) && (
        <div
          className={cn(
            'absolute inset-0',
            currentStep === 'sites' ? 'visible z-10' : 'invisible z-0'
          )}
        >
          <DesignatedSitesSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            userId={userId}
            savedFindings={savedFindings}
            showMap={showMap}
            onToggleMap={onToggleMap}
            isActive={currentStep === 'sites'}
            autoSearchTrigger={autoSearchStatus.sites === 'searching'}
            onAutoSearchComplete={(status) => onAutoSearchComplete('sites', status)}
          />
        </div>
      )}

      {/* Step 3: Species Records (GBIF + NBDC) */}
      {(currentStep === 'species' || isAutoSearchRunning) && (
        <div
          className={cn(
            'absolute inset-0',
            currentStep === 'species' ? 'visible z-10' : 'invisible z-0'
          )}
        >
          <SpeciesRecordsSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            userId={userId}
            savedFindings={savedFindings}
            showMap={showMap}
            onToggleMap={onToggleMap}
            isActive={currentStep === 'species'}
            autoSearchTrigger={autoSearchStatus.species === 'searching'}
            onAutoSearchComplete={(status) => onAutoSearchComplete('species', status)}
          />
        </div>
      )}

      {/* Step 4: Aquatic Features (EPA) */}
      {(currentStep === 'aquatic' || isAutoSearchRunning) && (
        <div
          className={cn(
            'absolute inset-0',
            currentStep === 'aquatic' ? 'visible z-10' : 'invisible z-0'
          )}
        >
          <AquaticFeaturesSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            userId={userId}
            savedFindings={savedFindings}
            showMap={showMap}
            onToggleMap={onToggleMap}
            isActive={currentStep === 'aquatic'}
            autoSearchTrigger={autoSearchStatus.aquatic === 'searching'}
            onAutoSearchComplete={(status) => onAutoSearchComplete('aquatic', status)}
          />
        </div>
      )}

      {/* Step 5: Habitat Data - NLC 2018 land cover */}
      {(currentStep === 'habitats' || isAutoSearchRunning) && (
        <div
          className={cn(
            'absolute inset-0',
            currentStep === 'habitats' ? 'visible z-10' : 'invisible z-0'
          )}
        >
          <HabitatDataSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            showMap={showMap}
            onToggleMap={onToggleMap}
            isActive={currentStep === 'habitats'}
            userId={userId}
            savedFindings={savedFindings}
            workflowStep={workflowStep}
            autoSearchTrigger={autoSearchStatus.habitats === 'searching'}
            onAutoSearchComplete={(status) => onAutoSearchComplete('habitats', status)}
          />
        </div>
      )}

      {/* Step 6: Company Reports */}
      {currentStep === 'reports' && (
        <CompanyReportsSubStep
          project={project}
          userId={userId}
          isActive={currentStep === 'reports'}
          siteId={siteId}
        />
      )}

      {/* Step 7: Review & Export */}
      {currentStep === 'review' && (
        <ReviewExportSubStep
          project={project}
          projectBoundary={projectBoundary}
          projectCenter={projectCenter}
          bufferDistances={bufferDistances}
          userId={userId}
          savedFindings={savedFindings}
          targetNotes={targetNotes}
          findingsStats={findingsStats}
          onComplete={onComplete}
          isCompleting={isCompleting}
          isComplete={isComplete}
        />
      )}
    </div>
  )
}
