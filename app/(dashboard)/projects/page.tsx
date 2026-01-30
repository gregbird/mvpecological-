'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  Clock,
  Plus,
  Users,
  FolderKanban,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  FlaskConical,
  BarChart3,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRole } from '@/contexts/role-context'

// Mock projects - All projects for admin, assigned for assessor
const allProjects = [
  {
    id: '1',
    code: 'KNP-2024-001',
    name: 'Killarney National Park Assessment',
    client: 'National Parks and Wildlife Service',
    location: 'Co. Kerry',
    dueDate: '30 Apr 2024',
    currentStep: 2,
    currentStepName: 'Data Gathering',
    phase: 'Desk Research',
    progress: 20,
    status: 'active',
    assignedTo: 'Sarah Murphy',
  },
  {
    id: '2',
    code: 'SRB-2024-002',
    name: 'Slieve Rushen Bog NHA',
    client: 'National Parks and Wildlife Service',
    location: 'Co. Cavan',
    dueDate: '15 May 2024',
    currentStep: 5,
    currentStepName: 'Habitat Mapping',
    phase: 'Field Research',
    progress: 50,
    status: 'active',
    assignedTo: 'Sarah Murphy',
  },
  {
    id: '3',
    code: 'SEW-2024-003',
    name: 'Shannon Estuary Wind Farm',
    client: 'Green Atlantic Energy Ltd',
    location: 'Co. Clare',
    dueDate: '20 Jun 2024',
    currentStep: 8,
    currentStepName: 'AI Draft',
    phase: 'Reporting',
    progress: 80,
    status: 'review',
    assignedTo: 'John Kelly',
  },
  {
    id: '4',
    code: 'DPE-2024-004',
    name: 'Dublin Port Expansion EIA',
    client: 'Dublin Port Company',
    location: 'Co. Dublin',
    dueDate: '10 Jul 2024',
    currentStep: 1,
    currentStepName: 'GIS Mapping',
    phase: 'Initial Setup',
    progress: 5,
    status: 'active',
    assignedTo: 'Mike Walsh',
  },
]

const phaseColors: Record<string, string> = {
  'Initial Setup': 'bg-gray-100 text-gray-700 border-gray-200',
  'Desk Research': 'bg-blue-100 text-blue-700 border-blue-200',
  'Field Research': 'bg-amber-100 text-amber-700 border-amber-200',
  Reporting: 'bg-purple-100 text-purple-700 border-purple-200',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  review: 'bg-amber-500',
  completed: 'bg-blue-500',
  draft: 'bg-gray-400',
}

export default function ProjectsPage() {
  const { user, currentRole, permissions } = useRole()
  const [searchQuery, setSearchQuery] = React.useState('')

  // Admin sees all projects, Assessor sees only assigned
  const visibleProjects =
    currentRole === 'admin' ? allProjects : allProjects.filter((p) => p.assignedTo === user.name)

  const filteredProjects = visibleProjects.filter((project) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      project.name.toLowerCase().includes(query) ||
      project.client.toLowerCase().includes(query) ||
      project.code.toLowerCase().includes(query)
    )
  })

  const activeCount = visibleProjects.filter((p) => p.status === 'active').length
  const reviewCount = visibleProjects.filter((p) => p.status === 'review').length
  const completedCount = visibleProjects.filter((p) => p.status === 'completed').length

  // Admin view
  if (currentRole === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects Dashboard</h1>
              <p className="mt-1 text-gray-500">Manage all ecological survey projects</p>
            </div>
            {permissions.canCreateProject && (
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-8 py-6">
          <div className="mb-6 grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <FolderKanban className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{visibleProjects.length}</p>
                    <p className="text-sm text-gray-500">Total Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-100 p-3">
                    <Clock className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeCount}</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-100 p-3">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reviewCount}</p>
                    <p className="text-sm text-gray-500">In Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 border-gray-200 bg-white pl-12 text-base"
            />
          </div>

          {/* Project List */}
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">{project.code}</span>
                      <span className={cn('h-2 w-2 rounded-full', statusColors[project.status])} />
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-gray-900">{project.name}</h3>

                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>{project.client}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {project.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {project.dueDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project.assignedTo}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', phaseColors[project.phase])}
                      >
                        {project.phase}
                      </Badge>
                      <div className="flex max-w-[200px] flex-1 items-center gap-2">
                        <Progress value={project.progress} className="h-2" />
                        <span className="text-xs font-medium text-gray-500">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Step {project.currentStep}/10</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-gray-700">
                        {project.currentStepName}
                      </p>
                    </div>

                    <Button asChild variant="outline">
                      <Link href={`/projects/${project.id}`}>
                        View
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
              <p className="text-gray-500">No projects found</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Next actions count (projects that need attention)
  const nextActionsCount = visibleProjects.filter(
    (p) => p.status === 'active' || p.status === 'review'
  ).length

  // Assessor view - Dulra prototype style
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">My Assigned Tasks</h1>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Assignments</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{visibleProjects.length}</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-2">
                  <FolderKanban className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-amber-700">In Progress</p>
                  <p className="mt-1 text-3xl font-bold text-amber-700">{activeCount}</p>
                </div>
                <div className="rounded-lg bg-amber-100 p-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-emerald-700">Completed</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">{completedCount}</p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Next Actions</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{nextActionsCount}</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Workflow Guide */}
        <Card className="mb-8 border-gray-200">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Assessment Workflow Guide</h2>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {/* Phase 1: Desk Research */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">1. Desk Research</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">GIS Mapping & Data Mine</p>
                </div>
              </div>

              {/* Phase 2: Field Research */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <FlaskConical className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">2. Field Research</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">Field Survey & Impact Calculation</p>
                </div>
              </div>

              {/* Phase 3: Reporting */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">3. Reporting</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">Generate Assessment Report</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Assessments */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active Assessments</h2>
          {permissions.canCreateProject && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 border-gray-200 bg-white pl-12 text-base"
          />
        </div>

        {/* Project List */}
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="border-gray-200 bg-white transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Project Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          project.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : project.status === 'review'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-gray-200 bg-gray-50 text-gray-700'
                        )}
                      >
                        {project.status === 'active' ? 'in progress' : project.status}
                      </Badge>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        Site Code: {project.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Assigned by: {project.client}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due: {project.dueDate}
                      </span>
                    </div>

                    {/* Overall Progress */}
                    <div className="mb-4">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Overall Progress</span>
                        <span className="text-gray-500">
                          {Math.round(project.progress / 10)} of 10 completed
                        </span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    {/* Phase Badge and Action */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Current Phase: {project.phase.toLowerCase()}
                      </Badge>
                      <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                        {project.currentStepName}
                      </Badge>
                    </div>
                  </div>

                  {/* Right: Step indicator */}
                  <div className="text-right">
                    <div className="mb-3 text-sm text-gray-500">Step {project.currentStep}/10</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <Button asChild className="bg-red-500 text-white hover:bg-red-600">
                    <Link href={`/projects/${project.id}`}>View Workflow</Link>
                  </Button>
                  <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
                    <Link href={`/projects/${project.id}?step=${project.currentStep}`}>
                      Start Next Step
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <Link href={`/projects/${project.id}`}>View Assessment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No projects assigned to you</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
