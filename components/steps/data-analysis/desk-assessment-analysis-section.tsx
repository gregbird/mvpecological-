'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Sparkles, Brain, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
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
  const { data: savedFindings = [], isLoading } = useSavedFindings(projectId, siteId)
  const [insightsOpen, setInsightsOpen] = React.useState(true)

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
      {/* AI Insights (collapsible) */}
      {deskInsights ? (
        <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI-Generated Desk Assessment
                  </span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-4 w-4 transition-transform',
                      insightsOpen && 'rotate-180'
                    )}
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{deskInsights}</ReactMarkdown>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="text-muted-foreground mb-3 h-10 w-10" />
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
