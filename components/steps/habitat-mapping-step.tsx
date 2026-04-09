'use client'

import * as React from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { useToast } from '@/hooks/use-toast'
import {
  useHabitats,
  useHabitatStats,
  useCreateHabitat,
  useCreateHabitatsBulk,
  useUpdateHabitat,
  useDeleteHabitat,
} from '@/hooks/queries/use-habitat-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import {
  HabitatForm,
  type HabitatPolygon as HabitatFormType,
} from '@/components/field-surveys/habitat-form'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { useAutoImportHabitats } from '@/hooks/steps/use-auto-import-habitats'
import { useHabitatMapData } from '@/hooks/steps/use-habitat-map-data'
import { HabitatListPanel } from '@/components/steps/habitat-mapping/habitat-list-panel'
import type { Project, WorkflowStep, HabitatPolygon, Json } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

// Dynamic import for map with draw controls
const ProjectMapWithDraw = dynamic(
  () => import('@/components/maps/project-map-with-draw').then((mod) => mod.ProjectMapWithDraw),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-125 items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface HabitatMappingStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
}

export function HabitatMappingStep({
  project,
  workflowStep: _workflowStep,
  userId: _userId,
}: HabitatMappingStepProps) {
  const { toast } = useToast()
  const [selectedSite, setSelectedSite] = React.useState<ProjectSiteWithGeoJSON | null>(null)
  const { projectBoundary, projectCenter } = useProjectBoundary(project, selectedSite)
  const [showHabitatForm, setShowHabitatForm] = React.useState(false)
  const [editingHabitat, setEditingHabitat] = React.useState<HabitatPolygon | null>(null)
  const [deletingHabitat, setDeletingHabitat] = React.useState<HabitatPolygon | null>(null)
  const [drawnBoundary, setDrawnBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    null
  )
  const [selectedHabitat, setSelectedHabitat] = React.useState<HabitatPolygon | null>(null)

  // React Query hooks
  const { data: habitats = [], isLoading } = useHabitats(project.id, selectedSite?.id)
  const { data: habitatStats } = useHabitatStats(project.id, selectedSite?.id)
  const { data: savedFindings = [], isLoading: findingsLoading } = useSavedFindings(
    project.id,
    selectedSite?.id
  )
  const createHabitat = useCreateHabitat()
  const createHabitatsBulk = useCreateHabitatsBulk()
  const updateHabitat = useUpdateHabitat()
  const deleteHabitat = useDeleteHabitat()

  const findingsByType = React.useMemo(() => groupFindingsByType(savedFindings), [savedFindings])

  // D2.3: Auto-import habitat findings from data gathering (bulk — single
  // round-trip to avoid the map freeze caused by N sequential inserts)
  useAutoImportHabitats({
    projectId: project.id,
    savedFindings,
    habitats,
    isLoading,
    findingsLoading,
    createHabitatsBulk,
    toast,
  })

  // Map-related computed data + visibility toggles
  const {
    visibleFindingGroups,
    toggleFindingGroup,
    filteredHabitats,
    findingMarkers,
    npwsVisibleLayers,
    habitatPolygonOverlays,
    flyToLocation,
    handleFindingClick,
    handleHabitatMapClick,
  } = useHabitatMapData({ habitats, savedFindings, selectedSite })

  // Handle boundary drawn on map
  const handleBoundaryChange = (features: GeoJSON.FeatureCollection) => {
    if (features.features.length > 0) {
      const feature = features.features[0] as GeoJSON.Feature<GeoJSON.Polygon>
      setDrawnBoundary(feature)
      setShowHabitatForm(true)
    }
  }

  /** Split a comma-separated string into a trimmed array, or null when empty. */
  const csvToArray = (value: string | undefined | null): string[] | null =>
    value
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null

  /** Build the shared habitat field payload from form data. */
  const buildHabitatFields = (data: Partial<HabitatFormType>) => {
    const fossittInfo = getHabitatByCode(data.fossittCode!)
    return {
      fossitt_code: data.fossittCode!,
      fossitt_name: fossittInfo?.name || data.fossittCode!,
      condition: data.condition!,
      notes: data.notes || null,
      eu_annex_code: data.euAnnexCode || null,
      evaluation: data.evaluation || null,
      threats: csvToArray(data.threats),
      survey_method: data.surveyMethod || null,
      listed_species: csvToArray(data.listedSpecies),
      photos: data.photos || null,
    }
  }

  const handleCreateHabitat = async (data: Partial<HabitatFormType>) => {
    const fields = buildHabitatFields(data)
    const areaHectares = drawnBoundary
      ? calculateAreaHectares(drawnBoundary.geometry)
      : data.areaHectares || 0
    try {
      await createHabitat.mutateAsync({
        project_id: project.id,
        site_id: selectedSite?.id ?? null,
        ...fields,
        boundary: drawnBoundary ? (drawnBoundary.geometry as unknown as Json) : null,
        area_hectares: areaHectares,
      })
      toast({
        title: 'Habitat created',
        description: `${fields.fossitt_name} habitat polygon saved.`,
      })
      setShowHabitatForm(false)
      setDrawnBoundary(null)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error creating habitat',
        description: 'Failed to save the habitat polygon.',
      })
    }
  }

  const handleEditHabitat = async (data: Partial<HabitatFormType>) => {
    if (!editingHabitat) return
    try {
      await updateHabitat.mutateAsync({
        habitatId: editingHabitat.id,
        projectId: project.id,
        updates: buildHabitatFields(data),
      })
      toast({ title: 'Habitat updated', description: 'Habitat polygon has been updated.' })
      setEditingHabitat(null)
      setShowHabitatForm(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error updating habitat',
        description: 'Failed to update the habitat polygon.',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingHabitat) return
    try {
      await deleteHabitat.mutateAsync({ habitatId: deletingHabitat.id, projectId: project.id })
      toast({ title: 'Habitat deleted', description: 'Habitat polygon has been removed.' })
      if (selectedHabitat?.id === deletingHabitat.id) setSelectedHabitat(null)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error deleting habitat',
        description: 'Failed to delete the habitat polygon.',
      })
    } finally {
      setDeletingHabitat(null)
    }
  }

  // Pre-compute initial data for the habitat form dialog
  const arrayToCSV = (val: unknown): string | undefined =>
    Array.isArray(val) ? val.join(', ') : (val as string) || undefined

  const habitatFormInitialData = React.useMemo(() => {
    if (editingHabitat) {
      return {
        fossittCode: editingHabitat.fossitt_code,
        fossittName: editingHabitat.fossitt_name,
        condition: editingHabitat.condition as HabitatFormType['condition'],
        notes: editingHabitat.notes || undefined,
        areaHectares: editingHabitat.area_hectares || undefined,
        euAnnexCode: editingHabitat.eu_annex_code || undefined,
        evaluation: editingHabitat.evaluation as HabitatFormType['evaluation'],
        threats: arrayToCSV(editingHabitat.threats),
        surveyMethod: editingHabitat.survey_method || undefined,
        listedSpecies: arrayToCSV(editingHabitat.listed_species),
        photos: (editingHabitat.photos as string[]) || undefined,
      }
    }
    if (drawnBoundary) return { areaHectares: calculateAreaHectares(drawnBoundary.geometry) }
    return undefined
  }, [editingHabitat, drawnBoundary])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Compact toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-1.5">
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold">{savedFindings.length}</span>
            <span className="text-muted-foreground text-xs">Findings</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold">{filteredHabitats.length}</span>
            <span className="text-muted-foreground text-xs">Habitats</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold">
              {(habitatStats?.totalArea || 0).toFixed(1)} ha
            </span>
            <span className="text-muted-foreground text-xs">Total</span>
          </div>
        </div>
        <SiteSelector
          projectId={project.id}
          stepKey="field-research"
          onSiteChange={setSelectedSite}
          showAllOption
        />
      </div>

      {!projectBoundary && (
        <Alert variant="destructive" className="mx-6 mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Project Boundary</AlertTitle>
          <AlertDescription>
            Please complete Step 1 (GIS Mapping) to define a project boundary before mapping
            habitats.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content - Stacked Layout: map on top, list below.
          The container scrolls so both map and list can have generous fixed
          heights that exceed the viewport. Horizontal padding leaves gutter
          space for mouse-wheel scroll (map intercepts wheel events over
          itself, so the user needs clear area beside it). */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-10 py-2">
        <div className="h-[62vh] min-h-[440px] shrink-0 overflow-hidden rounded-lg border">
          <ProjectMapWithDraw
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={projectCenter ? 14 : 7}
            boundary={projectBoundary}
            onBoundaryChange={handleBoundaryChange}
            editable
            findings={findingMarkers}
            flyToLocation={flyToLocation ?? undefined}
            habitatPolygons={habitatPolygonOverlays}
            selectedHabitatId={selectedHabitat?.id}
            onHabitatClick={(id) => setSelectedHabitat(handleHabitatMapClick(id))}
            allowMultipleDrawings
            visibleLayers={npwsVisibleLayers}
          />
        </div>

        <div className="h-[440px] shrink-0">
          <HabitatListPanel
            projectId={project.id}
            filteredHabitats={filteredHabitats}
            savedFindings={savedFindings}
            findingsByType={findingsByType}
            findingsLoading={findingsLoading}
            selectedHabitat={selectedHabitat}
            visibleFindingGroups={visibleFindingGroups}
            toggleFindingGroup={toggleFindingGroup}
            onSelectHabitat={setSelectedHabitat}
            onEditHabitat={(habitat) => {
              setEditingHabitat(habitat)
              setShowHabitatForm(true)
            }}
            onDeleteHabitat={setDeletingHabitat}
            onAddHabitat={() => {
              setEditingHabitat(null)
              setDrawnBoundary(null)
              setShowHabitatForm(true)
            }}
            onFindingClick={handleFindingClick}
          />
        </div>
      </div>

      <HabitatForm
        open={showHabitatForm}
        onOpenChange={(open) => {
          setShowHabitatForm(open)
          if (!open) {
            setEditingHabitat(null)
            setDrawnBoundary(null)
          }
        }}
        onSubmit={editingHabitat ? handleEditHabitat : handleCreateHabitat}
        initialData={habitatFormInitialData}
        projectId={project.id}
      />

      <AlertDialog
        open={!!deletingHabitat}
        onOpenChange={(open) => !open && setDeletingHabitat(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habitat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingHabitat?.fossitt_name}</strong> (
              {deletingHabitat?.fossitt_code})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
