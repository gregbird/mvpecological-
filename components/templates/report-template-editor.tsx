'use client'

import * as React from 'react'
import { Loader2, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import {
  REPORT_TYPES,
  DEFAULT_SECTIONS_BY_TYPE,
  OTHER_DEFAULT_SECTIONS,
} from '@/lib/config/template-types'
import { useUpsertReportTemplate } from '@/hooks/queries/use-template-management-hooks'
import { jsonToSections, sectionsToJson, slugifySectionId } from '@/lib/supabase/queries/templates'
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
  const getDefaultSections = React.useCallback((): TemplateSectionData[] => {
    const typeSections = DEFAULT_SECTIONS_BY_TYPE[reportTypeId] ?? OTHER_DEFAULT_SECTIONS
    return typeSections.map((s) => ({
      id: s.id,
      title: s.title,
      template: s.defaultTemplate,
      aiPrompt: s.aiPrompt,
    }))
  }, [reportTypeId])

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

  const handleTitleChange = (sectionId: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title: value } : s)))
  }

  const handleTemplateChange = (sectionId: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, template: value } : s)))
  }

  const handleAiPromptChange = (sectionId: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, aiPrompt: value } : s)))
  }

  const handleAddSection = () => {
    setSections((prev) => {
      const id = slugifySectionId(
        `Section ${prev.length + 1}`,
        prev.map((s) => s.id)
      )
      return [
        ...prev,
        {
          id,
          title: `${prev.length + 1}. New Section`,
          template: '',
          aiPrompt: '',
        },
      ]
    })
  }

  const handleRemoveSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
  }

  const handleMove = (sectionId: string, direction: 'up' | 'down') => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId)
      if (index === -1) return prev
      const swapWith = direction === 'up' ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      return next
    })
  }

  const handleResetToDefault = () => {
    setSections(getDefaultSections())
    toast({ title: 'Reset to defaults', description: 'Sections have been reset to Dulra Standard' })
  }

  const handleSave = async () => {
    // Validate: no empty titles, no duplicate ids
    const trimmed = sections.map((s) => ({
      ...s,
      title: s.title.trim(),
    }))
    if (trimmed.some((s) => !s.title)) {
      toast({
        variant: 'destructive',
        title: 'Empty section title',
        description: 'Every section must have a title.',
      })
      return
    }
    const ids = new Set<string>()
    for (const s of trimmed) {
      if (ids.has(s.id)) {
        toast({
          variant: 'destructive',
          title: 'Duplicate section id',
          description: `Section "${s.title}" shares an id with another section.`,
        })
        return
      }
      ids.add(s.id)
    }

    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        report_type: reportTypeId,
        name,
        description: description || null,
        use_custom: useCustom,
        sections: useCustom ? sectionsToJson(trimmed) : null,
      })
      toast({ title: 'Template saved', description: `${name} template has been updated` })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save template' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Edit Report Template</DialogTitle>
          <DialogDescription>
            Customize the {templateDisplayName} template for your organization
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
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
              <p className="text-muted-foreground text-sm">
                When enabled, your custom sections (structure + content) will be used in the AI
                draft, quality review, and final export.
              </p>
            </div>
            <Switch checked={useCustom} onCheckedChange={setUseCustom} />
          </div>

          {/* Section editor */}
          {useCustom && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Report Sections ({sections.length})</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset to Default
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleAddSection}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Section
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Use{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                  {'{{placeholder}}'}
                </code>{' '}
                syntax for dynamic content. Available: <code>{'{{project_name}}'}</code>,{' '}
                <code>{'{{site_location}}'}</code>, <code>{'{{survey_date}}'}</code>,{' '}
                <code>{'{{site_description}}'}</code>, <code>{'{{grid_reference}}'}</code>
              </div>

              {sections.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  No sections yet. Click <strong>Add Section</strong> to start, or{' '}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={handleResetToDefault}
                  >
                    reset to default
                  </button>
                  .
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      index={index}
                      total={sections.length}
                      onTitleChange={handleTitleChange}
                      onTemplateChange={handleTemplateChange}
                      onAiPromptChange={handleAiPromptChange}
                      onRemove={handleRemoveSection}
                      onMove={handleMove}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
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

interface SectionRowProps {
  section: TemplateSectionData
  index: number
  total: number
  onTitleChange: (id: string, value: string) => void
  onTemplateChange: (id: string, value: string) => void
  onAiPromptChange: (id: string, value: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

function SectionRow({
  section,
  index,
  total,
  onTitleChange,
  onTemplateChange,
  onAiPromptChange,
  onRemove,
  onMove,
}: SectionRowProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  return (
    <div className="bg-card space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={index === 0}
            onClick={() => onMove(section.id, 'up')}
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={index === total - 1}
            onClick={() => onMove(section.id, 'down')}
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span className="text-muted-foreground w-6 shrink-0 text-xs tabular-nums">
          {index + 1}.
        </span>
        <Input
          value={section.title}
          onChange={(e) => onTitleChange(section.id, e.target.value)}
          placeholder="Section title"
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
          onClick={() => onRemove(section.id)}
          title="Remove section"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Textarea
        rows={5}
        value={section.template}
        onChange={(e) => onTemplateChange(section.id, e.target.value)}
        className="font-mono text-sm"
        placeholder={`Enter template content for ${section.title || 'this section'}…`}
      />

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground h-7 px-2 text-xs">
            {advancedOpen ? 'Hide' : 'Show'} advanced (id, AI prompt)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <div className="grid gap-2">
            <Label className="text-xs">Section id (read-only)</Label>
            <Input value={section.id} disabled className="font-mono text-xs" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">AI prompt hint</Label>
            <Textarea
              rows={2}
              value={section.aiPrompt ?? ''}
              onChange={(e) => onAiPromptChange(section.id, e.target.value)}
              placeholder="Optional — guidance for the AI when generating this section."
              className="text-xs"
            />
            <p className="text-muted-foreground text-[11px]">
              Used by the section-level AI generate button. If empty, the AI falls back to a generic
              prompt for this section title.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
