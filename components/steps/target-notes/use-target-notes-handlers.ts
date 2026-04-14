import * as React from 'react'

import { useToast } from '@/hooks/use-toast'
import {
  useProjectObservations,
  useCreateObservation,
  useUpdateObservation,
  useDeleteObservation,
} from '@/hooks/queries/use-observation-hooks'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import {
  useTargetNotes,
  useTargetNotesStats,
  useCreateTargetNote,
  useUpdateTargetNote,
  useDeleteTargetNote,
  useVerifyTargetNote,
} from '@/hooks/queries/use-target-note-hooks'
import { type SpeciesObservation as ObservationFormType } from '@/components/field-surveys/species-observation-form'
import { type TargetNoteFormData } from '@/components/field-surveys/target-note-form'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import type { SpeciesObservation, Json } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

interface UseTargetNotesHandlersOptions {
  projectId: string
  userId: string
  selectedSite: ProjectSiteWithGeoJSON | null
  selectedSurveyId: string
}

export function useTargetNotesHandlers({
  projectId,
  userId,
  selectedSite,
  selectedSurveyId,
}: UseTargetNotesHandlersOptions) {
  const { toast } = useToast()

  // React Query hooks - Observations (site-scoped at query level)
  const { data: surveys = [] } = useSurveys(projectId, selectedSite?.id)
  const { data: observations = [], isLoading: observationsLoading } = useProjectObservations(
    projectId,
    selectedSite?.id
  )
  const { data: savedFindings = [] } = useSavedFindings(projectId, selectedSite?.id)
  const createObservation = useCreateObservation()
  const updateObservation = useUpdateObservation()
  const deleteObservation = useDeleteObservation()
  const [isImporting, setIsImporting] = React.useState(false)

  // React Query hooks - Target Notes (site-scoped at query level)
  const { data: targetNotes = [], isLoading: targetNotesLoading } = useTargetNotes(
    projectId,
    selectedSite?.id
  )
  const { data: targetNotesStats } = useTargetNotesStats(projectId, selectedSite?.id)
  const createTargetNote = useCreateTargetNote()
  const updateTargetNote = useUpdateTargetNote()
  const deleteTargetNote = useDeleteTargetNote()
  const verifyTargetNote = useVerifyTargetNote()

  const isLoading = observationsLoading || targetNotesLoading

  // surveys/observations are already site-scoped via the query hooks above.
  // The "filtered" aliases are kept for downstream consumers; only the
  // selected-survey narrowing for observations remains.
  const filteredSurveys = surveys

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

  // Check which species have already been imported
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

  // targetNotes are already site-scoped via the query hook above.
  // Alias kept so downstream consumers don't need to change.
  const filteredTargetNotes = targetNotes

  // Group target notes by category
  const targetNotesByCategory = React.useMemo(() => {
    const groups: Record<string, TargetNoteWithCreator[]> = {}
    for (const note of filteredTargetNotes) {
      const category = note.category || 'check_feature'
      if (!groups[category]) groups[category] = []
      groups[category].push(note)
    }
    return groups
  }, [filteredTargetNotes])

  // Handle creating a target note
  const handleCreateTargetNote = async (data: TargetNoteFormData) => {
    try {
      const locationData = data.location
        ? { type: 'Point', coordinates: [data.location.lng, data.location.lat] }
        : null

      await createTargetNote.mutateAsync({
        project_id: projectId,
        created_by: userId,
        site_id: selectedSite?.id || null,
        category: data.category,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        location: locationData as unknown as undefined,
        photos: data.photos || null,
        survey_id: selectedSurveyId || surveys[0]?.id || null,
      })

      toast({ title: 'Target note added', description: `"${data.title}" has been created.` })
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error creating target note',
        description: 'Failed to create the target note.',
      })
      return false
    }
  }

  // Handle editing a target note
  const handleEditTargetNote = async (
    data: TargetNoteFormData,
    editingNote: TargetNoteWithCreator
  ) => {
    try {
      const locationData = data.location
        ? { type: 'Point', coordinates: [data.location.lng, data.location.lat] }
        : null

      await updateTargetNote.mutateAsync({
        noteId: editingNote.id,
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
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error updating target note',
        description: 'Failed to update the target note.',
      })
      return false
    }
  }

  // Handle deleting a target note
  const handleDeleteTargetNote = async (note: TargetNoteWithCreator) => {
    try {
      await deleteTargetNote.mutateAsync(note.id)
      toast({ title: 'Target note deleted', description: 'Target note has been removed.' })
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
      await verifyTargetNote.mutateAsync({ noteId: note.id, verifierId: userId })
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
        ? { type: 'Point', coordinates: [data.location.lng, data.location.lat] }
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
        photos: data.photos || null,
      })

      toast({
        title: 'Observation recorded',
        description: `${data.speciesNameScientific} observation saved.`,
      })
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error recording observation',
        description: 'Failed to save the observation.',
      })
      return false
    }
  }

  // Handle editing an observation
  const handleEditObservation = async (
    data: Partial<ObservationFormType>,
    editingObs: SpeciesObservation
  ) => {
    try {
      const locationData = data.location
        ? { type: 'Point', coordinates: [data.location.lng, data.location.lat] }
        : null

      await updateObservation.mutateAsync({
        observationId: editingObs.id,
        projectId,
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
          photos: data.photos || null,
        },
      })

      toast({
        title: 'Observation updated',
        description: 'Species observation has been updated.',
      })
      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error updating observation',
        description: 'Failed to update the observation.',
      })
      return false
    }
  }

  // Handle deleting an observation
  const handleDeleteObservation = async (observation: SpeciesObservation) => {
    try {
      await deleteObservation.mutateAsync({ observationId: observation.id, projectId })
      toast({ title: 'Observation deleted', description: 'Species observation has been removed.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error deleting observation',
        description: 'Failed to delete the observation.',
      })
    }
  }

  return {
    // Data
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
    isTargetNoteMutating: createTargetNote.isPending || updateTargetNote.isPending,

    // Handlers
    handleCreateTargetNote,
    handleEditTargetNote,
    handleDeleteTargetNote,
    handleVerifyTargetNote,
    handleImportSpecies,
    handleCreateObservation,
    handleEditObservation,
    handleDeleteObservation,
  }
}
