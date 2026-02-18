'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Check, Sparkles, Brain, Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useWorkflowStep, useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useProjectDeepResearch } from '@/hooks/queries/use-deep-research-hooks'

interface DeskAssessmentTabProps {
  projectId: string
}

export function DeskAssessmentTab({ projectId }: DeskAssessmentTabProps) {
  const { toast } = useToast()
  const { data: deskAssessmentStep } = useWorkflowStep(projectId, 3)
  const { data: deepResearch = [] } = useProjectDeepResearch(projectId)
  const updateStep = useUpdateWorkflowStep()

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedInsights, setEditedInsights] = React.useState('')

  const deskInsights = React.useMemo(() => {
    const meta = deskAssessmentStep?.metadata as Record<string, unknown> | null
    if (meta?.aiInsights && typeof meta.aiInsights === 'string') {
      return meta.aiInsights
    }
    return null
  }, [deskAssessmentStep?.metadata])

  const handleSaveInsights = React.useCallback(() => {
    if (!deskAssessmentStep) return
    const existingMeta = (deskAssessmentStep.metadata as Record<string, unknown>) || {}
    updateStep
      .mutateAsync({
        stepId: deskAssessmentStep.id,
        updates: {
          metadata: {
            ...existingMeta,
            aiInsights: editedInsights,
            aiInsightsUpdatedAt: new Date().toISOString(),
          },
        },
      })
      .then(() => {
        setIsEditing(false)
        toast({
          title: 'Insights saved',
          description: 'Desk assessment insights have been updated.',
        })
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save insights.',
        })
      })
  }, [deskAssessmentStep, editedInsights, updateStep, toast])

  return (
    <div className="space-y-4 p-4">
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

      {/* AI Insights */}
      {deskInsights ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI-Generated Desk Assessment
              </CardTitle>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveInsights}
                      disabled={updateStep.isPending}
                    >
                      {updateStep.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3 w-3" />
                      )}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedInsights(deskInsights)
                      setIsEditing(true)
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedInsights}
                onChange={(e) => setEditedInsights(e.target.value)}
                className="min-h-[500px] w-full resize-none font-mono text-sm"
                placeholder="Edit the desk assessment insights in markdown..."
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{deskInsights}</ReactMarkdown>
              </div>
            )}
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
    </div>
  )
}
