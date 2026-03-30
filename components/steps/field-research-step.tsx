'use client'

import * as React from 'react'
import { Clipboard, Map, Target, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { FieldSurveyStep } from './field-survey-step'
import { HabitatMappingStep } from './habitat-mapping-step'
import { TargetNotesStep } from './target-notes'
import type { Project, WorkflowStep } from '@/types/database'

const FIELD_RESEARCH_TABS = [
  { id: 'field-survey', label: 'Field Survey', icon: Clipboard },
  { id: 'habitat-mapping', label: 'Habitat Mapping', icon: Map },
  { id: 'target-notes', label: 'Target Notes', icon: Target },
] as const

type TabId = (typeof FIELD_RESEARCH_TABS)[number]['id']

interface FieldResearchStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
  initialTab?: TabId
}

export function FieldResearchStep({
  project,
  workflowStep,
  userId,
  onComplete,
  initialTab = 'field-survey',
}: FieldResearchStepProps) {
  const { toast } = useToast()
  const completeStep = useCompleteWorkflowStep()
  const cacheKey = `field-research-tab-${project.id}`
  const [activeTab, setActiveTab] = React.useState<TabId>(() => {
    if (typeof window === 'undefined') return initialTab
    const cached = sessionStorage.getItem(cacheKey) as TabId | null
    if (cached && FIELD_RESEARCH_TABS.some((t) => t.id === cached)) return cached
    return initialTab
  })

  // Persist tab selection
  React.useEffect(() => {
    sessionStorage.setItem(cacheKey, activeTab)
  }, [activeTab, cacheKey])

  const isComplete = workflowStep.status === 'approved'

  const handleComplete = async () => {
    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Field Research has been completed. Moving to Data Analysis.',
      })

      onComplete?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId)
  }

  // All 3 tabs share the same workflow step (step 4: Field Research)
  const stepProps = {
    project,
    workflowStep,
    userId,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 4: Field Research</h2>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isComplete
                ? 'default'
                : workflowStep.status === 'in_progress'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {isComplete
              ? 'Completed'
              : workflowStep.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
          </Badge>
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={isComplete || completeStep.isPending}
          >
            {completeStep.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isComplete ? 'Completed' : 'Complete Step'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          {FIELD_RESEARCH_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="field-survey" className="mt-4">
          <FieldSurveyStep {...stepProps} />
        </TabsContent>

        <TabsContent value="habitat-mapping" className="mt-4">
          <HabitatMappingStep {...stepProps} />
        </TabsContent>

        <TabsContent value="target-notes" className="mt-4">
          <TargetNotesStep {...stepProps} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
