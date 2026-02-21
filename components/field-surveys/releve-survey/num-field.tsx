'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { ReleveFormValues } from './types'

interface NumFieldProps {
  form: UseFormReturn<ReleveFormValues>
  name: keyof ReleveFormValues
  label: string
  unit?: string
  step?: string
  min?: string
  readOnly?: boolean
}

export function NumField({
  form,
  name,
  label,
  unit,
  step = '1',
  min = '0',
  readOnly,
}: NumFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name as 'site_name'}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">
            {label}
            {unit && <span className="text-muted-foreground ml-1">({unit})</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              min={min}
              {...field}
              disabled={readOnly}
              className="h-8 text-sm"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
