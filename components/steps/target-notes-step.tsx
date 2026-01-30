'use client'

import * as React from 'react'
import { Plus, Loader2, Check, AlertCircle, Info, Trash2, Eye, MapPin, Shield } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  useObservations,
  useObservationStats,
  useSurveys,
  useCreateObservation,
  useUpdateObservation,
  useDeleteObservation,
  useCompleteWorkflowStep,
} from '@/hooks/use-project-data'
import {
  SpeciesObservationForm,
  type SpeciesObservation as ObservationFormType,
} from '@/components/field-surveys/species-observation-form'
import { ProjectMap } from '@/components/maps/project-map'
import type { Project, WorkflowStep, SpeciesObservation, Json } from '@/types/database'

// Dynamic import for map
const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-[400px] items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface TargetNotesStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

const TAXON_LABELS: Record<string, string> = {
  mammals: 'Mammals',
  birds: 'Birds',
  reptiles: 'Reptiles',
  amphibians: 'Amphibians',
  fish: 'Fish',
  invertebrates: 'Invertebrates',
  plants: 'Plants',
  fungi: 'Fungi',
  other: 'Other',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
}

export function TargetNotesStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: TargetNotesStepProps) {
  const { toast } = useToast()
  const [showObservationForm, setShowObservationForm] = React.useState(false)
  const [editingObservation, setEditingObservation] = React.useState<SpeciesObservation | null>(
    null
  )
  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string>('')
  const [activeTab, setActiveTab] = React.useState('all')
  const [selectedObservation, setSelectedObservation] = React.useState<SpeciesObservation | null>(
    null
  )

  // React Query hooks
  const { data: surveys = [] } = useSurveys(project.id)
  const { data: observations = [], isLoading } = useObservations(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const createObservation = useCreateObservation()
  const updateObservation = useUpdateObservation()
  const deleteObservation = useDeleteObservation()
  const completeStep = useCompleteWorkflowStep()

  // Filter observations by survey if selected
  const filteredObservations = React.useMemo(() => {
    if (!selectedSurveyId) return observations
    return observations.filter((o) => o.survey_id === selectedSurveyId)
  }, [observations, selectedSurveyId])

  // Group observations by taxon group
  const observationsByTaxon = React.useMemo(() => {
    const groups: Record<string, SpeciesObservation[]> = {}
    for (const obs of filteredObservations) {
      const taxon = obs.taxon_group || 'other'
      if (!groups[taxon]) groups[taxon] = []
      groups[taxon].push(obs)
    }
    return groups
  }, [filteredObservations])

  // Project boundary and center
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  // Handle creating an observation
  const handleCreateObservation = async (data: Partial<ObservationFormType>) => {
    if (!selectedSurveyId && surveys.length > 0) {
      toast({
        variant: 'destructive',
        title: 'No survey selected',
        description: 'Please select a survey to add the observation to.',
      })
      return
    }

    const surveyId = selectedSurveyId || surveys[0]?.id

    if (!surveyId) {
      toast({
        variant: 'destructive',
        title: 'No surveys available',
        description: 'Please create a survey first in Field Survey Planning.',
      })
      return
    }

    try {
      const locationData = data.location
        ? {
            type: 'Point',
            coordinates: [data.location.lng, data.location.lat],
          }
        : null

      await createObservation.mutateAsync({
        survey_id: surveyId,
        species_name_scientific: data.speciesNameScientific!,
        species_name_common: data.speciesNameCommon || null,
        taxon_group: data.taxonGroup || null,
        count: data.count || null,
        abundance_dafor: data.abundanceDafor || null,
        evidence_type: data.evidenceType || null,
        behavior_notes: data.behaviorNotes || null,
        location: locationData as unknown as Json,
        gps_accuracy: data.gpsAccuracy || null,
        is_protected: data.isProtected || false,
        designation: data.designation || null,
        confidence_level: (data.confidenceLevel as 'high' | 'medium' | 'low') || 'medium',
        needs_verification: data.needsVerification || false,
      })

      toast({
        title: 'Observation recorded',
        description: `${data.speciesNameScientific} observation saved.`,
      })

      setShowObservationForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error recording observation',
        description: 'Failed to save the observation.',
      })
    }
  }

  // Handle editing an observation
  const handleEditObservation = async (data: Partial<ObservationFormType>) => {
    if (!editingObservation) return

    try {
      const locationData = data.location
        ? {
            type: 'Point',
            coordinates: [data.location.lng, data.location.lat],
          }
        : null

      await updateObservation.mutateAsync({
        observationId: editingObservation.id,
        updates: {
          species_name_scientific: data.speciesNameScientific!,
          species_name_common: data.speciesNameCommon || null,
          taxon_group: data.taxonGroup || null,
          count: data.count || null,
          abundance_dafor: data.abundanceDafor || null,
          evidence_type: data.evidenceType || null,
          behavior_notes: data.behaviorNotes || null,
          location: locationData as unknown as Json,
          gps_accuracy: data.gpsAccuracy || null,
          is_protected: data.isProtected || false,
          designation: data.designation || null,
          confidence_level: (data.confidenceLevel as 'high' | 'medium' | 'low') || 'medium',
          needs_verification: data.needsVerification || false,
        },
      })

      toast({
        title: 'Observation updated',
        description: 'Species observation has been updated.',
      })

      setEditingObservation(null)
      setShowObservationForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating observation',
        description: 'Failed to update the observation.',
      })
    }
  }

  // Handle deleting an observation
  const handleDeleteObservation = async (observation: SpeciesObservation) => {
    try {
      await deleteObservation.mutateAsync(observation.id)

      toast({
        title: 'Observation deleted',
        description: 'Species observation has been removed.',
      })

      if (selectedObservation?.id === observation.id) {
        setSelectedObservation(null)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting observation',
        description: 'Failed to delete the observation.',
      })
    }
  }

  // Complete workflow step
  const handleComplete = async () => {
    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Target Notes step has been completed. Moving to Data Analysis.',
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
  const canComplete = !isComplete

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
          <h2 className="text-2xl font-bold">Step 6: Target Notes</h2>
          <p className="text-muted-foreground">Record species observations and ecological notes</p>
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
        <AlertTitle>Recording Observations</AlertTitle>
        <AlertDescription>
          Document species encountered during field surveys. Include location data, evidence type,
          and confidence level. Protected species will be flagged automatically for special
          consideration in the assessment.
        </AlertDescription>
      </Alert>

      {surveys.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Surveys Available</AlertTitle>
          <AlertDescription>
            Please complete Step 4 (Field Survey Planning) and create at least one survey before
            recording observations.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {observationStats?.total || filteredObservations.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Protected Species</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {observationStats?.protected ||
                filteredObservations.filter((o) => o.is_protected).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {observationStats?.needsVerification ||
                filteredObservations.filter((o) => o.needs_verification).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxon Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(observationsByTaxon).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredObservations.filter((o) => o.confidence_level === 'high').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survey Filter and Action */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Survey:</span>
          <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All surveys" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All surveys</SelectItem>
              {surveys.map((survey) => (
                <SelectItem key={survey.id} value={survey.id}>
                  {survey.survey_type} - {new Date(survey.survey_date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingObservation(null)
            setShowObservationForm(true)
          }}
          disabled={isComplete || surveys.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Observation
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Observation Map</CardTitle>
            <CardDescription>Species observation locations within the project area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-hidden rounded-lg border">
              <DynamicProjectMap
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
                zoom={projectCenter ? 14 : 7}
                boundary={projectBoundary}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observation List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Species Observations</CardTitle>
              <Badge variant="secondary">{filteredObservations.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="all">All ({filteredObservations.length})</TabsTrigger>
                {Object.entries(observationsByTaxon)
                  .slice(0, 4)
                  .map(([taxon, obs]) => (
                    <TabsTrigger key={taxon} value={taxon}>
                      {TAXON_LABELS[taxon] || taxon} ({obs.length})
                    </TabsTrigger>
                  ))}
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[350px]">
                  {filteredObservations.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                      No observations recorded yet. Click "Add Observation" to record species
                      sightings.
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredObservations.map((obs) => (
                        <ObservationListItem
                          key={obs.id}
                          observation={obs}
                          isSelected={selectedObservation?.id === obs.id}
                          onSelect={() => setSelectedObservation(obs)}
                          onEdit={() => {
                            setEditingObservation(obs)
                            setShowObservationForm(true)
                          }}
                          onDelete={() => handleDeleteObservation(obs)}
                          disabled={isComplete}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {Object.entries(observationsByTaxon).map(([taxon, taxonObs]) => (
                <TabsContent key={taxon} value={taxon} className="mt-4">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2 pr-4">
                      {taxonObs.map((obs) => (
                        <ObservationListItem
                          key={obs.id}
                          observation={obs}
                          isSelected={selectedObservation?.id === obs.id}
                          onSelect={() => setSelectedObservation(obs)}
                          onEdit={() => {
                            setEditingObservation(obs)
                            setShowObservationForm(true)
                          }}
                          onDelete={() => handleDeleteObservation(obs)}
                          disabled={isComplete}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Progress Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Surveys available</span>
              {surveys.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{surveys.length} surveys</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Observations recorded</span>
              {observations.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{observations.length} observations</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </div>

          <Progress
            value={isComplete ? 100 : surveys.length > 0 ? (observations.length > 0 ? 75 : 50) : 25}
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

      {/* Observation Form Dialog */}
      <SpeciesObservationForm
        open={showObservationForm}
        onOpenChange={(open) => {
          setShowObservationForm(open)
          if (!open) setEditingObservation(null)
        }}
        onSubmit={editingObservation ? handleEditObservation : handleCreateObservation}
        initialData={
          editingObservation
            ? {
                speciesNameScientific: editingObservation.species_name_scientific,
                speciesNameCommon: editingObservation.species_name_common || undefined,
                taxonGroup: editingObservation.taxon_group as ObservationFormType['taxonGroup'],
                count: editingObservation.count || undefined,
                abundanceDafor:
                  editingObservation.abundance_dafor as ObservationFormType['abundanceDafor'],
                evidenceType:
                  editingObservation.evidence_type as ObservationFormType['evidenceType'],
                behaviorNotes: editingObservation.behavior_notes || undefined,
                isProtected: editingObservation.is_protected,
                designation: editingObservation.designation || undefined,
                confidenceLevel:
                  editingObservation.confidence_level as ObservationFormType['confidenceLevel'],
                needsVerification: editingObservation.needs_verification,
              }
            : undefined
        }
        surveyId={selectedSurveyId || surveys[0]?.id || ''}
      />
    </div>
  )
}

// Observation list item component
function ObservationListItem({
  observation,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled,
}: {
  observation: SpeciesObservation
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const confidenceColor = CONFIDENCE_COLORS[observation.confidence_level] || 'bg-gray-400'

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
            <Badge variant="outline" className="text-xs">
              {TAXON_LABELS[observation.taxon_group || 'other'] || observation.taxon_group}
            </Badge>
            {observation.is_protected && (
              <Badge variant="destructive" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Protected
              </Badge>
            )}
            <div
              className={`h-2.5 w-2.5 rounded-full ${confidenceColor}`}
              title={`Confidence: ${observation.confidence_level}`}
            />
          </div>
          <h4 className="mt-1 truncate text-sm font-medium italic">
            {observation.species_name_scientific}
          </h4>
          {observation.species_name_common && (
            <p className="text-muted-foreground truncate text-xs">
              {observation.species_name_common}
            </p>
          )}
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            {observation.count && <span>Count: {observation.count}</span>}
            {observation.evidence_type && <span>• {observation.evidence_type}</span>}
          </div>
        </div>
        {!disabled && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Eye className="h-3.5 w-3.5" />
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
