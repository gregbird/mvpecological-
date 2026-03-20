'use client'

import * as React from 'react'
import { Loader2, RotateCcw, Plus, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { FIELD_SURVEY_TYPES } from '@/lib/config/survey-field-definitions'
import {
  getDefaultFieldsForType,
  parseTemplateFields,
  templateFieldsToJson,
} from '@/lib/config/survey-field-definitions'
import type { SurveyTemplateFields, SurveySection } from '@/lib/config/survey-field-definitions'
import { useUpsertSurveyTemplate } from '@/hooks/queries/use-template-management-hooks'
import { SectionEditor } from './survey-template/section-editor'
import { TagListInput } from './survey-template/tag-list-input'
import type { Database } from '@/types/database'

type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row']

interface SurveyTemplateEditorProps {
  organizationId: string
  surveyTypeId: string
  existingTemplate: SurveyTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SurveyTemplateEditor({
  organizationId,
  surveyTypeId,
  existingTemplate,
  open,
  onOpenChange,
}: SurveyTemplateEditorProps) {
  const { toast } = useToast()
  const upsertMutation = useUpsertSurveyTemplate(organizationId)
  const surveyType = FIELD_SURVEY_TYPES.find((s) => s.id === surveyTypeId)
  const isReleve = surveyTypeId === 'releve_survey'

  // Basic info state
  const [name, setName] = React.useState(existingTemplate?.name ?? surveyType?.label ?? '')
  const [description, setDescription] = React.useState(
    existingTemplate?.description ?? surveyType?.description ?? ''
  )
  const [isActive, setIsActive] = React.useState(existingTemplate?.is_active ?? true)

  // Template fields state
  const [templateFields, setTemplateFields] = React.useState<SurveyTemplateFields | null>(() => {
    if (isReleve) return null
    const saved = existingTemplate?.default_fields
      ? parseTemplateFields(existingTemplate.default_fields)
      : null
    return saved ?? getDefaultFieldsForType(surveyTypeId)
  })

  const handleSectionChange = (sectionId: string, updated: SurveySection) => {
    if (!templateFields) return
    setTemplateFields({
      ...templateFields,
      sections: templateFields.sections.map((s) => (s.id === sectionId ? updated : s)),
    })
  }

  const handleAddSection = () => {
    if (!templateFields) return
    const newId = `custom_section_${Date.now()}`
    const newSection: SurveySection = {
      id: newId,
      title: 'New Section',
      description: '',
      enabled: true,
      fields: [],
    }
    setTemplateFields({
      ...templateFields,
      sections: [...templateFields.sections, newSection],
    })
  }

  const handleResetToDefaults = () => {
    const defaults = getDefaultFieldsForType(surveyTypeId)
    if (defaults) {
      setTemplateFields(defaults)
      toast({ title: 'Reset', description: 'Template fields reset to Dulra Standard' })
    }
  }

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        survey_type: surveyTypeId,
        name,
        description: description || null,
        is_active: isActive,
        default_fields: templateFields ? templateFieldsToJson(templateFields) : {},
      })
      toast({ title: 'Template saved', description: `${name} template has been updated` })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save template' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Survey Template</DialogTitle>
          <DialogDescription>
            Customize the {surveyType?.label ?? surveyTypeId} template for your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="st-name">Template Name</Label>
              <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-desc">Description</Label>
              <Input
                id="st-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-gray-500">
                When disabled, this survey type won&apos;t appear in survey creation
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Releve notice */}
          {isReleve && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Dedicated Form System</p>
                <p className="text-sm text-blue-700">
                  Relev&eacute; surveys use their own specialised form with 40+ fields including
                  vegetation heights, cover percentages, species records, and custom fields.
                  Template customisation for Relev&eacute; surveys is managed directly within the
                  survey form using the template save/load feature.
                </p>
              </div>
            </div>
          )}

          {/* Template Field Sections */}
          {!isReleve && templateFields && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Survey Sections & Fields
                </p>
                <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset to Dulra Standard
                </Button>
              </div>

              <div className="space-y-2">
                {templateFields.sections.map((section) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    onChange={(updated) => handleSectionChange(section.id, updated)}
                  />
                ))}

                <Button variant="outline" size="sm" onClick={handleAddSection} className="w-full">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Section
                </Button>
              </div>

              {/* Methodology Guidance */}
              <div className="space-y-2">
                <Label>Methodology Guidance</Label>
                <Textarea
                  rows={3}
                  value={templateFields.methodologyGuidance ?? ''}
                  onChange={(e) =>
                    setTemplateFields({
                      ...templateFields,
                      methodologyGuidance: e.target.value || undefined,
                    })
                  }
                  placeholder="Methodology guidance for surveyors..."
                  className="text-sm"
                />
              </div>

              {/* Target Species */}
              <div className="space-y-2">
                <Label>Target Species</Label>
                <TagListInput
                  value={templateFields.targetSpecies ?? []}
                  onChange={(tags) =>
                    setTemplateFields({
                      ...templateFields,
                      targetSpecies: tags.length > 0 ? tags : undefined,
                    })
                  }
                  placeholder="e.g. Badger, Otter — press Enter to add"
                />
              </div>

              {/* Required Equipment */}
              <div className="space-y-2">
                <Label>Required Equipment</Label>
                <TagListInput
                  value={templateFields.requiredEquipment ?? []}
                  onChange={(tags) =>
                    setTemplateFields({
                      ...templateFields,
                      requiredEquipment: tags.length > 0 ? tags : undefined,
                    })
                  }
                  placeholder="e.g. GPS unit, Camera — press Enter to add"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertMutation.isPending || !name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
