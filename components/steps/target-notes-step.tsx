'use client'

import * as React from 'react'
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Info,
  Trash2,
  Eye,
  MapPin,
  Shield,
  Target,
  ClipboardList,
} from 'lucide-react'
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
  useTargetNotes,
  useTargetNotesStats,
  useCreateTargetNote,
  useUpdateTargetNote,
  useDeleteTargetNote,
  useVerifyTargetNote,
} from '@/hooks/use-project-data'
import {
  SpeciesObservationForm,
  type SpeciesObservation as ObservationFormType,
} from '@/components/field-surveys/species-observation-form'
import {
  TargetNoteCard,
  TARGET_NOTE_CATEGORIES,
  type TargetNoteCategory,
} from '@/components/field-surveys/target-note-card'
import {
  TargetNoteForm,
  type TargetNoteFormData,
} from '@/components/field-surveys/target-note-form'
import type { Project, WorkflowStep, SpeciesObservation, Json } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

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
  const [activeMainTab, setActiveMainTab] = React.useState<'target-notes' | 'observations'>(
    'target-notes'
  )
  const [showObservationForm, setShowObservationForm] = React.useState(false)
  const [editingObservation, setEditingObservation] = React.useState<SpeciesObservation | null>(
    null
  )
  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string>('')
  const [activeTab, setActiveTab] = React.useState('all')
  const [selectedObservation, setSelectedObservation] = React.useState<SpeciesObservation | null>(
    null
  )

  // Target Notes state
  const [showTargetNoteForm, setShowTargetNoteForm] = React.useState(false)
  const [editingTargetNote, setEditingTargetNote] = React.useState<TargetNoteWithCreator | null>(
    null
  )
  const [selectedTargetNote, setSelectedTargetNote] = React.useState<TargetNoteWithCreator | null>(
    null
  )
  const [activeCategoryTab, setActiveCategoryTab] = React.useState('all')

  // React Query hooks - Observations
  const { data: surveys = [] } = useSurveys(project.id)
  const { data: observations = [], isLoading: observationsLoading } = useObservations(project.id)
  const { data: observationStats } = useObservationStats(project.id)
  const createObservation = useCreateObservation()
  const updateObservation = useUpdateObservation()
  const deleteObservation = useDeleteObservation()

  // React Query hooks - Target Notes
  const { data: targetNotes = [], isLoading: targetNotesLoading } = useTargetNotes(project.id)
  const { data: targetNotesStats } = useTargetNotesStats(project.id)
  const createTargetNote = useCreateTargetNote()
  const updateTargetNote = useUpdateTargetNote()
  const deleteTargetNote = useDeleteTargetNote()
  const verifyTargetNote = useVerifyTargetNote()

  const completeStep = useCompleteWorkflowStep()

  const isLoading = observationsLoading || targetNotesLoading

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

  // Group target notes by category
  const targetNotesByCategory = React.useMemo(() => {
    const groups: Record<string, TargetNoteWithCreator[]> = {}
    for (const note of targetNotes) {
      const category = note.category || 'check_feature'
      if (!groups[category]) groups[category] = []
      groups[category].push(note)
    }
    return groups
  }, [targetNotes])

  // Project boundary and center
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  // Handle creating a target note
  const handleCreateTargetNote = async (data: TargetNoteFormData) => {
    try {
      const locationData = data.location
        ? {
            type: 'Point',
            coordinates: [data.location.lng, data.location.lat],
          }
        : null

      await createTargetNote.mutateAsync({
        project_id: project.id,
        created_by: userId,
        category: data.category,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        location: locationData as unknown as undefined,
        photos: data.photos || null,
      })

      toast({
        title: 'Target note added',
        description: `"${data.title}" has been created.`,
      })

      setShowTargetNoteForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating target note',
        description: 'Failed to create the target note.',
      })
    }
  }

  // Handle editing a target note
  const handleEditTargetNote = async (data: TargetNoteFormData) => {
    if (!editingTargetNote) return

    try {
      const locationData = data.location
        ? {
            type: 'Point',
            coordinates: [data.location.lng, data.location.lat],
          }
        : null

      await updateTargetNote.mutateAsync({
        noteId: editingTargetNote.id,
        updates: {
          category: data.category,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          location: locationData as unknown as undefined,
          photos: data.photos || null,
        },
      })

      toast({
        title: 'Target note updated',
        description: 'Target note has been updated successfully.',
      })

      setEditingTargetNote(null)
      setShowTargetNoteForm(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating target note',
        description: 'Failed to update the target note.',
      })
    }
  }

  // Handle deleting a target note
  const handleDeleteTargetNote = async (note: TargetNoteWithCreator) => {
    try {
      await deleteTargetNote.mutateAsync(note.id)

      toast({
        title: 'Target note deleted',
        description: 'Target note has been removed.',
      })

      if (selectedTargetNote?.id === note.id) {
        setSelectedTargetNote(null)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error deleting target note',
        description: 'Failed to delete the target note.',
      })
    }
  }

  // Handle verifying a target note
  const handleVerifyTargetNote = async (note: TargetNoteWithCreator) => {
    try {
      await verifyTargetNote.mutateAsync({
        noteId: note.id,
        verifierId: userId,
      })

      toast({
        title: 'Target note verified',
        description: 'Target note has been marked as verified.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error verifying target note',
        description: 'Failed to verify the target note.',
      })
    }
  }

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
          <p className="text-muted-foreground">Record field notes and species observations</p>
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
        <AlertTitle>Recording Field Data</AlertTitle>
        <AlertDescription>
          Use <strong>Target Notes</strong> to mark points of interest (access points, features to
          check, habitat notes, etc.) and <strong>Species Observations</strong> to record species
          encountered during surveys.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs
        value={activeMainTab}
        onValueChange={(v) => setActiveMainTab(v as 'target-notes' | 'observations')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="target-notes" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Notes ({targetNotes.length})
          </TabsTrigger>
          <TabsTrigger value="observations" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Species Observations ({observations.length})
          </TabsTrigger>
        </TabsList>

        {/* TARGET NOTES TAB */}
        <TabsContent value="target-notes" className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{targetNotesStats?.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {targetNotesStats?.byPriority?.find((p) => p.priority === 'high')?.count || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {targetNotesStats?.verified || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {targetNotesStats?.pending || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingTargetNote(null)
                setShowTargetNoteForm(true)
              }}
              disabled={isComplete}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Target Note
            </Button>
          </div>

          {/* Target Notes Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Target Notes Map</CardTitle>
                <CardDescription>Locations of field notes within the project area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-hidden rounded-lg border">
                  <DynamicProjectMap
                    center={
                      projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]
                    }
                    zoom={projectCenter ? 14 : 7}
                    boundary={projectBoundary}
                    targetNotes={targetNotes.map((n) => ({
                      id: n.id,
                      category: n.category,
                      title: n.title,
                      description: n.description,
                      priority: n.priority,
                      isVerified: n.is_verified,
                      location: n.location as { coordinates: [number, number] } | null,
                    }))}
                    selectedTargetNote={
                      selectedTargetNote
                        ? {
                            id: selectedTargetNote.id,
                            category: selectedTargetNote.category,
                            title: selectedTargetNote.title,
                            description: selectedTargetNote.description,
                            priority: selectedTargetNote.priority,
                            isVerified: selectedTargetNote.is_verified,
                            location: selectedTargetNote.location as {
                              coordinates: [number, number]
                            } | null,
                          }
                        : null
                    }
                    onTargetNoteClick={(note) => {
                      const found = targetNotes.find((t) => t.id === note.id)
                      if (found) setSelectedTargetNote(found)
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Target Notes List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Target Notes</CardTitle>
                  <Badge variant="secondary">{targetNotes.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeCategoryTab} onValueChange={setActiveCategoryTab}>
                  <TabsList className="flex h-auto flex-wrap gap-1">
                    <TabsTrigger value="all" className="text-xs">
                      All ({targetNotes.length})
                    </TabsTrigger>
                    {Object.entries(TARGET_NOTE_CATEGORIES)
                      .filter(([key]) => targetNotesByCategory[key]?.length)
                      .slice(0, 4)
                      .map(([key, config]) => (
                        <TabsTrigger key={key} value={key} className="text-xs">
                          {config.label} ({targetNotesByCategory[key]?.length || 0})
                        </TabsTrigger>
                      ))}
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-80">
                      {targetNotes.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                          No target notes yet. Click "Add Target Note" to create one.
                        </div>
                      ) : (
                        <div className="space-y-2 pr-4">
                          {targetNotes.map((note) => (
                            <TargetNoteCard
                              key={note.id}
                              note={note}
                              isSelected={selectedTargetNote?.id === note.id}
                              onSelect={() => setSelectedTargetNote(note)}
                              onEdit={() => {
                                setEditingTargetNote(note)
                                setShowTargetNoteForm(true)
                              }}
                              onDelete={() => handleDeleteTargetNote(note)}
                              onVerify={() => handleVerifyTargetNote(note)}
                              disabled={isComplete}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {Object.entries(targetNotesByCategory).map(([category, notes]) => (
                    <TabsContent key={category} value={category} className="mt-4">
                      <ScrollArea className="h-80">
                        <div className="space-y-2 pr-4">
                          {notes.map((note) => (
                            <TargetNoteCard
                              key={note.id}
                              note={note}
                              isSelected={selectedTargetNote?.id === note.id}
                              onSelect={() => setSelectedTargetNote(note)}
                              onEdit={() => {
                                setEditingTargetNote(note)
                                setShowTargetNoteForm(true)
                              }}
                              onDelete={() => handleDeleteTargetNote(note)}
                              onVerify={() => handleVerifyTargetNote(note)}
                              disabled={isComplete}
                              compact
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
        </TabsContent>

        {/* SPECIES OBSERVATIONS TAB */}
        <TabsContent value="observations" className="mt-6 space-y-6">
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
              <Select
                value={selectedSurveyId || 'all'}
                onValueChange={(value) => setSelectedSurveyId(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All surveys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All surveys</SelectItem>
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

          {/* Observations Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Observation Map</CardTitle>
                <CardDescription>
                  Species observation locations within the project area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-hidden rounded-lg border">
                  <DynamicProjectMap
                    center={
                      projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]
                    }
                    zoom={projectCenter ? 14 : 7}
                    boundary={projectBoundary}
                    observationPoints={{
                      type: 'FeatureCollection',
                      features: filteredObservations
                        .filter((o) => o.location)
                        .map((o) => ({
                          type: 'Feature' as const,
                          geometry: o.location as GeoJSON.Point,
                          properties: {
                            id: o.id,
                            name: o.species_name_common || o.species_name_scientific,
                            isProtected: o.is_protected || false,
                          },
                        })),
                    }}
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
                  <TabsList className="flex h-auto flex-wrap gap-1">
                    <TabsTrigger value="all" className="text-xs">
                      All ({filteredObservations.length})
                    </TabsTrigger>
                    {Object.entries(observationsByTaxon)
                      .slice(0, 4)
                      .map(([taxon, obs]) => (
                        <TabsTrigger key={taxon} value={taxon} className="text-xs">
                          {TAXON_LABELS[taxon] || taxon} ({obs.length})
                        </TabsTrigger>
                      ))}
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-80">
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
                      <ScrollArea className="h-80">
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
        </TabsContent>
      </Tabs>

      {/* Progress Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Target notes recorded</span>
              {targetNotes.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{targetNotes.length} notes</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Species observations</span>
              {observations.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{observations.length} observations</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Notes verified</span>
              {(targetNotesStats?.verified || 0) > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">
                    {targetNotesStats?.verified} verified
                  </span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </div>

          <Progress
            value={
              isComplete
                ? 100
                : targetNotes.length > 0 || observations.length > 0
                  ? 75
                  : surveys.length > 0
                    ? 50
                    : 25
            }
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

      {/* Target Note Form Dialog */}
      <TargetNoteForm
        open={showTargetNoteForm}
        onOpenChange={(open) => {
          setShowTargetNoteForm(open)
          if (!open) setEditingTargetNote(null)
        }}
        onSubmit={editingTargetNote ? handleEditTargetNote : handleCreateTargetNote}
        initialData={
          editingTargetNote
            ? {
                category: editingTargetNote.category as TargetNoteCategory,
                title: editingTargetNote.title,
                description: editingTargetNote.description || undefined,
                priority: (editingTargetNote.priority as 'high' | 'normal' | 'low') || 'normal',
                location: (() => {
                  const loc = editingTargetNote.location as {
                    coordinates?: [number, number]
                  } | null
                  if (loc?.coordinates && loc.coordinates.length === 2) {
                    return { lat: loc.coordinates[1], lng: loc.coordinates[0] }
                  }
                  return undefined
                })(),
                photos: (editingTargetNote.photos as string[]) || undefined,
              }
            : undefined
        }
        isLoading={createTargetNote.isPending || updateTargetNote.isPending}
        projectId={project.id}
        noteId={editingTargetNote?.id}
      />

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
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
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
