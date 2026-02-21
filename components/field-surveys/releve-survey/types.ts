import * as z from 'zod'

// --- Custom field types ---

export interface CustomFieldDefinition {
  id: string
  name: string
  type: 'text' | 'number' | 'textarea'
}

export interface CustomFieldsData {
  definitions: CustomFieldDefinition[]
  values: Record<string, string | number | null>
}

// --- Zod schemas ---

const speciesSchema = z.object({
  species_name_latin: z.string().min(1, 'Species name is required'),
  species_name_english: z.string().optional(),
  species_cover_domin: z.number().min(1).max(10).nullable().optional(),
  species_cover_pct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().optional(),
})

const customFieldDefSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'textarea']),
})

export const releveFormSchema = z.object({
  site_name: z.string().optional(),
  survey_date: z.string().min(1, 'Date is required'),
  releve_code: z.string().min(1, 'Relevé code is required'),
  releve_area_sqm: z.string().optional(),
  recorder: z.string().min(1, 'Recorder is required'),
  survey_x_coord: z.string().optional(),
  survey_y_coord: z.string().optional(),
  accuracy_m: z.string().optional(),
  habitat_type: z.string().optional(),
  soil_type: z.string().optional(),
  soil_stability: z.string().optional(),
  aspect: z.string().optional(),
  slope_degrees: z.string().optional(),
  max_height_trees_m: z.string().optional(),
  max_height_shrubs_cm: z.string().optional(),
  max_height_bryophytes_cm: z.string().optional(),
  max_height_graminea_cm: z.string().optional(),
  max_height_forbs_cm: z.string().optional(),
  median_height_graminea_cm: z.string().optional(),
  median_height_forbs_cm: z.string().optional(),
  total_vegetation_cover_pct: z.string().optional(),
  cover_graminea_pct: z.string().optional(),
  cover_forbs_pct: z.string().optional(),
  cover_mosses_liverworts_pct: z.string().optional(),
  cover_trees_pct: z.string().optional(),
  cover_shrubs_pct: z.string().optional(),
  cover_litter_pct: z.string().optional(),
  cover_bare_soil_pct: z.string().optional(),
  cover_bare_rock_pct: z.string().optional(),
  cover_open_water_pct: z.string().optional(),
  other_species_proximity: z.string().optional(),
  fauna_observations: z.string().optional(),
  releve_comment: z.string().optional(),
  species: z.array(speciesSchema),
  custom_field_definitions: z.array(customFieldDefSchema),
  custom_field_values: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
})

export type ReleveFormValues = z.infer<typeof releveFormSchema>

// --- Helpers ---

export function toNum(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

export function fromNum(val: number | null | undefined): string {
  return val != null ? String(val) : ''
}
