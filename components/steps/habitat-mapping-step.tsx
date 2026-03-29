'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Pencil,
  MapPin,
  TreePine,
  Fish,
  Shield,
  Plus,
  Pentagon,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  useHabitats,
  useHabitatStats,
  useCreateHabitat,
  useUpdateHabitat,
  useDeleteHabitat,
} from '@/hooks/queries/use-habitat-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import {
  HabitatForm,
  type HabitatPolygon as HabitatFormType,
} from '@/components/field-surveys/habitat-form'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  Project,
  WorkflowStep,
  HabitatPolygon,
  DeskResearchFinding,
  Json,
} from '@/types/database'

import { SiteSelector } from '@/components/project/site-selector'
import type { FindingMarker, HabitatPolygonOverlay } from '@/components/maps/map-types'

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
  onComplete?: () => void
}

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'bg-green-600' },
  good: { label: 'Good', color: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'bg-amber-500' },
  poor: { label: 'Poor', color: 'bg-orange-500' },
  bad: { label: 'Bad', color: 'bg-red-500' },
}

export function HabitatMappingStep({
  project,
  workflowStep,
  userId: _userId,
  onComplete,
}: HabitatMappingStepProps) {
  const { toast } = useToast()
  const [showHabitatForm, setShowHabitatForm] = React.useState(false)
  const [editingHabitat, setEditingHabitat] = React.useState<HabitatPolygon | null>(null)
  const [deletingHabitat, setDeletingHabitat] = React.useState<HabitatPolygon | null>(null)
  const [drawnBoundary, setDrawnBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    null
  )
  const [selectedHabitat, setSelectedHabitat] = React.useState<HabitatPolygon | null>(null)
  const [flyToLocation, setFlyToLocation] = React.useState<{
    center: [number, number]
    zoom: number
    key: string
  } | null>(null)

  // Persist active tab in sessionStorage
  const tabCacheKey = `habitat-mapping-tab-${project.id}`
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(tabCacheKey)
      if (cached === 'habitats' || cached === 'findings') return cached
    }
    return 'habitats'
  })

  React.useEffect(() => {
    sessionStorage.setItem(tabCacheKey, activeTab)
  }, [activeTab, tabCacheKey])

  // Visibility toggles for finding groups on the map
  const [visibleFindingGroups, setVisibleFindingGroups] = React.useState<Set<string>>(
    () => new Set(['designated_site', 'species_record', 'aquatic'])
  )

  const toggleFindingGroup = React.useCallback((group: string) => {
    setVisibleFindingGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  // React Query hooks
  const { data: habitats = [], isLoading } = useHabitats(project.id)
  const { data: habitatStats } = useHabitatStats(project.id)
  const { data: savedFindings = [], isLoading: findingsLoading } = useSavedFindings(project.id)
  const createHabitat = useCreateHabitat()
  const updateHabitat = useUpdateHabitat()
  const deleteHabitat = useDeleteHabitat()
  const completeStep = useCompleteWorkflowStep()

  const findingsByType = React.useMemo(() => groupFindingsByType(savedFindings), [savedFindings])

  // Convert findings to map markers (filtered by visibility toggles)
  const findingMarkers: FindingMarker[] = React.useMemo(() => {
    return savedFindings
      .filter((f) => {
        if (!f.location) return false
        // Check visibility toggle
        const group =
          f.data_type === 'water_quality' || f.data_type === 'catchment' ? 'aquatic' : f.data_type
        return visibleFindingGroups.has(group)
      })
      .map((f) => ({
        id: f.id,
        title: f.title,
        dataType: f.data_type,
        location: f.location as { coordinates: [number, number] } | null,
        isProtected: f.is_protected ?? undefined,
        source: f.source,
      }))
  }, [savedFindings, visibleFindingGroups])

  // NPWS layers to show on map when designated sites are visible
  const npwsVisibleLayers = React.useMemo(() => {
    if (!visibleFindingGroups.has('designated_site')) return []
    return ['sac', 'spa', 'nha', 'pnha']
  }, [visibleFindingGroups])

  // Handle clicking a finding - fly to its location on the map
  const handleFindingClick = React.useCallback((finding: DeskResearchFinding) => {
    const location = finding.location as { coordinates: [number, number] } | null
    if (
      location?.coordinates &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length >= 2
    ) {
      const lng = Number(location.coordinates[0])
      const lat = Number(location.coordinates[1])
      if (!isNaN(lat) && !isNaN(lng)) {
        setFlyToLocation({
          center: [lat, lng],
          zoom: 15,
          key: `finding-${finding.id}-${Date.now()}`,
        })
      }
    }
  }, [])

  // Convert saved habitats to map overlay format
  const habitatPolygonOverlays: HabitatPolygonOverlay[] = React.useMemo(() => {
    return habitats
      .filter((h) => h.boundary != null)
      .map((h) => {
        const fossittInfo = getHabitatByCode(h.fossitt_code)
        return {
          id: h.id,
          geometry: h.boundary as GeoJSON.Geometry,
          fossittCode: h.fossitt_code,
          fossittName: h.fossitt_name,
          condition: h.condition,
          color: fossittInfo?.color,
        }
      })
  }, [habitats])

  // Handle clicking a habitat polygon on the map
  const handleHabitatMapClick = React.useCallback(
    (id: string) => {
      const habitat = habitats.find((h) => h.id === id) ?? null
      setSelectedHabitat(habitat)
    },
    [habitats]
  )

  // Project boundary
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  // Handle boundary drawn on map
  const handleBoundaryChange = (features: GeoJSON.FeatureCollection) => {
    if (features.features.length > 0) {
      const feature = features.features[0] as GeoJSON.Feature<GeoJSON.Polygon>
      setDrawnBoundary(feature)
      // Open the habitat form when a polygon is drawn
      setShowHabitatForm(true)
    }
  }

  // Handle creating a habitat
  const handleCreateHabitat = async (data: Partial<HabitatFormType>) => {
    const fossittInfo = getHabitatByCode(data.fossittCode!)
    const areaHectares = drawnBoundary
      ? calculateAreaHectares(drawnBoundary.geometry)
      : data.areaHectares || 0

    try {
      await createHabitat.mutateAsync({
        project_id: project.id,
        fossitt_code: data.fossittCode!,
        fossitt_name: fossittInfo?.name || data.fossittCode!,
        boundary: drawnBoundary ? (drawnBoundary.geometry as unknown as Json) : null,
        area_hectares: areaHectares,
        condition: data.condition!,
        notes: data.notes || null,
        eu_annex_code: data.euAnnexCode || null,
        evaluation: data.evaluation || null,
        threats: data.threats
          ? data.threats
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : null,
        survey_method: data.surveyMethod || null,
        listed_species: data.listedSpecies
          ? data.listedSpecies
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : null,
        photos: data.photos || null,
      })

      toast({
        title: 'Habitat created',
        description: `${fossittInfo?.name || data.fossittCode} habitat polygon saved.`,
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

  // Handle editing a habitat
  const handleEditHabitat = async (data: Partial<HabitatFormType>) => {
    if (!editingHabitat) return

    const fossittInfo = getHabitatByCode(data.fossittCode!)

    try {
      await updateHabitat.mutateAsync({
        habitatId: editingHabitat.id,
        updates: {
          fossitt_code: data.fossittCode!,
          fossitt_name: fossittInfo?.name || data.fossittCode!,
          condition: data.condition!,
          notes: data.notes || null,
          eu_annex_code: data.euAnnexCode || null,
          evaluation: data.evaluation || null,
          threats: data.threats
            ? data.threats
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : null,
          survey_method: data.surveyMethod || null,
          listed_species: data.listedSpecies
            ? data.listedSpecies
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : null,
          photos: data.photos || null,
        },
      })

      toast({
        title: 'Habitat updated',
        description: 'Habitat polygon has been updated.',
      })

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

  // Handle confirming habitat deletion
  const handleConfirmDelete = async () => {
    if (!deletingHabitat) return
    try {
      await deleteHabitat.mutateAsync(deletingHabitat.id)

      toast({
        title: 'Habitat deleted',
        description: 'Habitat polygon has been removed.',
      })

      if (selectedHabitat?.id === deletingHabitat.id) {
        setSelectedHabitat(null)
      }
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

  // Complete workflow step
  const handleComplete = async () => {
    if (habitats.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'Please map at least one habitat polygon before completing this step.',
      })
      return
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Habitat Mapping step has been completed. Moving to Target Notes.',
      })

      onComplete?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const canComplete = habitats.length > 0 && !isComplete

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Step 5: Habitat Mapping</h2>
            <p className="text-muted-foreground text-sm">
              Draw polygons on the map, then select Fossitt code and condition
            </p>
          </div>
          <SiteSelector projectId={project.id} stepKey="habitat-mapping" onSiteChange={() => {}} />
          {/* Inline Stats */}
          <div className="hidden items-center gap-4 border-l pl-4 md:flex">
            <div className="text-center">
              <div className="text-lg font-bold">{savedFindings.length}</div>
              <div className="text-muted-foreground text-xs">Findings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{habitats.length}</div>
              <div className="text-muted-foreground text-xs">Habitats</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {(habitatStats?.totalArea || 0).toFixed(1)} ha
              </div>
              <div className="text-muted-foreground text-xs">Total Area</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isComplete
                ? 'default'
                : workflowStep.status === 'in_progress'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {isComplete
              ? 'Completed'
              : workflowStep.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
          </Badge>
          <Button
            onClick={handleComplete}
            disabled={!canComplete || completeStep.isPending}
            size="sm"
          >
            {completeStep.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Complete Step
          </Button>
        </div>
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

      {/* Main Content - Side-by-side Layout: Panel left, Map right */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row">
        {/* Left Panel - Tabbed Interface with Add Habitat button */}
        <Card className="flex shrink-0 flex-col md:w-[38%]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 pt-3">
              <TabsList className="grid w-auto shrink-0 grid-cols-2">
                <TabsTrigger value="habitats" className="text-xs">
                  Habitats ({habitats.length})
                </TabsTrigger>
                <TabsTrigger value="findings" className="text-xs">
                  Desk Research ({savedFindings.length})
                </TabsTrigger>
              </TabsList>
              <Button
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => {
                  setEditingHabitat(null)
                  setDrawnBoundary(null)
                  setShowHabitatForm(true)
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Habitat
              </Button>
            </div>

            {/* Keep both tabs mounted, toggle visibility via CSS */}
            <div className="relative min-h-0 flex-1">
              {/* Mapped Habitats Tab */}
              <div
                className={cn(
                  'absolute inset-0',
                  activeTab === 'habitats' ? 'visible z-10' : 'invisible z-0'
                )}
              >
                <CardContent className="h-full p-3">
                  {habitats.length === 0 ? (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                      No habitats mapped yet. Click &quot;Add Habitat&quot; or draw a polygon on the
                      map below.
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-3">
                        {habitats.map((habitat) => (
                          <HabitatListItem
                            key={habitat.id}
                            habitat={habitat}
                            isSelected={selectedHabitat?.id === habitat.id}
                            onSelect={() => setSelectedHabitat(habitat)}
                            onEdit={() => {
                              setEditingHabitat(habitat)
                              setShowHabitatForm(true)
                            }}
                            onDelete={() => setDeletingHabitat(habitat)}
                            disabled={false}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </div>

              {/* Desk Research Findings Tab */}
              <div
                className={cn(
                  'absolute inset-0',
                  activeTab === 'findings' ? 'visible z-10' : 'invisible z-0'
                )}
              >
                <CardContent className="h-full p-3">
                  {findingsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : savedFindings.length === 0 ? (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                      No saved findings from Data Gathering. Complete Step 2 first.
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="space-y-4 pr-3">
                        {/* Designated Sites */}
                        {findingsByType.designated_site.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Shield className="text-primary h-4 w-4" />
                              <span className="flex-1 text-sm font-medium">
                                Designated Sites ({findingsByType.designated_site.length})
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                                onClick={() => toggleFindingGroup('designated_site')}
                                title={
                                  visibleFindingGroups.has('designated_site')
                                    ? 'Hide on map'
                                    : 'Show on map'
                                }
                              >
                                {visibleFindingGroups.has('designated_site') ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {findingsByType.designated_site.map((finding) => (
                                <FindingItem
                                  key={finding.id}
                                  finding={finding}
                                  onClick={() => handleFindingClick(finding)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Species Records */}
                        {findingsByType.species_record.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <TreePine className="text-primary h-4 w-4" />
                              <span className="flex-1 text-sm font-medium">
                                Species Records ({findingsByType.species_record.length})
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                                onClick={() => toggleFindingGroup('species_record')}
                                title={
                                  visibleFindingGroups.has('species_record')
                                    ? 'Hide on map'
                                    : 'Show on map'
                                }
                              >
                                {visibleFindingGroups.has('species_record') ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {findingsByType.species_record.map((finding) => (
                                <FindingItem
                                  key={finding.id}
                                  finding={finding}
                                  onClick={() => handleFindingClick(finding)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Aquatic Features */}
                        {findingsByType.aquatic.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Fish className="text-primary h-4 w-4" />
                              <span className="flex-1 text-sm font-medium">
                                Aquatic Features ({findingsByType.aquatic.length})
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                                onClick={() => toggleFindingGroup('aquatic')}
                                title={
                                  visibleFindingGroups.has('aquatic')
                                    ? 'Hide on map'
                                    : 'Show on map'
                                }
                              >
                                {visibleFindingGroups.has('aquatic') ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {findingsByType.aquatic.map((finding) => (
                                <FindingItem
                                  key={finding.id}
                                  finding={finding}
                                  onClick={() => handleFindingClick(finding)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Habitats (NLC) */}
                        {findingsByType.habitat.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Layers className="text-primary h-4 w-4" />
                              <span className="flex-1 text-sm font-medium">
                                Habitats ({findingsByType.habitat.length})
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {findingsByType.habitat.map((finding) => (
                                <FindingItem key={finding.id} finding={finding} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </div>
            </div>
          </Tabs>
        </Card>

        {/* Right - Map Section */}
        <Card className="flex min-h-80 flex-1 flex-col md:min-h-0">
          <CardContent className="flex min-h-0 flex-1 flex-col p-3">
            {/* Drawing instructions banner */}
            <div className="bg-muted/60 mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Pentagon className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-muted-foreground">
                Use the <strong className="text-foreground">polygon</strong> or{' '}
                <strong className="text-foreground">rectangle</strong> tool on the map (top-right
                icons) to draw a habitat boundary. The form will open automatically.
              </span>
            </div>
            <div className="min-h-64 flex-1 overflow-hidden rounded-lg border">
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
                onHabitatClick={handleHabitatMapClick}
                allowMultipleDrawings
                visibleLayers={npwsVisibleLayers}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habitat Form Dialog */}
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
        initialData={
          editingHabitat
            ? {
                fossittCode: editingHabitat.fossitt_code,
                fossittName: editingHabitat.fossitt_name,
                condition: editingHabitat.condition as HabitatFormType['condition'],
                notes: editingHabitat.notes || undefined,
                areaHectares: editingHabitat.area_hectares || undefined,
                euAnnexCode: editingHabitat.eu_annex_code || undefined,
                evaluation: editingHabitat.evaluation as HabitatFormType['evaluation'],
                threats: Array.isArray(editingHabitat.threats)
                  ? editingHabitat.threats.join(', ')
                  : editingHabitat.threats || undefined,
                surveyMethod: editingHabitat.survey_method || undefined,
                listedSpecies: Array.isArray(editingHabitat.listed_species)
                  ? editingHabitat.listed_species.join(', ')
                  : editingHabitat.listed_species || undefined,
                photos: (editingHabitat.photos as string[]) || undefined,
              }
            : drawnBoundary
              ? {
                  areaHectares: calculateAreaHectares(drawnBoundary.geometry),
                }
              : undefined
        }
        projectId={project.id}
      />

      {/* Delete Confirmation Dialog */}
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

// Habitat list item component
function HabitatListItem({
  habitat,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled,
}: {
  habitat: HabitatPolygon
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const conditionInfo = CONDITION_LABELS[habitat.condition || 'moderate']
  const fossittInfo = getHabitatByCode(habitat.fossitt_code)

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isSelected ? 'border-primary bg-muted/50' : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="font-mono"
          style={{ borderColor: fossittInfo?.color, color: fossittInfo?.color }}
        >
          {habitat.fossitt_code}
        </Badge>
        <div
          className={`h-2.5 w-2.5 rounded-full ${conditionInfo?.color || 'bg-gray-400'}`}
          title={conditionInfo?.label}
        />
        <span className="text-muted-foreground text-xs">{conditionInfo?.label}</span>
      </div>
      <h4 className="mt-1 truncate text-sm font-medium">{habitat.fossitt_name}</h4>
      <p className="text-muted-foreground text-xs">{habitat.area_hectares?.toFixed(2)} ha</p>
      {!disabled && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 border-blue-200 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

// Finding item component for desk research data
function FindingItem({ finding, onClick }: { finding: DeskResearchFinding; onClick?: () => void }) {
  const rawData = finding.raw_data as Record<string, unknown> | null

  // Get site type for designated sites
  const siteType =
    rawData?.siteType || rawData?.SITETYPE || rawData?.type || finding.source?.toUpperCase()

  // Get distance
  const distance = finding.distance_from_boundary_km

  // Check if finding has a location
  const hasLocation = !!(finding.location as { coordinates?: unknown } | null)?.coordinates

  return (
    <div
      className={`bg-card rounded-md border p-2 text-sm transition-colors ${
        hasLocation ? 'hover:bg-muted/50 cursor-pointer' : ''
      }`}
      onClick={hasLocation ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {siteType && (
              <Badge variant="outline" className="text-[10px]">
                {String(siteType)}
              </Badge>
            )}
            {finding.is_protected && (
              <Badge variant="destructive" className="text-[10px]">
                Protected
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate font-medium">{finding.title}</p>
          {finding.content && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{finding.content}</p>
          )}
        </div>
        {distance !== null && distance !== undefined && (
          <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {distance.toFixed(1)} km
          </div>
        )}
      </div>
    </div>
  )
}
