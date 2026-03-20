'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FieldEditor } from './field-editor'
import type { SurveySection, SurveyFieldDefinition } from '@/lib/config/survey-field-definitions'

interface SectionEditorProps {
  section: SurveySection
  onChange: (updated: SurveySection) => void
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const [expanded, setExpanded] = React.useState(section.enabled)

  const handleToggle = (enabled: boolean) => {
    onChange({ ...section, enabled })
  }

  const handleFieldChange = (fieldId: string, updated: SurveyFieldDefinition) => {
    onChange({
      ...section,
      fields: section.fields.map((f) => (f.id === fieldId ? updated : f)),
    })
  }

  const handleFieldRemove = (fieldId: string) => {
    onChange({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    })
  }

  const handleAddField = () => {
    const newId = `custom_${Date.now()}`
    const newField: SurveyFieldDefinition = {
      id: newId,
      label: 'New Field',
      key: newId,
      type: 'text',
      required: false,
      isCustom: true,
    }
    onChange({ ...section, fields: [...section.fields, newField] })
  }

  const enabledFieldCount = section.fields.length

  return (
    <div className="rounded-lg border">
      <div
        className="flex cursor-pointer items-center justify-between p-3"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-medium">{section.title}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            {enabledFieldCount} field{enabledFieldCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-500">{section.enabled ? 'Enabled' : 'Disabled'}</span>
          <Switch checked={section.enabled} onCheckedChange={handleToggle} className="scale-90" />
        </div>
      </div>

      {expanded && section.enabled && (
        <div className="space-y-2 border-t px-3 pt-2 pb-3">
          {section.description && <p className="text-xs text-gray-500">{section.description}</p>}

          {section.fields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              onChange={(updated) => handleFieldChange(field.id, updated)}
              onRemove={() => handleFieldRemove(field.id)}
              canRemove={!!field.isCustom}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddField}
            className="mt-1 w-full text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Custom Field
          </Button>
        </div>
      )}
    </div>
  )
}
