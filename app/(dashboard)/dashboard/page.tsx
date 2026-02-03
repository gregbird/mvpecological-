'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Loader2,
  ChevronRight,
  MapPin,
  Calendar,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'
import { getPhaseByStepNumber } from '@/lib/config/workflow'
import type { Project, WorkflowStep } from '@/types/database'

interface DashboardStats {
  totalProjects: number
  draft: number
  active: number
  completed: number
  onTrack: number
  atRisk: number
  overdue: number
  deskResearch: number
  fieldResearch: number
  reporting: number
}

interface ProjectWithProgress extends Project {
  currentStep: number
  currentStepName: string
  progress: number
}

// Donut chart component
function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: { value: number; color: string; label: string }[]
  centerLabel: string
  centerValue: string | number
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {total === 0 ? (
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
        ) : (
          data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`
            const rotation = currentAngle * 3.6
            currentAngle += percentage

            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset="0"
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
              />
            )
          })
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{centerValue}</span>
        <span className="text-xs text-gray-500">{centerLabel}</span>
      </div>
    </div>
  )
}

function getPhaseInfo(stepNumber: number) {
  const phase = getPhaseByStepNumber(stepNumber)
  if (!phase) return { label: 'Unknown', color: 'bg-gray-100 text-gray-700' }

  const colors = {
    'desk-research': 'bg-blue-100 text-blue-700',
    'field-research': 'bg-amber-100 text-amber-700',
    reporting: 'bg-purple-100 text-purple-700',
  }

  return {
    label: phase.label,
    color: colors[phase.id as keyof typeof colors] || 'bg-gray-100 text-gray-700',
  }
}

export default function DashboardPage() {
  const { user, permissions, isLoading: isRoleLoading } = useRole()
  const [stats, setStats] = React.useState<DashboardStats>({
    totalProjects: 0,
    draft: 0,
    active: 0,
    completed: 0,
    onTrack: 0,
    atRisk: 0,
    overdue: 0,
    deskResearch: 0,
    fieldResearch: 0,
    reporting: 0,
  })
  const [recentProjects, setRecentProjects] = React.useState<ProjectWithProgress[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const isAdmin = user?.role === 'admin'

  // Fetch dashboard data
  React.useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.organization_id) {
        setIsLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // For assessors, get their assigned project IDs first
        let assignedProjectIds: string[] = []
        if (!isAdmin) {
          const { data: memberships } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id)

          assignedProjectIds = memberships?.map((m) => m.project_id) || []
        }

        // Fetch projects
        let projectsQuery = supabase
          .from('projects')
          .select('*')
          .eq('organization_id', user.organization_id)
          .order('updated_at', { ascending: false })

        // For assessors, filter to only assigned projects
        if (!isAdmin && assignedProjectIds.length > 0) {
          projectsQuery = projectsQuery.in('id', assignedProjectIds)
        } else if (!isAdmin && assignedProjectIds.length === 0) {
          // No assigned projects
          setStats({
            totalProjects: 0,
            draft: 0,
            active: 0,
            completed: 0,
            onTrack: 0,
            atRisk: 0,
            overdue: 0,
            deskResearch: 0,
            fieldResearch: 0,
            reporting: 0,
          })
          setRecentProjects([])
          setIsLoading(false)
          return
        }

        const { data: projects, error } = await projectsQuery

        if (error) throw error

        const projectList = projects || []

        // Calculate stats
        const newStats: DashboardStats = {
          totalProjects: projectList.length,
          draft: projectList.filter((p) => p.status === 'draft').length,
          active: projectList.filter((p) => p.status === 'active').length,
          completed: projectList.filter((p) => p.status === 'completed').length,
          onTrack: projectList.filter((p) => p.health_status === 'on_track').length,
          atRisk: projectList.filter((p) => p.health_status === 'at_risk').length,
          overdue: projectList.filter((p) => p.health_status === 'overdue').length,
          deskResearch: projectList.filter((p) => p.current_phase === 'desk_research').length,
          fieldResearch: projectList.filter((p) => p.current_phase === 'field_research').length,
          reporting: projectList.filter((p) => p.current_phase === 'reporting').length,
        }

        setStats(newStats)

        // Fetch workflow steps for progress calculation
        const projectIds = projectList.map((p) => p.id)
        let workflowSteps: WorkflowStep[] = []

        if (projectIds.length > 0) {
          const { data: stepsData } = await supabase
            .from('workflow_steps')
            .select('*')
            .in('project_id', projectIds)

          workflowSteps = stepsData || []
        }

        // Calculate progress for recent projects (top 5)
        const recentWithProgress: ProjectWithProgress[] = projectList.slice(0, 5).map((project) => {
          const steps = workflowSteps.filter((s) => s.project_id === project.id)
          const completedSteps = steps.filter(
            (s) => s.status === 'approved' || s.status === 'needs_review'
          ).length
          const totalSteps = steps.length || 10

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

        setRecentProjects(recentWithProgress)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isRoleLoading) {
      fetchDashboardData()
    }
  }, [user, isRoleLoading, isAdmin])

  // Stats cards
  const statsCards = [
    {
      label: isAdmin ? 'Total Projects' : 'My Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'In Progress',
      value: stats.active,
      icon: Clock,
      color: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Needs Attention',
      value: stats.atRisk + stats.overdue,
      icon: AlertCircle,
      color: 'text-red-600',
      iconBg: 'bg-red-100',
    },
  ]

  const workflowData = [
    { value: stats.deskResearch, color: '#3b82f6', label: 'Desk Research' },
    { value: stats.fieldResearch, color: '#f59e0b', label: 'Field Research' },
    { value: stats.reporting, color: '#8b5cf6', label: 'Reporting' },
  ]

  // Loading state
  if (isLoading || isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Dashboard' : 'My Dashboard'}
          </h1>
          <p className="mt-1 text-gray-500">Welcome back, {user?.full_name || 'User'}</p>
        </div>
        {permissions.canCreateProject && (
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-2.5 ${stat.iconBg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent/Assigned Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isAdmin ? 'Recent Projects' : 'My Assigned Projects'}</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Latest project activity' : 'Projects assigned to you'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  View all
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="py-8 text-center">
                <FolderKanban className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">
                  {isAdmin
                    ? 'No projects yet. Create your first project to get started.'
                    : 'No projects assigned to you yet.'}
                </p>
                {permissions.canCreateProject && (
                  <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/projects/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => {
                  const phaseInfo = getPhaseInfo(project.currentStep)
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?step=${project.currentStep}`}
                      className="block rounded-lg border p-4 transition-colors hover:border-emerald-300 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-400">
                              {project.site_code || project.id.slice(0, 8)}
                            </span>
                            <Badge className={phaseInfo.color}>{phaseInfo.label}</Badge>
                          </div>
                          <h4 className="font-medium text-gray-900">{project.name}</h4>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            {project.grid_reference && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {project.grid_reference}
                              </span>
                            )}
                            {project.expected_end_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(project.expected_end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm text-gray-500">
                            Step {project.currentStep}/10
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="h-2 w-20" />
                            <span className="text-xs font-medium text-gray-600">
                              {project.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Distribution</CardTitle>
            <CardDescription>Projects by current phase</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={workflowData} centerLabel="Active" centerValue={stats.active} />
            <div className="mt-4 space-y-2">
              {workflowData.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Assessor */}
      {!isAdmin && recentProjects.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump back into your work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.slice(0, 3).map((project) => (
                <Button
                  key={project.id}
                  variant="outline"
                  className="h-auto justify-start p-4"
                  asChild
                >
                  <Link href={`/projects/${project.id}?step=${project.currentStep}`}>
                    <div className="text-left">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-gray-500">Continue: {project.currentStepName}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
