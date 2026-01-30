'use client'

import * as React from 'react'
import { Plus, Loader2, Check, AlertCircle, Info, Trash2, Eye, Pencil } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  useHabitats,
  useHabitatStats,
  useCreateHabitat,
  useUpdateHabitat,
  useDeleteHabitat,
  useCompleteWorkflowStep,
} from '@/hooks/use-project-data'
import {
  HabitatForm,
  type HabitatPolygon as HabitatFormType,
} from '@/components/field-surveys/habitat-form'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import type { Project, WorkflowStep, HabitatPolygon, Json } from '@/types/database'

// Dynamic import for map with draw controls
const ProjectMapWithDraw = dynamic(
  () => import('@/components/maps/project-map-with-draw').then((mod) => mod.ProjectMapWithDraw),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-[500px] items-center justify-center rounded-lg">
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
  userId,
  onComplete,
}: HabitatMappingStepProps) {
  const { toast } = useToast()
  const [showHabitatForm, setShowHabitatForm] = React.useState(false)
  const [editingHabitat, setEditingHabitat] = React.useState<HabitatPolygon | null>(null)
  const [drawnBoundary, setDrawnBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    null
  )
  const [selectedHabitat, setSelectedHabitat] = React.useState<HabitatPolygon | null>(null)

  // React Query hooks
  const { data: habitats = [], isLoading } = useHabitats(project.id)
  const { data: habitatStats } = useHabitatStats(project.id)
  const createHabitat = useCreateHabitat()
  const updateHabitat = useUpdateHabitat()
  const deleteHabitat = useDeleteHabitat()
  const completeStep = useCompleteWorkflowStep()

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
    if (!drawnBoundary) {
      toast({
        variant: 'destructive',
        title: 'No boundary drawn',
        description: 'Please draw a polygon on the map first.',
      })
      return
    }

    const fossittInfo = getHabitatByCode(data.fossittCode!)
    const areaHectares = calculateAreaHectares(drawnBoundary.geometry)

    try {
      await createHabitat.mutateAsync({
        project_id: project.id,
        fossitt_code: data.fossittCode!,
        fossitt_name: fossittInfo?.name || data.fossittCode!,
        boundary: drawnBoundary.geometry as unknown as Json,
        area_hectares: areaHectares,
        condition: data.condition!,
        notes: data.notes || null,
      })

      toast({
        title: 'Habitat created',
        description: `${fossittInfo?.name || data.fossittCode} habitat polygon saved.`,
      })

      setShowHabitatForm(false)
      setDrawnBoundary(null)
    } catch (error) {
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
        },
      })

      toast({
        title: 'Habitat updated',
        description: 'Habitat polygon has been updated.',
      })

      setEditingHabitat(null)
      setShowHabitatForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating habitat',
        description: 'Failed to update the habitat polygon.',
      })
    }
  }

  // Handle deleting a habitat
  const handleDeleteHabitat = async (habitat: HabitatPolygon) => {
    try {
      await deleteHabitat.mutateAsync(habitat.id)

      toast({
        title: 'Habitat deleted',
        description: 'Habitat polygon has been removed.',
      })

      if (selectedHabitat?.id === habitat.id) {
        setSelectedHabitat(null)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting habitat',
        description: 'Failed to delete the habitat polygon.',
      })
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
    } catch (error) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 5: Habitat Mapping</h2>
          <p className="text-muted-foreground">
            Map habitat polygons using Fossitt classification codes
          </p>
        </div>
        <Badge
          variant={
            isComplete ? 'default' : workflowStep.status === 'in_progress' ? 'secondary' : 'outline'
          }
        >
          {isComplete
            ? 'Completed'
            : workflowStep.status === 'in_progress'
              ? 'In Progress'
              : 'Pending'}
        </Badge>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Habitat Mapping Guide</AlertTitle>
        <AlertDescription>
          Draw polygons on the map to delineate habitat areas. For each polygon, select the
          appropriate Fossitt habitat classification code and assess the habitat condition. The area
          is calculated automatically based on the polygon shape.
        </AlertDescription>
      </Alert>

      {!projectBoundary && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Project Boundary</AlertTitle>
          <AlertDescription>
            Please complete Step 1 (GIS Mapping) to define a project boundary before mapping
            habitats.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Habitats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{habitatStats?.total || habitats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(habitatStats?.totalArea || 0).toFixed(2)} ha</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Habitat Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {habitatStats?.byFossittCode.length ||
                new Set(habitats.map((h) => h.fossitt_code)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Good+ Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {habitats.filter((h) => h.condition === 'excellent' || h.condition === 'good').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Split View */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Habitat Map</CardTitle>
                  <CardDescription>Draw polygons to delineate habitat boundaries</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-hidden rounded-lg border">
                <ProjectMapWithDraw
                  center={
                    projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]
                  }
                  zoom={projectCenter ? 14 : 7}
                  boundary={projectBoundary}
                  onBoundaryChange={handleBoundaryChange}
                  editable={!isComplete}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Use the polygon tool (top right of map) to draw habitat boundaries. Click to add
                points, double-click to complete.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Habitat List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mapped Habitats</CardTitle>
                <Badge variant="secondary">{habitats.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {habitats.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No habitats mapped yet. Draw a polygon on the map to add a habitat.
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
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
                        onDelete={() => handleDeleteHabitat(habitat)}
                        disabled={isComplete}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Condition Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(CONDITION_LABELS).map(([key, { label, color }]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div className={`h-3 w-3 rounded-full ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Step Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Project boundary defined</span>
                  {projectBoundary ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Habitats mapped</span>
                  {habitats.length > 0 ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">{habitats.length} habitats</span>
                    </span>
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>

              <Progress
                value={isComplete ? 100 : projectBoundary ? (habitats.length > 0 ? 75 : 50) : 25}
              />

              <Button
                onClick={handleComplete}
                disabled={!canComplete || completeStep.isPending}
                className="w-full"
              >
                {completeStep.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isComplete ? 'Completed' : 'Complete Step & Continue'}
              </Button>
            </CardContent>
          </Card>
        </div>
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
              }
            : drawnBoundary
              ? {
                  areaHectares: calculateAreaHectares(drawnBoundary.geometry),
                }
              : undefined
        }
        projectId={project.id}
      />
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
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
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
          </div>
          <h4 className="mt-1 truncate text-sm font-medium">{habitat.fossitt_name}</h4>
          <p className="text-muted-foreground text-xs">{habitat.area_hectares?.toFixed(2)} ha</p>
        </div>
        {!disabled && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
