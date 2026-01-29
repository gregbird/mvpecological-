'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, LayoutGrid, List, Calendar, User, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRole } from '@/contexts/role-context'

// Mock projects data (Bolt.new style)
const mockProjects = [
  {
    id: '1',
    name: 'Killarney National Park Assessment',
    client: 'National Parks and Wildlife Service',
    deadline: null,
    surveyType: 'Wintering_Birds',
    status: 'active',
  },
  {
    id: '2',
    name: 'Slieve Rushen Bog NHA',
    client: 'National Parks and Wildlife Service',
    deadline: null,
    surveyType: null,
    status: 'active',
  },
  {
    id: '3',
    name: 'Shannon Estuary Wind Farm',
    client: 'Green Atlantic Energy Ltd',
    deadline: null,
    surveyType: null,
    status: 'draft',
  },
  {
    id: '4',
    name: 'Dublin Port Expansion EIA',
    client: 'Dublin Port Company',
    deadline: null,
    surveyType: null,
    status: 'active',
  },
  {
    id: '5',
    name: 'M7 Motor Badger Survey',
    client: 'Transport Infrastructure Ireland',
    deadline: null,
    surveyType: null,
    status: 'active',
  },
  {
    id: '6',
    name: 'Shannon Estuary Breeding Bird Survey',
    client: 'BirdWatch Ireland',
    deadline: '1/13/2026',
    surveyType: 'Breeding_Birds',
    status: 'active',
  },
  {
    id: '7',
    name: 'Kilkenny Castle Bat Roost Assessment',
    client: 'OPW Heritage Services',
    deadline: '12/14/2025',
    surveyType: null,
    status: 'review',
  },
]

const statusStyles: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  review: { label: 'Review', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
}

export default function ProjectsPage() {
  const { permissions, user } = useRole()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')

  const filteredProjects = mockProjects.filter((project) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      project.name.toLowerCase().includes(query) ||
      project.client.toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
          <p className="text-gray-500 mt-1">Manage all your ecological survey projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <List className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          {permissions.canCreateProject && (
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by project name, client, or site code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base border-gray-200 bg-white"
          />
        </div>
        <button className="flex items-center gap-2 mt-3 text-sm text-gray-600 hover:text-gray-900">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Advanced Filters
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const status = statusStyles[project.status] || statusStyles.draft

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 leading-tight pr-3">
                  {project.name}
                </h3>
                <Badge className={cn('shrink-0', status.className)}>
                  {status.label}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{project.client}</span>
                </div>

                {project.deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{project.deadline}</span>
                  </div>
                )}

                {project.surveyType && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{project.surveyType.replace('_', ' ')}</span>
                  </div>
                )}

                {!project.deadline && !project.surveyType && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>No deadline</span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found</p>
        </div>
      )}
    </div>
  )
}
