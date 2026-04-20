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
  const initialResolvedTab = React.useMemo((): TabId => {
    if (typeof window === 'undefined') return initialTab
    const cached = sessionStorage.getItem(cacheKey) as TabId | null
    if (cached && FIELD_RESEARCH_TABS.some((t) => t.id === cached)) return cached
    return initialTab
  }, [cacheKey, initialTab])

  const [activeTab, setActiveTab] = React.useState<TabId>(initialResolvedTab)

  // Lazy mount — a tab is only rendered after it has been visited at least
  // once. Once mounted, it stays in the DOM (hidden via data-[state=inactive])
  // so switching back is instant and React Query state is preserved. Without
  // this, Radix Tabs unmounts inactive content, forcing a fresh Leaflet init
  // and query refetch on every tab switch.
  const [visitedTabs, setVisitedTabs] = React.useState<Set<TabId>>(
    () => new Set([initialResolvedTab])
  )

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
    const next = value as TabId
    setActiveTab(next)
    setVisitedTabs((prev) => {
      if (prev.has(next)) return prev
      const copy = new Set(prev)
      copy.add(next)
      return copy
    })
  }

  // All 3 tabs share the same workflow step (step 4: Field Research)
  const stepProps = {
    project,
    workflowStep,
    userId,
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
      {/* Combined header + tab bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-2">
        <TabsList className="grid shrink-0 grid-cols-3">
          {FIELD_RESEARCH_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
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
          {!isComplete && (
            <Button size="sm" onClick={handleComplete} disabled={completeStep.isPending}>
              {completeStep.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Complete Step
            </Button>
          )}
        </div>
      </div>

      {visitedTabs.has('field-survey') && (
        <TabsContent
          value="field-survey"
          forceMount
          className="min-h-0 flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden"
        >
          <FieldSurveyStep {...stepProps} />
        </TabsContent>
      )}

      {visitedTabs.has('habitat-mapping') && (
        <TabsContent
          value="habitat-mapping"
          forceMount
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <HabitatMappingStep {...stepProps} />
        </TabsContent>
      )}

      {visitedTabs.has('target-notes') && (
        <TabsContent
          value="target-notes"
          forceMount
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <TargetNotesStep {...stepProps} />
        </TabsContent>
      )}
    </Tabs>
  )
}
