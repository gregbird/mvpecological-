'use client'

import type { AutoSearchStatus } from './auto-search-banner'
import type { Project, WorkflowStep, DeskResearchFinding, TargetNote } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

import { ProjectInfoSubStep } from './project-info-substep'
import { DesignatedSitesSubStep } from './designated-sites-substep'
import { SpeciesRecordsSubStep } from './species-records-substep'
import { AquaticFeaturesSubStep } from './aquatic-features-substep'
import { ReviewExportSubStep } from './review-export-substep'
import { CompanyReportsSubStep } from './company-reports-substep'
import { HabitatDataSubStep } from './habitat-data-substep'

type WizardStepId = 'info' | 'sites' | 'species' | 'aquatic' | 'habitats' | 'reports' | 'review'

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
  visitedSteps: Set<WizardStepId>
  userId: string
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId: string | null
  /** Selected site object (forwarded to Review & Export for header label,
   *  export filenames, and target-note site_id assignment) */
  selectedSite?: ProjectSiteWithGeoJSON | null
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[] | undefined
  /** All site boundaries regardless of selection — used for refreshing
   *  data at the project level (manual `Search` button), so that picking
   *  a specific site never narrows the search scope. */
  allSiteBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNote[]
  findingsStats: FindingsStatsResult | undefined
  /** Project-wide finding count (ignores siteId filter) — used so that the
   *  Review & Export "Complete" button isn't disabled when the user views
   *  a single empty site while other sites have data. */
  projectWideFindingsCount?: number
  showMap: boolean
  onToggleMap: () => void
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

/**
 * Renders substep content for the data-gathering wizard.
 *
 * Mounting strategy: Each substep is lazily mounted on first visit and stays
 * mounted thereafter (controlled via `visitedSteps`). Inactive substeps are
 * hidden with `display: none` so all local state — search results, filters,
 * selections, modal state, AI summaries — is preserved when navigating between
 * substeps. ShellMapPanel guards the Leaflet map with `isActive` to prevent
 * multiple Leaflet containers being mounted simultaneously.
 */
export function WizardStepContent({
  project,
  workflowStep,
  currentStep,
  visitedSteps,
  userId,
  projectBoundary,
  searchBoundary,
  projectCenter,
  bufferDistances,
  siteId,
  selectedSite,
  otherBoundaries,
  allBoundaries,
  allSiteBoundaries,
  savedFindings,
  targetNotes,
  findingsStats,
  projectWideFindingsCount,
  showMap,
  onToggleMap,
  autoSearchStatus,
  onAutoSearchComplete,
  onComplete,
  isCompleting,
  isComplete,
}: WizardStepContentProps) {
  // Helper: a substep should render if it's currently active OR has been visited.
  const shouldMount = (id: WizardStepId) => currentStep === id || visitedSteps.has(id)

  // Helper: hide via display:none so layout doesn't overlap and Leaflet doesn't
  // try to measure invisible containers, while keeping the React tree mounted.
  const wrapperStyle = (id: WizardStepId): React.CSSProperties =>
    currentStep === id ? { display: 'block', height: '100%' } : { display: 'none' }

  return (
    <div className="relative min-h-0 flex-1">
      {/* Step 1: Project Info */}
      {shouldMount('info') && (
        <div style={wrapperStyle('info')}>
          <ProjectInfoSubStep
            project={project}
            projectBoundary={projectBoundary}
            bufferDistances={bufferDistances}
            savedFindingsCount={savedFindings.length}
          />
        </div>
      )}

      {/* Step 2: Designated Sites (NPWS) */}
      {shouldMount('sites') && (
        <div style={wrapperStyle('sites')}>
          <DesignatedSitesSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            allSiteBoundaries={allSiteBoundaries}
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
      {shouldMount('species') && (
        <div style={wrapperStyle('species')}>
          <SpeciesRecordsSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            allSiteBoundaries={allSiteBoundaries}
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
      {shouldMount('aquatic') && (
        <div style={wrapperStyle('aquatic')}>
          <AquaticFeaturesSubStep
            project={project}
            projectBoundary={projectBoundary}
            searchBoundary={searchBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            siteId={siteId}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            allSiteBoundaries={allSiteBoundaries}
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
      {shouldMount('habitats') && (
        <div style={wrapperStyle('habitats')}>
          <HabitatDataSubStep
            project={project}
            projectBoundary={projectBoundary}
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
      {shouldMount('reports') && (
        <div style={wrapperStyle('reports')}>
          <CompanyReportsSubStep
            project={project}
            userId={userId}
            isActive={currentStep === 'reports'}
            siteId={siteId}
          />
        </div>
      )}

      {/* Step 7: Review & Export */}
      {shouldMount('review') && (
        <div style={wrapperStyle('review')}>
          <ReviewExportSubStep
            project={project}
            projectBoundary={projectBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            selectedSite={selectedSite}
            projectWideFindingsCount={projectWideFindingsCount}
            userId={userId}
            savedFindings={savedFindings}
            targetNotes={targetNotes}
            findingsStats={findingsStats}
            isActive={currentStep === 'review'}
            onComplete={onComplete}
            isCompleting={isCompleting}
            isComplete={isComplete}
          />
        </div>
      )}
    </div>
  )
}
