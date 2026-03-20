'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { SurveyTemplatesTab } from '@/components/templates/survey-templates-tab'
import { ReportTemplatesTab } from '@/components/templates/report-templates-tab'

export default function TemplatesPage() {
  const router = useRouter()
  const { user, permissions, isLoading: isRoleLoading } = useRole()

  // Check permissions
  React.useEffect(() => {
    if (!isRoleLoading && !permissions.canManageTemplates) {
      router.push('/projects')
    }
  }, [isRoleLoading, permissions.canManageTemplates, router])

  if (isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const organizationId = user?.organization_id

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-emerald-600" />
          <div>
            <h1 className="text-foreground text-2xl font-bold">Surveys & Reports</h1>
            <p className="mt-1 text-gray-600">
              Manage your organization&apos;s survey and report templates
            </p>
          </div>
        </div>
      </div>

      {!organizationId ? (
        <div className="py-16 text-center text-gray-500">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p>No organization found. Please contact your administrator.</p>
        </div>
      ) : (
        <Tabs defaultValue="survey-templates" className="space-y-6">
          <TabsList className="bg-background">
            <TabsTrigger value="survey-templates">Survey Templates</TabsTrigger>
            <TabsTrigger value="report-templates">Report Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="survey-templates">
            <SurveyTemplatesTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="report-templates">
            <ReportTemplatesTab organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
