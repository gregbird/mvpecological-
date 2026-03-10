'use client'

import * as React from 'react'
import { Plus, Loader2, Check, Target, ClipboardList, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  useProjectObservations,
  useCreateObservation,
  useUpdateObservation,
  useDeleteObservation,
} from '@/hooks/queries/use-observation-hooks'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
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
import { type TargetNoteCategory } from '@/components/field-surveys/target-note-card'
import {
  TargetNoteForm,
  type TargetNoteFormData,
} from '@/components/field-surveys/target-note-form'
import type { Project, WorkflowStep, SpeciesObservation, Json } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import { TargetNotesPanel } from './target-notes-panel'
import { ObservationsPanel } from './observations-panel'

interface TargetNotesStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
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
  const [deletingTargetNote, setDeletingTargetNote] = React.useState<TargetNoteWithCreator | null>(
    null
  )
  const [deletingObservation, setDeletingObservation] = React.useState<SpeciesObservation | null>(
    null
  )

  // React Query hooks - Observations
  const { data: surveys = [] } = useSurveys(project.id)
  const { data: observations = [], isLoading: observationsLoading } = useProjectObservations(
    project.id
  )
  const { data: savedFindings = [] } = useSavedFindings(project.id)
  const createObservation = useCreateObservation()
  const updateObservation = useUpdateObservation()
  const deleteObservation = useDeleteObservation()
  const [isImporting, setIsImporting] = React.useState(false)

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

  // Species findings from desk research (for import)
  const speciesFindings = React.useMemo(() => {
    return savedFindings.filter((f) => f.data_type === 'species_record')
  }, [savedFindings])

  // Check which species have already been imported (by scientific name)
  const alreadyImportedNames = React.useMemo(() => {
    return new Set(observations.map((o) => o.species_name_scientific.toLowerCase()))
  }, [observations])

  const importableSpecies = React.useMemo(() => {
    return speciesFindings.filter((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | undefined
      const scientificName = (metadata?.scientificName as string) || f.title
      return !alreadyImportedNames.has(scientificName.toLowerCase())
    })
  }, [speciesFindings, alreadyImportedNames])

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
        survey_id: selectedSurveyId || surveys[0]?.id || null,
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

  // Handle importing species from desk research
  const handleImportSpecies = async () => {
    const surveyId = selectedSurveyId || surveys[0]?.id

    if (!surveyId) {
      toast({
        variant: 'destructive',
        title: 'No surveys available',
        description: 'Please create a survey first in Field Survey Planning.',
      })
      return
    }

    if (importableSpecies.length === 0) {
      toast({
        title: 'Nothing to import',
        description: 'All data gathering species have already been imported.',
      })
      return
    }

    setIsImporting(true)

    try {
      let imported = 0
      for (const finding of importableSpecies) {
        const raw = finding.raw_data as Record<string, unknown> | null
        const metadata = raw?.metadata as Record<string, unknown> | undefined
        const sampleRecord = (raw?.sampleRecords as Record<string, unknown>[])?.[0]

        const scientificName = (metadata?.scientificName as string) || finding.title
        const commonName = (metadata?.commonName as string) || null

        // Map GBIF class to taxon group
        const gbifClass = (sampleRecord?.class as string) || ''
        const kingdom = (sampleRecord?.kingdom as string) || ''
        let taxonGroup = 'other'
        if (gbifClass === 'Aves') taxonGroup = 'bird'
        else if (gbifClass === 'Mammalia') taxonGroup = 'mammal'
        else if (gbifClass === 'Reptilia') taxonGroup = 'reptile'
        else if (gbifClass === 'Amphibia') taxonGroup = 'amphibian'
        else if (gbifClass === 'Actinopterygii' || gbifClass === 'Chondrichthyes')
          taxonGroup = 'fish'
        else if (
          gbifClass === 'Insecta' ||
          gbifClass === 'Arachnida' ||
          gbifClass === 'Malacostraca'
        )
          taxonGroup = 'invertebrate'
        else if (
          gbifClass === 'Magnoliopsida' ||
          gbifClass === 'Liliopsida' ||
          kingdom === 'Plantae'
        )
          taxonGroup = 'plant'
        else if (gbifClass === 'Pezizomycetes' || kingdom === 'Fungi') taxonGroup = 'fungi'

        const isProtected = finding.is_protected || !!(metadata?.isProtected as boolean | undefined)
        const designation = (metadata?.designations as string) || null

        await createObservation.mutateAsync({
          survey_id: surveyId,
          species_name_scientific: scientificName,
          species_name_common: commonName,
          taxon_group: taxonGroup,
          is_protected: isProtected,
          designation: designation,
          confidence_level: 'low',
          needs_verification: true,
          behavior_notes: `Imported from data gathering (${finding.source.toUpperCase()})`,
        })
        imported++
      }

      toast({
        title: 'Species imported',
        description: `${imported} species imported from data gathering. Please verify in the field.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Failed to import some species from data gathering.',
      })
    } finally {
      setIsImporting(false)
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
              <div className="flex items-center gap-2">
                {importableSpecies.length > 0 && (
                  <Button
                    onClick={handleImportSpecies}
                    disabled={surveys.length === 0 || isImporting}
                    size="sm"
                    variant="outline"
                  >
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Import from Data Gathering ({importableSpecies.length})
                  </Button>
                )}
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
              </div>
            )}
          </div>

          {/* TARGET NOTES TAB */}
          <TabsContent value="target-notes" className="mt-0 min-h-0 flex-1">
            <TargetNotesPanel
              targetNotes={targetNotes}
              targetNotesByCategory={targetNotesByCategory}
              selectedTargetNote={selectedTargetNote}
              activeCategoryTab={activeCategoryTab}
              onCategoryTabChange={setActiveCategoryTab}
              onSelectNote={setSelectedTargetNote}
              onEditNote={(note) => {
                setEditingTargetNote(note)
                setShowTargetNoteForm(true)
              }}
              onDeleteNote={setDeletingTargetNote}
              onVerifyNote={handleVerifyTargetNote}
              onMapClick={(latlng) => {
                setMapClickLocation(latlng)
                setEditingTargetNote(null)
                setShowTargetNoteForm(true)
              }}
              projectBoundary={projectBoundary}
              projectCenter={projectCenter}
            />
          </TabsContent>

          {/* SPECIES OBSERVATIONS TAB */}
          <TabsContent value="observations" className="mt-0 min-h-0 flex-1">
            <ObservationsPanel
              surveys={surveys}
              filteredObservations={filteredObservations}
              observationsByTaxon={observationsByTaxon}
              selectedSurveyId={selectedSurveyId}
              onSurveyChange={setSelectedSurveyId}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              selectedObservation={selectedObservation}
              onSelectObservation={setSelectedObservation}
              onEditObservation={(obs) => {
                setEditingObservation(obs)
                setShowObservationForm(true)
              }}
              onDeleteObservation={setDeletingObservation}
              projectBoundary={projectBoundary}
              projectCenter={projectCenter}
            />
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

      {/* Delete Target Note Confirmation */}
      <AlertDialog
        open={!!deletingTargetNote}
        onOpenChange={(open) => {
          if (!open) setDeletingTargetNote(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTargetNote?.title}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingTargetNote) {
                  handleDeleteTargetNote(deletingTargetNote)
                  setDeletingTargetNote(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete observation confirmation dialog */}
      <AlertDialog
        open={!!deletingObservation}
        onOpenChange={(open) => !open && setDeletingObservation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Observation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingObservation?.species_name_scientific}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingObservation) {
                  handleDeleteObservation(deletingObservation)
                  setDeletingObservation(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
