'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SITE_ATTRIBUTE_FIELDS, type SiteAttributeField } from '@/lib/config/site-attributes'

interface AttributeEditorProps {
  attributes: Record<string, unknown>
  onChange: (attributes: Record<string, unknown>) => void
  /** Extra attribute keys from shapefile that aren't in the predefined list */
  extraKeys?: string[]
  readOnly?: boolean
}

export function AttributeEditor({
  attributes,
  onChange,
  extraKeys = [],
  readOnly = false,
}: AttributeEditorProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...attributes, [key]: value })
  }

  // Merge predefined + extra keys
  const allFields: SiteAttributeField[] = [
    ...SITE_ATTRIBUTE_FIELDS,
    ...extraKeys
      .filter((k) => !SITE_ATTRIBUTE_FIELDS.some((f) => f.key === k))
      .map((k) => ({ key: k, label: k, type: 'text' as const })),
  ]

  // Count filled attributes
  const filledCount = allFields.filter(
    (f) => attributes[f.key] !== undefined && attributes[f.key] !== '' && attributes[f.key] !== null
  ).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        Attributes
        <span className="text-muted-foreground text-xs">
          ({filledCount}/{allFields.length})
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2 pl-5">
        {allFields.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <label
              className="text-muted-foreground w-24 shrink-0 text-xs"
              title={field.description}
            >
              {field.label}
            </label>

            {field.type === 'select' && field.options ? (
              <Select
                value={(attributes[field.key] as string) ?? ''}
                onValueChange={(v) => handleChange(field.key, v)}
                disabled={readOnly || field.auto}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={(attributes[field.key] as string) ?? ''}
                onChange={(e) =>
                  handleChange(
                    field.key,
                    field.type === 'number' ? Number(e.target.value) : e.target.value
                  )
                }
                disabled={readOnly || field.auto}
                className="h-7 flex-1 text-xs"
                placeholder="—"
              />
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
