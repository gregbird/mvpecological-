'use client'

import * as React from 'react'
import { AlertCircle, Loader2, Target, ClipboardList } from 'lucide-react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SpeciesObservationForm,
  type SpeciesObservation as ObservationFormType,
} from '@/components/field-surveys/species-observation-form'
import { type TargetNoteCategory } from '@/components/field-surveys/target-note-card'
import { TargetNoteForm } from '@/components/field-surveys/target-note-form'
import { SiteSelector } from '@/components/project/site-selector'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { useToast } from '@/hooks/use-toast'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import type { Project, WorkflowStep, SpeciesObservation } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import { TargetNotesPanel } from './target-notes-panel'
import { ObservationsPanel } from './observations-panel'
import { useTargetNotesHandlers } from './use-target-notes-handlers'

interface TargetNotesStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
}

export function TargetNotesStep({
  project,
  workflowStep: _workflowStep,
  userId,
}: TargetNotesStepProps) {
  const { toast } = useToast()
  const [selectedSite, setSelectedSite] = React.useState<ProjectSiteWithGeoJSON | null>(null)
  const { data: projectSites = [], isLoading: isLoadingSites } = useProjectSites(project.id)
  const isMultiSite = projectSites.length > 1
  // Multi-site projects must have a site picked before users can persist
  // target notes / observations — keeps every record traceable to one site.
  // Also block while sites load to avoid a brief window where Add buttons
  // appear enabled before `isMultiSite` resolves.
  const requiresSiteSelection = isLoadingSites || (isMultiSite && !selectedSite)
  const { projectBoundary, projectCenter, bufferDistances } = useProjectBoundary(
    project,
    selectedSite
  )
  const [activeMainTab, setActiveMainTab] = React.useState<'target-notes' | 'observations'>(
    'target-notes'
  )
  const [showObservationForm, setShowObservationForm] = React.useState(false)
  const [editingObservation, setEditingObservation] = React.useState<SpeciesObservation | null>(
    null
  )
  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string>('')

  // Switching sites invalidates the current survey choice — surveys are
  // site-scoped, so the dropdown re-populates with a new list. Leaving the
  // old id in state would attach imported species to a survey from the wrong site.
  React.useEffect(() => {
    setSelectedSurveyId('')
  }, [selectedSite?.id])
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

  const {
    surveys,
    filteredSurveys,
    filteredObservations,
    observationsByTaxon,
    filteredTargetNotes,
    targetNotesByCategory,
    targetNotesStats,
    importableSpecies,
    isLoading,
    isImporting,
    isTargetNoteMutating,
    handleCreateTargetNote,
    handleEditTargetNote,
    handleDeleteTargetNote,
    handleVerifyTargetNote,
    handleImportSpecies,
    handleCreateObservation,
    handleEditObservation,
    handleDeleteObservation,
  } = useTargetNotesHandlers({
    projectId: project.id,
    userId,
    selectedSite,
    selectedSurveyId,
    // Single-site projects auto-resolve to that site (SiteSelector is hidden)
    effectiveSiteId:
      selectedSite?.id ?? (projectSites.length === 1 ? (projectSites[0]?.id ?? null) : null),
  })

  const onCreateTargetNote = async (data: Parameters<typeof handleCreateTargetNote>[0]) => {
    const success = await handleCreateTargetNote(data)
    if (success) setShowTargetNoteForm(false)
  }

  const onEditTargetNote = async (data: Parameters<typeof handleEditTargetNote>[0]) => {
    if (!editingTargetNote) return
    const success = await handleEditTargetNote(data, editingTargetNote)
    if (success) {
      setEditingTargetNote(null)
      setShowTargetNoteForm(false)
    }
  }

  const onDeleteTargetNote = async (note: TargetNoteWithCreator) => {
    await handleDeleteTargetNote(note)
    if (selectedTargetNote?.id === note.id) setSelectedTargetNote(null)
  }

  const onCreateObservation = async (data: Partial<ObservationFormType>) => {
    const success = await handleCreateObservation(data)
    if (success) setShowObservationForm(false)
  }

  const onEditObservation = async (data: Partial<ObservationFormType>) => {
    if (!editingObservation) return
    const success = await handleEditObservation(data, editingObservation)
    if (success) {
      setEditingObservation(null)
      setShowObservationForm(false)
    }
  }

  const onDeleteObservation = async (observation: SpeciesObservation) => {
    await handleDeleteObservation(observation)
    if (selectedObservation?.id === observation.id) setSelectedObservation(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Combined toolbar: SiteSelector + stats + sub-tabs + add button */}
      <Tabs
        value={activeMainTab}
        onValueChange={(v) => setActiveMainTab(v as 'target-notes' | 'observations')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-6 py-1.5">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="target-notes" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target Notes ({filteredTargetNotes.length})
              </TabsTrigger>
              <TabsTrigger value="observations" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Species Observations ({filteredObservations.length})
              </TabsTrigger>
            </TabsList>
            {/* Inline Stats */}
            <div className="hidden items-center gap-3 border-l pl-3 md:flex">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold">{filteredTargetNotes.length}</span>
                <span className="text-muted-foreground text-xs">Notes</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold">{filteredObservations.length}</span>
                <span className="text-muted-foreground text-xs">Obs</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-green-600">
                  {targetNotesStats?.verified || 0}
                </span>
                <span className="text-muted-foreground text-xs">Verified</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Survey filter — only relevant for Species Observations. Lives
                in the toolbar (next to SiteSelector) instead of consuming a
                whole row inside the panel. */}
            {activeMainTab === 'observations' && surveys.length > 0 && (
              <Select
                value={selectedSurveyId || 'all'}
                onValueChange={(value) => setSelectedSurveyId(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All surveys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All surveys</SelectItem>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.survey_type}
                      {survey.visit_number != null ? ` · V${survey.visit_number}` : ''} ·{' '}
                      {new Date(survey.survey_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <SiteSelector
              projectId={project.id}
              stepKey="field-research"
              onSiteChange={setSelectedSite}
              showAllOption
            />
            {/* Add buttons live inside their respective panels,
                matching the Habitat Mapping pattern. */}
          </div>
        </div>

        {requiresSiteSelection && (
          <Alert className="mx-6 mt-3 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Select a site first</AlertTitle>
            <AlertDescription>
              Pick a site from the selector above before adding notes or observations. Each record
              must be associated with a single site.
            </AlertDescription>
          </Alert>
        )}

        {/* TARGET NOTES TAB */}
        <TabsContent
          value="target-notes"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-10 py-2"
        >
          <TargetNotesPanel
            targetNotes={filteredTargetNotes}
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
              if (!latlng) return
              // Warn (but don't block) when the click lands outside the
              // selected site boundary. A note saved from an outside-boundary
              // click gets the selected site_id regardless, so silently
              // accepting would silently misattribute field observations.
              if (projectBoundary) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const turf = require('@turf/turf')
                  const point = turf.point([latlng.lng, latlng.lat])
                  const inside = turf.booleanPointInPolygon(point, projectBoundary)
                  if (!inside) {
                    toast({
                      variant: 'destructive',
                      title: 'Click outside site boundary',
                      description:
                        'This note will still be saved to the selected site. Adjust the location if this is unintended.',
                    })
                  }
                } catch {
                  // Fall through — treat as valid if the check fails
                }
              }
              setMapClickLocation(latlng)
              setEditingTargetNote(null)
              setShowTargetNoteForm(true)
            }}
            projectBoundary={projectBoundary}
            projectCenter={projectCenter}
            bufferDistances={bufferDistances}
            addDisabled={requiresSiteSelection}
            onAddNote={() => {
              setEditingTargetNote(null)
              setMapClickLocation(undefined)
              setShowTargetNoteForm(true)
            }}
          />
        </TabsContent>

        {/* SPECIES OBSERVATIONS TAB */}
        <TabsContent
          value="observations"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-10 py-2"
        >
          <ObservationsPanel
            surveys={filteredSurveys}
            filteredObservations={filteredObservations}
            observationsByTaxon={observationsByTaxon}
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
            bufferDistances={bufferDistances}
            onAddObservation={() => {
              setEditingObservation(null)
              setShowObservationForm(true)
            }}
            addObservationDisabled={
              surveys.length === 0 || !selectedSurveyId || requiresSiteSelection
            }
            addObservationDisabledReason={
              requiresSiteSelection
                ? 'Select a site first to add an observation.'
                : surveys.length === 0
                  ? 'Create a survey in the Field Survey tab first.'
                  : !selectedSurveyId
                    ? 'Select a survey from the dropdown to add observations to it.'
                    : undefined
            }
            onImportSpecies={handleImportSpecies}
            importableCount={importableSpecies.length}
            isImporting={isImporting}
          />
        </TabsContent>
      </Tabs>

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
        onSubmit={editingTargetNote ? onEditTargetNote : onCreateTargetNote}
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
        isLoading={isTargetNoteMutating}
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
        onSubmit={editingObservation ? onEditObservation : onCreateObservation}
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
                photos: (editingObservation.photos as string[]) || undefined,
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
                  onDeleteTargetNote(deletingTargetNote)
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
                  onDeleteObservation(deletingObservation)
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
