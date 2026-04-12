'use client'

import * as React from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { SourceSelectionPanel, type GISSourceId } from './gis-mapping/source-selection-panel'
import { BufferZonePanel } from './gis-mapping/buffer-zone-panel'
import { WizardStepHeader } from './gis-mapping/wizard-step-header'
import { BoundaryClipDialog, type ClipSource } from '@/components/maps/boundary-clip-dialog'

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

export function GISMappingStep({ project, workflowStep, userId, onComplete }: GISMappingStepProps) {
  const { setMapFullscreen, refetchProject, refetchWorkflowSteps } = useProjectContext()
  const { toast } = useToast()

  // Hooks
  const wizard = useGISWizard(project, workflowStep)
  const { data: existingSites = [] } = useProjectSites(project.id)
  const siteMgmt = useSiteManagement(project, existingSites)
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

  // Reset layer cache when sites change
  React.useEffect(() => {
    layers.resetLayerCache()
  }, [allSiteBoundaries, activeBoundary, layers.resetLayerCache])

  // Trigger data fetch when layers step is active
  React.useEffect(() => {
    if (wizard.currentStep === 'layers' && !layers.layerDataFetchedRef.current) {
      const boundaries =
        allSiteBoundaries.length > 0 ? allSiteBoundaries : activeBoundary ? [activeBoundary] : null
      if (boundaries && boundaries.length > 0) {
        layers.fetchLayerData(boundaries, bufferConfig.enabledBuffers)
      }
    }
  }, [
    wizard.currentStep,
    allSiteBoundaries,
    activeBoundary,
    bufferConfig.enabledBuffers,
    layers.fetchLayerData,
  ])

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

  // ── Clip-to-layer (cookie cutter) ─────────────────────────────────────────

  const [clipDialogOpen, setClipDialogOpen] = React.useState(false)

  const clipSources: ClipSource[] = React.useMemo(() => {
    const sources: ClipSource[] = []
    // Other site boundaries
    siteMgmt.sites.forEach((s, i) => {
      if (i !== siteMgmt.activeSiteIndex && s.boundary) {
        sources.push({ label: s.siteCode, group: 'Other Sites', feature: s.boundary })
      }
    })
    return sources
  }, [siteMgmt.sites, siteMgmt.activeSiteIndex])

  const handleClipApply = React.useCallback(
    (source: ClipSource, mode: 'keep-inside' | 'remove-overlap') => {
      const boundary = siteMgmt.activeSite?.boundary
      if (!boundary) return

      import('@/lib/gis/polygon-operations').then(({ clipToPolygon, clipPolygon }) => {
        const result =
          mode === 'keep-inside'
            ? clipToPolygon(boundary, source.feature)
            : clipPolygon(boundary, source.feature)

        if (!result) {
          toast({
            variant: 'destructive',
            title: 'Clip failed',
            description: 'The selected polygon does not overlap the site boundary.',
          })
          return
        }

        const changed = siteMgmt.handleBoundaryChange(
          { type: 'FeatureCollection', features: [result] },
          true
        )
        if (changed) wizard.setHasUnsavedChanges(true)
      })
    },
    [siteMgmt, wizard, toast]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSourceSelect = (source: string) => {
    if (source === 'upload') {
      siteMgmt.fileInputRef.current?.click()
      return
    }
    if (source === 'manual') {
      if (siteMgmt.sites.length === 0) siteMgmt.addSite()
      wizard.setCurrentStep('sites')
    }
  }

  const handleBoundaryChange = (features: GeoJSON.FeatureCollection, isEdit?: boolean) => {
    const changed = siteMgmt.handleBoundaryChange(features, isEdit)
    if (changed) wizard.setHasUnsavedChanges(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // ── PREVIEW MODE ──────────────────────────────────────────────────────────

  if (wizard.viewMode === 'preview') {
    const previewBoundary = activeBoundary ?? boundaryMgmt.boundary ?? undefined
    return (
      <div className="flex h-full">
        <div className="flex-1">
          <ProjectMapWithDraw
            className="h-full"
            center={mapView.mapCenter}
            zoom={mapView.mapZoom}
            boundary={previewBoundary}
            otherBoundaries={otherBoundaries}
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

  // ── WIZARD MODE ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      <WizardStepHeader
        currentStep={wizard.currentStep}
        currentStepIndex={wizard.currentStepIndex}
        isMapMode={wizard.isMapMode}
        isComplete={wizard.isComplete}
        hasSites={siteMgmt.sites.length > 0}
        hasAnySiteBoundary={siteMgmt.sites.some((s) => s.boundary)}
        onStepClick={wizard.setCurrentStep}
      />

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: Source Selection */}
        {wizard.currentStep === 'source' && (
          <SourceSelectionPanel
            selectedSource={boundaryMgmt.selectedSource as GISSourceId | null}
            fileInputRef={siteMgmt.fileInputRef}
            isProcessing={siteMgmt.isProcessing}
            onSourceSelect={handleSourceSelect}
            onFileUpload={handleFileUpload}
          />
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
              onUpdateAttributes={(attributes) => {
                siteMgmt.updateSite(siteMgmt.activeSiteIndex, { attributes })
                wizard.setHasUnsavedChanges(true)
              }}
              onClipToLayer={
                siteMgmt.activeSite?.boundary && clipSources.length > 0
                  ? () => setClipDialogOpen(true)
                  : undefined
              }
              boundaryInfo={siteMgmt.boundaryInfo}
              locationInfo={siteMgmt.locationInfo}
              isLoadingLocation={siteMgmt.isLoadingLocation}
            />
            <BoundaryClipDialog
              open={clipDialogOpen}
              onOpenChange={setClipDialogOpen}
              sources={clipSources}
              onApply={handleClipApply}
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

            <BufferZonePanel
              enabledBuffers={bufferConfig.enabledBuffers}
              customBuffers={bufferConfig.customBuffers}
              customBufferInput={bufferConfig.customBufferInput}
              onBufferToggle={handleBufferToggle}
              onRemoveCustomBuffer={(distance) => {
                bufferConfig.handleRemoveCustomBuffer(distance)
                wizard.setHasUnsavedChanges(true)
              }}
              onAddCustomBuffer={() => {
                const added = bufferConfig.handleAddCustomBuffer()
                if (added) wizard.setHasUnsavedChanges(true)
                return added
              }}
              onCustomBufferInputChange={bufferConfig.setCustomBufferInput}
            />
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
