'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SurveyFieldDefinition } from '@/lib/config/survey-field-definitions'

interface DynamicFieldRendererProps {
  field: SurveyFieldDefinition
  value: string | number | boolean | string[] | null | undefined
  onChange: (key: string, value: string | number | boolean | string[] | null) => void
  readOnly?: boolean
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  readOnly,
}: DynamicFieldRendererProps) {
  const displayValue = value ?? ''

  if (readOnly) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">
          {field.label}
          {field.unit && ` (${field.unit})`}
        </Label>
        <p className="text-sm">{formatReadOnlyValue(field, value) || '—'}</p>
      </div>
    )
  }

  // Guard against legacy/bad template data where a numeric field was saved as type:"select"
  // without any options — would render as an empty dropdown. Coerce it to a usable input.
  const hasNumericMetadata =
    typeof field.min === 'number' || typeof field.max === 'number' || Boolean(field.unit)
  const effectiveType: typeof field.type =
    field.type === 'select' && (!field.options || field.options.length === 0)
      ? hasNumericMetadata
        ? 'number'
        : 'text'
      : field.type

  switch (effectiveType) {
    case 'text':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
            {field.unit && <span className="ml-1 text-xs text-gray-400">({field.unit})</span>}
          </Label>
          <Input
            value={String(displayValue)}
            onChange={(e) => onChange(field.key, e.target.value || null)}
            placeholder={field.placeholder}
            className="h-9 text-sm"
          />
          {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
            {field.unit && <span className="ml-1 text-xs text-gray-400">({field.unit})</span>}
          </Label>
          <Input
            type="number"
            value={displayValue === '' || displayValue === null ? '' : String(displayValue)}
            onChange={(e) =>
              onChange(field.key, e.target.value ? parseFloat(e.target.value) : null)
            }
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className="h-9 text-sm"
          />
          {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
        </div>
      )

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Textarea
            value={String(displayValue)}
            onChange={(e) => onChange(field.key, e.target.value || null)}
            placeholder={field.placeholder}
            rows={3}
            className="text-sm"
          />
          {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
        </div>
      )

    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Select
            value={String(displayValue) || undefined}
            onValueChange={(v) => onChange(field.key, v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={field.placeholder ?? 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
        </div>
      )

    case 'multi-select':
      // Render as checkboxes for simplicity
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const selected = Array.isArray(value) ? value.includes(opt.value) : false
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600'
                  }`}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : []
                    const updated = selected
                      ? current.filter((v) => v !== opt.value)
                      : [...current, opt.value]
                    onChange(field.key, updated.length > 0 ? updated : null)
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Switch checked={value === true} onCheckedChange={(v) => onChange(field.key, v)} />
        </div>
      )

    case 'date':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={String(displayValue)}
            onChange={(e) => onChange(field.key, e.target.value || null)}
            className="h-9 text-sm"
          />
        </div>
      )

    case 'time':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            type="time"
            value={String(displayValue)}
            onChange={(e) => onChange(field.key, e.target.value || null)}
            className="h-9 text-sm"
          />
        </div>
      )

    default:
      return null
  }
}

function formatReadOnlyValue(
  field: SurveyFieldDefinition,
  value: string | number | boolean | string[] | null | undefined
): string {
  if (value === null || value === undefined || value === '') return ''

  if (field.type === 'boolean') return value ? 'Yes' : 'No'

  if (field.type === 'select' && field.options) {
    const opt = field.options.find((o) => o.value === String(value))
    return opt ? opt.label : String(value)
  }

  if (field.type === 'multi-select' && Array.isArray(value) && field.options) {
    return value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ')
  }

  const str = String(value)
  return field.unit ? `${str} ${field.unit}` : str
}
