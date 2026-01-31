'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, Calendar, MapPin, ChevronRight, Plus, FolderKanban, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRole } from '@/contexts/role-context'
import { getPhaseByStepNumber } from '@/lib/config/workflow'
import { createClient } from '@/lib/supabase/client'
import type { Project, WorkflowStep } from '@/types/database'

interface ProjectWithProgress extends Project {
  currentStep: number
  currentStepName: string
  progress: number
  client?: { name: string } | null
  assigned_to_profile?: { full_name: string } | null
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
            client:clients(name)
          `
          )
          .eq('organization_id', user.organization_id)
          .order('updated_at', { ascending: false })

        if (projectsError) throw projectsError

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

        // Calculate progress for each project
        const projectsWithProgress: ProjectWithProgress[] = (projectsData || []).map((project) => {
          const steps = workflowSteps.filter((s) => s.project_id === project.id)
          const completedSteps = steps.filter(
            (s) => s.status === 'approved' || s.status === 'needs_review'
          ).length
          const totalSteps = steps.length || 10 // Default to 10 if no steps

          // Find current step (first non-completed step or last step)
          const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
          const currentStepData =
            sortedSteps.find((s) => s.status !== 'approved') || sortedSteps[sortedSteps.length - 1]

          return {
            ...project,
            currentStep: currentStepData?.step_number || 1,
            currentStepName: currentStepData?.name || 'GIS Mapping',
            progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
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

  // Filter projects based on role and search
  const filteredProjects = React.useMemo(() => {
    let visibleProjects = projects

    // For non-admin users, filter to only show assigned projects
    if (user?.role !== 'admin') {
      visibleProjects = projects.filter((p) => p.created_by === user?.id)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      visibleProjects = visibleProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.client?.name?.toLowerCase().includes(query) ||
          project.site_code?.toLowerCase().includes(query)
      )
    }

    return visibleProjects
  }, [projects, user, searchQuery])

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
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          <Input
            placeholder="Search projects by name, client, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-card h-12 pl-12 text-base"
          />
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
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Project Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-xs">
                          {project.site_code || project.id.slice(0, 8)}
                        </span>
                        <span className={cn('h-2 w-2 rounded-full', status?.dot)} />
                        <Badge variant="outline" className={cn('text-xs', status?.className)}>
                          {status?.label}
                        </Badge>
                      </div>

                      <Link href={`/projects/${project.id}`} className="group">
                        <h3 className="text-foreground mb-2 text-lg font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {project.name}
                        </h3>
                      </Link>

                      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {project.client?.name && <span>{project.client.name}</span>}
                        {project.grid_reference && (
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

                      {/* Progress and Phase */}
                      <div className="flex items-center gap-4">
                        <Badge className={cn('text-xs', phaseInfo.color)}>{phaseInfo.label}</Badge>
                        <div className="flex max-w-[180px] flex-1 items-center gap-2">
                          <Progress value={project.progress} className="h-2" />
                          <span className="text-muted-foreground text-xs font-medium">
                            {project.progress}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Step Info & Action */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <span>Step {project.currentStep}/10</span>
                        </div>
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
                {searchQuery
                  ? 'No projects match your search'
                  : 'No projects yet. Create your first project to get started.'}
              </p>
              {!searchQuery && permissions.canCreateProject && (
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
