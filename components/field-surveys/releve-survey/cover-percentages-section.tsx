'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Section } from './section-shell'
import { NumField } from './num-field'
import type { ReleveFormValues } from './types'

interface CoverPercentagesSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function CoverPercentagesSection({ form, readOnly }: CoverPercentagesSectionProps) {
  return (
    <Section title="Cover Percentages" badge="0–100%" defaultOpen={false}>
      <div className="grid gap-3 sm:grid-cols-5">
        <NumField
          form={form}
          name="total_vegetation_cover_pct"
          label="Total Vegetation"
          unit="%"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="cover_graminea_pct"
          label="Graminea"
          unit="%"
          readOnly={readOnly}
        />
        <NumField form={form} name="cover_forbs_pct" label="Forbs" unit="%" readOnly={readOnly} />
        <NumField
          form={form}
          name="cover_mosses_liverworts_pct"
          label="Mosses & Liverworts"
          unit="%"
          readOnly={readOnly}
        />
        <NumField form={form} name="cover_trees_pct" label="Trees" unit="%" readOnly={readOnly} />
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        <NumField form={form} name="cover_shrubs_pct" label="Shrubs" unit="%" readOnly={readOnly} />
        <NumField form={form} name="cover_litter_pct" label="Litter" unit="%" readOnly={readOnly} />
        <NumField
          form={form}
          name="cover_bare_soil_pct"
          label="Bare Soil"
          unit="%"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="cover_bare_rock_pct"
          label="Bare Rock"
          unit="%"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="cover_open_water_pct"
          label="Open Water"
          unit="%"
          readOnly={readOnly}
        />
      </div>
    </Section>
  )
}
