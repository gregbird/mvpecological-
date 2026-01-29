'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileText, Clock, AlertCircle, CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRole } from '@/contexts/role-context'

// Stats data
const stats = [
  {
    label: 'Total Projects',
    value: 37,
    icon: FileText,
    color: 'bg-blue-50 text-blue-600',
    iconBg: 'bg-blue-100',
  },
  {
    label: 'Not Started',
    value: 0,
    icon: Clock,
    color: 'bg-gray-50 text-gray-600',
    iconBg: 'bg-gray-100',
  },
  {
    label: 'In Progress',
    value: 0,
    icon: AlertCircle,
    color: 'bg-orange-50 text-orange-600',
    iconBg: 'bg-orange-100',
  },
  {
    label: 'Completed',
    value: 0,
    icon: CheckCircle,
    color: 'bg-emerald-50 text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
]

// Donut chart component
function DonutChart({
  data,
  centerLabel,
  centerValue
}: {
  data: { value: number; color: string; label: string }[]
  centerLabel: string
  centerValue: string | number
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {total === 0 ? (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
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
  const { user, permissions } = useRole()

  const projectStatusData = [
    { value: 37, color: '#9ca3af', label: 'Pending' },
    { value: 0, color: '#3b82f6', label: 'Not Started' },
    { value: 0, color: '#f97316', label: 'In Progress' },
    { value: 0, color: '#22c55e', label: 'Completed' },
  ]

  const workflowData = [
    { value: 0, color: '#3b82f6', label: 'Desk Research' },
    { value: 0, color: '#22c55e', label: 'Field Research' },
    { value: 0, color: '#f97316', label: 'Reporting' },
  ]

  const timelineHealthData = [
    { value: 18, color: '#22c55e', label: 'On Track' },
    { value: 2, color: '#f97316', label: 'At Risk' },
    { value: 17, color: '#ef4444', label: 'Overdue' },
  ]

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
        </div>
        {permissions.canCreateProject && (
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.iconBg}`}>
                  <Icon className={`h-6 w-6 ${stat.color.split(' ')[1]}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Project Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Status Distribution</h3>
          <DonutChart
            data={projectStatusData}
            centerLabel="Projects"
            centerValue={37}
          />
          <div className="mt-6 grid grid-cols-2 gap-2">
            {projectStatusData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Stage Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Stage Progress</h3>
          <DonutChart
            data={workflowData}
            centerLabel="Active"
            centerValue={0}
          />
          <div className="mt-6 space-y-2">
            {workflowData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Timeline Health</h3>
          <DonutChart
            data={timelineHealthData}
            centerLabel="Healthy"
            centerValue="49%"
          />
          <div className="mt-6 space-y-2">
            {timelineHealthData.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Projects Timeline Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Projects Timeline Status</h3>
        <div className="text-center py-12 text-gray-500">
          <p>Project timeline visualization coming soon...</p>
          <Link href="/projects" className="text-emerald-600 hover:underline mt-2 inline-block">
            View all projects
          </Link>
        </div>
      </div>
    </div>
  )
}
