'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useWorkflowStep, useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'

type TabContext = 'desk-assessment' | 'field-survey' | 'habitats' | 'target-notes'

interface CreateSummaryButtonProps {
  projectId: string
  siteId?: string | null
  tabContext: TabContext
  /** Step number for Data Analysis (5) */
  stepNumber?: number
}

const METADATA_KEY_MAP: Record<TabContext, string> = {
  'desk-assessment': 'dataSummary_deskAssessment',
  'field-survey': 'dataSummary_fieldSurvey',
  habitats: 'dataSummary_habitats',
  'target-notes': 'dataSummary_targetNotes',
}

export function CreateSummaryButton({
  projectId,
  siteId,
  tabContext,
  stepNumber = 5,
}: CreateSummaryButtonProps) {
  const { toast } = useToast()
  const { data: workflowStep } = useWorkflowStep(projectId, stepNumber)
  const updateStep = useUpdateWorkflowStep()
  const [isGenerating, setIsGenerating] = React.useState(false)

  const metadataKey = METADATA_KEY_MAP[tabContext]

  const existingSummary = React.useMemo(() => {
    const meta = workflowStep?.metadata as Record<string, unknown> | null
    if (meta?.[metadataKey] && typeof meta[metadataKey] === 'string') {
      return meta[metadataKey] as string
    }
    return null
  }, [workflowStep?.metadata, metadataKey])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/data-analysis-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tabContext, siteId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate summary')
      }

      const { summary } = await res.json()

      // Save to workflow step metadata
      if (workflowStep) {
        const existingMeta = (workflowStep.metadata as Record<string, unknown>) || {}
        await updateStep.mutateAsync({
          stepId: workflowStep.id,
          updates: {
            metadata: {
              ...existingMeta,
              [metadataKey]: summary,
              [`${metadataKey}_updatedAt`]: new Date().toISOString(),
            },
          },
        })
      }

      toast({ title: 'Summary generated' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate summary',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : existingSummary ? (
            <RefreshCw className="mr-2 h-4 w-4" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isGenerating
            ? 'Generating...'
            : existingSummary
              ? 'Regenerate Summary'
              : 'Create a Summary'}
        </Button>
      </div>

      {existingSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{existingSummary}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
