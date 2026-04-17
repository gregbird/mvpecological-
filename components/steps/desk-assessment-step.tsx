'use client'

import * as React from 'react'
import { Loader2, Check, AlertCircle, FileText, MapPin, Network } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { useUpdateWorkflowStep, useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useProjectContext } from '@/contexts/project-context'
import { useAiInsights } from '@/hooks/steps/use-ai-insights'
import { useDeskExport } from '@/hooks/steps/use-desk-export'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { useSpatialFilter } from '@/hooks/shared/use-spatial-filter'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import { SiteSelector } from '@/components/project/site-selector'
import {
  BaselineReportTab,
  type HabitatRow,
} from '@/components/steps/desk-assessment/baseline-report-tab'
import { DeepResearchTab } from '@/components/steps/desk-assessment/deep-research-tab'
import { EvidenceMatrixTab } from '@/components/steps/desk-assessment/evidence-matrix/evidence-matrix-tab'
import { ExportMenu } from '@/components/steps/desk-assessment/export-menu'
import { AiSummarySection } from '@/components/steps/desk-assessment/ai-summary-section'
import { DataSummaryCards } from '@/components/steps/desk-assessment/data-summary-cards'
import {
  AssessmentDialog,
  type FindingWithRelevance,
  type Relevance,
} from '@/components/steps/desk-assessment/assessment-dialog'
import type { Project, WorkflowStep, DeskResearchFinding } from '@/types/database'

interface DeskAssessmentStepProps {
  project: Project
  workflowStep: WorkflowStep
  onComplete?: () => void
}

export function DeskAssessmentStep({ project, workflowStep, onComplete }: DeskAssessmentStepProps) {
  const { toast } = useToast()
  const { refetchWorkflowSteps } = useProjectContext()

  // State
  const [selectedFinding, setSelectedFinding] = React.useState<FindingWithRelevance | null>(null)
  const [habitatRows, setHabitatRows] = React.useState<HabitatRow[]>([])
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null)

  // Findings are project-wide (designated sites, species, catchments have
  // site_id=NULL). Spatial filtering narrows to the selected site's buffer.
  const { data: allSavedFindings = [], isLoading } = useSavedFindings(project.id)
  const updateWorkflowStep = useUpdateWorkflowStep()
  const completeStep = useCompleteWorkflowStep()

  // Resolve selected site for spatial filtering
  const { data: projectSites = [] } = useProjectSites(project.id)
  const selectedSite = React.useMemo(
    () => (selectedSiteId ? (projectSites.find((s) => s.id === selectedSiteId) ?? null) : null),
    [selectedSiteId, projectSites]
  )
  const { projectBoundary } = useProjectBoundary(project, selectedSite)
  const getLocation = React.useCallback(
    (f: DeskResearchFinding) => (f.location as GeoJSON.Geometry | null) ?? undefined,
    []
  )
  const { filteredItems: savedFindings } = useSpatialFilter({
    boundary: projectBoundary,
    bufferKm: project.buffer_distances?.[project.buffer_distances.length - 1] ?? 15,
    items: allSavedFindings,
    getGeometry: getLocation,
    disabled: !selectedSiteId,
  })

  // AI insights hook
  const projectLocation =
    [project.townland, project.county, project.province].filter(Boolean).join(', ') || 'Ireland'

  const { insights, isGenerating, generate, setInsights, persistInsights } = useAiInsights({
    workflowStep,
    projectId: project.id,
    projectName: project.name,
    projectLocation,
    savedFindings,
    siteId: selectedSiteId,
  })

  // Export hook
  const { isExporting, handleExport } = useDeskExport({
    project,
    savedFindings,
    habitatRows,
    aiInsights: insights,
  })

  // Auto-reopen step when saved findings change after completion
  const findingsFingerprint = React.useMemo(
    () =>
      savedFindings
        .map((f) => `${f.id}:${f.updated_at || ''}`)
        .sort()
        .join(','),
    [savedFindings]
  )
  const prevFingerprintRef = React.useRef(findingsFingerprint)

  React.useEffect(() => {
    const prev = prevFingerprintRef.current
    prevFingerprintRef.current = findingsFingerprint

    // Skip initial load — only trigger on actual changes
    if (!prev || prev === findingsFingerprint) return

    if (workflowStep.status === 'approved') {
      updateWorkflowStep
        .mutateAsync({
          stepId: workflowStep.id,
          updates: { status: 'in_progress' },
        })
        .then(() => {
          refetchWorkflowSteps()
          toast({
            title: 'Step reopened',
            description: 'Findings have changed — please review and re-complete.',
          })
        })
        .catch((err) => console.error('Failed to reopen step:', err))
    }
  }, [findingsFingerprint])

  // Derived data
  const findingsWithRelevance = React.useMemo(() => {
    return savedFindings.map((f): FindingWithRelevance => {
      let rel: Relevance = 'medium'
      let parsedNotes = ''

      if (f.notes?.startsWith('{')) {
        try {
          const parsed = JSON.parse(f.notes)
          rel = parsed.relevance || 'medium'
          parsedNotes = parsed.notes || ''
        } catch {
          parsedNotes = f.notes || ''
        }
      } else {
        parsedNotes = f.notes || ''
      }

      return { ...f, relevance: rel, parsedNotes }
    })
  }, [savedFindings])

  const findingsByType = React.useMemo(
    () => groupFindingsByType(findingsWithRelevance),
    [findingsWithRelevance]
  )

  const highRelevanceCount = findingsWithRelevance.filter((f) => f.relevance === 'high').length
  const protectedSpeciesCount = findingsWithRelevance.filter(
    (f) => f.data_type === 'species_record' && (f.raw_data as Record<string, unknown>)?.isProtected
  ).length

  // Complete step
  const handleComplete = async () => {
    if (savedFindings.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'No findings to assess. Complete Data Gathering first.',
      })
      return
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      refetchWorkflowSteps()
      onComplete?.()
    } catch {
      toast({ variant: 'destructive', title: 'Error completing step' })
    }
  }

  const isComplete = workflowStep.status === 'approved'

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (savedFindings.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Header — keep SiteSelector visible even when no findings so user can switch */}
        <div className="border-border bg-card shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Desk Assessment</h2>
              <p className="text-muted-foreground text-sm">
                Analyze findings and plan field survey
              </p>
            </div>
            <SiteSelector
              projectId={project.id}
              stepKey="desk-assessment"
              onSiteChange={(site) => setSelectedSiteId(site?.id ?? null)}
              showAllOption
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-gray-300" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {selectedSiteId ? 'No Findings for This Site' : 'No Findings Available'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {selectedSiteId
                ? 'Switch sites or save findings for this site in Step 2 (Data Gathering).'
                : 'Complete Step 2 (Data Gathering) and save some findings first.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border bg-card shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Desk Assessment</h2>
            <p className="text-muted-foreground text-sm">Analyze findings and plan field survey</p>
          </div>
          <div className="flex items-center gap-2">
            <SiteSelector
              projectId={project.id}
              stepKey="desk-assessment"
              onSiteChange={(site) => setSelectedSiteId(site?.id ?? null)}
              showAllOption
            />
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {isComplete ? 'Completed' : 'In Progress'}
            </Badge>
            <Badge variant="outline">{savedFindings.length} findings</Badge>
            <Badge variant="outline" className="text-red-600">
              {highRelevanceCount} high priority
            </Badge>
            <ExportMenu isExporting={isExporting} onExport={handleExport} />
          </div>
        </div>
      </div>

      {/* Main Content — Tabs */}
      <Tabs defaultValue="desk-assessment" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b px-4">
          <TabsList className="h-auto gap-0 rounded-none border-none bg-transparent p-0">
            <TabsTrigger
              value="desk-assessment"
              className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent py-3 font-medium shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <FileText className="mr-2 h-4 w-4" />
              Desk Assessment
            </TabsTrigger>
            <TabsTrigger
              value="deep-research"
              className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent py-3 font-medium shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Deep Research
            </TabsTrigger>
            <TabsTrigger
              value="evidence"
              className="data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent py-3 font-medium shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Network className="mr-2 h-4 w-4" />
              Evidence
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Desk Assessment Tab */}
        <TabsContent value="desk-assessment" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <AiSummarySection
              insights={insights}
              isGenerating={isGenerating}
              findingsCount={savedFindings.length}
              onRegenerate={generate}
              onInsightsChange={(updated) => {
                setInsights(updated)
                persistInsights(updated)
              }}
            />

            {/* Data Summary & Complete */}
            {!isGenerating && (
              <div className="mt-8 border-t pt-6">
                <DataSummaryCards
                  findingsByType={findingsByType}
                  protectedSpeciesCount={protectedSpeciesCount}
                />
              </div>
            )}

            {/* Baseline Report */}
            <div className="mt-8 border-t pt-6">
              <BaselineReportTab
                savedFindings={savedFindings}
                project={project}
                onHabitatData={setHabitatRows}
                hideExport
                siteId={selectedSiteId}
              />
            </div>

            {/* Complete Button */}
            {!isGenerating && (
              <div className="px-6 pb-6">
                <Button
                  onClick={handleComplete}
                  disabled={isComplete || completeStep.isPending}
                  className="mt-6 w-full"
                  size="lg"
                >
                  {completeStep.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isComplete ? 'Completed' : 'Complete & Continue to Field Survey'}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Deep Research Tab */}
        <TabsContent value="deep-research" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <DeepResearchTab
            projectId={project.id}
            project={project}
            findings={savedFindings}
            siteId={selectedSiteId}
          />
        </TabsContent>

        {/* Evidence Matrix Tab */}
        <TabsContent value="evidence" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <EvidenceMatrixTab projectId={project.id} siteId={selectedSiteId} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Assessment Dialog */}
      <AssessmentDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  )
}
