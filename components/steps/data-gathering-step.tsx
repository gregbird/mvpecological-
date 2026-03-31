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
  ChevronDown,
  Loader2,
  Pencil,
  Database,
  Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings, useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useTargetNotes } from '@/hooks/queries/use-target-note-hooks'
import { useHabitats } from '@/hooks/queries/use-habitat-hooks'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { useProjectContext } from '@/contexts/project-context'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import type { Project, WorkflowStep } from '@/types/database'

// Sub-step components
import { ProjectInfoSubStep } from './data-gathering/project-info-substep'
import { DesignatedSitesSubStep } from './data-gathering/designated-sites-substep'
import { SpeciesRecordsSubStep } from './data-gathering/species-records-substep'
import { AquaticFeaturesSubStep } from './data-gathering/aquatic-features-substep'
import { ReviewExportSubStep } from './data-gathering/review-export-substep'
import { CompanyReportsSubStep } from './data-gathering/company-reports-substep'
import { HabitatDataSubStep } from './data-gathering/habitat-data-substep'

// Dynamic import for map
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface DataGatheringStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

// Wizard steps
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

  // Check if step is completed (used for auto-search guard, not for locking)
  const isStepCompleted =
    workflowStep.status === 'approved' || workflowStep.status === 'needs_review'
  // Cache key for wizard step
  const wizardStepCacheKey = `data-gathering-step-${project.id}`

  // View mode: preview or wizard — start in preview when step is completed
  const [viewMode, setViewMode] = React.useState<ViewMode>(isStepCompleted ? 'preview' : 'wizard')

  // Wizard state - restore from sessionStorage
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

  // Save current step to sessionStorage
  React.useEffect(() => {
    sessionStorage.setItem(wizardStepCacheKey, currentStep)
  }, [currentStep, wizardStepCacheKey])

  // Auto-search state
  type AutoSearchStatus = 'idle' | 'searching' | 'done' | 'skipped' | 'error'
  const [autoSearchStatus, setAutoSearchStatus] = React.useState<{
    triggered: boolean
    sites: AutoSearchStatus
    species: AutoSearchStatus
    aquatic: AutoSearchStatus
    habitats: AutoSearchStatus
  }>({ triggered: false, sites: 'idle', species: 'idle', aquatic: 'idle', habitats: 'idle' })
  const [showAutoSearchBanner, setShowAutoSearchBanner] = React.useState(false)

  // Data hooks
  const { data: savedFindings = [] } = useSavedFindings(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const { data: targetNotes = [] } = useTargetNotes(project.id)
  useHabitats(project.id) // pre-fetch for downstream steps
  const completeStep = useCompleteWorkflowStep()

  // Expanded state for Findings by Type rows
  const [expandedType, setExpandedType] = React.useState<string | null>(null)

  // Site-aware boundary via shared hook
  const [selectedSite, setSelectedSite] = React.useState<ProjectSiteWithGeoJSON | null>(null)
  const {
    projectBoundary,
    projectCenter,
    bufferDistances,
    effectiveSiteId,
    projectSites,
    allBoundaries,
  } = useProjectBoundary(project, selectedSite)

  // Whether "All Sites" is selected (no specific site)
  const isAllSites = !selectedSite && allBoundaries.length > 1

  // Merged bbox boundary for searching across all sites.
  // Always computed for multi-site projects so the shell can detect broader search results.
  const searchBoundary = React.useMemo(() => {
    if (allBoundaries.length <= 1) return undefined
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity
    for (const b of allBoundaries) {
      for (const coord of b.geometry.coordinates[0]) {
        minLng = Math.min(minLng, coord[0])
        maxLng = Math.max(maxLng, coord[0])
        minLat = Math.min(minLat, coord[1])
        maxLat = Math.max(maxLat, coord[1])
      }
    }
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      },
    } as GeoJSON.Feature<GeoJSON.Polygon>
  }, [allBoundaries])

  // Other site boundaries for map overlay (all sites except the active one)
  const otherBoundaries = React.useMemo(
    () =>
      isAllSites
        ? [] // When "All Sites", no dimmed boundaries — all shown as primary via allBoundaries
        : projectSites
            .filter((s) => s.id !== effectiveSiteId && s.boundary)
            .map((s) => s.boundary as GeoJSON.Feature<GeoJSON.Polygon>),
    [projectSites, effectiveSiteId, isAllSites]
  )

  // Stable boundary hash based on ALL boundaries — does NOT change on site switch
  const boundaryHash = React.useMemo(() => {
    const boundaries =
      allBoundaries.length > 0 ? allBoundaries : projectBoundary ? [projectBoundary] : []
    if (boundaries.length === 0) return ''
    try {
      return boundaries
        .map((b) => {
          const coords = b.geometry.coordinates[0]
          const first = coords[0]
          const last = coords[coords.length - 1]
          return `${coords.length}:${first[0].toFixed(6)},${first[1].toFixed(6)}:${last[0].toFixed(6)},${last[1].toFixed(6)}`
        })
        .join('|')
    } catch {
      return ''
    }
  }, [allBoundaries, projectBoundary])

  // Invalidate caches when boundary changes (GIS re-edited)
  React.useEffect(() => {
    if (!boundaryHash) return
    const hashKey = `boundary-hash-${project.id}`
    const storedHash = sessionStorage.getItem(hashKey)

    if (storedHash && storedHash !== boundaryHash) {
      // Boundary changed — clear all search caches and auto-search flag for this site
      sessionStorage.removeItem(`auto-search-triggered-${project.id}`)
      sessionStorage.removeItem(`npws-search-${project.id}`)
      sessionStorage.removeItem(`gbif-search-${project.id}`)
      sessionStorage.removeItem(`epa-search-${project.id}`)
      sessionStorage.removeItem(`nlc-habitat-${project.id}`)
      // Reset auto-search state so it re-triggers
      setAutoSearchStatus({
        triggered: false,
        sites: 'idle',
        species: 'idle',
        aquatic: 'idle',
        habitats: 'idle',
      })
    }

    sessionStorage.setItem(hashKey, boundaryHash)
  }, [boundaryHash, project.id])

  // Auto-search: trigger when boundary exists and no prior auto-search in this session
  // Uses searchBoundary (merged for multi-site) or projectBoundary (single site)
  const autoSearchBoundary = searchBoundary ?? projectBoundary
  React.useEffect(() => {
    if (autoSearchStatus.triggered) return
    if (!autoSearchBoundary) return
    if (isStepCompleted) return
    if (viewMode !== 'wizard') return

    // Check if already triggered this session (project-level, not per-site)
    const autoSearchKey = `auto-search-triggered-${project.id}`
    if (sessionStorage.getItem(autoSearchKey)) return

    // Check if all substeps already have cache
    const hasSitesCache = !!sessionStorage.getItem(`npws-search-${project.id}`)
    const hasSpeciesCache = !!sessionStorage.getItem(`gbif-search-${project.id}`)
    const hasAquaticCache = !!sessionStorage.getItem(`epa-search-${project.id}`)
    const hasHabitatCache = !!sessionStorage.getItem(`nlc-habitat-${project.id}`)

    // If all caches exist, no need to auto-search
    if (hasSitesCache && hasSpeciesCache && hasAquaticCache && hasHabitatCache) return

    // Trigger auto-search
    sessionStorage.setItem(autoSearchKey, 'true')
    setAutoSearchStatus({
      triggered: true,
      sites: hasSitesCache ? 'skipped' : 'searching',
      species: hasSpeciesCache ? 'skipped' : 'searching',
      aquatic: hasAquaticCache ? 'skipped' : 'searching',
      habitats: hasHabitatCache ? 'skipped' : 'searching',
    })
    setShowAutoSearchBanner(true)
  }, [autoSearchBoundary, project.id, autoSearchStatus.triggered, isStepCompleted, viewMode])

  // Auto-hide banner 5 seconds after all searches complete
  React.useEffect(() => {
    if (!showAutoSearchBanner) return
    const { sites, species, aquatic, habitats: habitatStatus } = autoSearchStatus
    const allDone =
      ['done', 'skipped', 'error'].includes(sites) &&
      ['done', 'skipped', 'error'].includes(species) &&
      ['done', 'skipped', 'error'].includes(aquatic) &&
      ['done', 'skipped', 'error'].includes(habitatStatus)

    if (!allDone) return

    const timer = setTimeout(() => setShowAutoSearchBanner(false), 5000)
    return () => clearTimeout(timer)
  }, [autoSearchStatus, showAutoSearchBanner])

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

  // Handle step completion
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

  // Handle entering edit mode from preview
  const handleEditClick = () => {
    setViewMode('wizard')
    setCurrentStep('info')
  }

  // In wizard mode (editing), always allow re-completion
  const isComplete = viewMode === 'preview' && workflowStep.status === 'approved'
  const isMapMode = currentStep !== 'info' && currentStep !== 'reports' && currentStep !== 'review'

  // Track visited substeps so we keep them mounted (preserves searchResults + map state)
  const [visitedSteps, setVisitedSteps] = React.useState<Set<WizardStep>>(
    () => new Set([currentStep])
  )

  React.useEffect(() => {
    setVisitedSteps((prev) => {
      if (prev.has(currentStep)) return prev
      return new Set(prev).add(currentStep)
    })
  }, [currentStep])

  // PREVIEW MODE - Show summary when step is completed
  if (viewMode === 'preview') {
    return (
      <div className="flex h-full">
        {/* Map with findings */}
        <div className="flex-1">
          <ProjectMap
            className="h-full"
            center={IRELAND_CENTER}
            zoom={7}
            skipFitBounds
            boundary={projectBoundary}
            bufferDistances={bufferDistances}
            findings={savedFindings
              .filter((f) => {
                const raw = f.raw_data as Record<string, unknown> | null
                return f.location != null || raw?.geometry != null
              })
              .map((f) => {
                const raw = f.raw_data as Record<string, unknown> | null
                // Prefer raw_data.geometry (GeoJSON) over location column (WKB binary)
                const geometry =
                  (raw?.geometry as GeoJSON.Geometry) ||
                  (f.location as GeoJSON.Geometry | undefined)
                return {
                  id: f.id,
                  source: f.source,
                  dataType: f.data_type,
                  title: f.title,
                  content: f.content || undefined,
                  location: geometry,
                  isSaved: true,
                }
              })}
          />
        </div>

        {/* Summary Panel */}
        <div className="border-border bg-background w-96 overflow-y-auto border-l">
          {/* Header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Data Gathering</h2>
                <p className="text-muted-foreground text-sm">Ecological data collection</p>
              </div>
              <Badge
                variant="default"
                className={workflowStep.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}
              >
                {workflowStep.status === 'approved' ? 'Completed' : 'Needs Review'}
              </Badge>
            </div>
          </div>

          {/* Summary Content */}
          <div className="space-y-6 p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">
                  {findingsStats?.total || savedFindings.length}
                </div>
                <div className="text-muted-foreground text-xs">Total Findings</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{targetNotes.length}</div>
                <div className="text-muted-foreground text-xs">Target Notes</div>
              </div>
            </div>

            {/* By Type */}
            <div className="rounded-lg border">
              <h4 className="border-b px-4 py-3 font-medium">Findings by Type</h4>
              <div className="divide-y">
                {/* Habitats row (from saved habitat findings) */}
                {(() => {
                  const items = savedFindings.filter((f) => f.data_type === 'habitat')
                  if (items.length === 0) return null
                  const isOpen = expandedType === 'habitats'
                  return (
                    <div>
                      <button
                        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                        onClick={() => setExpandedType(isOpen ? null : 'habitats')}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-muted-foreground">Habitats</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{items.length}</Badge>
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground h-3.5 w-3.5 transition-transform',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="bg-muted/30 space-y-1 border-t px-4 py-2">
                          {items.map((f) => {
                            const raw = f.raw_data as Record<string, unknown> | null
                            const fossittCode = (raw?.fossittCode as string) || ''
                            return (
                              <div
                                key={f.id}
                                className="flex items-center justify-between py-0.5 text-xs"
                              >
                                <span className="text-muted-foreground truncate">{f.title}</span>
                                {fossittCode && (
                                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                    {fossittCode}
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Designated Sites row */}
                {(() => {
                  const items = savedFindings.filter((f) => f.data_type === 'designated_site')
                  const isOpen = expandedType === 'designated_site'
                  return (
                    <div>
                      <button
                        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                        onClick={() => setExpandedType(isOpen ? null : 'designated_site')}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-muted-foreground">Designated Sites</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{items.length}</Badge>
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground h-3.5 w-3.5 transition-transform',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && items.length > 0 && (
                        <div className="bg-muted/30 space-y-1 border-t px-4 py-2">
                          {items.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground truncate">{f.title}</span>
                              {f.source && (
                                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                  {f.source.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Species Records row */}
                {(() => {
                  const items = savedFindings.filter((f) => f.data_type === 'species_record')
                  const isOpen = expandedType === 'species_record'
                  return (
                    <div>
                      <button
                        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                        onClick={() => setExpandedType(isOpen ? null : 'species_record')}
                      >
                        <div className="flex items-center gap-2">
                          <Bug className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-muted-foreground">Species Records</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{items.length}</Badge>
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground h-3.5 w-3.5 transition-transform',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && items.length > 0 && (
                        <div className="bg-muted/30 space-y-1 border-t px-4 py-2">
                          {items.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground truncate">{f.title}</span>
                              {f.source && (
                                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                  {f.source.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Aquatic row */}
                {(() => {
                  const items = savedFindings.filter(
                    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
                  )
                  const isOpen = expandedType === 'aquatic'
                  return (
                    <div>
                      <button
                        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                        onClick={() => setExpandedType(isOpen ? null : 'aquatic')}
                      >
                        <div className="flex items-center gap-2">
                          <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                          <span className="text-muted-foreground">Aquatic</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{items.length}</Badge>
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground h-3.5 w-3.5 transition-transform',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && items.length > 0 && (
                        <div className="bg-muted/30 space-y-1 border-t px-4 py-2">
                          {items.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground truncate">{f.title}</span>
                              {f.source && (
                                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                  {f.source.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* By Source */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 font-medium">Findings by Source</h4>
              <div className="flex flex-wrap gap-2">
                {findingsStats?.bySource.map((item) => (
                  <Badge key={item.source} variant="outline" className="gap-1">
                    {item.source.toUpperCase()}
                    <span className="text-muted-foreground">({item.count})</span>
                  </Badge>
                )) || (
                  <>
                    {Array.from(new Set(savedFindings.map((f) => f.source))).map((source) => (
                      <Badge key={source} variant="outline" className="gap-1">
                        {source.toUpperCase()}
                        <span className="text-muted-foreground">
                          ({savedFindings.filter((f) => f.source === source).length})
                        </span>
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Button onClick={handleEditClick} variant="outline" className="w-full">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Data Gathering
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // WIZARD MODE
  return (
    <div className="flex h-full flex-col">
      {/* Progress Header */}
      <div
        className={cn(
          'border-border bg-card shrink-0 border-b transition-all duration-300',
          isMapMode ? 'px-4 py-2' : 'px-6 py-4'
        )}
      >
        {/* Full header for non-map steps */}
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

        {/* Site selector in map mode (always visible) */}
        {isMapMode && (
          <div className="mb-1 flex justify-end">
            <SiteSelector
              projectId={project.id}
              stepKey="data-gathering"
              onSiteChange={setSelectedSite}
              showAllOption
            />
          </div>
        )}

        {/* Step indicators */}
        <div
          className={cn(
            'flex items-center',
            isMapMode ? 'justify-center gap-2' : 'justify-between'
          )}
        >
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isPast = index < currentStepIndex

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 transition-all',
                    !isActive && 'opacity-60 hover:opacity-100',
                    isMapMode ? 'flex-row' : 'flex-col'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 transition-all',
                      isMapMode ? 'h-7 w-7' : 'h-10 w-10',
                      isActive && 'border-blue-500 bg-blue-500 text-white',
                      isPast && 'border-blue-500 bg-blue-50 text-blue-600',
                      !isActive && !isPast && 'border-gray-300 text-gray-400'
                    )}
                  >
                    {isPast ? (
                      <Check className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    ) : (
                      <Icon className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      isMapMode ? 'text-[11px]' : 'text-xs',
                      isActive && 'text-blue-600',
                      isPast && 'text-blue-600',
                      !isActive && !isPast && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5',
                      isMapMode ? 'w-6' : 'mx-2 flex-1',
                      index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Auto-search Progress Banner */}
      {showAutoSearchBanner && (
        <div className="border-border shrink-0 border-b bg-blue-50/80 px-4 py-2">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {(() => {
                const { sites, species, aquatic, habitats: hStatus } = autoSearchStatus
                const total = 4
                const completed = [sites, species, aquatic, hStatus].filter((s) =>
                  ['done', 'skipped', 'error'].includes(s)
                ).length
                if (completed >= total) return 'Auto-search complete'
                return `Auto-searching ecological databases... (${completed}/${total})`
              })()}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* Sites status */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    autoSearchStatus.sites === 'searching' && 'animate-pulse bg-blue-500',
                    autoSearchStatus.sites === 'done' && 'bg-emerald-500',
                    autoSearchStatus.sites === 'skipped' && 'bg-gray-400',
                    autoSearchStatus.sites === 'error' && 'bg-red-500',
                    autoSearchStatus.sites === 'idle' && 'bg-gray-300'
                  )}
                />
                <span className="text-xs text-blue-700">NPWS</span>
              </div>
              {/* Species status */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    autoSearchStatus.species === 'searching' && 'animate-pulse bg-blue-500',
                    autoSearchStatus.species === 'done' && 'bg-emerald-500',
                    autoSearchStatus.species === 'skipped' && 'bg-gray-400',
                    autoSearchStatus.species === 'error' && 'bg-red-500',
                    autoSearchStatus.species === 'idle' && 'bg-gray-300'
                  )}
                />
                <span className="text-xs text-blue-700">GBIF</span>
              </div>
              {/* Aquatic status */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    autoSearchStatus.aquatic === 'searching' && 'animate-pulse bg-blue-500',
                    autoSearchStatus.aquatic === 'done' && 'bg-emerald-500',
                    autoSearchStatus.aquatic === 'skipped' && 'bg-gray-400',
                    autoSearchStatus.aquatic === 'error' && 'bg-red-500',
                    autoSearchStatus.aquatic === 'idle' && 'bg-gray-300'
                  )}
                />
                <span className="text-xs text-blue-700">EPA</span>
              </div>
              {/* Habitat status */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    autoSearchStatus.habitats === 'searching' && 'animate-pulse bg-blue-500',
                    autoSearchStatus.habitats === 'done' && 'bg-emerald-500',
                    autoSearchStatus.habitats === 'skipped' && 'bg-gray-400',
                    autoSearchStatus.habitats === 'error' && 'bg-red-500',
                    autoSearchStatus.habitats === 'idle' && 'bg-gray-300'
                  )}
                />
                <span className="text-xs text-blue-700">NLC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="relative min-h-0 flex-1">
        {/* Step 1: Project Info - simple step, conditional render is fine */}
        {currentStep === 'info' && (
          <ProjectInfoSubStep
            project={project}
            projectBoundary={projectBoundary}
            bufferDistances={bufferDistances}
            savedFindingsCount={savedFindings.length}
          />
        )}

        {/* Step 2: Designated Sites (NPWS) - keep mounted once visited or during auto-search */}
        {(visitedSteps.has('sites') || autoSearchStatus.triggered) && (
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
              siteId={selectedSite?.id ?? null}
              otherBoundaries={otherBoundaries}
              allBoundaries={isAllSites ? allBoundaries : undefined}
              userId={userId}
              savedFindings={savedFindings}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
              isActive={currentStep === 'sites'}
              autoSearchTrigger={autoSearchStatus.sites === 'searching'}
              onAutoSearchComplete={(status) =>
                setAutoSearchStatus((prev) => ({ ...prev, sites: status }))
              }
            />
          </div>
        )}

        {/* Step 3: Species Records (GBIF + NBDC) - keep mounted once visited or during auto-search */}
        {(visitedSteps.has('species') || autoSearchStatus.triggered) && (
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
              siteId={selectedSite?.id ?? null}
              otherBoundaries={otherBoundaries}
              allBoundaries={isAllSites ? allBoundaries : undefined}
              userId={userId}
              savedFindings={savedFindings}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
              isActive={currentStep === 'species'}
              autoSearchTrigger={autoSearchStatus.species === 'searching'}
              onAutoSearchComplete={(status) =>
                setAutoSearchStatus((prev) => ({ ...prev, species: status }))
              }
            />
          </div>
        )}

        {/* Step 4: Aquatic Features (EPA) - keep mounted once visited or during auto-search */}
        {(visitedSteps.has('aquatic') || autoSearchStatus.triggered) && (
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
              siteId={selectedSite?.id ?? null}
              otherBoundaries={otherBoundaries}
              allBoundaries={isAllSites ? allBoundaries : undefined}
              userId={userId}
              savedFindings={savedFindings}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
              isActive={currentStep === 'aquatic'}
              autoSearchTrigger={autoSearchStatus.aquatic === 'searching'}
              onAutoSearchComplete={(status) =>
                setAutoSearchStatus((prev) => ({ ...prev, aquatic: status }))
              }
            />
          </div>
        )}

        {/* Step 5: Habitat Data - NLC 2018 land cover - keep mounted once visited or during auto-search */}
        {(visitedSteps.has('habitats') || autoSearchStatus.triggered) && (
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
              siteId={selectedSite?.id ?? null}
              showMap={showMap}
              onToggleMap={() => setShowMap(!showMap)}
              isActive={currentStep === 'habitats'}
              userId={userId}
              savedFindings={savedFindings}
              workflowStep={workflowStep}
              autoSearchTrigger={autoSearchStatus.habitats === 'searching'}
              onAutoSearchComplete={(status) =>
                setAutoSearchStatus((prev) => ({ ...prev, habitats: status }))
              }
            />
          </div>
        )}

        {/* Step 6: Company Reports - text search, conditional render */}
        {currentStep === 'reports' && (
          <CompanyReportsSubStep
            project={project}
            userId={userId}
            isActive={currentStep === 'reports'}
            siteId={selectedSite?.id ?? null}
          />
        )}

        {/* Step 8: Review & Export - simple step, conditional render is fine */}
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
            onComplete={handleComplete}
            isCompleting={completeStep.isPending}
            isComplete={isComplete}
          />
        )}
      </div>

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
  )
}
