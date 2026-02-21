'use client'

import * as React from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { SOIL_STABILITY_OPTIONS, ASPECT_OPTIONS } from '@/lib/data/common-irish-flora'
import { FOSSITT_HABITATS } from '@/lib/data/fossitt-codes'
import { Section } from './section-shell'
import { NumField } from './num-field'
import type { ReleveFormValues } from './types'

interface SiteCharacteristicsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function SiteCharacteristicsSection({ form, readOnly }: SiteCharacteristicsSectionProps) {
  const fossittOptions = React.useMemo(() => {
    return FOSSITT_HABITATS.filter((h) => h.level === 3)
      .map((h) => ({ value: h.code, label: `${h.code} — ${h.name}` }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [])

  return (
    <Section title="Site Characteristics" defaultOpen={false}>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="habitat_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Habitat Type (FOSSITT)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select habitat" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60">
                  {fossittOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="soil_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Soil Type</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Peat, Clay, Loam"
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
          name="soil_stability"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Soil Stability</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SOIL_STABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="aspect"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Aspect</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ASPECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <NumField
          form={form}
          name="slope_degrees"
          label="Slope"
          unit="°"
          step="0.1"
          readOnly={readOnly}
        />
      </div>
    </Section>
  )
}
