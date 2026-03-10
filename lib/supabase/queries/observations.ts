import { createClient } from '@/lib/supabase/client'
import type { Database, SpeciesObservation } from '@/types/database'

type InsertObservation = Database['public']['Tables']['species_observations']['Insert']
type UpdateObservation = Database['public']['Tables']['species_observations']['Update']

// Get all observations for a survey
export async function getSurveyObservations(surveyId: string): Promise<SpeciesObservation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('species_observations')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching observations:', error)
    return []
  }

  return (data ?? []) as SpeciesObservation[]
}

// Get all observations for a project (across all surveys)
export async function getProjectObservations(projectId: string): Promise<SpeciesObservation[]> {
  const supabase = createClient()
  // First get all surveys for the project
  const { data: surveys, error: surveysError } = await supabase
    .from('surveys')
    .select('id')
    .eq('project_id', projectId)

  if (surveysError || !surveys) {
    console.error('Error fetching project surveys:', surveysError)
    return []
  }

  const surveyIds = (surveys as Array<{ id: string }>).map((s) => s.id)
  if (surveyIds.length === 0) return []

  const { data, error } = await supabase
    .from('species_observations')
    .select('*')
    .in('survey_id', surveyIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching project observations:', error)
    return []
  }

  return (data ?? []) as SpeciesObservation[]
}

// Get single observation by ID
export async function getObservation(observationId: string): Promise<SpeciesObservation | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('species_observations')
    .select('*')
    .eq('id', observationId)
    .single()

  if (error) {
    console.error('Error fetching observation:', error)
    return null
  }

  return data as SpeciesObservation
}

// Create new observation
export async function createObservation(
  observation: InsertObservation
): Promise<SpeciesObservation | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('species_observations')
    .insert(observation as Database['public']['Tables']['species_observations']['Insert'])
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create observation')
  }

  return data as unknown as SpeciesObservation
}

// Update observation
export async function updateObservation(
  observationId: string,
  updates: UpdateObservation
): Promise<SpeciesObservation | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('species_observations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', observationId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update observation')
  }

  return data as unknown as SpeciesObservation
}

// Delete observation
export async function deleteObservation(observationId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('species_observations').delete().eq('id', observationId)

  if (error) {
    throw new Error(error.message || 'Failed to delete observation')
  }

  return true
}

// Verify observation
export async function verifyObservation(
  observationId: string,
  verifierId: string
): Promise<SpeciesObservation | null> {
  return updateObservation(observationId, {
    needs_verification: false,
    verified_by: verifierId,
  })
}

// Get observation statistics
export async function getObservationStats(projectId: string): Promise<{
  total: number
  protected: number
  needsVerification: number
  byTaxonGroup: { group: string; count: number }[]
  byConfidence: { level: string; count: number }[]
}> {
  const observations = await getProjectObservations(projectId)

  // Group by taxon
  const taxonGroups = observations.reduce(
    (acc, o) => {
      const group = o.taxon_group || 'Unknown'
      if (!acc[group]) {
        acc[group] = { group, count: 0 }
      }
      acc[group].count++
      return acc
    },
    {} as Record<string, { group: string; count: number }>
  )

  // Group by confidence
  const confidenceGroups = observations.reduce(
    (acc, o) => {
      const level = o.confidence_level
      if (!acc[level]) {
        acc[level] = { level, count: 0 }
      }
      acc[level].count++
      return acc
    },
    {} as Record<string, { level: string; count: number }>
  )

  return {
    total: observations.length,
    protected: observations.filter((o) => o.is_protected).length,
    needsVerification: observations.filter((o) => o.needs_verification).length,
    byTaxonGroup: Object.values(taxonGroups).sort((a, b) => b.count - a.count),
    byConfidence: Object.values(confidenceGroups),
  }
}

// Taxon groups for filtering
export const TAXON_GROUPS = [
  'Mammals',
  'Birds',
  'Reptiles',
  'Amphibians',
  'Fish',
  'Invertebrates',
  'Plants',
  'Fungi',
  'Other',
]

// Evidence types
export const EVIDENCE_TYPES = [
  'Visual',
  'Call/Song',
  'Tracks/Signs',
  'Droppings',
  'Feathers/Hair',
  'Nest/Roost',
  'Dead Specimen',
  'Camera Trap',
  'eDNA',
  'Other',
]
