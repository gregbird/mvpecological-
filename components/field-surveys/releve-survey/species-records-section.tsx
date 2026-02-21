'use client'

import { type UseFormReturn, type UseFieldArrayReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COMMON_IRISH_FLORA, DOMIN_SCALE, getEnglishName } from '@/lib/data/common-irish-flora'
import { Section } from './section-shell'
import type { ReleveFormValues } from './types'

interface SpeciesRecordsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  fieldArray: UseFieldArrayReturn<ReleveFormValues, 'species'>
  readOnly: boolean
}

export function SpeciesRecordsSection({ form, fieldArray, readOnly }: SpeciesRecordsSectionProps) {
  const { fields: speciesFields, append, remove } = fieldArray

  return (
    <Section title="Species Records" badge={`${speciesFields.length} species`} defaultOpen={true}>
      {speciesFields.map((field, index) => (
        <div
          key={field.id}
          className="bg-muted/30 grid gap-2 rounded-md border p-3 sm:grid-cols-12"
        >
          {/* Latin name dropdown */}
          <div className="sm:col-span-3">
            <Label className="text-xs">Latin Name *</Label>
            <Select
              value={form.watch(`species.${index}.species_name_latin`)}
              onValueChange={(val) => {
                form.setValue(`species.${index}.species_name_latin`, val)
                form.setValue(`species.${index}.species_name_english`, getEnglishName(val))
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COMMON_IRISH_FLORA.map((sp) => (
                  <SelectItem key={sp.latin} value={sp.latin} className="text-xs">
                    <span className="italic">{sp.latin}</span>
                  </SelectItem>
                ))}
                {form.watch(`species.${index}.species_name_latin`) &&
                  !COMMON_IRISH_FLORA.some(
                    (f) => f.latin === form.watch(`species.${index}.species_name_latin`)
                  ) && (
                    <SelectItem
                      value={form.watch(`species.${index}.species_name_latin`)}
                      className="text-xs"
                    >
                      {form.watch(`species.${index}.species_name_latin`)}
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>

          {/* English name */}
          <div className="sm:col-span-3">
            <Label className="text-xs">English Name</Label>
            <Input
              className="mt-1 h-8 text-xs"
              value={form.watch(`species.${index}.species_name_english`) ?? ''}
              onChange={(e) =>
                form.setValue(`species.${index}.species_name_english`, e.target.value)
              }
              disabled={readOnly}
            />
          </div>

          {/* DOMIN Scale */}
          <div className="sm:col-span-2">
            <Label className="text-xs">DOMIN (1-10)</Label>
            <Select
              value={form.watch(`species.${index}.species_cover_domin`)?.toString() ?? ''}
              onValueChange={(val) =>
                form.setValue(`species.${index}.species_cover_domin`, parseInt(val))
              }
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {DOMIN_SCALE.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)} className="text-xs">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cover % */}
          <div className="sm:col-span-2">
            <Label className="text-xs">Cover %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              className="mt-1 h-8 text-xs"
              value={form.watch(`species.${index}.species_cover_pct`) ?? ''}
              onChange={(e) =>
                form.setValue(
                  `species.${index}.species_cover_pct`,
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              disabled={readOnly}
            />
          </div>

          {/* Notes + Delete */}
          <div className="flex items-end sm:col-span-2">
            <Input
              placeholder="Notes"
              className="mt-1 h-8 flex-1 text-xs"
              value={form.watch(`species.${index}.notes`) ?? ''}
              onChange={(e) => form.setValue(`species.${index}.notes`, e.target.value)}
              disabled={readOnly}
            />
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-1 h-8 w-8 shrink-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              species_name_latin: '',
              species_name_english: '',
              species_cover_domin: null,
              species_cover_pct: null,
              notes: '',
            })
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Species
        </Button>
      )}
    </Section>
  )
}
