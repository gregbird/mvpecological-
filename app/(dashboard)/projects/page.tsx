'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, Calendar, MapPin, ChevronRight, Plus, FolderKanban } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRole } from '@/contexts/role-context'
import { getPhaseByStepNumber } from '@/lib/config/workflow'

// Mock projects data
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
    progress: 5,
    status: 'active',
    assignedTo: 'Mike Walsh',
  },
]

const statusConfig = {
  active: {
    label: 'In Progress',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  review: {
    label: 'In Review',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
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

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-border bg-card border-b px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">
              {currentRole === 'admin' ? 'Projects Dashboard' : 'My Assessments'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentRole === 'admin'
                ? 'Manage all ecological survey projects'
                : 'Your assigned assessment tasks'}
            </p>
          </div>
          {permissions.canCreateProject && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              New Project
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
                          {project.code}
                        </span>
                        <span className={cn('h-2 w-2 rounded-full', status.dot)} />
                        <Badge variant="outline" className={cn('text-xs', status.className)}>
                          {status.label}
                        </Badge>
                      </div>

                      <Link href={`/projects/${project.id}`} className="group">
                        <h3 className="text-foreground mb-2 text-lg font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {project.name}
                        </h3>
                      </Link>

                      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span>{project.client}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {project.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Due: {project.dueDate}
                        </span>
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
                {searchQuery ? 'No projects match your search' : 'No projects found'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
