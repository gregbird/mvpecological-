'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  MapPin,
  Bug,
  Droplets,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Download,
  FileText,
  BarChart3,
  Layers,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import { useUpdateWorkflowStep, useCompleteWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { useProjectContext } from '@/contexts/project-context'
import {
  BaselineReportTab,
  type HabitatRow,
} from '@/components/steps/desk-assessment/baseline-report-tab'
import { DeepResearchTab } from '@/components/steps/desk-assessment/deep-research-tab'
import { EcologicalSummaryPanel } from '@/components/desk-research/ecological-summary-panel'
import { getFindingSourceUrl } from '@/lib/utils/finding-source-url'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import {
  generateBaselineReportHtml,
  type BaselineExportData,
  type MapImage,
} from '@/lib/export/baseline-report-exporter'
import {
  exportDeskAssessmentPdf,
  exportDeskAssessmentDocx,
} from '@/lib/export/desk-assessment-exporter'
import { getAllScreenshots } from '@/lib/map-screenshots/storage'
import { fetchImageAsBase64 } from '@/lib/export/image-utils'
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
    bgColor: 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
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
  const [selectedFinding, setSelectedFinding] = React.useState<FindingWithRelevance | null>(null)
  const [notes, setNotes] = React.useState('')
  const [relevance, setRelevance] = React.useState<Relevance>('medium')
  const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false)
  const [aiInsights, setAiInsights] = React.useState<string | null>(() => {
    const meta = workflowStep.metadata as Record<string, unknown> | null
    return (meta?.aiInsights as string) || null
  })
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null)
  const [habitatRows, setHabitatRows] = React.useState<HabitatRow[]>([])
  const [isExporting, setIsExporting] = React.useState(false)

  // React Query hooks
  const { data: savedFindings = [], isLoading } = useSavedFindings(project.id)
  const updateFinding = useUpdateFinding()
  const updateWorkflowStep = useUpdateWorkflowStep()
  const completeStep = useCompleteWorkflowStep()

  // Sync AI insights when workflow step metadata changes (e.g. navigating back)
  React.useEffect(() => {
    const meta = workflowStep.metadata as Record<string, unknown> | null
    if (meta?.aiInsights && typeof meta.aiInsights === 'string') {
      setAiInsights(meta.aiInsights)
    }
  }, [workflowStep.metadata])

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

  // Auto-trigger AI generation when Step 3 mounts with no insights
  const autoTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (
      !aiInsights &&
      savedFindings.length > 0 &&
      !isGeneratingInsights &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true
      handleGenerateInsights()
    }
  }, [aiInsights, savedFindings.length, isGeneratingInsights])

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

  const findingsByType = React.useMemo(
    () => groupFindingsByType(findingsWithRelevance),
    [findingsWithRelevance]
  )

  // Stats
  const highRelevanceCount = findingsWithRelevance.filter((f) => f.relevance === 'high').length
  const protectedSpeciesCount = findingsWithRelevance.filter(
    (f) => f.data_type === 'species_record' && (f.raw_data as Record<string, unknown>)?.isProtected
  ).length

  // Handle assessment
  const _handleAssessFinding = (finding: FindingWithRelevance) => {
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
      const designatedSites = findingsByType.designated_site || []
      const speciesRecords = findingsByType.species_record || []
      const aquaticFeatures = findingsByType.aquatic || []

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

  // ── Combined export handler ──
  const collectExportData = React.useCallback(async (): Promise<BaselineExportData> => {
    const designatedSites = savedFindings
      .filter((f) => f.data_type === 'designated_site')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        return {
          name: f.title,
          code: (raw?.SITE_CODE as string) || '',
          type: (raw?.DESIGNATION as string) || '',
          area: raw?.AREA_HA ? `${(raw.AREA_HA as number).toFixed(0)} ha` : '',
          distance: f.distance_from_boundary_km?.toFixed(1) ?? '—',
        }
      })

    const speciesRecords = savedFindings
      .filter((f) => f.data_type === 'species_record')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const metadata = raw?.metadata as Record<string, unknown> | null
        return {
          name: f.title,
          taxon: (metadata?.taxonGroup as string) || 'Unknown',
          source: f.source,
          protected: f.is_protected || (metadata?.isProtected as boolean) || false,
          records: (metadata?.recordCount as number) || 1,
        }
      })

    const waterBodies = savedFindings
      .filter((f) => f.data_type === 'water_quality' || f.data_type === 'catchment')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const metadata = raw?.metadata as Record<string, unknown> | null
        const siteType = (metadata?.siteType as string) || ''
        let type = 'River'
        if (siteType.toLowerCase().includes('lake')) type = 'Lake'
        else if (siteType.toLowerCase().includes('transitional')) type = 'Transitional'
        else if (f.data_type === 'catchment') type = 'Catchment'
        return {
          name: f.title,
          type,
          wfdStatus: (raw?.WFD_Status as string) || '—',
          distance: f.distance_from_boundary_km?.toFixed(1) ?? '—',
        }
      })

    const constraints: BaselineExportData['constraints'] = []
    for (const f of savedFindings) {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null

      if (f.data_type === 'designated_site') {
        const distance = f.distance_from_boundary_km ?? (metadata?.distance as number) ?? null
        if (distance != null && distance <= 2) {
          constraints.push({
            finding: f.title,
            type: 'Designated Site',
            source: f.source,
            constraint: `Within ${distance.toFixed(1)} km of site boundary`,
          })
        } else if (distance == null || distance === 0) {
          constraints.push({
            finding: f.title,
            type: 'Designated Site',
            source: f.source,
            constraint: 'Overlaps or adjacent to site boundary',
          })
        }
      }
      if (f.data_type === 'species_record' && (f.is_protected || metadata?.isProtected)) {
        constraints.push({
          finding: f.title,
          type: 'Species Record',
          source: f.source,
          constraint: 'Protected species — Wildlife Acts / Habitats Directive',
        })
      }
      if (f.data_type === 'species_record' && metadata?.isInvasive) {
        constraints.push({
          finding: f.title,
          type: 'Species Record',
          source: f.source,
          constraint: 'Invasive species — management measures required',
        })
      }
      if (f.data_type === 'water_quality') {
        const wfdStatus = (raw?.WFD_Status as string) || ''
        if (['Poor', 'Bad', 'Moderate'].includes(wfdStatus)) {
          constraints.push({
            finding: f.title,
            type: 'Water Quality',
            source: f.source,
            constraint: `WFD Status: ${wfdStatus} — water quality constraint`,
          })
        }
      }
    }

    let mapImages: MapImage[] = []
    try {
      const screenshots = await getAllScreenshots(project.id)
      const results = await Promise.all(
        screenshots.map(async (ss) => {
          if (!ss.url) return null
          const img = await fetchImageAsBase64(ss.url)
          if (!img) return null
          return {
            stepName: ss.stepName,
            label: ss.label,
            dataUrl: `data:image/jpeg;base64,${img.base64}`,
          }
        })
      )
      mapImages = results.filter((r): r is MapImage => r !== null)
    } catch {
      // Screenshots non-critical
    }

    return {
      projectName: project.name,
      siteCode: project.site_code || project.id.slice(0, 8),
      date: new Date().toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      designatedSites,
      speciesRecords,
      habitatTypes: habitatRows.map((h) => ({
        fossittCode: h.fossittCode,
        name: h.fossittName,
        nlcLabel: h.nlcLabel,
        areaHa: h.areaHa,
        percentage: h.percentage,
      })),
      waterBodies,
      constraints,
      mapImages,
      aiInsights: aiInsights ?? undefined,
    }
  }, [savedFindings, project, habitatRows, aiInsights])

  const handleExport = React.useCallback(
    async (format: 'html' | 'pdf' | 'docx') => {
      setIsExporting(true)
      try {
        const data = await collectExportData()
        if (format === 'html') {
          const html = generateBaselineReportHtml(data)
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${(project.site_code || project.name).replace(/\s+/g, '_')}_desk_assessment.html`
          a.click()
          URL.revokeObjectURL(url)
        } else if (format === 'pdf') {
          exportDeskAssessmentPdf(data)
        } else {
          await exportDeskAssessmentDocx(data)
        }
        toast({ title: `Exported as ${format.toUpperCase()}` })
      } catch {
        toast({ variant: 'destructive', title: 'Export failed' })
      } finally {
        setIsExporting(false)
      }
    },
    [collectExportData, project, toast]
  )

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  Export as HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('docx')}>
                  Export as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          </TabsList>
        </div>

        {/* Desk Assessment Tab — combined AI Summary + Baseline Report */}
        <TabsContent value="desk-assessment" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <EcologicalSummaryPanel
              insights={aiInsights}
              isGenerating={isGeneratingInsights}
              findingsCount={savedFindings.length}
              onRegenerate={handleGenerateInsights}
              onInsightsChange={(updated) => {
                setAiInsights(updated)
                persistInsights(updated)
              }}
            />

            {/* Data Summary & Complete */}
            {!isGeneratingInsights && (
              <div className="mt-8 border-t pt-6">
                {/* Data Summary */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    <BarChart3 className="h-5 w-5" />
                    Data Summary
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Designated Sites */}
                    <Card>
                      <CardContent className="p-4">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3"
                          onClick={() =>
                            setExpandedCard(
                              expandedCard === 'designated_site' ? null : 'designated_site'
                            )
                          }
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <MapPin className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-2xl font-bold">
                              {findingsByType.designated_site?.length || 0}
                            </div>
                            <div className="text-muted-foreground text-xs">Designated Sites</div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-4 w-4 shrink-0 transition-transform',
                              expandedCard === 'designated_site' && 'rotate-180'
                            )}
                          />
                        </button>
                        {expandedCard === 'designated_site' &&
                          findingsByType.designated_site?.length > 0 && (
                            <ul className="mt-3 space-y-1 border-t pt-2">
                              {findingsByType.designated_site.map((f) => {
                                const url = getFindingSourceUrl(f)
                                return (
                                  <li key={f.id} className="flex items-start gap-1.5 text-xs">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    {url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                                      >
                                        <span className="line-clamp-1">{f.title}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : (
                                      <span className="line-clamp-1">{f.title}</span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                      </CardContent>
                    </Card>

                    {/* Species Records */}
                    <Card>
                      <CardContent className="p-4">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3"
                          onClick={() =>
                            setExpandedCard(
                              expandedCard === 'species_record' ? null : 'species_record'
                            )
                          }
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                            <Bug className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-2xl font-bold">
                              {findingsByType.species_record?.length || 0}
                            </div>
                            <div className="text-muted-foreground text-xs">Species Records</div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-4 w-4 shrink-0 transition-transform',
                              expandedCard === 'species_record' && 'rotate-180'
                            )}
                          />
                        </button>
                        {expandedCard === 'species_record' &&
                          findingsByType.species_record?.length > 0 && (
                            <ul className="mt-3 space-y-1 border-t pt-2">
                              {findingsByType.species_record.map((f) => {
                                const url = getFindingSourceUrl(f)
                                return (
                                  <li key={f.id} className="flex items-start gap-1.5 text-xs">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    {url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-purple-700 hover:underline"
                                      >
                                        <span className="line-clamp-1">{f.title}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : (
                                      <span className="line-clamp-1">{f.title}</span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                      </CardContent>
                    </Card>

                    {/* Aquatic Features */}
                    <Card>
                      <CardContent className="p-4">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3"
                          onClick={() =>
                            setExpandedCard(
                              expandedCard === 'water_quality' ? null : 'water_quality'
                            )
                          }
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <Droplets className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-2xl font-bold">
                              {findingsByType.aquatic?.length || 0}
                            </div>
                            <div className="text-muted-foreground text-xs">Aquatic Features</div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-4 w-4 shrink-0 transition-transform',
                              expandedCard === 'water_quality' && 'rotate-180'
                            )}
                          />
                        </button>
                        {expandedCard === 'water_quality' && findingsByType.aquatic?.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t pt-2">
                            {findingsByType.aquatic.map((f) => {
                              const url = getFindingSourceUrl(f)
                              return (
                                <li key={f.id} className="flex items-start gap-1.5 text-xs">
                                  <span className="text-muted-foreground mt-0.5">•</span>
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                                    >
                                      <span className="line-clamp-1">{f.title}</span>
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="line-clamp-1">{f.title}</span>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </CardContent>
                    </Card>

                    {/* Habitat Data */}
                    <Card>
                      <CardContent className="p-4">
                        <button
                          className="flex w-full items-center gap-3"
                          onClick={() =>
                            setExpandedCard((prev) => (prev === 'habitat' ? null : 'habitat'))
                          }
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <Layers className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-2xl font-bold">
                              {findingsByType.habitat?.length || 0}
                            </div>
                            <div className="text-muted-foreground text-xs">Habitat Types</div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-4 w-4 shrink-0 transition-transform',
                              expandedCard === 'habitat' && 'rotate-180'
                            )}
                          />
                        </button>
                        {expandedCard === 'habitat' && findingsByType.habitat?.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t pt-2">
                            {findingsByType.habitat.map((f) => (
                              <li key={f.id} className="flex items-start gap-1.5 text-xs">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                <span className="line-clamp-1">{f.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Protected Species Warning */}
                  {protectedSpeciesCount > 0 && (
                    <Card className="mt-4 border-amber-200 bg-amber-50">
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
              </div>
            )}

            {/* Baseline Report — inline within combined tab */}
            <div className="mt-8 border-t pt-6">
              <BaselineReportTab
                savedFindings={savedFindings}
                project={project}
                onHabitatData={setHabitatRows}
                hideExport
              />
            </div>

            {/* Complete Button */}
            {!isGeneratingInsights && (
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
          <DeepResearchTab projectId={project.id} project={project} findings={savedFindings} />
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
              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                {selectedFinding.content}
              </div>
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
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
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
