'use client'

import * as React from 'react'
import { Loader2, Pencil, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  FIELD_SURVEY_TYPES,
  parseTemplateFields,
  countTemplateFields,
} from '@/lib/config/survey-field-definitions'
import {
  useSurveyTemplates,
  useUpsertSurveyTemplate,
  useDeleteSurveyTemplate,
} from '@/hooks/queries/use-template-management-hooks'
import { SurveyTemplateEditor } from '@/components/templates/survey-template-editor'
import { NewSurveyTemplateDialog } from '@/components/templates/new-survey-template-dialog'
import type { Database } from '@/types/database'

type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row']

// Predefined survey type IDs that cannot be deleted
const PREDEFINED_IDS = new Set(FIELD_SURVEY_TYPES.map((s) => s.id))

interface SurveyTemplatesTabProps {
  organizationId: string
}

export function SurveyTemplatesTab({ organizationId }: SurveyTemplatesTabProps) {
  const { toast } = useToast()
  const { data: templates, isLoading } = useSurveyTemplates(organizationId)
  const upsertMutation = useUpsertSurveyTemplate(organizationId)
  const deleteMutation = useDeleteSurveyTemplate(organizationId)
  const [editingSurveyType, setEditingSurveyType] = React.useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = React.useState(false)

  // Map saved templates by survey_type for quick lookup
  const templateMap = React.useMemo(() => {
    const map = new Map<string, SurveyTemplate>()
    templates?.forEach((t) => map.set(t.survey_type, t))
    return map
  }, [templates])

  // Custom templates from DB that are not predefined
  const customTemplates = React.useMemo(() => {
    return (templates ?? []).filter((t) => !PREDEFINED_IDS.has(t.survey_type))
  }, [templates])

  const handleDeleteCustom = async (template: SurveyTemplate) => {
    try {
      await deleteMutation.mutateAsync(template.id)
      toast({ title: 'Template deleted', description: `${template.name} has been removed` })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete template' })
    }
  }

  const handleToggleActive = async (surveyTypeId: string, currentlyActive: boolean) => {
    const existing = templateMap.get(surveyTypeId)
    const surveyType = FIELD_SURVEY_TYPES.find((s) => s.id === surveyTypeId)
    if (!surveyType) return

    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        survey_type: surveyTypeId,
        name: existing?.name ?? surveyType.label,
        description: existing?.description ?? surveyType.description,
        is_active: !currentlyActive,
        default_fields: existing?.default_fields ?? {},
      })
      toast({
        title: currentlyActive ? 'Template disabled' : 'Template enabled',
        description: `${surveyType.label} has been ${currentlyActive ? 'disabled' : 'enabled'}`,
      })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update template' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELD_SURVEY_TYPES.map((surveyType) => {
          const saved = templateMap.get(surveyType.id)
          const isActive = saved ? saved.is_active : true
          const parsedFields = saved?.default_fields
            ? parseTemplateFields(saved.default_fields)
            : null
          const hasCustomization = !!parsedFields
          const fieldCount = parsedFields ? countTemplateFields(parsedFields) : 0
          const isReleve = surveyType.id === 'releve_survey'

          return (
            <Card key={surveyType.id} className={!isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base">{saved?.name ?? surveyType.label}</CardTitle>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggleActive(surveyType.id, isActive)}
                  />
                </div>
                <CardDescription className="text-sm">
                  {saved?.description ?? surveyType.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={hasCustomization ? 'default' : 'secondary'}>
                      {hasCustomization ? 'Customized' : 'Dulra Standard'}
                    </Badge>
                    {hasCustomization && fieldCount > 0 && (
                      <span className="text-xs text-gray-500">
                        {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isReleve && (
                      <Badge variant="outline" className="text-xs">
                        Dedicated Form
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSurveyType(surveyType.id)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Custom templates from DB */}
        {customTemplates.map((template) => (
          <Card key={template.id} className="border-emerald-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={() =>
                    handleToggleActive(template.survey_type, template.is_active)
                  }
                />
              </div>
              <CardDescription className="text-sm">
                {template.description ?? 'Custom survey template'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-emerald-600">
                  Custom
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSurveyType(template.survey_type)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteCustom(template)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Create New Template card */}
        <Card
          className="flex cursor-pointer items-center justify-center border-dashed border-gray-300 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-gray-600 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30"
          onClick={() => setShowNewDialog(true)}
        >
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <Plus className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-500">Create New Template</p>
          </CardContent>
        </Card>
      </div>

      {editingSurveyType && (
        <SurveyTemplateEditor
          organizationId={organizationId}
          surveyTypeId={editingSurveyType}
          existingTemplate={templateMap.get(editingSurveyType) ?? null}
          open={!!editingSurveyType}
          onOpenChange={(open) => {
            if (!open) setEditingSurveyType(null)
          }}
        />
      )}

      <NewSurveyTemplateDialog
        organizationId={organizationId}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />
    </>
  )
}
