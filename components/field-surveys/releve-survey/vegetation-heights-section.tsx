'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Section } from './section-shell'
import { NumField } from './num-field'
import type { ReleveFormValues } from './types'

interface VegetationHeightsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function VegetationHeightsSection({ form, readOnly }: VegetationHeightsSectionProps) {
  return (
    <Section title="Vegetation Heights" defaultOpen={false}>
      <p className="text-muted-foreground -mt-2 text-xs">Maximum heights observed</p>
      <div className="grid gap-3 sm:grid-cols-5">
        <NumField
          form={form}
          name="max_height_trees_m"
          label="Trees"
          unit="m"
          step="0.1"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="max_height_shrubs_cm"
          label="Shrubs"
          unit="cm"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="max_height_bryophytes_cm"
          label="Bryophytes"
          unit="cm"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="max_height_graminea_cm"
          label="Graminea"
          unit="cm"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="max_height_forbs_cm"
          label="Forbs"
          unit="cm"
          readOnly={readOnly}
        />
      </div>
      <p className="text-muted-foreground text-xs">Median heights</p>
      <div className="grid gap-3 sm:grid-cols-5">
        <NumField
          form={form}
          name="median_height_graminea_cm"
          label="Graminea"
          unit="cm"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="median_height_forbs_cm"
          label="Forbs"
          unit="cm"
          readOnly={readOnly}
        />
      </div>
    </Section>
  )
}
