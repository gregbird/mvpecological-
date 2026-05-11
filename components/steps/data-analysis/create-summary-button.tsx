'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Sparkles, RefreshCw, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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

const BASE_METADATA_KEY_MAP: Record<TabContext, string> = {
  'desk-assessment': 'dataSummary_deskAssessment',
  'field-survey': 'dataSummary_fieldSurvey',
  habitats: 'dataSummary_habitats',
  'target-notes': 'dataSummary_targetNotes',
}

function getMetadataKey(tabContext: TabContext, siteId?: string | null): string {
  const base = BASE_METADATA_KEY_MAP[tabContext]
  return `${base}_${siteId ?? 'all'}`
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
  const [summaryOpen, setSummaryOpen] = React.useState(true)

  const metadataKey = getMetadataKey(tabContext, siteId)

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
        const rawMeta = workflowStep.metadata as unknown
        const existingMeta =
          typeof rawMeta === 'object' && rawMeta !== null && !Array.isArray(rawMeta)
            ? (rawMeta as Record<string, unknown>)
            : {}
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

  // No summary yet — render a bare button (no card)
  if (!existingSummary) {
    return (
      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isGenerating ? 'Generating...' : 'Create a Summary'}
      </Button>
    )
  }

  // Summary exists — render single combined collapsible card with regenerate in the header
  return (
    <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:text-foreground/80 flex flex-1 items-center justify-between gap-2 text-left"
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Summary
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 transition-transform',
                    summaryOpen && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              <span className="text-xs">{isGenerating ? 'Generating...' : 'Regenerate'}</span>
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{existingSummary}</ReactMarkdown>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
