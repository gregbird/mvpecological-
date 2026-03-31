'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Sparkles, Brain } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useProjectDeepResearch } from '@/hooks/queries/use-deep-research-hooks'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { BaselineReportTab } from '@/components/steps/desk-assessment/baseline-report-tab'
import type { Project } from '@/types/database'

interface DeskAssessmentAnalysisSectionProps {
  projectId: string
  siteId?: string | null
  project: Project
}

export function DeskAssessmentAnalysisSection({
  projectId,
  siteId,
  project,
}: DeskAssessmentAnalysisSectionProps) {
  const { data: deskAssessmentStep } = useWorkflowStep(projectId, 3)
  const { data: deepResearch = [] } = useProjectDeepResearch(projectId)
  const { data: savedFindings = [], isLoading } = useSavedFindings(projectId, siteId)

  const deskInsights = React.useMemo(() => {
    const meta = deskAssessmentStep?.metadata as Record<string, unknown> | null
    if (meta?.aiInsights && typeof meta.aiInsights === 'string') {
      return meta.aiInsights
    }
    return null
  }, [deskAssessmentStep?.metadata])

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Deep Research Summary */}
      {deepResearch.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Deep Research ({deepResearch.length} sites analysed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {deepResearch.map((r) => (
                <Badge key={r.id} variant="secondary">
                  {r.site_code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights (readonly) */}
      {deskInsights ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Generated Desk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deskInsights}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground text-sm">
              No desk assessment insights available. Generate AI Analysis in Step 3 first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Baseline Report Sections (reused from Step 3) */}
      {savedFindings.length > 0 && (
        <BaselineReportTab savedFindings={savedFindings} project={project} hideExport />
      )}
    </div>
  )
}
