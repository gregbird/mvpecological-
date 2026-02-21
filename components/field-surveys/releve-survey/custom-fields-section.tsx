'use client'

import * as React from 'react'
import { type UseFormReturn, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Section } from './section-shell'
import type { ReleveFormValues, CustomFieldDefinition } from './types'

interface CustomFieldsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function CustomFieldsSection({ form, readOnly }: CustomFieldsSectionProps) {
  const [newFieldName, setNewFieldName] = React.useState('')
  const [newFieldType, setNewFieldType] = React.useState<CustomFieldDefinition['type']>('text')

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'custom_field_definitions',
  })

  const addField = () => {
    if (!newFieldName.trim()) return
    const id = crypto.randomUUID()
    append({ id, name: newFieldName.trim(), type: newFieldType })
    form.setValue(`custom_field_values.${id}`, newFieldType === 'number' ? 0 : '')
    setNewFieldName('')
    setNewFieldType('text')
  }

  const removeField = (index: number) => {
    const def = fields[index]
    remove(index)
    // Clean up the value
    const current = form.getValues('custom_field_values')
    const updated = { ...current }
    delete updated[def.id]
    form.setValue('custom_field_values', updated)
  }

  const renderInput = (def: CustomFieldDefinition & { id: string }) => {
    const value = form.watch(`custom_field_values.${def.id}`) ?? ''

    if (def.type === 'textarea') {
      return (
        <Textarea
          className="min-h-16 text-sm"
          value={String(value)}
          onChange={(e) => form.setValue(`custom_field_values.${def.id}`, e.target.value)}
          disabled={readOnly}
        />
      )
    }

    return (
      <Input
        type={def.type === 'number' ? 'number' : 'text'}
        className="h-8 text-sm"
        value={String(value)}
        onChange={(e) =>
          form.setValue(
            `custom_field_values.${def.id}`,
            def.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
          )
        }
        disabled={readOnly}
      />
    )
  }

  return (
    <Section
      title="Custom Fields"
      badge={fields.length > 0 ? `${fields.length} fields` : undefined}
      defaultOpen={fields.length > 0}
    >
      {/* Existing custom fields */}
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-3">
          <div className="flex-1">
            <Label className="text-xs">
              {field.name}
              <span className="text-muted-foreground ml-1.5 text-[10px] uppercase">
                {field.type}
              </span>
            </Label>
            <div className="mt-1">{renderInput(field)}</div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-5 h-8 w-8 shrink-0"
              onClick={() => removeField(index)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </div>
      ))}

      {/* Add new field */}
      {!readOnly && (
        <div className="bg-muted/30 rounded-md border p-3">
          <p className="mb-2 text-xs font-medium">Add Custom Field</p>
          <div className="flex gap-2">
            <Input
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="h-8 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addField()
                }
              }}
            />
            <Select
              value={newFieldType}
              onValueChange={(val) => setNewFieldType(val as CustomFieldDefinition['type'])}
            >
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
              disabled={!newFieldName.trim()}
              className="h-8"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}
