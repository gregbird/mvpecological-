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
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'
import type { Project, WorkflowStep } from '@/types/database'
import { useRouter } from 'next/navigation'
import { ProjectDetailModal } from '@/components/dashboard/project-detail-modal'

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

interface ProjectWithTimeline extends Project {
  currentStep: number
  currentStepName: string
  progress: number
  timelineProgress: number
  healthStatus: 'on_track' | 'at_risk' | 'overdue'
  daysInfo: string
}

// Donut chart component with white gaps between segments
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
  const cx = 50
  const cy = 50
  const outerR = 46
  const innerR = 30
  const gapDeg = 2 // white gap in degrees between segments

  function polarToXY(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s1 = polarToXY(startDeg, outerR)
    const e1 = polarToXY(endDeg, outerR)
    const s2 = polarToXY(endDeg, innerR)
    const e2 = polarToXY(startDeg, innerR)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
      `L ${s2.x} ${s2.y}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}`,
      'Z',
    ].join(' ')
  }

  // Filter out zero-value segments for gap calculation
  const nonZero = data.filter((d) => d.value > 0)
  const totalGap = nonZero.length > 1 ? nonZero.length * gapDeg : 0
  const available = 360 - totalGap

  let cursor = 0
  const segments = data.map((item) => {
    if (item.value === 0) return { ...item, startDeg: cursor, endDeg: cursor }
    const sweep = (item.value / total) * available
    const startDeg = cursor + (nonZero.length > 1 ? gapDeg / 2 : 0)
    const endDeg = cursor + sweep + (nonZero.length > 1 ? gapDeg / 2 : 0)
    cursor += sweep + (nonZero.length > 1 ? gapDeg : 0)
    return { ...item, startDeg, endDeg }
  })

  return (
    <div className="relative mx-auto h-56 w-56">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {total === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={outerR - innerR}
          />
        ) : (
          segments.map((seg, i) =>
            seg.value === 0 ? null : (
              <path key={i} d={arcPath(seg.startDeg, seg.endDeg)} fill={seg.color} />
            )
          )
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{centerValue}</span>
        <span className="text-sm text-gray-500">{centerLabel}</span>
      </div>
    </div>
  )
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
  const [allProjects, setAllProjects] = React.useState<ProjectWithTimeline[]>([])
  const [showAllProjects, setShowAllProjects] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedProject, setSelectedProject] = React.useState<ProjectWithTimeline | null>(null)
  const [workflowStepsMap, setWorkflowStepsMap] = React.useState<Record<string, WorkflowStep[]>>({})
  const router = useRouter()

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
          setAllProjects([])
          setIsLoading(false)
          return
        }

        const { data: projects, error } = await projectsQuery

        if (error) throw error

        const projectList = projects || []

        // Calculate health status from expected_end_date
        const now = new Date()
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        // Only non-completed projects count for health
        const activeProjects = projectList.filter((p) => p.status !== 'completed')

        let onTrack = 0
        let atRisk = 0
        let overdue = 0

        for (const p of activeProjects) {
          if (!p.expected_end_date) {
            onTrack++
            continue
          }
          const endDate = new Date(p.expected_end_date)
          if (endDate < now) {
            overdue++
          } else if (endDate <= oneWeekFromNow) {
            atRisk++
          } else {
            onTrack++
          }
        }

        // Calculate stats
        const newStats: DashboardStats = {
          totalProjects: projectList.length,
          draft: projectList.filter((p) => p.status === 'draft').length,
          active: projectList.filter((p) => p.status === 'active').length,
          completed: projectList.filter((p) => p.status === 'completed').length,
          onTrack,
          atRisk,
          overdue,
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

        // Group steps by project for modal
        const grouped: Record<string, WorkflowStep[]> = {}
        for (const step of workflowSteps) {
          if (!grouped[step.project_id]) grouped[step.project_id] = []
          grouped[step.project_id].push(step)
        }
        setWorkflowStepsMap(grouped)

        // Calculate progress and timeline for all projects
        const projectsWithTimeline: ProjectWithTimeline[] = projectList.map((project) => {
          const steps = workflowSteps.filter((s) => s.project_id === project.id)
          const completedSteps = steps.filter(
            (s) => s.status === 'approved' || s.status === 'needs_review'
          ).length
          const totalSteps = steps.length || 10

          const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
          const currentStepData =
            sortedSteps.find((s) => s.status !== 'approved') || sortedSteps[sortedSteps.length - 1]

          // Timeline progress calculation
          let timelineProgress = 0
          let healthStatus: 'on_track' | 'at_risk' | 'overdue' = 'on_track'
          let daysInfo = 'No deadline'

          if (project.expected_end_date) {
            const endDate = new Date(project.expected_end_date)
            const startDate = project.expected_start_date
              ? new Date(project.expected_start_date)
              : new Date(project.created_at)
            const totalDuration = endDate.getTime() - startDate.getTime()
            const elapsed = now.getTime() - startDate.getTime()

            if (totalDuration > 0) {
              timelineProgress = Math.min(
                100,
                Math.max(0, Math.round((elapsed / totalDuration) * 100))
              )
            }

            const diffMs = endDate.getTime() - now.getTime()
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

            if (diffDays < 0) {
              healthStatus = 'overdue'
              daysInfo = `${Math.abs(diffDays)}d over`
            } else if (diffDays <= 7) {
              healthStatus = 'at_risk'
              daysInfo = `${diffDays}d left`
            } else {
              healthStatus = 'on_track'
              daysInfo = `${diffDays}d left`
            }
          }

          return {
            ...project,
            currentStep: currentStepData?.step_number || 1,
            currentStepName: currentStepData?.name || 'GIS Mapping',
            progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            timelineProgress,
            healthStatus,
            daysInfo,
          }
        })

        setAllProjects(projectsWithTimeline)
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
      valueColor: 'text-gray-900',
      icon: FileText,
      color: 'text-blue-500',
      iconBg: 'bg-blue-50',
      border: 'border-l-blue-400',
    },
    {
      label: 'Not Started',
      value: stats.draft,
      valueColor: 'text-blue-600',
      icon: Clock,
      color: 'text-blue-500',
      iconBg: 'bg-blue-50',
      border: 'border-l-blue-400',
    },
    {
      label: 'In Progress',
      value: stats.active,
      valueColor: 'text-orange-500',
      icon: AlertCircle,
      color: 'text-orange-400',
      iconBg: 'bg-orange-50',
      border: 'border-l-orange-400',
    },
    {
      label: 'Completed',
      value: stats.completed,
      valueColor: 'text-green-600',
      icon: CheckCircle,
      color: 'text-green-500',
      iconBg: 'bg-green-50',
      border: 'border-l-green-400',
    },
  ]

  const statusData = [
    { value: stats.draft, color: '#6b7280', label: 'Pending' },
    { value: 0, color: '#3b82f6', label: 'Not Started' },
    { value: stats.active, color: '#f97316', label: 'In Progress' },
    { value: stats.completed, color: '#22c55e', label: 'Completed' },
  ]

  const workflowData = [
    { value: stats.deskResearch, color: '#3b82f6', label: 'Desk Research' },
    { value: stats.fieldResearch, color: '#22c55e', label: 'Field Research' },
    { value: stats.reporting, color: '#f97316', label: 'Reporting' },
  ]

  const healthData = [
    { value: stats.onTrack, color: '#22c55e', label: 'On Track' },
    { value: stats.atRisk, color: '#f59e0b', label: 'At Risk' },
    { value: stats.overdue, color: '#ef4444', label: 'Overdue' },
  ]
  const activeTotal = stats.onTrack + stats.atRisk + stats.overdue
  const healthyPercentage = activeTotal > 0 ? Math.round((stats.onTrack / activeTotal) * 100) : 0

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
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
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
            <Card key={stat.label} className={`border-l-4 border-gray-100 ${stat.border}`}>
              <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className={`mt-1.5 text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.iconBg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Donut Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Project Status Distribution */}
        <Card className="min-h-105">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-xl">Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-4 pb-10">
            <DonutChart
              data={statusData}
              centerLabel="Projects"
              centerValue={stats.totalProjects}
            />
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
              {statusData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3.5 w-3.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Stage Progress */}
        <Card className="min-h-105">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-xl">Workflow Stage Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-4 pb-10">
            <DonutChart data={workflowData} centerLabel="Active" centerValue={stats.active} />
            <div className="mt-8 space-y-3">
              {workflowData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3.5 w-3.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Health */}
        <Card className="min-h-105">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-xl">Timeline Health</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-4 pb-10">
            <DonutChart
              data={healthData}
              centerLabel="Healthy"
              centerValue={`${healthyPercentage}%`}
            />
            <div className="mt-8 space-y-3">
              {healthData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Projects Timeline Status */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">All Projects Timeline Status</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {allProjects.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
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
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {(showAllProjects ? allProjects : allProjects.slice(0, 12)).map((project) => {
                const healthColors = {
                  on_track: {
                    dot: 'bg-green-500',
                    text: 'text-green-600',
                    bar: 'bg-green-500',
                  },
                  at_risk: {
                    dot: 'bg-amber-500',
                    text: 'text-amber-600',
                    bar: 'bg-amber-500',
                  },
                  overdue: {
                    dot: 'bg-red-500',
                    text: 'text-red-600',
                    bar: 'bg-red-500',
                  },
                }
                const colors = healthColors[project.healthStatus]
                const statusLabel =
                  project.status === 'completed'
                    ? 'Completed'
                    : project.status === 'draft'
                      ? 'Draft'
                      : 'Active'

                const formatDate = (dateStr: string | null) => {
                  if (!dateStr) return null
                  return new Date(dateStr).toLocaleDateString('en-IE', {
                    day: 'numeric',
                    month: 'short',
                  })
                }

                const startLabel = formatDate(project.expected_start_date ?? project.created_at)
                const endLabel = formatDate(project.expected_end_date)

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedProject(project)
                      } else {
                        router.push(`/projects/${project.id}?step=${project.currentStep}`)
                      }
                    }}
                    className="block cursor-pointer"
                  >
                    <Card className="h-full transition-colors hover:border-blue-300 hover:shadow-md">
                      <CardContent className="p-5">
                        {/* Row 1: Status dot + Project name */}
                        <div className="mb-1 flex items-center gap-2.5">
                          <div className={`h-3.5 w-3.5 flex-shrink-0 rounded-full ${colors.dot}`} />
                          <h3 className="line-clamp-1 leading-tight font-semibold text-gray-900">
                            {project.name}
                          </h3>
                        </div>

                        {/* Row 2: Site code */}
                        <p className="mb-3 pl-6 font-mono text-xs text-gray-400">
                          {project.site_code || project.id.slice(0, 8)}
                        </p>

                        {/* Row 3: Status + days info */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-gray-600">{statusLabel}</span>
                          <span className={`text-sm font-semibold ${colors.text}`}>
                            {project.daysInfo}
                          </span>
                        </div>

                        {/* Row 4: Progress bar */}
                        <div className="mb-2">
                          <div className="h-2 w-full rounded-full bg-gray-100">
                            <div
                              className={`h-2 rounded-full transition-all ${colors.bar}`}
                              style={{ width: `${project.timelineProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Row 5: Start - End dates */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{startLabel || '—'}</span>
                          <span className="text-xs text-gray-400">{endLabel || '—'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>

            {/* Show more / Show less toggle */}
            {allProjects.length > 12 && (
              <div className="mt-5 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllProjects(!showAllProjects)}
                >
                  {showAllProjects ? 'Show less' : 'Show more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Project Detail Modal */}
      {isAdmin && (
        <ProjectDetailModal
          project={selectedProject}
          workflowSteps={selectedProject ? workflowStepsMap[selectedProject.id] || [] : []}
          teamName={user?.full_name || undefined}
          open={!!selectedProject}
          onOpenChange={(open) => {
            if (!open) setSelectedProject(null)
          }}
        />
      )}

      {/* Quick Actions for Assessor */}
      {!isAdmin && allProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump back into your work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allProjects.slice(0, 3).map((project) => (
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
