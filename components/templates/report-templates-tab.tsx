'use client'

import * as React from 'react'
import { Loader2, Pencil, FileText, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { REPORT_TYPES } from '@/lib/config/template-types'
import {
  useReportTemplates,
  useUpsertReportTemplate,
  useDeleteReportTemplate,
} from '@/hooks/queries/use-template-management-hooks'
import { ReportTemplateEditor } from '@/components/templates/report-template-editor'
import { NewReportTemplateDialog } from '@/components/templates/new-report-template-dialog'
import type { Database } from '@/types/database'

type ReportTemplate = Database['public']['Tables']['report_templates']['Row']

// Predefined report type IDs that cannot be deleted
const PREDEFINED_IDS = new Set(REPORT_TYPES.map((r) => r.id))

interface ReportTemplatesTabProps {
  organizationId: string
}

export function ReportTemplatesTab({ organizationId }: ReportTemplatesTabProps) {
  const { toast } = useToast()
  const { data: templates, isLoading } = useReportTemplates(organizationId)
  const upsertMutation = useUpsertReportTemplate(organizationId)
  const deleteMutation = useDeleteReportTemplate(organizationId)
  const [editingReportType, setEditingReportType] = React.useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = React.useState(false)

  // Map saved templates by report_type for quick lookup
  const templateMap = React.useMemo(() => {
    const map = new Map<string, ReportTemplate>()
    templates?.forEach((t) => map.set(t.report_type, t))
    return map
  }, [templates])

  // Custom templates from DB that are not predefined
  const customTemplates = React.useMemo(() => {
    return (templates ?? []).filter((t) => !PREDEFINED_IDS.has(t.report_type))
  }, [templates])

  const handleToggleCustom = async (reportTypeId: string, currentlyCustom: boolean) => {
    const existing = templateMap.get(reportTypeId)
    const reportType = REPORT_TYPES.find((r) => r.id === reportTypeId)
    if (!reportType) return

    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        report_type: reportTypeId,
        name: existing?.name ?? reportType.name,
        description: existing?.description ?? reportType.description,
        use_custom: !currentlyCustom,
        sections: existing?.sections ?? null,
      })
      toast({
        title: currentlyCustom ? 'Switched to Dulra Standard' : 'Switched to Custom Template',
        description: `${reportType.name} template updated`,
      })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update template' })
    }
  }

  const handleDeleteCustom = async (template: ReportTemplate) => {
    try {
      await deleteMutation.mutateAsync(template.id)
      toast({ title: 'Template deleted', description: `${template.name} has been removed` })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete template' })
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
        {/* Predefined report types */}
        {REPORT_TYPES.map((reportType) => {
          const saved = templateMap.get(reportType.id)
          const useCustom = saved?.use_custom ?? false

          return (
            <Card key={reportType.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">{saved?.name ?? reportType.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {saved?.description ?? reportType.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={useCustom ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleCustom(reportType.id, useCustom)}
                    >
                      {useCustom ? 'Custom' : 'Dulra Standard'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingReportType(reportType.id)}
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
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm">
                {template.description ?? 'Custom template'}
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
                    onClick={() => setEditingReportType(template.report_type)}
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

      {editingReportType && (
        <ReportTemplateEditor
          organizationId={organizationId}
          reportTypeId={editingReportType}
          existingTemplate={templateMap.get(editingReportType) ?? null}
          open={!!editingReportType}
          onOpenChange={(open) => {
            if (!open) setEditingReportType(null)
          }}
        />
      )}

      <NewReportTemplateDialog
        organizationId={organizationId}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />
    </>
  )
}
