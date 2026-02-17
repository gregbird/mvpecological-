'use client'

import * as React from 'react'
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Eye,
  Shield,
  Target,
  ClipboardList,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  useProjectObservations,
  useCreateObservation,
  useUpdateObservation,
  useDeleteObservation,
} from '@/hooks/queries/use-observation-hooks'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import {
  useTargetNotes,
  useTargetNotesStats,
  useCreateTargetNote,
  useUpdateTargetNote,
  useDeleteTargetNote,
  useVerifyTargetNote,
} from '@/hooks/queries/use-target-note-hooks'
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
      <div className="bg-muted/50 flex h-100 items-center justify-center rounded-lg">
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
  const [mapClickLocation, setMapClickLocation] = React.useState<
    { lat: number; lng: number } | undefined
  >(undefined)

  // React Query hooks - Observations
  const { data: surveys = [] } = useSurveys(project.id)
  const { data: observations = [], isLoading: observationsLoading } = useProjectObservations(
    project.id
  )
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    <div className="flex h-full flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Step 6: Target Notes</h2>
            <p className="text-muted-foreground text-sm">
              Record field notes and species observations
            </p>
          </div>
          {/* Inline Stats */}
          <div className="hidden items-center gap-4 border-l pl-4 md:flex">
            <div className="text-center">
              <div className="text-lg font-bold">{targetNotes.length}</div>
              <div className="text-muted-foreground text-xs">Notes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{observations.length}</div>
              <div className="text-muted-foreground text-xs">Observations</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {targetNotesStats?.verified || 0}
              </div>
              <div className="text-muted-foreground text-xs">Verified</div>
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

      {/* Main Content - Full Height */}
      <div className="min-h-0 flex-1 p-4">
        <Tabs
          value={activeMainTab}
          onValueChange={(v) => setActiveMainTab(v as 'target-notes' | 'observations')}
          className="flex h-full flex-col"
        >
          <div className="mb-3 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="target-notes" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target Notes ({targetNotes.length})
              </TabsTrigger>
              <TabsTrigger value="observations" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Species Observations ({observations.length})
              </TabsTrigger>
            </TabsList>
            {activeMainTab === 'target-notes' ? (
              <Button
                onClick={() => {
                  setEditingTargetNote(null)
                  setShowTargetNoteForm(true)
                }}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditingObservation(null)
                  setShowObservationForm(true)
                }}
                disabled={surveys.length === 0}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
              </Button>
            )}
          </div>

          {/* TARGET NOTES TAB */}
          <TabsContent value="target-notes" className="mt-0 min-h-0 flex-1">
            {/* Target Notes Content - Full Height Grid */}
            <div className="grid h-full gap-4 lg:grid-cols-2">
              {/* Map */}
              <Card className="flex min-h-0 flex-col">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Target Notes Map</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 p-3 pt-0">
                  <div className="h-full min-h-0 overflow-hidden rounded-lg border">
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
                      onMapClick={(latlng) => {
                        if (latlng) {
                          setMapClickLocation(latlng)
                          setEditingTargetNote(null)
                          setShowTargetNoteForm(true)
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Target Notes List */}
              <Card className="flex min-h-0 flex-col">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Target Notes</CardTitle>
                    <Badge variant="secondary">{targetNotes.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-auto p-3 pt-0">
                  <Tabs
                    value={activeCategoryTab}
                    onValueChange={setActiveCategoryTab}
                    className="flex h-full flex-col"
                  >
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

                    <TabsContent value="all" className="mt-3 min-h-0 flex-1 overflow-auto">
                      {targetNotes.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                          No target notes yet. Click "Add Note" to create one.
                        </div>
                      ) : (
                        <div className="space-y-2">
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
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {Object.entries(targetNotesByCategory).map(([category, notes]) => (
                      <TabsContent
                        key={category}
                        value={category}
                        className="mt-3 min-h-0 flex-1 overflow-auto"
                      >
                        <div className="space-y-2">
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
                              compact
                            />
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SPECIES OBSERVATIONS TAB */}
          <TabsContent value="observations" className="mt-0 min-h-0 flex-1">
            {surveys.length === 0 ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Surveys Available</AlertTitle>
                <AlertDescription>
                  Please complete Step 4 (Field Survey Planning) first.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Survey Filter */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium">Survey:</span>
              <Select
                value={selectedSurveyId || 'all'}
                onValueChange={(value) => setSelectedSurveyId(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-50">
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

            {/* Observations Content - Full Height Grid */}
            <div className="grid h-full gap-4 lg:grid-cols-2">
              {/* Map */}
              <Card className="flex min-h-0 flex-col">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Observation Map</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 p-3 pt-0">
                  <div className="h-full min-h-0 overflow-hidden rounded-lg border">
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
              <Card className="flex min-h-0 flex-col">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Species Observations</CardTitle>
                    <Badge variant="secondary">{filteredObservations.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-auto p-3 pt-0">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex h-full flex-col"
                  >
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

                    <TabsContent value="all" className="mt-3 min-h-0 flex-1 overflow-auto">
                      {filteredObservations.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                          No observations yet. Click "Add Observation" to record species sightings.
                        </div>
                      ) : (
                        <div className="space-y-2">
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
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {Object.entries(observationsByTaxon).map(([taxon, taxonObs]) => (
                      <TabsContent
                        key={taxon}
                        value={taxon}
                        className="mt-3 min-h-0 flex-1 overflow-auto"
                      >
                        <div className="space-y-2">
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
                            />
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Target Note Form Dialog */}
      <TargetNoteForm
        open={showTargetNoteForm}
        onOpenChange={(open) => {
          setShowTargetNoteForm(open)
          if (!open) {
            setEditingTargetNote(null)
            setMapClickLocation(undefined)
          }
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
            : mapClickLocation
              ? { location: mapClickLocation }
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
        projectId={project.id}
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
}: {
  observation: SpeciesObservation
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
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
      </div>
    </div>
  )
}
