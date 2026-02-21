'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Section } from './section-shell'
import type { ReleveFormValues } from './types'

interface AdditionalObservationsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function AdditionalObservationsSection({
  form,
  readOnly,
}: AdditionalObservationsSectionProps) {
  return (
    <Section title="Additional Observations" defaultOpen={false}>
      <FormField
        control={form.control}
        name="other_species_proximity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Other Species in Proximity</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                disabled={readOnly}
                className="min-h-16 text-sm"
                placeholder="Species observed nearby but not within the plot..."
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="fauna_observations"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Fauna Observations</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                disabled={readOnly}
                className="min-h-16 text-sm"
                placeholder="Animals observed during the survey..."
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="releve_comment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">General Comments</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                disabled={readOnly}
                className="min-h-16 text-sm"
                placeholder="Any additional comments about this relevé..."
              />
            </FormControl>
          </FormItem>
        )}
      />
    </Section>
  )
}
