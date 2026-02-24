'use client'

import * as React from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  REPORT_TYPES,
  PEA_DEFAULT_SECTIONS,
  DEFAULT_SECTIONS_BY_TYPE,
} from '@/lib/config/template-types'
import { useUpsertReportTemplate } from '@/hooks/queries/use-template-management-hooks'
import { jsonToSections, sectionsToJson } from '@/lib/supabase/queries/templates'
import type { TemplateSectionData } from '@/lib/supabase/queries/templates'
import type { Database } from '@/types/database'

type ReportTemplate = Database['public']['Tables']['report_templates']['Row']

interface ReportTemplateEditorProps {
  organizationId: string
  reportTypeId: string
  existingTemplate: ReportTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportTemplateEditor({
  organizationId,
  reportTypeId,
  existingTemplate,
  open,
  onOpenChange,
}: ReportTemplateEditorProps) {
  const { toast } = useToast()
  const upsertMutation = useUpsertReportTemplate(organizationId)
  const reportType = REPORT_TYPES.find((r) => r.id === reportTypeId)

  // Initialize sections from existing template or defaults (type-specific)
  const getDefaultSections = (): TemplateSectionData[] => {
    const typeSections = DEFAULT_SECTIONS_BY_TYPE[reportTypeId] ?? PEA_DEFAULT_SECTIONS
    return typeSections.map((s) => ({
      id: s.id,
      title: s.title,
      template: s.defaultTemplate,
    }))
  }

  const templateDisplayName = existingTemplate?.name ?? reportType?.name ?? 'Custom Template'
  const [name, setName] = React.useState(templateDisplayName)
  const [description, setDescription] = React.useState(
    existingTemplate?.description ?? reportType?.description ?? ''
  )
  const [useCustom, setUseCustom] = React.useState(existingTemplate?.use_custom ?? false)
  const [sections, setSections] = React.useState<TemplateSectionData[]>(() => {
    const saved = existingTemplate?.sections ? jsonToSections(existingTemplate.sections) : []
    return saved.length > 0 ? saved : getDefaultSections()
  })

  const handleSectionChange = (sectionId: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, template: value } : s)))
  }

  const handleResetToDefault = () => {
    setSections(getDefaultSections())
    toast({ title: 'Reset to defaults', description: 'Sections have been reset to Dulra Standard' })
  }

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        report_type: reportTypeId,
        name,
        description: description || null,
        use_custom: useCustom,
        sections: useCustom ? sectionsToJson(sections) : null,
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
          <DialogTitle>Edit Report Template</DialogTitle>
          <DialogDescription>
            Customize the {templateDisplayName} template for your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description</Label>
              <Input
                id="template-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Use Custom toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Use Custom Template</p>
              <p className="text-sm text-gray-500">
                When enabled, your custom section content will be used instead of the Dulra Standard
              </p>
            </div>
            <Switch checked={useCustom} onCheckedChange={setUseCustom} />
          </div>

          {/* Section editor */}
          {useCustom && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Report Sections</p>
                <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset to Dulra Standard
                </Button>
              </div>

              <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-800">
                Use <code className="rounded bg-amber-100 px-1">{'{{placeholder}}'}</code> syntax
                for dynamic content. Available: <code>{'{{project_name}}'}</code>,{' '}
                <code>{'{{site_location}}'}</code>, <code>{'{{survey_date}}'}</code>,{' '}
                <code>{'{{site_description}}'}</code>, <code>{'{{grid_reference}}'}</code>
              </div>

              <Tabs defaultValue={sections[0]?.id} className="space-y-3">
                <TabsList className="flex-wrap">
                  {sections.map((section) => (
                    <TabsTrigger key={section.id} value={section.id} className="text-xs">
                      {section.title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {sections.map((section) => (
                  <TabsContent key={section.id} value={section.id}>
                    <Textarea
                      rows={8}
                      value={section.template}
                      onChange={(e) => handleSectionChange(section.id, e.target.value)}
                      className="font-mono text-sm"
                      placeholder={`Enter template content for ${section.title}...`}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
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
