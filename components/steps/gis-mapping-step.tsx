'use client'

import * as React from 'react'
import {
  FileUp,
  MapPin,
  Loader2,
  Check,
  Globe,
  Database,
  Pencil,
  Clock,
  ChevronLeft,
  ChevronRight,
  Circle,
  Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUpdateProjectBoundary } from '@/hooks/queries/use-project-hooks'
import { useCompleteWorkflowStep, useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { getDefaultVisibleLayers } from '@/lib/config/dataset-layers'
import { getBufferColor } from '@/lib/config/map-constants'
import { STANDARD_BUFFER_DISTANCES } from '@/lib/gis'
import { MapCaptureButton } from '@/components/maps/map-capture-button'
import type { Project, WorkflowStep } from '@/types/database'
import { useProjectContext } from '@/contexts/project-context'

// Hooks
import { useGISWizard, WIZARD_STEPS } from '@/hooks/gis/use-gis-wizard'
import { useBoundaryManagement } from '@/hooks/gis/use-boundary-management'
import { useSiteManagement } from '@/hooks/gis/use-site-management'
import { useBufferConfiguration } from '@/hooks/gis/use-buffer-configuration'
import { useLayerData } from '@/hooks/gis/use-layer-data'
import { useMapViewPersistence } from '@/hooks/gis/use-map-view-persistence'
import { useProjectSites, useUpsertSite } from '@/hooks/queries/use-site-hooks'

// Components
import { PreviewPanel } from './gis-mapping/preview-panel'
import { LayersSidebar } from './gis-mapping/layers-sidebar'
import { SiteListPanel } from './gis-mapping/site-list-panel'

// Dynamic import for map
const ProjectMapWithDraw = dynamic(
  () => import('@/components/maps/project-map-with-draw').then((mod) => mod.ProjectMapWithDraw),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface GISMappingStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId?: string
  onComplete?: () => void
}

// GIS source options
const gisSourceOptions = [
  {
    id: 'arcgis' as const,
    label: 'ArcGIS Online',
    description: 'Import from ArcGIS',
    icon: Globe,
    color: 'bg-blue-500',
    comingSoon: true,
  },
  {
    id: 'qgis' as const,
    label: 'QGIS',
    description: 'Import from PostGIS',
    icon: Database,
    color: 'bg-green-600',
    comingSoon: true,
  },
  {
    id: 'manual' as const,
    label: 'Draw on Map',
    description: 'Draw boundary manually',
    icon: Pencil,
    color: 'bg-amber-500',
    comingSoon: false,
  },
  {
    id: 'upload' as const,
    label: 'Upload File',
    description: 'GeoJSON or Shapefile',
    icon: FileUp,
    color: 'bg-purple-500',
    comingSoon: false,
  },
]

export function GISMappingStep({ project, workflowStep, userId, onComplete }: GISMappingStepProps) {
  const { setMapFullscreen, refetchProject, refetchWorkflowSteps } = useProjectContext()
  const { toast } = useToast()

  // Hooks
  const wizard = useGISWizard(project, workflowStep)
  const { data: existingSites = [] } = useProjectSites(project.id)
  const siteMgmt = useSiteManagement(project, existingSites)
  // Keep boundaryMgmt for backward compat (preview mode, legacy code paths)
  const boundaryMgmt = useBoundaryManagement(project)
  const bufferConfig = useBufferConfiguration(project)
  const layers = useLayerData(project)
  const mapView = useMapViewPersistence(project.id)

  // Map container ref for screenshot capture
  const gisMapContainerRef = React.useRef<HTMLDivElement>(null)

  // Mutations
  const updateBoundary = useUpdateProjectBoundary()
  const upsertSite = useUpsertSite()
  const completeStep = useCompleteWorkflowStep()
  const updateWorkflowStep = useUpdateWorkflowStep()

  // Track original boundary/buffer for detecting changes on save
  const originalBoundaryRef = React.useRef<string | null>(
    project.boundary
      ? JSON.stringify(
          (project.boundary as GeoJSON.Feature<GeoJSON.Polygon>)?.geometry?.coordinates
        )
      : null
  )
  const originalBuffersRef = React.useRef<string>(
    JSON.stringify((project.buffer_distances as number[] | null) ?? [])
  )

  // Toggle map fullscreen mode
  React.useEffect(() => {
    const isMapStep =
      wizard.viewMode === 'preview' ||
      wizard.currentStep === 'sites' ||
      wizard.currentStep === 'buffers' ||
      wizard.currentStep === 'layers'
    setMapFullscreen(isMapStep)
    return () => {
      setMapFullscreen(false)
    }
  }, [wizard.viewMode, wizard.currentStep, setMapFullscreen])

  // Active site boundary for buffer/layer operations
  const activeBoundary = siteMgmt.activeSite?.boundary ?? boundaryMgmt.boundary

  // All site boundaries (for buffer generation across all sites)
  const allSiteBoundaries = React.useMemo(
    () => siteMgmt.sites.filter((s) => s.boundary).map((s) => s.boundary!),
    [siteMgmt.sites]
  )

  // Generate buffer zones for ALL site boundaries
  React.useEffect(() => {
    if (allSiteBoundaries.length > 0) {
      bufferConfig.regenerateBufferZones(allSiteBoundaries)
    } else if (activeBoundary) {
      bufferConfig.regenerateBufferZones(activeBoundary)
    } else {
      bufferConfig.regenerateBufferZones(null)
    }
  }, [
    allSiteBoundaries,
    activeBoundary,
    bufferConfig.enabledBuffers,
    bufferConfig.regenerateBufferZones,
  ])

  // Reset layer cache when boundary changes
  React.useEffect(() => {
    layers.resetLayerCache()
  }, [activeBoundary, layers.resetLayerCache])

  // Trigger data fetch when layers step is active
  React.useEffect(() => {
    if (wizard.currentStep === 'layers' && activeBoundary && !layers.layerDataFetchedRef.current) {
      layers.fetchLayerData(activeBoundary, bufferConfig.enabledBuffers)
    }
  }, [wizard.currentStep, activeBoundary, bufferConfig.enabledBuffers, layers.fetchLayerData])

  // Boundaries of non-active sites (shown dimmed on map)
  const otherBoundaries = React.useMemo(
    () =>
      siteMgmt.sites
        .filter((s, i) => i !== siteMgmt.activeSiteIndex && s.boundary)
        .map((s) => s.boundary!),
    [siteMgmt.sites, siteMgmt.activeSiteIndex]
  )

  // Computed buffer colors
  const bufferColors = React.useMemo(
    () => Object.fromEntries(bufferConfig.enabledBuffers.map((d) => [d, getBufferColor(d)])),
    [bufferConfig.enabledBuffers]
  )

  // NPWS site count for map prop
  const npwsSiteCount = React.useMemo(() => {
    const layerToSiteType: Record<string, string> = {
      sac: 'SAC',
      spa: 'SPA',
      nha: 'NHA',
      pnha: 'pNHA',
    }
    const selectedTypes = ['sac', 'spa', 'nha', 'pnha']
      .filter((l) => layers.visibleLayers.includes(l))
      .map((l) => layerToSiteType[l])
    return layers.layerData.npwsSites.filter(
      (site) =>
        selectedTypes.includes(site.SITE_TYPE || '') &&
        !layers.deletedItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`) &&
        !layers.ignoredItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
    ).length
  }, [layers.layerData.npwsSites, layers.visibleLayers, layers.deletedItems, layers.ignoredItems])

  // Handlers
  const handleSourceSelect = (source: string) => {
    if (source === 'upload') {
      siteMgmt.fileInputRef.current?.click()
      return
    }
    if (source === 'manual') {
      // Ensure at least one site exists for drawing
      if (siteMgmt.sites.length === 0) siteMgmt.addSite()
      wizard.setCurrentStep('sites')
    }
  }

  const handleBoundaryChange = (features: GeoJSON.FeatureCollection) => {
    const changed = siteMgmt.handleBoundaryChange(features)
    if (changed) wizard.setHasUnsavedChanges(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure at least one site exists before upload
    if (siteMgmt.sites.length === 0) siteMgmt.addSite()
    const result = await siteMgmt.handleFileUpload(event)
    if (result) {
      wizard.setHasUnsavedChanges(true)
      wizard.setCurrentStep('sites')
      toast({ title: 'File imported', description: 'Boundary loaded from file.' })
    } else if (event.target.files?.length) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description:
          'Could not parse boundary from file. Ensure it is a valid GeoJSON or Shapefile.',
      })
    }
  }

  const handleBufferToggle = (distance: number) => {
    bufferConfig.handleBufferToggle(distance)
    wizard.setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    const dirtySites = siteMgmt.sites.filter((s) => s.isDirty)
    // Fallback: if no sites managed yet, use legacy single-boundary save
    if (dirtySites.length === 0 && boundaryMgmt.boundary && boundaryMgmt.boundaryInfo) {
      try {
        await updateBoundary.mutateAsync({
          projectId: project.id,
          boundary: boundaryMgmt.boundary,
          centerPoint: {
            type: 'Point',
            coordinates: [
              parseFloat(boundaryMgmt.boundaryInfo.centerLng),
              parseFloat(boundaryMgmt.boundaryInfo.centerLat),
            ],
          },
          gridReference: boundaryMgmt.boundaryInfo.gridRef,
          bufferDistances: bufferConfig.enabledBuffers,
          visibleLayers: layers.visibleLayers,
          townland: boundaryMgmt.locationInfo?.townland || undefined,
          county: boundaryMgmt.locationInfo?.county || undefined,
          province: boundaryMgmt.locationInfo?.province || undefined,
        })
        wizard.setHasUnsavedChanges(false)
        refetchProject()
        refetchWorkflowSteps()
        toast({ title: 'Saved', description: 'GIS configuration saved successfully.' })
        return
      } catch (error) {
        console.error('[GISMappingStep] Legacy save error:', error)
        toast({ variant: 'destructive', title: 'Save failed' })
        throw error
      }
    }

    // Multi-site save: upsert each dirty site
    try {
      for (const site of dirtySites) {
        if (!site.boundary) continue
        await upsertSite.mutateAsync({
          projectId: project.id,
          siteCode: site.siteCode,
          siteName: site.siteName ?? undefined,
          sortOrder: site.sortOrder,
          boundary: site.boundary,
          centerPoint: site.centerPoint ?? undefined,
          gridReference: siteMgmt.boundaryInfo?.gridRef,
          county: siteMgmt.locationInfo?.county,
          townland: siteMgmt.locationInfo?.townland,
          province: siteMgmt.locationInfo?.province,
          bufferDistances: bufferConfig.enabledBuffers,
          visibleLayers: layers.visibleLayers,
          attributes: site.attributes,
        })
      }

      // Check if downstream steps need review
      const newBoundaryKey = JSON.stringify(
        siteMgmt.sites.map((s) => s.boundary?.geometry?.coordinates)
      )
      const boundaryChanged = newBoundaryKey !== originalBoundaryRef.current
      const newBuffersKey = JSON.stringify(bufferConfig.enabledBuffers)
      const buffersChanged = newBuffersKey !== originalBuffersRef.current

      if ((boundaryChanged || buffersChanged) && wizard.allWorkflowSteps) {
        const laterSteps = wizard.allWorkflowSteps.filter(
          (s) => s.step_number > 1 && (s.status === 'approved' || s.status === 'in_progress')
        )
        for (const step of laterSteps) {
          await updateWorkflowStep.mutateAsync({
            stepId: step.id,
            updates: { status: 'needs_review' },
          })
        }
      }

      originalBoundaryRef.current = newBoundaryKey
      originalBuffersRef.current = newBuffersKey
      wizard.setHasUnsavedChanges(false)
      refetchProject()
      refetchWorkflowSteps()
      toast({ title: 'Saved', description: 'GIS configuration saved successfully.' })
    } catch (error) {
      console.error('[GISMappingStep] Save error:', error)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save the GIS configuration. Please try again.',
      })
      throw error
    }
  }

  const handleComplete = async () => {
    const hasAnyBoundary = siteMgmt.sites.some((s) => s.boundary) || !!boundaryMgmt.boundary
    if (!hasAnyBoundary) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Draw or upload a project boundary before completing this step.',
      })
      return
    }
    try {
      if (wizard.hasUnsavedChanges) await handleSave()
    } catch {
      return // Save failed — don't proceed to complete
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })
      refetchWorkflowSteps()
      onComplete?.()
    } catch (error) {
      console.error('[GISMappingStep] Complete step error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not complete the step. Please try again.',
      })
    }
  }

  const goNext = () => {
    if (wizard.currentStep === 'source' && siteMgmt.sites.length === 0) {
      toast({ title: 'Select a source', description: 'Choose how to define your boundary.' })
      return
    }
    if (wizard.currentStep === 'sites' && !siteMgmt.sites.some((s) => s.boundary)) {
      toast({ title: 'No boundary', description: 'Draw or upload at least one site boundary.' })
      return
    }
    if (wizard.currentStep === 'buffers' && bufferConfig.enabledBuffers.length === 0) {
      toast({ title: 'No buffers', description: 'Select at least one buffer zone.' })
      return
    }

    // Auto-enable default data layers when entering the Layers step
    if (wizard.currentStep === 'buffers') {
      const defaultLayers = getDefaultVisibleLayers()
      if (layers.visibleLayers.length === 0) {
        layers.setVisibleLayers(defaultLayers)
        wizard.setHasUnsavedChanges(true)
      }
    }
    if (wizard.canGoNext) {
      wizard.setCurrentStep(WIZARD_STEPS[wizard.currentStepIndex + 1].id)
    }
  }

  // PREVIEW MODE
  if (wizard.viewMode === 'preview') {
    return (
      <div className="flex h-full">
        <div className="flex-1">
          <ProjectMapWithDraw
            className="h-full"
            center={mapView.mapCenter}
            zoom={mapView.mapZoom}
            boundary={boundaryMgmt.boundary ?? undefined}
            bufferZones={bufferConfig.bufferZones}
            bufferColors={bufferColors}
            onViewChange={mapView.handleViewChange}
            editable={false}
            showLayersControl={true}
            visibleLayers={layers.visibleLayers}
            baseMapStyle={mapView.baseMapStyle}
            onBaseMapStyleChange={mapView.setBaseMapStyle}
            flyToLocation={mapView.flyToLocation}
          />
        </div>

        <PreviewPanel
          boundaryInfo={boundaryMgmt.boundaryInfo}
          locationInfo={boundaryMgmt.locationInfo}
          enabledBuffers={bufferConfig.enabledBuffers}
          visibleLayers={layers.visibleLayers}
          workflowStatus={workflowStep.status}
          onEditClick={wizard.handleEditClick}
        />

        <AlertDialog open={wizard.showEditWarning} onOpenChange={wizard.setShowEditWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit GIS Configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                Other steps in this project have already been started. If you change the site
                boundary or buffer zones, the data in those steps (such as Data Gathering and Desk
                Assessment) may no longer be accurate and will need to be reviewed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={wizard.confirmEdit}>Continue Editing</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
          wizard.isMapMode ? 'px-4 py-2' : 'px-6 py-4'
        )}
      >
        {!wizard.isMapMode && (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">GIS Mapping</h2>
              <p className="text-muted-foreground text-sm">Define your project boundary</p>
            </div>
            <Badge variant={wizard.isComplete ? 'default' : 'secondary'}>
              {wizard.isComplete ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
        )}

        {/* Step indicators */}
        <div
          className={cn(
            'flex items-center',
            wizard.isMapMode ? 'justify-center gap-2' : 'justify-between'
          )}
        >
          {WIZARD_STEPS.map((step, index) => {
            const icons: Record<string, typeof Globe> = {
              source: Globe,
              sites: MapPin,
              boundary: MapPin,
              buffers: Circle,
              layers: Layers,
            }
            const Icon = icons[step.id] ?? Globe
            const isActive = step.id === wizard.currentStep
            const isPast = index < wizard.currentStepIndex
            const hasSites = siteMgmt.sites.length > 0
            const hasAnySiteBoundary = siteMgmt.sites.some((s) => s.boundary)
            const isClickable =
              isPast ||
              (index === wizard.currentStepIndex + 1 &&
                (wizard.currentStep !== 'source' || hasSites) &&
                (wizard.currentStep !== 'sites' || hasAnySiteBoundary))

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => isClickable && wizard.setCurrentStep(step.id)}
                  disabled={!isClickable && !isActive}
                  className={cn(
                    'flex items-center gap-1 transition-all',
                    isClickable && 'cursor-pointer',
                    !isClickable && !isActive && 'opacity-40',
                    wizard.isMapMode ? 'flex-row' : 'flex-col'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 transition-all',
                      wizard.isMapMode ? 'h-7 w-7' : 'h-10 w-10',
                      isActive && 'border-emerald-500 bg-emerald-500 text-white',
                      isPast &&
                        'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
                      !isActive && !isPast && 'border-gray-300 text-gray-400'
                    )}
                  >
                    {isPast ? (
                      <Check className={cn(wizard.isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    ) : (
                      <Icon className={cn(wizard.isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      wizard.isMapMode ? 'text-[11px]' : 'text-xs',
                      isActive && 'text-emerald-600',
                      isPast && 'text-emerald-600',
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
                      wizard.isMapMode ? 'w-6' : 'mx-2 flex-1',
                      index < wizard.currentStepIndex
                        ? 'bg-emerald-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: Source Selection */}
        {wizard.currentStep === 'source' && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              <h3 className="mb-2 text-center text-xl font-semibold">
                How would you like to define your boundary?
              </h3>
              <p className="text-muted-foreground mb-8 text-center">
                Choose a method to get started
              </p>

              <div className="grid grid-cols-2 gap-4">
                {gisSourceOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = boundaryMgmt.selectedSource === option.id

                  return (
                    <button
                      key={option.id}
                      onClick={() => !option.comingSoon && handleSourceSelect(option.id)}
                      disabled={option.comingSoon}
                      className={cn(
                        'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                        option.comingSoon && 'cursor-not-allowed opacity-50',
                        !option.comingSoon && 'hover:border-emerald-400 hover:shadow-lg',
                        isSelected &&
                          'border-emerald-500 bg-emerald-50 shadow-lg dark:bg-emerald-950'
                      )}
                    >
                      {option.comingSoon && (
                        <Badge variant="secondary" className="absolute -top-2 -right-2">
                          <Clock className="mr-1 h-3 w-3" /> Soon
                        </Badge>
                      )}
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-xl',
                          option.color
                        )}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold">{option.label}</h4>
                        <p className="text-muted-foreground text-sm">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <input
                ref={siteMgmt.fileInputRef}
                type="file"
                accept=".geojson,.json,.shp,.zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={siteMgmt.isProcessing}
              />
            </div>
          </div>
        )}

        {/* Step 2: Sites (Multi-site boundary management) */}
        {wizard.currentStep === 'sites' && (
          <div className="flex h-full">
            <div className="flex-1">
              <ProjectMapWithDraw
                className="h-full"
                center={mapView.mapCenter}
                zoom={mapView.mapZoom}
                boundary={siteMgmt.activeSite?.boundary ?? undefined}
                otherBoundaries={otherBoundaries}
                onBoundaryChange={handleBoundaryChange}
                onViewChange={mapView.handleViewChange}
                editable={true}
                showLayersControl={true}
                visibleLayers={[]}
                baseMapStyle={mapView.baseMapStyle}
                onBaseMapStyleChange={mapView.setBaseMapStyle}
                flyToLocation={mapView.flyToLocation}
              />
            </div>

            <SiteListPanel
              sites={siteMgmt.sites}
              activeSiteIndex={siteMgmt.activeSiteIndex}
              onSelectSite={siteMgmt.setActiveSiteIndex}
              onRemoveSite={siteMgmt.removeSite}
              onRenameSite={(index, code) => siteMgmt.updateSite(index, { siteCode: code })}
              boundaryInfo={siteMgmt.boundaryInfo}
              locationInfo={siteMgmt.locationInfo}
              isLoadingLocation={siteMgmt.isLoadingLocation}
            />
          </div>
        )}

        {/* Step 3: Buffer Zones */}
        {wizard.currentStep === 'buffers' && (
          <div className="flex h-full">
            <div className="flex-1">
              <ProjectMapWithDraw
                className="h-full"
                center={mapView.mapCenter}
                zoom={mapView.mapZoom}
                boundary={activeBoundary ?? undefined}
                otherBoundaries={otherBoundaries}
                bufferZones={bufferConfig.bufferZones}
                bufferColors={bufferColors}
                onViewChange={mapView.handleViewChange}
                editable={false}
                showLayersControl={true}
                visibleLayers={[]}
                baseMapStyle={mapView.baseMapStyle}
                onBaseMapStyleChange={mapView.setBaseMapStyle}
                flyToLocation={mapView.flyToLocation}
              />
            </div>

            {/* Buffer selection panel */}
            <div className="border-border w-80 overflow-y-auto border-l p-6">
              <h3 className="mb-2 text-lg font-semibold">Buffer Zones</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Select buffer distances for designated site analysis
              </p>

              <div className="space-y-2">
                {STANDARD_BUFFER_DISTANCES.map((buffer) => {
                  const isEnabled = bufferConfig.enabledBuffers.includes(buffer.value)
                  const color = getBufferColor(buffer.value)

                  return (
                    <button
                      key={buffer.value}
                      onClick={() => handleBufferToggle(buffer.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                        isEnabled
                          ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      )}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: color.stroke,
                          backgroundColor: isEnabled ? color.fill : 'transparent',
                        }}
                      >
                        {isEnabled && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{buffer.label}</span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color.fill }}
                          />
                        </div>
                        <div className="text-muted-foreground text-xs">{buffer.description}</div>
                      </div>
                    </button>
                  )
                })}

                {/* Custom buffer distances */}
                {bufferConfig.customBuffers.map((distance) => {
                  const isEnabled = bufferConfig.enabledBuffers.includes(distance)
                  const color = getBufferColor(distance)

                  return (
                    <div key={distance} className="flex items-center gap-2">
                      <button
                        onClick={() => handleBufferToggle(distance)}
                        className={cn(
                          'flex flex-1 items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                          isEnabled
                            ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        )}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: color.stroke,
                            backgroundColor: isEnabled ? color.fill : 'transparent',
                          }}
                        >
                          {isEnabled && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{distance} km</span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color.fill }}
                          />
                          <Badge variant="outline" className="text-[10px]">
                            Custom
                          </Badge>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => {
                          bufferConfig.handleRemoveCustomBuffer(distance)
                          wizard.setHasUnsavedChanges(true)
                        }}
                      >
                        <span className="text-lg">×</span>
                      </Button>
                    </div>
                  )
                })}
              </div>

              {/* Add custom buffer */}
              <div className="mt-4 border-t pt-4">
                <label className="text-sm font-medium">Add Custom Buffer</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={bufferConfig.customBufferInput}
                    onChange={(e) => bufferConfig.setCustomBufferInput(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const added = bufferConfig.handleAddCustomBuffer()
                      if (added) wizard.setHasUnsavedChanges(true)
                    }}
                    disabled={
                      !bufferConfig.customBufferInput ||
                      parseFloat(bufferConfig.customBufferInput) <= 0
                    }
                  >
                    Add
                  </Button>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Enter distance in kilometers (0.1 - 50)
                </p>
                {bufferConfig.customBufferInput &&
                  parseFloat(bufferConfig.customBufferInput) > 15 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Large buffers may slow down searches and map rendering
                    </p>
                  )}
              </div>

              {/* Selected summary */}
              <div className="mt-6 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Buffers</span>
                  <span className="text-muted-foreground text-sm">
                    {bufferConfig.enabledBuffers.length}
                  </span>
                </div>
                {bufferConfig.enabledBuffers.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Select at least one buffer zone to proceed
                  </p>
                )}
                {bufferConfig.enabledBuffers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bufferConfig.enabledBuffers
                      .sort((a, b) => a - b)
                      .map((d) => {
                        const color = getBufferColor(d)
                        return (
                          <Badge
                            key={d}
                            variant="secondary"
                            className="gap-1"
                            style={{ borderColor: color.stroke, borderWidth: 1 }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: color.fill }}
                            />
                            {d} km
                          </Badge>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Data Layers */}
        {wizard.currentStep === 'layers' && (
          <div className="flex h-full">
            <div className="relative flex-1" ref={gisMapContainerRef}>
              <ProjectMapWithDraw
                className="h-full"
                center={mapView.mapCenter}
                zoom={mapView.mapZoom}
                boundary={activeBoundary ?? undefined}
                otherBoundaries={otherBoundaries}
                bufferZones={bufferConfig.bufferZones}
                bufferColors={bufferColors}
                onViewChange={mapView.handleViewChange}
                editable={false}
                showLayersControl={true}
                visibleLayers={layers.visibleLayers}
                baseMapStyle={mapView.baseMapStyle}
                onBaseMapStyleChange={mapView.setBaseMapStyle}
                ignoredItems={layers.ignoredItems}
                deletedItems={layers.deletedItems}
                npwsSiteCount={npwsSiteCount}
                npwsSites={layers.layerData.npwsSites}
                flyToLocation={mapView.flyToLocation}
              />

              <MapCaptureButton
                containerRef={gisMapContainerRef}
                projectId={project.id}
                stepName="gis_mapping"
                userId={userId}
                className="absolute top-4 right-4 z-1000 shadow-md"
              />
            </div>

            <LayersSidebar
              enabledBuffers={bufferConfig.enabledBuffers}
              visibleLayers={layers.visibleLayers}
              layerData={layers.layerData}
              layerDataLoading={layers.layerDataLoading}
              expandedLayers={layers.expandedLayers}
              ignoredItems={layers.ignoredItems}
              deletedItems={layers.deletedItems}
              showAllItems={layers.showAllItems}
              isSaving={updateBoundary.isPending || upsertSite.isPending}
              isCompleting={completeStep.isPending}
              canComplete={siteMgmt.sites.some((s) => s.boundary) || !!boundaryMgmt.boundary}
              hasUnsavedChanges={wizard.hasUnsavedChanges}
              onLayerToggle={layers.handleLayerToggle}
              onToggleIgnore={layers.handleToggleIgnore}
              onDeleteItem={layers.handleDeleteItem}
              onToggleExpand={layers.handleToggleExpand}
              onToggleShowAll={layers.handleToggleShowAll}
              onFlyTo={(center, zoom, key) => mapView.setFlyToLocation({ center, zoom, key })}
              onSetVisibleLayers={layers.setVisibleLayers}
              onMarkUnsaved={() => wizard.setHasUnsavedChanges(true)}
              onSave={handleSave}
              onComplete={handleComplete}
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div
        className={cn(
          'border-border bg-card shrink-0 border-t transition-all duration-300',
          wizard.isMapMode ? 'px-4 py-2' : 'px-6 py-4'
        )}
      >
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size={wizard.isMapMode ? 'sm' : 'default'}
            onClick={wizard.goBack}
            disabled={!wizard.canGoBack}
          >
            <ChevronLeft className={cn(wizard.isMapMode ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')} />
            Back
          </Button>

          <div className={cn('text-muted-foreground', wizard.isMapMode ? 'text-xs' : 'text-sm')}>
            Step {wizard.currentStepIndex + 1} of {WIZARD_STEPS.length}
          </div>

          {wizard.canGoNext ? (
            <Button size={wizard.isMapMode ? 'sm' : 'default'} onClick={goNext}>
              Next
              <ChevronRight className={cn(wizard.isMapMode ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>
    </div>
  )
}
