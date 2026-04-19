'use client'

import * as React from 'react'
import {
  Info,
  MapPin,
  Bug,
  Droplets,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings, useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useTargetNotes } from '@/hooks/queries/use-target-note-hooks'
import { useProjectContext } from '@/contexts/project-context'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { useBoundaryHash } from '@/hooks/shared/use-boundary-hash'
import { useAutoSearch } from '@/hooks/shared/use-auto-search'
import { DataGatheringProvider } from '@/contexts/data-gathering-context'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import type { Project, WorkflowStep } from '@/types/database'

import { DataGatheringPreview } from './data-gathering/data-gathering-preview'
import { AutoSearchBanner, type AutoSearchStatus } from './data-gathering/auto-search-banner'
import { WizardStepIndicators } from './data-gathering/wizard-step-indicators'
import { WizardStepContent } from './data-gathering/wizard-step-content'

interface DataGatheringStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

type WizardStep = 'info' | 'sites' | 'species' | 'aquatic' | 'habitats' | 'reports' | 'review'
type ViewMode = 'preview' | 'wizard'

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'info', label: 'Project Info', icon: Info },
  { id: 'sites', label: 'Designated Sites', icon: MapPin },
  { id: 'species', label: 'Species Records', icon: Bug },
  { id: 'aquatic', label: 'Aquatic Features', icon: Droplets },
  { id: 'habitats', label: 'Habitat Data', icon: Layers },
  { id: 'reports', label: 'Company Reports', icon: FileText },
  { id: 'review', label: 'Review & Export', icon: Check },
]

export function DataGatheringStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: DataGatheringStepProps) {
  const { setMapFullscreen, refetchWorkflowSteps } = useProjectContext()
  const { toast } = useToast()

  const isStepCompleted =
    workflowStep.status === 'approved' || workflowStep.status === 'needs_review'
  const wizardStepCacheKey = `data-gathering-step-${project.id}`

  const [viewMode, setViewMode] = React.useState<ViewMode>(isStepCompleted ? 'preview' : 'wizard')

  const [currentStep, setCurrentStep] = React.useState<WizardStep>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(wizardStepCacheKey)
      if (
        cached &&
        ['info', 'sites', 'species', 'aquatic', 'habitats', 'reports', 'review'].includes(cached)
      ) {
        return cached as WizardStep
      }
    }
    return 'info'
  })
  const [showMap, setShowMap] = React.useState(true)

  // Track which substeps have been visited so they stay mounted (preserves state)
  const [visitedSteps, setVisitedSteps] = React.useState<Set<WizardStep>>(
    () => new Set([currentStep])
  )
  React.useEffect(() => {
    setVisitedSteps((prev) => {
      if (prev.has(currentStep)) return prev
      const next = new Set(prev)
      next.add(currentStep)
      return next
    })
  }, [currentStep])

  React.useEffect(() => {
    sessionStorage.setItem(wizardStepCacheKey, currentStep)
  }, [currentStep, wizardStepCacheKey])

  // Site selection
  const [selectedSite, setSelectedSite] = React.useState<ProjectSiteWithGeoJSON | null>(null)

  // Data hooks — savedFindings is project-wide (no site filter) because search
  // results are project-wide and "is this already saved?" must check all saved
  // findings regardless of which site context they were saved from.
  const { data: savedFindings = [] } = useSavedFindings(project.id)
  const { data: findingsStats } = useFindingsStats(project.id, selectedSite?.id)
  // Project-wide finding stats (no site filter) — used by Review & Export to
  // gate the Complete button so a single empty site can't block the step.
  const { data: projectWideFindingsStats } = useFindingsStats(project.id)
  const { data: targetNotes = [] } = useTargetNotes(project.id, selectedSite?.id)
  const completeStep = useCompleteWorkflowStep()

  // Site-aware boundary (includes searchBoundary, otherBoundaries, allSiteBoundaries)
  const {
    projectBoundary,
    projectCenter,
    bufferDistances,
    effectiveSiteId,
    projectSites,
    allBoundaries,
    allSiteBoundaries,
    otherBoundaries,
    searchBoundary,
    isSitesLoading,
  } = useProjectBoundary(project, selectedSite)

  const isAllSites = !selectedSite && allBoundaries.length > 1

  // Boundary hash — detects GIS re-edits and clears caches
  const { boundaryChanged } = useBoundaryHash(
    project.id,
    projectSites,
    projectBoundary,
    isSitesLoading
  )

  // Per-type counts from the project-wide stats so auto-search can skip
  // sources that already have saved findings on a fresh tab. `byType` is
  // a sorted array of { type, count } — pluck the four we care about.
  const findingCounts = React.useMemo(() => {
    const byType = projectWideFindingsStats?.byType ?? []
    const countFor = (t: string) => byType.find((b) => b.type === t)?.count ?? 0
    return {
      designatedSites: countFor('designated_site'),
      speciesRecords: countFor('species_record'),
      aquatic: countFor('water_quality') + countFor('catchment'),
      habitats: countFor('habitat'),
    }
  }, [projectWideFindingsStats?.byType])

  // Auto-search orchestration (trigger, banner, status)
  const { autoSearchStatus, setAutoSearchStatus, showAutoSearchBanner, isAutoSearchRunning } =
    useAutoSearch({
      projectId: project.id,
      boundary: searchBoundary ?? projectBoundary,
      isStepCompleted,
      viewMode,
      boundaryChanged,
      findingCounts,
    })

  // Stable auto-search completion callback — prevents WizardStepContent
  // from invalidating every substep's prop reference on parent re-renders.
  const handleAutoSearchComplete = React.useCallback(
    (key: 'sites' | 'species' | 'aquatic' | 'habitats', status: AutoSearchStatus) =>
      setAutoSearchStatus((prev) => ({ ...prev, [key]: status })),
    [setAutoSearchStatus]
  )

  // Auto-search needs the search-target substeps mounted to perform searches.
  // Mark them visited as soon as auto-search begins so they stay mounted afterward.
  React.useEffect(() => {
    if (!isAutoSearchRunning) return
    setVisitedSteps((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of ['sites', 'species', 'aquatic', 'habitats'] as const) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [isAutoSearchRunning])

  // Lookahead prefetch: when the user enters a substep, kick off the search for
  // the NEXT substep in the background so its results are ready on arrival.
  // Each next-step is prefetched at most once per session (prefetchedRef guard).
  // Substeps with results already loaded skip themselves via useSubstepSearch's
  // own guard (`searchResultsRef.current.length > 0 → skipped`).
  const prefetchedRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    const PREFETCH_NEXT: Partial<Record<WizardStep, 'sites' | 'species' | 'aquatic' | 'habitats'>> =
      {
        sites: 'species',
        species: 'aquatic',
        aquatic: 'habitats',
      }
    const nextStep = PREFETCH_NEXT[currentStep]
    if (!nextStep) return
    if (prefetchedRef.current.has(nextStep)) return
    if (!projectBoundary && !searchBoundary) return
    if (isStepCompleted) return

    prefetchedRef.current.add(nextStep)

    // Mount the next substep so it can react to autoSearchTrigger
    setVisitedSteps((prev) => {
      if (prev.has(nextStep)) return prev
      const next = new Set(prev)
      next.add(nextStep)
      return next
    })

    // Trigger its search only if it hasn't already started
    setAutoSearchStatus((prev) => {
      if (prev[nextStep] !== 'idle') return prev
      return { ...prev, [nextStep]: 'searching' }
    })
  }, [currentStep, projectBoundary, searchBoundary, isStepCompleted, setAutoSearchStatus])

  // Toggle map fullscreen mode in wizard
  React.useEffect(() => {
    const isMapStep =
      viewMode === 'wizard' &&
      currentStep !== 'info' &&
      currentStep !== 'reports' &&
      currentStep !== 'review'
    setMapFullscreen(isMapStep)
    return () => {
      setMapFullscreen(false)
    }
  }, [viewMode, currentStep, setMapFullscreen])

  // Navigation
  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1

  // Transition + double-click guard. The first click marks the navigation
  // pending (button shows spinner + becomes disabled) while React mounts the
  // next substep; the ref guard ignores any click that arrives within 300ms of
  // the previous one so a fast double-tap can never skip a step.
  const [isNavigating, startNavigation] = React.useTransition()
  const lastNavRef = React.useRef(0)
  const navigate = (delta: 1 | -1) => {
    const now = Date.now()
    if (now - lastNavRef.current < 300) return
    const targetIdx = currentStepIndex + delta
    if (targetIdx < 0 || targetIdx >= WIZARD_STEPS.length) return
    lastNavRef.current = now
    startNavigation(() => {
      setCurrentStep(WIZARD_STEPS[targetIdx].id)
    })
  }
  const goBack = () => navigate(-1)
  const goNext = () => navigate(1)

  const handleComplete = async () => {
    // Gate on project-wide count so a single empty site can't block completion.
    const projectWideCount = projectWideFindingsStats?.total ?? savedFindings.length
    if (projectWideCount === 0) {
      toast({
        variant: 'destructive',
        title: 'No findings saved',
        description:
          'Save at least one finding in any site of this project before completing this step.',
      })
      return
    }
    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })
      refetchWorkflowSteps()
      onComplete?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to complete step',
        description:
          'An error occurred while completing the data gathering step. Please try again.',
      })
    }
  }

  const handleEditClick = () => {
    setViewMode('wizard')
    setCurrentStep('info')
  }

  const isComplete = viewMode === 'preview' && workflowStep.status === 'approved'
  // Compact header (small wizard, no big title) is used for every substep
  // except Project Info, where we still want the introductory header. The
  // variable name is legacy from when only the map substeps used compact mode.
  const isMapMode = currentStep !== 'info'

  // Single SiteSelector instance reused in both compact and full header layouts
  const siteSelectorElement = (
    <SiteSelector
      projectId={project.id}
      stepKey="data-gathering"
      onSiteChange={setSelectedSite}
      showAllOption
    />
  )

  // Context value for substeps — memoized to prevent cascade re-renders
  // across all consumers when an unrelated parent state changes.
  // IMPORTANT: These hooks must run on EVERY render (including preview mode)
  // to satisfy the Rules of Hooks. Do not move them below the preview return.
  const handleToggleMap = React.useCallback(() => setShowMap((v) => !v), [])
  const contextValue = React.useMemo(
    () => ({
      project,
      projectBoundary,
      searchBoundary,
      projectCenter,
      bufferDistances,
      selectedSite,
      effectiveSiteId,
      otherBoundaries,
      allBoundaries,
      savedFindings,
      userId,
      showMap,
      onToggleMap: handleToggleMap,
    }),
    [
      project,
      projectBoundary,
      searchBoundary,
      projectCenter,
      bufferDistances,
      selectedSite,
      effectiveSiteId,
      otherBoundaries,
      allBoundaries,
      savedFindings,
      userId,
      showMap,
      handleToggleMap,
    ]
  )

  // PREVIEW MODE
  if (viewMode === 'preview') {
    return (
      <DataGatheringPreview
        project={project}
        workflowStep={workflowStep}
        projectBoundary={projectBoundary}
        bufferDistances={bufferDistances}
        savedFindings={savedFindings}
        findingsStats={findingsStats}
        targetNotes={targetNotes}
        onEdit={handleEditClick}
      />
    )
  }

  // WIZARD MODE
  return (
    <DataGatheringProvider value={contextValue}>
      <div className="flex h-full flex-col">
        {/* Progress Header */}
        <div
          className={cn(
            'border-border bg-card shrink-0 border-b transition-all duration-300',
            isMapMode ? 'px-4 py-2' : 'px-6 py-4'
          )}
        >
          {!isMapMode && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Data Gathering</h2>
                  <p className="text-muted-foreground text-sm">
                    Search external databases for ecological data
                  </p>
                </div>
                {siteSelectorElement}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isComplete ? 'default' : 'secondary'}>
                  {isComplete ? 'Completed' : 'In Progress'}
                </Badge>
                <Badge variant="outline">{savedFindings.length} findings saved</Badge>
              </div>
            </div>
          )}

          {isMapMode ? (
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <WizardStepIndicators
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                currentStepIndex={currentStepIndex}
                onStepClick={(id) => setCurrentStep(id as WizardStep)}
                compact
              />
              {siteSelectorElement}
            </div>
          ) : (
            <WizardStepIndicators
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              currentStepIndex={currentStepIndex}
              onStepClick={(id) => setCurrentStep(id as WizardStep)}
            />
          )}
        </div>

        <AutoSearchBanner autoSearchStatus={autoSearchStatus} visible={showAutoSearchBanner} />

        <WizardStepContent
          project={project}
          workflowStep={workflowStep}
          currentStep={currentStep}
          visitedSteps={visitedSteps}
          userId={userId}
          projectBoundary={projectBoundary}
          searchBoundary={searchBoundary}
          projectCenter={projectCenter}
          bufferDistances={bufferDistances}
          siteId={selectedSite?.id ?? null}
          selectedSite={selectedSite}
          otherBoundaries={otherBoundaries}
          allBoundaries={isAllSites ? allBoundaries : undefined}
          allSiteBoundaries={allSiteBoundaries}
          savedFindings={savedFindings}
          targetNotes={targetNotes}
          projectWideFindingsCount={projectWideFindingsStats?.total}
          showMap={showMap}
          onToggleMap={handleToggleMap}
          autoSearchStatus={autoSearchStatus}
          onAutoSearchComplete={handleAutoSearchComplete}
          onComplete={handleComplete}
          isCompleting={completeStep.isPending}
          isComplete={isComplete}
        />

        {/* Navigation Footer */}
        <div
          className={cn(
            'border-border bg-card shrink-0 border-t transition-all duration-300',
            isMapMode ? 'px-4 py-2' : 'px-6 py-4'
          )}
        >
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size={isMapMode ? 'sm' : 'default'}
              onClick={goBack}
              disabled={!canGoBack || isNavigating}
            >
              <ChevronLeft className={cn(isMapMode ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')} />
              Back
            </Button>

            <div className={cn('text-muted-foreground', isMapMode ? 'text-xs' : 'text-sm')}>
              Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
            </div>

            {currentStep !== 'review' ? (
              <Button
                size={isMapMode ? 'sm' : 'default'}
                onClick={goNext}
                disabled={!canGoNext || isNavigating}
              >
                {isNavigating ? (
                  <>
                    <Loader2
                      className={cn('animate-spin', isMapMode ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')}
                    />
                    Loading
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className={cn(isMapMode ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
                  </>
                )}
              </Button>
            ) : (
              <div className="w-20" />
            )}
          </div>
        </div>
      </div>
    </DataGatheringProvider>
  )
}
