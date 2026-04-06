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

  React.useEffect(() => {
    sessionStorage.setItem(wizardStepCacheKey, currentStep)
  }, [currentStep, wizardStepCacheKey])

  // Site selection
  const [selectedSite, setSelectedSite] = React.useState<ProjectSiteWithGeoJSON | null>(null)

  // Data hooks
  const { data: savedFindings = [] } = useSavedFindings(project.id, selectedSite?.id)
  const { data: findingsStats } = useFindingsStats(project.id, selectedSite?.id)
  const { data: targetNotes = [] } = useTargetNotes(project.id)
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

  // Auto-search orchestration (trigger, banner, status)
  const { autoSearchStatus, setAutoSearchStatus, showAutoSearchBanner, isAutoSearchRunning } =
    useAutoSearch({
      projectId: project.id,
      boundary: searchBoundary ?? projectBoundary,
      isStepCompleted,
      viewMode,
      boundaryChanged,
    })

  // Stable auto-search completion callback — prevents WizardStepContent
  // from invalidating every substep's prop reference on parent re-renders.
  const handleAutoSearchComplete = React.useCallback(
    (key: 'sites' | 'species' | 'aquatic' | 'habitats', status: AutoSearchStatus) =>
      setAutoSearchStatus((prev) => ({ ...prev, [key]: status })),
    [setAutoSearchStatus]
  )

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

  const goBack = () => {
    if (canGoBack) setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
  }

  const goNext = () => {
    if (canGoNext) setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
  }

  const handleComplete = async () => {
    if (savedFindings.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No findings saved',
        description: 'Save at least one finding before completing this step.',
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
    } catch (error) {
      console.error('[DataGatheringStep] Complete step error:', error)
    }
  }

  const handleEditClick = () => {
    setViewMode('wizard')
    setCurrentStep('info')
  }

  const isComplete = viewMode === 'preview' && workflowStep.status === 'approved'
  const isMapMode = currentStep !== 'info' && currentStep !== 'reports' && currentStep !== 'review'

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

  // Context value for substeps — memoized to prevent cascade re-renders
  // across all consumers when an unrelated parent state changes.
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
                <SiteSelector
                  projectId={project.id}
                  stepKey="data-gathering"
                  onSiteChange={setSelectedSite}
                  showAllOption
                />
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
              <SiteSelector
                projectId={project.id}
                stepKey="data-gathering"
                onSiteChange={setSelectedSite}
                showAllOption
              />
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
          userId={userId}
          projectBoundary={projectBoundary}
          searchBoundary={searchBoundary}
          projectCenter={projectCenter}
          bufferDistances={bufferDistances}
          siteId={selectedSite?.id ?? null}
          otherBoundaries={otherBoundaries}
          allBoundaries={isAllSites ? allBoundaries : undefined}
          allSiteBoundaries={allSiteBoundaries}
          savedFindings={savedFindings}
          targetNotes={targetNotes}
          findingsStats={findingsStats}
          showMap={showMap}
          onToggleMap={handleToggleMap}
          isAutoSearchRunning={isAutoSearchRunning}
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
              disabled={!canGoBack}
            >
              <ChevronLeft className={cn(isMapMode ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')} />
              Back
            </Button>

            <div className={cn('text-muted-foreground', isMapMode ? 'text-xs' : 'text-sm')}>
              Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
            </div>

            {currentStep !== 'review' ? (
              <Button size={isMapMode ? 'sm' : 'default'} onClick={goNext} disabled={!canGoNext}>
                Next
                <ChevronRight className={cn(isMapMode ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
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
