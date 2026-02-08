'use client'

import * as React from 'react'
import { Loader2, Check, AlertCircle, Trash2, Pencil } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
          {/* Inline Stats */}
          <div className="hidden items-center gap-4 border-l pl-4 md:flex">
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

      {/* Main Content - Full Height Split View */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        {/* Map Section */}
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3">
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
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
            </CardContent>
          </Card>
        </div>

        {/* Habitat List - Scrollable */}
        <div className="flex min-h-0 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Mapped Habitats</CardTitle>
                <Badge variant="secondary">{habitats.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto p-3 pt-0">
              {habitats.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                  No habitats mapped yet.
                  <br />
                  Draw a polygon on the map to add a habitat.
                </div>
              ) : (
                <div className="space-y-2">
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
              )}
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
