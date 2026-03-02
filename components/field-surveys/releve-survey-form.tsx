'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useUpsertReleveSurvey } from '@/hooks/queries/use-releve-hooks'
import type { ReleveSurveyRow, ReleveSpeciesRow } from '@/lib/supabase/queries/releve-surveys'

import {
  releveFormSchema,
  type ReleveFormValues,
  type CustomFieldsData,
  fromNum,
  toNum,
} from './releve-survey/types'
import { BasicInfoSection } from './releve-survey/basic-info-section'
import { GpsSection } from './releve-survey/gps-section'
import { SiteCharacteristicsSection } from './releve-survey/site-characteristics-section'
import { VegetationHeightsSection } from './releve-survey/vegetation-heights-section'
import { CoverPercentagesSection } from './releve-survey/cover-percentages-section'
import { SpeciesRecordsSection } from './releve-survey/species-records-section'
import { AdditionalObservationsSection } from './releve-survey/additional-observations-section'
import { CustomFieldsSection } from './releve-survey/custom-fields-section'
import { TemplateSaveModal } from './releve-survey/template-save-modal'
import { TemplateLoadDropdown } from './releve-survey/template-load-dropdown'

// --- Props ---

interface ReleveSurveyFormProps {
  projectId: string
  projectName: string
  surveyId?: string | null
  existingData?: {
    survey: ReleveSurveyRow
    species: ReleveSpeciesRow[]
  } | null
  readOnly?: boolean
  onSaved?: () => void
  onClose?: () => void
}

function parseCustomFields(raw: Record<string, unknown> | null | undefined): {
  definitions: CustomFieldsData['definitions']
  values: CustomFieldsData['values']
} {
  if (!raw || !('definitions' in raw) || !Array.isArray(raw.definitions)) {
    return { definitions: [], values: {} }
  }
  return {
    definitions: raw.definitions as CustomFieldsData['definitions'],
    values: (raw.values as CustomFieldsData['values']) ?? {},
  }
}

export function ReleveSurveyForm({
  projectId,
  projectName,
  surveyId,
  existingData,
  readOnly = false,
  onSaved,
  onClose,
}: ReleveSurveyFormProps) {
  const { toast } = useToast()
  const upsertReleve = useUpsertReleveSurvey()

  const existing = existingData?.survey
  const existingSpecies = existingData?.species ?? []
  const existingCustom = parseCustomFields(existing?.custom_fields as Record<string, unknown>)

  const form = useForm<ReleveFormValues>({
    resolver: zodResolver(releveFormSchema),
    defaultValues: {
      site_name: existing?.site_name ?? '',
      survey_date: existing?.survey_date ?? format(new Date(), 'yyyy-MM-dd'),
      releve_code: existing?.releve_code ?? '',
      releve_area_sqm: fromNum(existing?.releve_area_sqm),
      recorder: existing?.recorder ?? '',
      survey_x_coord: fromNum(existing?.survey_x_coord),
      survey_y_coord: fromNum(existing?.survey_y_coord),
      accuracy_m: fromNum(existing?.accuracy_m),
      habitat_type: existing?.habitat_type ?? '',
      soil_type: existing?.soil_type ?? '',
      soil_stability: existing?.soil_stability ?? '',
      aspect: existing?.aspect ?? '',
      slope_degrees: fromNum(existing?.slope_degrees),
      max_height_trees_m: fromNum(existing?.max_height_trees_m),
      max_height_shrubs_cm: fromNum(existing?.max_height_shrubs_cm),
      max_height_bryophytes_cm: fromNum(existing?.max_height_bryophytes_cm),
      max_height_graminea_cm: fromNum(existing?.max_height_graminea_cm),
      max_height_forbs_cm: fromNum(existing?.max_height_forbs_cm),
      median_height_graminea_cm: fromNum(existing?.median_height_graminea_cm),
      median_height_forbs_cm: fromNum(existing?.median_height_forbs_cm),
      total_vegetation_cover_pct: fromNum(existing?.total_vegetation_cover_pct),
      cover_graminea_pct: fromNum(existing?.cover_graminea_pct),
      cover_forbs_pct: fromNum(existing?.cover_forbs_pct),
      cover_mosses_liverworts_pct: fromNum(existing?.cover_mosses_liverworts_pct),
      cover_trees_pct: fromNum(existing?.cover_trees_pct),
      cover_shrubs_pct: fromNum(existing?.cover_shrubs_pct),
      cover_litter_pct: fromNum(existing?.cover_litter_pct),
      cover_bare_soil_pct: fromNum(existing?.cover_bare_soil_pct),
      cover_bare_rock_pct: fromNum(existing?.cover_bare_rock_pct),
      cover_open_water_pct: fromNum(existing?.cover_open_water_pct),
      other_species_proximity: existing?.other_species_proximity ?? '',
      fauna_observations: existing?.fauna_observations ?? '',
      releve_comment: existing?.releve_comment ?? '',
      species: existingSpecies.map((s) => ({
        species_name_latin: s.species_name_latin,
        species_name_english: s.species_name_english ?? '',
        species_cover_domin: s.species_cover_domin,
        species_cover_pct: s.species_cover_pct,
        notes: s.notes ?? '',
      })),
      custom_field_definitions: existingCustom.definitions,
      custom_field_values: existingCustom.values,
    },
  })

  const speciesFieldArray = useFieldArray({ control: form.control, name: 'species' })
  const customDefs = form.watch('custom_field_definitions')

  const handleSave = async (values: ReleveFormValues) => {
    const customFieldsData: CustomFieldsData = {
      definitions: values.custom_field_definitions,
      values: values.custom_field_values,
    }

    try {
      await upsertReleve.mutateAsync({
        data: {
          id: existing?.id,
          project_id: projectId,
          survey_id: surveyId ?? null,
          site_name: values.site_name || null,
          survey_date: values.survey_date,
          releve_code: values.releve_code,
          releve_area_sqm: toNum(values.releve_area_sqm),
          recorder: values.recorder,
          accuracy_m: toNum(values.accuracy_m),
          survey_x_coord: toNum(values.survey_x_coord),
          survey_y_coord: toNum(values.survey_y_coord),
          habitat_type: values.habitat_type || null,
          soil_type: values.soil_type || null,
          soil_stability: values.soil_stability || null,
          aspect: values.aspect || null,
          slope_degrees: toNum(values.slope_degrees),
          max_height_trees_m: toNum(values.max_height_trees_m),
          max_height_shrubs_cm: toNum(values.max_height_shrubs_cm),
          max_height_bryophytes_cm: toNum(values.max_height_bryophytes_cm),
          max_height_graminea_cm: toNum(values.max_height_graminea_cm),
          max_height_forbs_cm: toNum(values.max_height_forbs_cm),
          median_height_graminea_cm: toNum(values.median_height_graminea_cm),
          median_height_forbs_cm: toNum(values.median_height_forbs_cm),
          total_vegetation_cover_pct: toNum(values.total_vegetation_cover_pct),
          cover_graminea_pct: toNum(values.cover_graminea_pct),
          cover_forbs_pct: toNum(values.cover_forbs_pct),
          cover_mosses_liverworts_pct: toNum(values.cover_mosses_liverworts_pct),
          cover_trees_pct: toNum(values.cover_trees_pct),
          cover_shrubs_pct: toNum(values.cover_shrubs_pct),
          cover_litter_pct: toNum(values.cover_litter_pct),
          cover_bare_soil_pct: toNum(values.cover_bare_soil_pct),
          cover_bare_rock_pct: toNum(values.cover_bare_rock_pct),
          cover_open_water_pct: toNum(values.cover_open_water_pct),
          other_species_proximity: values.other_species_proximity || null,
          fauna_observations: values.fauna_observations || null,
          releve_comment: values.releve_comment || null,
          custom_fields: customFieldsData as unknown as Record<string, unknown>,
          created_by: null,
        },
        species: values.species
          .filter((s) => s.species_name_latin)
          .map((s) => ({
            species_name_latin: s.species_name_latin,
            species_name_english: s.species_name_english || null,
            species_cover_domin: s.species_cover_domin ?? null,
            species_cover_pct: s.species_cover_pct ?? null,
            notes: s.notes || null,
          })),
      })

      toast({ title: existing ? 'Relevé survey updated' : 'Relevé survey saved' })
      onSaved?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      toast({ title: 'Error saving survey', description: message, variant: 'destructive' })
    }
  }

  const handleEmail = () => {
    const vals = form.getValues()
    const subject = encodeURIComponent(`Relevé Survey — ${projectName} — ${vals.releve_code}`)
    const bodyParts = [
      `Project: ${projectName}`,
      `Site: ${vals.site_name || '—'}`,
      `Relevé Code: ${vals.releve_code}`,
      `Date: ${vals.survey_date}`,
      `Recorder: ${vals.recorder}`,
      `Habitat (FOSSITT): ${vals.habitat_type || '—'}`,
      '',
      `Species (${speciesFieldArray.fields.length}):`,
      ...vals.species.map(
        (s) =>
          `  • ${s.species_name_latin} (${s.species_name_english || '—'}) — DOMIN: ${s.species_cover_domin ?? '—'}, Cover: ${s.species_cover_pct ?? '—'}%`
      ),
      '',
      `Notes: ${vals.releve_comment || '—'}`,
    ]
    const body = encodeURIComponent(bodyParts.join('\n'))
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-2">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {readOnly
              ? 'Relevé Survey Data'
              : existing
                ? 'Edit Relevé Survey'
                : 'New Relevé Survey'}
          </h3>
          <div className="flex gap-2">
            {!readOnly && <TemplateLoadDropdown form={form} />}
            {!readOnly && <TemplateSaveModal definitions={customDefs} />}
            <Button type="button" variant="outline" size="sm" onClick={handleEmail}>
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email
            </Button>
          </div>
        </div>

        <Separator />

        <BasicInfoSection form={form} readOnly={readOnly} />
        <GpsSection form={form} readOnly={readOnly} />
        <SiteCharacteristicsSection form={form} readOnly={readOnly} />
        <VegetationHeightsSection form={form} readOnly={readOnly} />
        <CoverPercentagesSection form={form} readOnly={readOnly} />
        <SpeciesRecordsSection form={form} fieldArray={speciesFieldArray} readOnly={readOnly} />
        <AdditionalObservationsSection form={form} readOnly={readOnly} />
        <CustomFieldsSection form={form} readOnly={readOnly} />

        {/* Actions */}
        {!readOnly && (
          <>
            <Separator />
            <div className="flex justify-end gap-3">
              {onClose && (
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={upsertReleve.isPending}>
                {upsertReleve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existing ? 'Update Relevé Survey' : 'Save Relevé Survey'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  )
}
