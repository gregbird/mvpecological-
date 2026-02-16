'use client'

import * as React from 'react'
import {
  Loader2,
  Check,
  AlertCircle,
  Info,
  Download,
  BarChart3,
  PieChart,
  Table,
  Sparkles,
  Brain,
  Pencil,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useHabitats, useHabitatStats } from '@/hooks/queries/use-habitat-hooks'
import { useObservations, useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { useFindingsStats } from '@/hooks/queries/use-finding-hooks'
import { useSurveyStats } from '@/hooks/queries/use-survey-hooks'
import {
  useCompleteWorkflowStep,
  useWorkflowStep,
  useUpdateWorkflowStep,
} from '@/hooks/queries/use-workflow-hooks'

import type { Project, WorkflowStep } from '@/types/database'

interface DataAnalysisStepProps {
  project: Project
  workflowStep: WorkflowStep
  onComplete?: () => void
}

const CHART_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  moderate: '#f59e0b',
  poor: '#f97316',
  bad: '#ef4444',
}

export function DataAnalysisStep({ project, workflowStep, onComplete }: DataAnalysisStepProps) {
  const { toast } = useToast()

  // React Query hooks
  const { data: habitatStats, isLoading: loadingHabitats } = useHabitatStats(project.id)
  const { data: observationStats, isLoading: loadingObservations } = useObservationStats(project.id)
  const { data: findingsStats, isLoading: loadingFindings } = useFindingsStats(project.id)
  const { data: surveyStats, isLoading: loadingSurveys } = useSurveyStats(project.id)
  const { data: habitats = [] } = useHabitats(project.id)
  const { data: observations = [] } = useObservations(project.id)
  const completeStep = useCompleteWorkflowStep()
  const updateStep = useUpdateWorkflowStep()
  const { data: deskAssessmentStep } = useWorkflowStep(project.id, 3)

  const [isEditingInsights, setIsEditingInsights] = React.useState(false)
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
        setIsEditingInsights(false)
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

  const isLoading = loadingHabitats || loadingObservations || loadingFindings || loadingSurveys

  // Prepare chart data
  const habitatChartData = React.useMemo(() => {
    if (!habitatStats?.byFossittCode) return []
    return habitatStats.byFossittCode.slice(0, 8).map((h) => ({
      name: h.code,
      fullName: h.name,
      area: Math.round(h.area * 100) / 100,
      count: h.count,
    }))
  }, [habitatStats])

  const conditionChartData = React.useMemo(() => {
    if (!habitatStats?.byCondition) return []
    return habitatStats.byCondition.map((c) => ({
      name: c.condition.charAt(0).toUpperCase() + c.condition.slice(1),
      value: c.count,
      color: CONDITION_COLORS[c.condition] || '#9ca3af',
    }))
  }, [habitatStats])

  const taxonChartData = React.useMemo(() => {
    if (!observationStats?.byTaxonGroup) return []
    return observationStats.byTaxonGroup.map((t, index) => ({
      name: t.group.charAt(0).toUpperCase() + t.group.slice(1),
      value: t.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [observationStats])

  // Export data as CSV
  const handleExportCSV = (type: 'habitats' | 'observations') => {
    let csvContent = ''
    let filename = ''

    if (type === 'habitats') {
      filename = `${project.site_code || project.id}_habitats.csv`
      csvContent = 'Fossitt Code,Habitat Name,Area (ha),Condition,Notes\n'
      habitats.forEach((h) => {
        csvContent += `"${h.fossitt_code}","${h.fossitt_name}",${h.area_hectares || 0},"${h.condition || ''}","${h.notes || ''}"\n`
      })
    } else {
      filename = `${project.site_code || project.id}_observations.csv`
      csvContent = 'Scientific Name,Common Name,Taxon Group,Count,Evidence,Protected,Confidence\n'
      observations.forEach((o) => {
        csvContent += `"${o.species_name_scientific}","${o.species_name_common || ''}","${o.taxon_group || ''}",${o.count || ''},"${o.evidence_type || ''}","${o.is_protected ? 'Yes' : 'No'}","${o.confidence_level}"\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    toast({
      title: 'Export complete',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} data exported to ${filename}`,
    })
  }

  // Complete workflow step
  const handleComplete = async () => {
    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Data Analysis step has been completed. Moving to AI Draft.',
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

  const isComplete = workflowStep.status === 'approved'
  const hasData = (habitatStats?.total || 0) > 0 || (observationStats?.total || 0) > 0
  const canComplete = !isComplete

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 7: Data Analysis</h2>
          <p className="text-muted-foreground">Review and analyze collected field data</p>
        </div>
        <Badge
          variant={
            isComplete ? 'default' : workflowStep.status === 'in_progress' ? 'secondary' : 'outline'
          }
        >
          {isComplete
            ? 'Completed'
            : workflowStep.status === 'in_progress'
              ? 'In Progress'
              : 'Pending'}
        </Badge>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Data Analysis</AlertTitle>
        <AlertDescription>
          Review the summary statistics and visualizations of your field data. Export data as CSV
          for further analysis if needed. This analysis will inform the AI-generated report draft.
        </AlertDescription>
      </Alert>

      {!hasData && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Complete the previous steps (Habitat Mapping and Target Notes) to have data for
            analysis.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Surveys Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveyStats?.completed || 0}</div>
            <p className="text-muted-foreground text-xs">of {surveyStats?.total || 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Habitats Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{habitatStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              {(habitatStats?.totalArea || 0).toFixed(2)} ha total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Species Observed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{observationStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              {observationStats?.protected || 0} protected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Desk Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findingsStats?.total || 0}</div>
            <p className="text-muted-foreground text-xs">
              from {findingsStats?.bySource.length || 0} sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <Tabs defaultValue="habitats">
        <TabsList>
          <TabsTrigger value="habitats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Habitats
          </TabsTrigger>
          <TabsTrigger value="species">
            <PieChart className="mr-2 h-4 w-4" />
            Species
          </TabsTrigger>
          <TabsTrigger value="tables">
            <Table className="mr-2 h-4 w-4" />
            Data Tables
          </TabsTrigger>
          <TabsTrigger value="desk-assessments">
            <Sparkles className="mr-2 h-4 w-4" />
            Desk Assessments
          </TabsTrigger>
        </TabsList>

        {/* Habitats Tab */}
        <TabsContent value="habitats" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Habitat Area Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Habitat Areas by Fossitt Code</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExportCSV('habitats')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {habitatChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={habitatChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-background rounded border p-2 shadow">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-muted-foreground text-sm">{data.fullName}</p>
                                <p className="text-sm">Area: {data.area} ha</p>
                                <p className="text-sm">Polygons: {data.count}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="area" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground flex h-75 items-center justify-center text-sm">
                    No habitat data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Condition Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Habitat Condition Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {conditionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={conditionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {conditionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground flex h-75 items-center justify-center text-sm">
                    No condition data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Species Tab */}
        <TabsContent value="species" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Taxon Group Distribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Observations by Taxon Group</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV('observations')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {taxonChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={taxonChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {taxonChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground flex h-75 items-center justify-center text-sm">
                    No species observation data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confidence Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>High Confidence</span>
                      <span className="font-medium">
                        {observations.filter((o) => o.confidence_level === 'high').length}
                      </span>
                    </div>
                    <Progress
                      value={
                        observations.length > 0
                          ? (observations.filter((o) => o.confidence_level === 'high').length /
                              observations.length) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Medium Confidence</span>
                      <span className="font-medium">
                        {observations.filter((o) => o.confidence_level === 'medium').length}
                      </span>
                    </div>
                    <Progress
                      value={
                        observations.length > 0
                          ? (observations.filter((o) => o.confidence_level === 'medium').length /
                              observations.length) *
                            100
                          : 0
                      }
                      className="h-2 bg-amber-100 [&>div]:bg-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Low Confidence</span>
                      <span className="font-medium">
                        {observations.filter((o) => o.confidence_level === 'low').length}
                      </span>
                    </div>
                    <Progress
                      value={
                        observations.length > 0
                          ? (observations.filter((o) => o.confidence_level === 'low').length /
                              observations.length) *
                            100
                          : 0
                      }
                      className="h-2 bg-red-100 [&>div]:bg-red-500"
                    />
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Needs Verification</span>
                      <Badge variant="destructive" className="text-xs">
                        {observationStats?.needsVerification || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Habitat Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Habitat Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Habitat</TableHead>
                      <TableHead className="text-right">Area (ha)</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {habitatStats?.byFossittCode.slice(0, 10).map((h) => (
                      <TableRow key={h.code}>
                        <TableCell className="font-mono">{h.code}</TableCell>
                        <TableCell className="max-w-50 truncate">{h.name}</TableCell>
                        <TableCell className="text-right">{h.area.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{h.count}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-center">
                          No habitat data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>

            {/* Species Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Species Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taxon Group</TableHead>
                      <TableHead className="text-right">Observations</TableHead>
                      <TableHead className="text-right">Protected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {observationStats?.byTaxonGroup.map((t) => {
                      const protectedCount = observations.filter(
                        (o) => o.taxon_group === t.group.toLowerCase() && o.is_protected
                      ).length
                      return (
                        <TableRow key={t.group}>
                          <TableCell>{t.group}</TableCell>
                          <TableCell className="text-right">{t.count}</TableCell>
                          <TableCell className="text-right">
                            {protectedCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {protectedCount}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    }) || (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground text-center">
                          No observation data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Desk Assessments Tab */}
        <TabsContent value="desk-assessments" className="space-y-4">
          {deskInsights ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI-Generated Desk Assessment
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {isEditingInsights ? (
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditedInsights(deskInsights)
                          setIsEditingInsights(true)
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
                {isEditingInsights ? (
                  <Textarea
                    value={editedInsights}
                    onChange={(e) => setEditedInsights(e.target.value)}
                    className="min-h-[500px] w-full resize-none font-mono text-sm"
                    placeholder="Edit the desk assessment insights in markdown..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {deskInsights}
                    </ReactMarkdown>
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
        </TabsContent>
      </Tabs>

      {/* Progress Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Data collected</span>
              {hasData ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Analysis reviewed</span>
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <Progress value={isComplete ? 100 : hasData ? 75 : 25} />

          <Button
            onClick={handleComplete}
            disabled={!canComplete || completeStep.isPending}
            className="w-full"
          >
            {completeStep.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isComplete ? 'Completed' : 'Complete Step & Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
