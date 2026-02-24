'use client'

import * as React from 'react'
import { Loader2, Pencil, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { SURVEY_TYPES } from '@/lib/config/template-types'
import {
  useSurveyTemplates,
  useUpsertSurveyTemplate,
} from '@/hooks/queries/use-template-management-hooks'
import { SurveyTemplateEditor } from '@/components/templates/survey-template-editor'
import type { Database } from '@/types/database'

type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row']

interface SurveyTemplatesTabProps {
  organizationId: string
}

export function SurveyTemplatesTab({ organizationId }: SurveyTemplatesTabProps) {
  const { toast } = useToast()
  const { data: templates, isLoading } = useSurveyTemplates(organizationId)
  const upsertMutation = useUpsertSurveyTemplate(organizationId)
  const [editingSurveyType, setEditingSurveyType] = React.useState<string | null>(null)

  // Map saved templates by survey_type for quick lookup
  const templateMap = React.useMemo(() => {
    const map = new Map<string, SurveyTemplate>()
    templates?.forEach((t) => map.set(t.survey_type, t))
    return map
  }, [templates])

  const handleToggleActive = async (surveyTypeId: string, currentlyActive: boolean) => {
    const existing = templateMap.get(surveyTypeId)
    const surveyType = SURVEY_TYPES.find((s) => s.id === surveyTypeId)
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
        {SURVEY_TYPES.map((surveyType) => {
          const saved = templateMap.get(surveyType.id)
          const isActive = saved ? saved.is_active : true
          const hasCustomization = !!saved

          return (
            <Card key={surveyType.id} className={!isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base">{surveyType.label}</CardTitle>
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
                  <Badge variant={hasCustomization ? 'default' : 'secondary'}>
                    {hasCustomization ? 'Customized' : 'Dulra Standard'}
                  </Badge>
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
    </>
  )
}
