'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileText, Clock, AlertCircle, CheckCircle, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'

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
    <div className="relative mx-auto h-48 w-48">
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
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch dashboard stats
  React.useEffect(() => {
    async function fetchStats() {
      if (!user?.organization_id) {
        setIsLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Fetch all projects for the organization
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, status, health_status, current_phase')
          .eq('organization_id', user.organization_id)

        if (error) throw error

        // Calculate stats
        const projectList = projects || []
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
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isRoleLoading) {
      fetchStats()
    }
  }, [user, isRoleLoading])

  // Build stats cards data
  const statsCards = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: Clock,
      color: 'bg-gray-50 text-gray-600',
      iconBg: 'bg-gray-100',
    },
    {
      label: 'In Progress',
      value: stats.active,
      icon: AlertCircle,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
  ]

  const projectStatusData = [
    { value: stats.draft, color: '#9ca3af', label: 'Draft' },
    { value: stats.active, color: '#f97316', label: 'In Progress' },
    { value: stats.completed, color: '#22c55e', label: 'Completed' },
  ]

  const workflowData = [
    { value: stats.deskResearch, color: '#3b82f6', label: 'Desk Research' },
    { value: stats.fieldResearch, color: '#22c55e', label: 'Field Research' },
    { value: stats.reporting, color: '#f97316', label: 'Reporting' },
  ]

  const timelineHealthData = [
    { value: stats.onTrack, color: '#22c55e', label: 'On Track' },
    { value: stats.atRisk, color: '#f97316', label: 'At Risk' },
    { value: stats.overdue, color: '#ef4444', label: 'Overdue' },
  ]

  const healthyPercentage =
    stats.totalProjects > 0 ? Math.round((stats.onTrack / stats.totalProjects) * 100) : 0

  // Loading state
  if (isLoading || isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.iconBg}`}>
                  <Icon className={`h-6 w-6 ${stat.color.split(' ')[1]}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Project Status Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">Project Status Distribution</h3>
          <DonutChart
            data={projectStatusData}
            centerLabel="Projects"
            centerValue={stats.totalProjects}
          />
          <div className="mt-6 grid grid-cols-2 gap-2">
            {projectStatusData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Stage Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">Workflow Stage Progress</h3>
          <DonutChart data={workflowData} centerLabel="Active" centerValue={stats.active} />
          <div className="mt-6 space-y-2">
            {workflowData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Health */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">Timeline Health</h3>
          <DonutChart
            data={timelineHealthData}
            centerLabel="Healthy"
            centerValue={`${healthyPercentage}%`}
          />
          <div className="mt-6 space-y-2">
            {timelineHealthData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Projects Timeline Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">All Projects Timeline Status</h3>
        <div className="py-12 text-center text-gray-500">
          {stats.totalProjects === 0 ? (
            <>
              <p>No projects yet. Create your first project to see analytics.</p>
              {permissions.canCreateProject && (
                <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <p>Project timeline visualization coming soon...</p>
              <Link href="/projects" className="mt-2 inline-block text-emerald-600 hover:underline">
                View all projects
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
