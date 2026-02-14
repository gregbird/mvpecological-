'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Loader2,
  Check,
  AlertCircle,
  Star,
  MessageSquare,
  Sparkles,
  ClipboardList,
  Target,
  Brain,
  ChevronRight,
  MapPin,
  Bug,
  Droplets,
  Calendar,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Pencil,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import { useUpdateWorkflowStep, useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useProjectContext } from '@/contexts/project-context'
import type { Project, WorkflowStep, DeskResearchFinding } from '@/types/database'

interface DeskAssessmentStepProps {
  project: Project
  workflowStep: WorkflowStep
  onComplete?: () => void
}

type Relevance = 'high' | 'medium' | 'low' | 'none'

const RELEVANCE_CONFIG: Record<
  Relevance,
  { label: string; color: string; bgColor: string; description: string }
> = {
  high: {
    label: 'High',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    description: 'Critical - requires field survey attention',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-200',
    description: 'Relevant - should be considered',
  },
  low: {
    label: 'Low',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    description: 'Minor relevance to project',
  },
  none: {
    label: 'None',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 border-gray-200',
    description: 'Not applicable to this project',
  },
}

interface FindingWithRelevance extends DeskResearchFinding {
  relevance: Relevance
  parsedNotes: string
}

export function DeskAssessmentStep({ project, workflowStep, onComplete }: DeskAssessmentStepProps) {
  const { toast } = useToast()
  const { refetchWorkflowSteps } = useProjectContext()

  // State
  const [activeTab, setActiveTab] = React.useState('insights')
  const [selectedFinding, setSelectedFinding] = React.useState<FindingWithRelevance | null>(null)
  const [notes, setNotes] = React.useState('')
  const [relevance, setRelevance] = React.useState<Relevance>('medium')
  const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false)
  const [aiInsights, setAiInsights] = React.useState<string | null>(null)
  const [isEditingInsights, setIsEditingInsights] = React.useState(false)
  const [editedInsights, setEditedInsights] = React.useState('')
  // Assessment tab filters
  const [relevanceFilter, setRelevanceFilter] = React.useState<'all' | Relevance>('all')
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null)

  // React Query hooks
  const { data: savedFindings = [], isLoading } = useSavedFindings(project.id)
  const updateFinding = useUpdateFinding()
  const updateWorkflowStep = useUpdateWorkflowStep()
  const completeStep = useCompleteWorkflowStep()

  // Load persisted AI insights from workflow step metadata on mount
  React.useEffect(() => {
    const meta = workflowStep.metadata as Record<string, unknown> | null
    if (meta?.aiInsights && typeof meta.aiInsights === 'string') {
      setAiInsights(meta.aiInsights)
    }
  }, [workflowStep.id])

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

  // Parse relevance from notes
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

  // Group by type
  const findingsByType = React.useMemo(() => {
    const groups: Record<string, FindingWithRelevance[]> = {}
    for (const f of findingsWithRelevance) {
      if (!groups[f.data_type]) groups[f.data_type] = []
      groups[f.data_type].push(f)
    }
    return groups
  }, [findingsWithRelevance])

  // Filtered findings for assessment tab
  const filteredAssessmentFindings = React.useMemo(() => {
    return findingsWithRelevance.filter((f) => {
      if (relevanceFilter !== 'all' && f.relevance !== relevanceFilter) return false
      if (typeFilter && f.data_type !== typeFilter) return false
      return true
    })
  }, [findingsWithRelevance, relevanceFilter, typeFilter])

  // Stats
  const assessedCount = findingsWithRelevance.filter(
    (f) => f.parsedNotes || f.relevance !== 'medium'
  ).length
  const highRelevanceCount = findingsWithRelevance.filter((f) => f.relevance === 'high').length
  const protectedSpeciesCount = findingsWithRelevance.filter(
    (f) => f.data_type === 'species_record' && (f.raw_data as any)?.isProtected
  ).length

  // Handle assessment
  const handleAssessFinding = (finding: FindingWithRelevance) => {
    setSelectedFinding(finding)
    setNotes(finding.parsedNotes)
    setRelevance(finding.relevance)
  }

  const handleSaveAssessment = async () => {
    if (!selectedFinding) return

    try {
      const structuredNotes = JSON.stringify({
        relevance,
        notes,
        assessedAt: new Date().toISOString(),
      })

      await updateFinding.mutateAsync({
        findingId: selectedFinding.id,
        updates: { notes: structuredNotes },
      })

      setSelectedFinding(null)
    } catch {
      toast({ variant: 'destructive', title: 'Error saving assessment' })
    }
  }

  // Persist AI insights to workflow step metadata
  const persistInsights = React.useCallback(
    (insights: string) => {
      const existingMeta = (workflowStep.metadata as Record<string, unknown>) || {}
      updateWorkflowStep
        .mutateAsync({
          stepId: workflowStep.id,
          updates: {
            metadata: {
              ...existingMeta,
              aiInsights: insights,
              aiInsightsUpdatedAt: new Date().toISOString(),
            },
          },
        })
        .catch((err) => console.error('Failed to persist AI insights:', err))
    },
    [workflowStep.id, workflowStep.metadata, updateWorkflowStep]
  )

  // Generate AI insights
  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true)

    try {
      // Call the new desk-insights API that fetches all data server-side
      const response = await fetch('/api/ai/desk-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          projectLocation:
            [project.townland, project.county, project.province].filter(Boolean).join(', ') ||
            'Ireland',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate insights')
      }

      const data = await response.json()
      setAiInsights(data.insights)
      persistInsights(data.insights)
    } catch (error) {
      console.error('Error generating insights:', error)

      // Fallback to template-based insights
      const designatedSites = findingsByType['designated_site'] || []
      const speciesRecords = findingsByType['species_record'] || []
      const aquaticFeatures = findingsByType['water_quality'] || []

      const fallbackInsights = `## Key Findings Summary

### Designated Sites (${designatedSites.length} found)
${
  designatedSites.length > 0
    ? `- ${designatedSites
        .map((s) => s.title)
        .slice(0, 3)
        .join(
          '\n- '
        )}${designatedSites.length > 3 ? `\n- ...and ${designatedSites.length - 3} more` : ''}`
    : '- No designated sites found within search area'
}

### Species Records (${speciesRecords.length} found)
${
  speciesRecords.length > 0
    ? `- ${protectedSpeciesCount} protected species identified
- Key species: ${speciesRecords
        .map((s) => s.title)
        .slice(0, 3)
        .join(', ')}`
    : '- No historical species records found'
}

### Aquatic Features (${aquaticFeatures.length} found)
${
  aquaticFeatures.length > 0
    ? `- ${aquaticFeatures
        .map((s) => s.title)
        .slice(0, 2)
        .join('\n- ')}`
    : '- No aquatic features identified'
}

## Risk Assessment

${designatedSites.length > 0 ? `⚠️ **SAC/SPA Proximity**: ${designatedSites.length} designated site(s) within buffer zone. Appropriate Assessment screening may be required.` : ''}

${protectedSpeciesCount > 0 ? `⚠️ **Protected Species**: ${protectedSpeciesCount} protected species recorded historically. Targeted field surveys recommended.` : ''}

## Recommended Actions

1. ${highRelevanceCount > 0 ? `Review ${highRelevanceCount} high-relevance findings before field survey` : 'Assess findings and assign relevance levels'}
2. ${protectedSpeciesCount > 0 ? 'Plan species-specific surveys for protected species' : 'Standard habitat survey recommended'}
3. ${designatedSites.length > 0 ? 'Consider connectivity assessment for nearby designated sites' : 'Document baseline habitat conditions'}

## Survey Timing Considerations

- **Breeding Birds**: March - July
- **Bats**: May - September
- **Badger**: Year-round (avoid breeding season Feb-June for sett disturbance)
- **Otter**: Year-round

---
*Note: AI analysis unavailable. This is a template-based summary.*`

      setAiInsights(fallbackInsights)
      persistInsights(fallbackInsights)

      toast({
        variant: 'destructive',
        title: 'AI Analysis Failed',
        description: 'Using template-based insights instead.',
      })
    } finally {
      setIsGeneratingInsights(false)
    }
  }

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
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-16 w-16 text-gray-300" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Findings Available</h3>
          <p className="text-muted-foreground mt-1">
            Complete Step 2 (Data Gathering) and save some findings first.
          </p>
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
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {isComplete ? 'Completed' : 'In Progress'}
            </Badge>
            <Badge variant="outline">{savedFindings.length} findings</Badge>
            <Badge variant="outline" className="text-red-600">
              {highRelevanceCount} high priority
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="insights" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="assessment" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Assessment
              {assessedCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {assessedCount}/{savedFindings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="field-plan" className="gap-2">
              <Target className="h-4 w-4" />
              Field Plan
            </TabsTrigger>
          </TabsList>
        </div>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="mt-0 flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 w-full">
            {/* Left Panel - Stats (hidden during edit mode) */}
            <div
              className={cn(
                'w-75 shrink-0 overflow-y-auto border-r p-4',
                isEditingInsights && 'hidden'
              )}
            >
              <h3 className="mb-4 font-semibold">Data Summary</h3>

              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {findingsByType['designated_site']?.length || 0}
                        </div>
                        <div className="text-muted-foreground text-xs">Designated Sites</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <Bug className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {findingsByType['species_record']?.length || 0}
                        </div>
                        <div className="text-muted-foreground text-xs">Species Records</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <Droplets className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {findingsByType['water_quality']?.length || 0}
                        </div>
                        <div className="text-muted-foreground text-xs">Aquatic Features</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {protectedSpeciesCount > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div>
                          <div className="font-semibold text-amber-800">
                            {protectedSpeciesCount} Protected Species
                          </div>
                          <div className="text-xs text-amber-700">Requires attention</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Button
                onClick={handleGenerateInsights}
                disabled={isGeneratingInsights}
                className="mt-6 w-full"
              >
                {isGeneratingInsights ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Right Panel - AI Insights */}
            <div
              className={cn(
                'min-h-0 min-w-0 flex-1',
                isEditingInsights ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
              )}
            >
              <div className={cn('p-6', isEditingInsights && 'flex min-h-0 flex-1 flex-col')}>
                {aiInsights ? (
                  <div
                    className={cn(
                      'max-w-none',
                      isEditingInsights && 'flex min-h-0 flex-1 flex-col'
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <h3 className="m-0 text-lg font-semibold">AI Analysis</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {isEditingInsights ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAiInsights(editedInsights)
                                setIsEditingInsights(false)
                                persistInsights(editedInsights)
                              }}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingInsights(false)}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditedInsights(aiInsights)
                                setIsEditingInsights(true)
                              }}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleGenerateInsights}>
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Regenerate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditingInsights ? (
                      <Textarea
                        value={editedInsights}
                        onChange={(e) => setEditedInsights(e.target.value)}
                        className="h-full min-h-[600px] w-full flex-1 resize-none font-mono text-sm"
                        placeholder="Edit the AI analysis in markdown..."
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none overflow-x-auto rounded-lg border bg-gray-50 p-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiInsights}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                    <Brain className="mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="text-lg font-semibold">AI Insights</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
                      Click <strong>&quot;Generate AI Analysis&quot;</strong> to get intelligent
                      insights about your findings, risk assessment, and field survey
                      recommendations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Assessment Tab */}
        <TabsContent value="assessment" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Filters */}
            <div className="w-60 shrink-0 border-r p-4">
              <h3 className="mb-4 font-semibold">Filter by Relevance</h3>
              <div className="space-y-1">
                {(['all', 'high', 'medium', 'low', 'none'] as const).map((filter) => {
                  // Count respects the current type filter
                  const base = typeFilter
                    ? findingsWithRelevance.filter((f) => f.data_type === typeFilter)
                    : findingsWithRelevance
                  const count =
                    filter === 'all'
                      ? base.length
                      : base.filter((f) => f.relevance === filter).length
                  const isActive = relevanceFilter === filter
                  return (
                    <button
                      key={filter}
                      onClick={() => setRelevanceFilter(filter)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {filter !== 'all' && (
                          <div
                            className={cn('h-2.5 w-2.5 rounded-full', {
                              'bg-red-500': filter === 'high',
                              'bg-amber-500': filter === 'medium',
                              'bg-green-500': filter === 'low',
                              'bg-gray-400': filter === 'none',
                            })}
                          />
                        )}
                        <span className="capitalize">
                          {filter === 'all' ? 'All Findings' : filter}
                        </span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 border-t pt-4">
                <h3 className="mb-4 font-semibold">Filter by Type</h3>
                <div className="space-y-1">
                  {Object.entries(findingsByType).map(([type, findings]) => {
                    const isActive = typeFilter === type
                    // Count filtered by current relevance filter
                    const count =
                      relevanceFilter === 'all'
                        ? findings.length
                        : findings.filter((f) => f.relevance === relevanceFilter).length
                    return (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(isActive ? null : type)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                          isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                        )}
                      >
                        <span className="capitalize">{type.replaceAll('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Findings List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {filteredAssessmentFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className={cn(
                        'cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50',
                        RELEVANCE_CONFIG[finding.relevance].bgColor
                      )}
                      onClick={() => handleAssessFinding(finding)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {finding.source.toUpperCase()}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-[10px]',
                                RELEVANCE_CONFIG[finding.relevance].bgColor,
                                RELEVANCE_CONFIG[finding.relevance].color
                              )}
                            >
                              {RELEVANCE_CONFIG[finding.relevance].label}
                            </Badge>
                          </div>
                          <h4 className="mt-1.5 font-medium">{finding.title}</h4>
                          {finding.content && (
                            <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                              {finding.content}
                            </p>
                          )}
                          {finding.parsedNotes && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                              <MessageSquare className="h-3 w-3" />
                              {finding.parsedNotes.slice(0, 50)}
                              {finding.parsedNotes.length > 50 && '...'}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Field Plan Tab */}
        <TabsContent value="field-plan" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Target Species */}
            <div className="flex-1 border-r p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Target className="h-5 w-5" />
                Target Species for Field Survey
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Based on high relevance findings, these species should be prioritized during field
                surveys.
              </p>

              {findingsWithRelevance.filter(
                (f) => f.relevance === 'high' && f.data_type === 'species_record'
              ).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Target className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    No high-priority species identified yet.
                    <br />
                    Mark species as "High" relevance in the Assessment tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {findingsWithRelevance
                    .filter((f) => f.relevance === 'high' && f.data_type === 'species_record')
                    .map((finding) => (
                      <div
                        key={finding.id}
                        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
                      >
                        <Star className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium">{finding.title}</div>
                          {finding.parsedNotes && (
                            <p className="text-muted-foreground text-sm">{finding.parsedNotes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <h3 className="mt-8 mb-4 flex items-center gap-2 font-semibold">
                <MapPin className="h-5 w-5" />
                Key Sites to Survey
              </h3>

              {findingsWithRelevance.filter(
                (f) => f.relevance === 'high' && f.data_type === 'designated_site'
              ).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <MapPin className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    No high-priority sites identified yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {findingsWithRelevance
                    .filter((f) => f.relevance === 'high' && f.data_type === 'designated_site')
                    .map((finding) => (
                      <div
                        key={finding.id}
                        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
                      >
                        <MapPin className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium">{finding.title}</div>
                          {finding.content && (
                            <p className="text-muted-foreground text-sm">{finding.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Survey Recommendations */}
            <div className="w-87.5 shrink-0 p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Lightbulb className="h-5 w-5" />
                Survey Recommendations
              </h3>

              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recommended Survey Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Habitat Survey (Fossitt Level 3)</li>
                      {protectedSpeciesCount > 0 && <li>• Protected Species Survey</li>}
                      {(findingsByType['designated_site']?.length || 0) > 0 && (
                        <li>• Connectivity Assessment</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Optimal Survey Timing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Breeding Birds: Mar - Jul</li>
                      <li>• Bats: May - Sep</li>
                      <li>• Badger: Year-round</li>
                      <li>• Otter: Year-round</li>
                      <li>• Vegetation: May - Sep</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Complete Button */}
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Assessment Dialog */}
      <Dialog
        open={!!selectedFinding}
        onOpenChange={(open) => !open && setSelectedFinding(null)}
        modal={false}
      >
        <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Assess Finding</DialogTitle>
            <DialogDescription className="line-clamp-2">{selectedFinding?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFinding?.content && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">{selectedFinding.content}</div>
            )}

            <div className="space-y-2">
              <Label>Relevance Level</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['high', 'medium', 'low', 'none'] as const).map((key) => {
                  const config = RELEVANCE_CONFIG[key]
                  const isSelected = relevance === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRelevance(key)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-3 text-left transition-all',
                        isSelected
                          ? cn(config.bgColor, 'ring-2 ring-offset-1', {
                              'ring-red-500': key === 'high',
                              'ring-amber-500': key === 'medium',
                              'ring-green-500': key === 'low',
                              'ring-gray-400': key === 'none',
                            })
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div
                        className={cn('h-3 w-3 rounded-full', {
                          'bg-red-500': key === 'high',
                          'bg-amber-500': key === 'medium',
                          'bg-green-500': key === 'low',
                          'bg-gray-400': key === 'none',
                        })}
                      />
                      <div>
                        <div className="text-sm font-medium">{config.label}</div>
                        <div className="text-muted-foreground text-xs">{config.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assessment Notes</Label>
              <Textarea
                placeholder="Add notes about this finding's relevance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFinding(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssessment} disabled={updateFinding.isPending}>
              {updateFinding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
