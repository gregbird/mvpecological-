'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Section } from './section-shell'
import { NumField } from './num-field'
import type { ReleveFormValues } from './types'

interface BasicInfoSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function BasicInfoSection({ form, readOnly }: BasicInfoSectionProps) {
  return (
    <Section title="Basic Information" defaultOpen={true}>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="site_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Site Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="releve_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Relevé Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. REL001"
                  {...field}
                  disabled={readOnly}
                  className="h-8 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="survey_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Survey Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={readOnly} className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="recorder"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Recorder *</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <NumField
          form={form}
          name="releve_area_sqm"
          label="Relevé Area"
          unit="m²"
          step="0.1"
          readOnly={readOnly}
        />
      </div>
    </Section>
  )
}
