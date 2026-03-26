'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  Plus,
  FolderKanban,
  Loader2,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useRole } from '@/contexts/role-context'
import { getPhaseByStepNumber } from '@/lib/config/workflow'
import { PROJECT_TYPE_LABELS } from '@/lib/config/survey'
import { createClient } from '@/lib/supabase/client'
import type { Project, WorkflowStep } from '@/types/database'

interface ProjectWithProgress extends Project {
  currentStep: number
  currentStepName: string
  progress: number
  client?: { name: string } | null
  assigned_to_profile?: { full_name: string } | null
  isMember?: boolean
  dataSources?: string[]
  findingCount?: number
  reportTypes?: string[]
}

const statusConfig = {
  active: {
    label: 'In Progress',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  archived: {
    label: 'Archived',
    className:
      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800',
    dot: 'bg-gray-500',
  },
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  npws: 'NPWS',
  gbif: 'GBIF',
  nbdc: 'NBDC',
  epa: 'EPA',
  catchments: 'Catchments',
  manual: 'Manual',
  company_reports: 'Company Reports',
}

function getPhaseInfo(stepNumber: number) {
  const phase = getPhaseByStepNumber(stepNumber)
  if (!phase) return { label: 'Unknown', color: 'bg-muted text-muted-foreground' }

  const colors = {
    'desk-research': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    'field-research': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    reporting: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  }

  return {
    label: phase.label,
    color: colors[phase.id as keyof typeof colors] || 'bg-muted text-muted-foreground',
  }
}

export default function ProjectsPage() {
  const { user, permissions, isLoading: isRoleLoading } = useRole()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [aiSummaries, setAiSummaries] = React.useState<Record<string, string>>({})
  const [loadingSummary, setLoadingSummary] = React.useState<Record<string, boolean>>({})
  const [expandedSummary, setExpandedSummary] = React.useState<Record<string, boolean>>({})
  const [filterStatus, setFilterStatus] = React.useState('all')
  const [filterSurveyType, setFilterSurveyType] = React.useState('all')
  const [filterCounty, setFilterCounty] = React.useState('all')
  const [sortBy, setSortBy] = React.useState('updated')
  const [projects, setProjects] = React.useState<ProjectWithProgress[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch projects from Supabase
  React.useEffect(() => {
    async function fetchProjects() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Fetch projects for the user's organization
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(
            `
            *,
            client:clients(name),
            report_types:project_report_types(report_type, display_order)
          `
          )
          .eq('organization_id', user.organization_id)
          .order('updated_at', { ascending: false })

        if (projectsError) throw projectsError

        // Fetch project memberships for the current user (for non-admin filtering)
        const { data: membershipData } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)

        const memberProjectIds = membershipData?.map((m) => m.project_id) || []

        // Fetch workflow steps for all projects to calculate progress
        const projectIds = projectsData?.map((p) => p.id) || []

        let workflowSteps: WorkflowStep[] = []
        if (projectIds.length > 0) {
          const { data: stepsData, error: stepsError } = await supabase
            .from('workflow_steps')
            .select('*')
            .in('project_id', projectIds)

          if (stepsError) throw stepsError
          workflowSteps = stepsData || []
        }

        // Fetch data sources used per project (AC5)
        const dataSourcesMap: Record<string, string[]> = {}
        if (projectIds.length > 0) {
          const { data: findingsData } = await supabase
            .from('desk_research_findings')
            .select('project_id, source')
            .in('project_id', projectIds)

          if (findingsData) {
            for (const f of findingsData) {
              if (!dataSourcesMap[f.project_id]) dataSourcesMap[f.project_id] = []
              if (f.source && !dataSourcesMap[f.project_id].includes(f.source)) {
                dataSourcesMap[f.project_id].push(f.source)
              }
            }
          }
        }

        // Calculate progress for each project
        const projectsWithProgress: ProjectWithProgress[] = (projectsData || []).map((project) => {
          const steps = workflowSteps.filter((s) => s.project_id === project.id)
          const completedSteps = steps.filter(
            (s) => s.status === 'approved' || s.status === 'needs_review'
          ).length
          const totalSteps = steps.length || 10

          // Find current step (first non-completed step or last step)
          const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
          const currentStepData =
            sortedSteps.find((s) => s.status !== 'approved') || sortedSteps[sortedSteps.length - 1]

          // Extract report types from join (fallback to survey_type)
          const joinedTypes = (
            project as unknown as {
              report_types?: { report_type: string; display_order: number }[]
            }
          ).report_types
          const rtList = joinedTypes?.length
            ? joinedTypes
                .sort((a, b) => a.display_order - b.display_order)
                .map((r) => r.report_type)
            : project.survey_type
              ? [project.survey_type]
              : []

          return {
            ...project,
            currentStep: Math.min(currentStepData?.step_number || 1, 10),
            currentStepName: currentStepData?.name || 'GIS Mapping',
            progress:
              totalSteps > 0 ? Math.min(Math.round((completedSteps / totalSteps) * 100), 100) : 0,
            isMember: memberProjectIds.includes(project.id),
            dataSources: dataSourcesMap[project.id] || [],
            findingCount: dataSourcesMap[project.id]?.length || 0,
            reportTypes: rtList,
          }
        })

        setProjects(projectsWithProgress)
      } catch (err) {
        console.error('Error fetching projects:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isRoleLoading) {
      fetchProjects()
    }
  }, [user, isRoleLoading])

  // Derive unique counties and survey types from loaded projects
  const availableCounties = React.useMemo(() => {
    const counties = projects.map((p) => p.county).filter(Boolean) as string[]
    return [...new Set(counties)].sort()
  }, [projects])

  const availableSurveyTypes = React.useMemo(() => {
    const types = projects.flatMap((p) => p.reportTypes ?? []).filter(Boolean)
    return [...new Set(types)].sort()
  }, [projects])

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let visibleProjects = projects

    // For users without canViewAllProjects, filter to only show projects they created or are assigned to
    if (!permissions.canViewAllProjects) {
      visibleProjects = projects.filter((p) => p.created_by === user?.id || p.isMember)
    }

    // Status filter
    if (filterStatus !== 'all') {
      visibleProjects = visibleProjects.filter((p) => p.status === filterStatus)
    }

    // Survey type filter
    if (filterSurveyType !== 'all') {
      visibleProjects = visibleProjects.filter(
        (p) => p.reportTypes?.includes(filterSurveyType) || p.survey_type === filterSurveyType
      )
    }

    // County filter
    if (filterCounty !== 'all') {
      visibleProjects = visibleProjects.filter((p) => p.county === filterCounty)
    }

    // Text search — name, client, site_code, county, survey_type
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      visibleProjects = visibleProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.client?.name?.toLowerCase().includes(query) ||
          project.site_code?.toLowerCase().includes(query) ||
          project.county?.toLowerCase().includes(query) ||
          project.reportTypes?.some((t) => t.toLowerCase().includes(query)) ||
          project.survey_type?.toLowerCase().includes(query)
      )
    }

    // Sort
    return [...visibleProjects].sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'due') {
        if (!a.expected_end_date) return 1
        if (!b.expected_end_date) return -1
        return new Date(a.expected_end_date).getTime() - new Date(b.expected_end_date).getTime()
      }
      return 0
    })
  }, [projects, user, searchQuery, filterStatus, filterSurveyType, filterCounty, sortBy])

  const hasActiveFilters =
    filterStatus !== 'all' || filterSurveyType !== 'all' || filterCounty !== 'all' || !!searchQuery

  function clearFilters() {
    setSearchQuery('')
    setFilterStatus('all')
    setFilterSurveyType('all')
    setFilterCounty('all')
  }

  async function handleAiSummary(projectId: string) {
    // Toggle off if already expanded
    if (expandedSummary[projectId]) {
      setExpandedSummary((prev) => ({ ...prev, [projectId]: false }))
      return
    }

    // Show existing summary if already fetched
    if (aiSummaries[projectId]) {
      setExpandedSummary((prev) => ({ ...prev, [projectId]: true }))
      return
    }

    setLoadingSummary((prev) => ({ ...prev, [projectId]: true }))
    setExpandedSummary((prev) => ({ ...prev, [projectId]: true }))

    try {
      const res = await fetch('/api/ai/project-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (data.summary) {
        setAiSummaries((prev) => ({ ...prev, [projectId]: data.summary }))
      }
    } catch {
      setAiSummaries((prev) => ({ ...prev, [projectId]: 'Failed to generate summary.' }))
    } finally {
      setLoadingSummary((prev) => ({ ...prev, [projectId]: false }))
    }
  }

  // Loading state
  if (isLoading || isRoleLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-border bg-card border-b px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">
              {user?.role === 'admin' ? 'Projects Dashboard' : 'My Assessments'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'admin'
                ? 'Manage all ecological survey projects'
                : 'Your assigned assessment tasks'}
            </p>
          </div>
          {permissions.canCreateProject && (
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 lg:px-8">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          <Input
            placeholder="Search by name, client, code, county, or survey type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-card h-12 pl-12 text-base"
          />
        </div>

        {/* Filters Row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">In Progress</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Survey type filter */}
          <Select value={filterSurveyType} onValueChange={setFilterSurveyType}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Survey Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableSurveyTypes.length > 0
                ? availableSurveyTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {PROJECT_TYPE_LABELS[t] || t}
                    </SelectItem>
                  ))
                : Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>

          {/* County filter */}
          <Select value={filterCounty} onValueChange={setFilterCounty}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="County" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {availableCounties.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="created">Date Created</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="due">Due Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          {/* Result count */}
          <span className="text-muted-foreground ml-auto text-sm">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Project List */}
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const status = statusConfig[project.status as keyof typeof statusConfig]
            const phaseInfo = getPhaseInfo(project.currentStep)

            return (
              <Card
                key={project.id}
                className="border-border transition-all hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700"
              >
                <CardContent className="p-0">
                  {/* Top section */}
                  <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                    {/* Left */}
                    <div className="min-w-0 flex-1">
                      {/* Row 1: badges */}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-xs">
                          {project.site_code || project.id.slice(0, 8)}
                        </span>
                        <span className={cn('h-2 w-2 rounded-full', status?.dot)} />
                        <Badge variant="outline" className={cn('text-xs', status?.className)}>
                          {status?.label}
                        </Badge>
                        {(project.reportTypes ?? []).length > 0
                          ? project.reportTypes!.map((rt) => (
                              <Badge key={rt} variant="outline" className="text-xs font-medium">
                                {PROJECT_TYPE_LABELS[rt] || rt}
                              </Badge>
                            ))
                          : project.survey_type && (
                              <Badge variant="outline" className="text-xs font-medium">
                                {PROJECT_TYPE_LABELS[project.survey_type] || project.survey_type}
                              </Badge>
                            )}
                      </div>

                      {/* Row 2: project name */}
                      <Link href={`/projects/${project.id}`} className="group">
                        <h3 className="text-foreground mb-2 text-lg font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {project.name}
                        </h3>
                      </Link>

                      {/* Row 3: meta info */}
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {project.client?.name && <span>{project.client.name}</span>}
                        {project.county && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {project.county}
                          </span>
                        )}
                        {!project.county && project.grid_reference && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {project.grid_reference}
                          </span>
                        )}
                        {project.expected_end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Due: {new Date(project.expected_end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Step + Continue */}
                    <div className="flex flex-shrink-0 flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">
                          Step {project.currentStep}/10
                        </p>
                        <p className="text-foreground mt-0.5 text-sm font-medium">
                          {project.currentStepName}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/projects/${project.id}?step=${project.currentStep}`}>
                          Continue
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Bottom section: progress + sources + AI */}
                  <div className="border-border border-t px-5 py-3">
                    {/* Progress row */}
                    <div className="mb-2.5 flex items-center gap-3">
                      <Badge className={cn('text-xs', phaseInfo.color)}>{phaseInfo.label}</Badge>
                      <div className="flex flex-1 items-center gap-2">
                        <Progress value={project.progress} className="h-2 flex-1" />
                        <span className="text-muted-foreground w-8 text-right text-xs font-medium">
                          {project.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Data sources + AI Summary row */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Data source pills (AC5) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {project.dataSources && project.dataSources.length > 0 ? (
                          project.dataSources.map((src) => (
                            <span
                              key={src}
                              title={`${DATA_SOURCE_LABELS[src] || src} data checked`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {DATA_SOURCE_LABELS[src] || src}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            No desk research yet
                          </span>
                        )}
                      </div>

                      {/* AI Summary button */}
                      {project.dataSources && project.dataSources.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground h-7 flex-shrink-0 gap-1.5 px-2 text-xs"
                          onClick={() => handleAiSummary(project.id)}
                        >
                          {loadingSummary[project.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          AI Summary
                          {expandedSummary[project.id] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* AI Summary expanded */}
                    {expandedSummary[project.id] && (
                      <div className="border-border mt-2.5 rounded-md border bg-amber-50/50 p-3 dark:bg-amber-950/10">
                        {loadingSummary[project.id] ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground text-xs">
                              Generating summary...
                            </span>
                          </div>
                        ) : (
                          <p className="text-foreground text-xs leading-relaxed">
                            {aiSummaries[project.id]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <FolderKanban className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'No projects match your search or filters.'
                  : 'No projects yet. Create your first project to get started.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              )}
              {!hasActiveFilters && permissions.canCreateProject && (
                <Button asChild className="mt-4">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
