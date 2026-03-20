'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, BookOpen, Tag, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DynamicFieldRenderer } from './dynamic-field-renderer'
import type { SurveyTemplateFields } from '@/lib/config/survey-field-definitions'

type FieldValue = string | number | boolean | string[] | null

interface TemplateSectionsRendererProps {
  templateFields: SurveyTemplateFields
  values: Record<string, FieldValue>
  onChange: (key: string, value: FieldValue) => void
  readOnly?: boolean
}

export function TemplateSectionsRenderer({
  templateFields,
  values,
  onChange,
  readOnly,
}: TemplateSectionsRendererProps) {
  const enabledSections = templateFields.sections.filter((s) => s.enabled)

  return (
    <div className="space-y-4">
      {enabledSections.map((section) => (
        <CollapsibleSection key={section.id} title={section.title}>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <DynamicFieldRenderer
                  field={field}
                  value={values[field.key]}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ))}

      {/* Methodology Guidance */}
      {templateFields.methodologyGuidance && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Methodology Guidance</span>
          </div>
          <p className="text-xs text-blue-700">{templateFields.methodologyGuidance}</p>
        </div>
      )}

      {/* Target Species & Equipment as inline badges */}
      {((templateFields.targetSpecies && templateFields.targetSpecies.length > 0) ||
        (templateFields.requiredEquipment && templateFields.requiredEquipment.length > 0)) && (
        <div className="flex flex-wrap gap-4 text-xs">
          {templateFields.targetSpecies && templateFields.targetSpecies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500">Target:</span>
              {templateFields.targetSpecies.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {templateFields.requiredEquipment && templateFields.requiredEquipment.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500">Equipment:</span>
              {templateFields.requiredEquipment.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs">
                  {e}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
      </button>
      {open && <div className="border-t px-3 py-3">{children}</div>}
    </div>
  )
}
