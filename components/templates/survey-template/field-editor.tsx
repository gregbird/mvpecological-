'use client'

import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SurveyFieldDefinition, FieldType } from '@/lib/config/survey-field-definitions'

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi-select', label: 'Multi-Select' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
]

interface FieldEditorProps {
  field: SurveyFieldDefinition
  onChange: (updated: SurveyFieldDefinition) => void
  onRemove: () => void
  canRemove: boolean
}

export function FieldEditor({ field, onChange, onRemove, canRemove }: FieldEditorProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
      <Input
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
        className="h-8 flex-1 text-sm"
        placeholder="Field label"
      />

      <Select
        value={field.type}
        onValueChange={(v) => onChange({ ...field, type: v as FieldType })}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Req</span>
        <Switch
          checked={field.required}
          onCheckedChange={(v) => onChange({ ...field, required: v })}
          className="scale-75"
        />
      </div>

      {canRemove && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      )}
    </div>
  )
}
