'use client'

import * as React from 'react'
import { Loader2, Pencil, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { REPORT_TYPES } from '@/lib/config/template-types'
import {
  useReportTemplates,
  useUpsertReportTemplate,
} from '@/hooks/queries/use-template-management-hooks'
import { ReportTemplateEditor } from '@/components/templates/report-template-editor'
import type { Database } from '@/types/database'

type ReportTemplate = Database['public']['Tables']['report_templates']['Row']

interface ReportTemplatesTabProps {
  organizationId: string
}

export function ReportTemplatesTab({ organizationId }: ReportTemplatesTabProps) {
  const { toast } = useToast()
  const { data: templates, isLoading } = useReportTemplates(organizationId)
  const upsertMutation = useUpsertReportTemplate(organizationId)
  const [editingReportType, setEditingReportType] = React.useState<string | null>(null)

  // Map saved templates by report_type for quick lookup
  const templateMap = React.useMemo(() => {
    const map = new Map<string, ReportTemplate>()
    templates?.forEach((t) => map.set(t.report_type, t))
    return map
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
        {REPORT_TYPES.map((reportType) => {
          const saved = templateMap.get(reportType.id)
          const useCustom = saved?.use_custom ?? false

          return (
            <Card key={reportType.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">{reportType.name}</CardTitle>
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
    </>
  )
}
