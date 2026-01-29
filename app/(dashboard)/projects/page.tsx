'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, LayoutGrid, List, Download, Eye, Edit, Trash2, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProjectCard } from '@/components/dashboard/project-card'
import { StatusFilter, type FilterState } from '@/components/dashboard/status-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { PHASE_COLORS, HEALTH_STATUS_COLORS, type ProjectWithDetails } from '@/types'
import { useRole } from '@/contexts/role-context'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

// Mock data - same as dashboard
const mockProjects: ProjectWithDetails[] = [
  {
    id: '1',
    name: 'Ballymore Wind Farm EcIA',
    site_code: 'BWF-2024-001',
    status: 'active',
    current_phase: 'desk_research',
    health_status: 'on_track',
    expected_start_date: '2024-01-15',
    expected_end_date: '2024-04-30',
    progress: 35,
    client: { id: 'c1', name: 'Energia Renewables' },
    members: [
      { id: 'm1', full_name: 'Eoin Murphy', avatar_url: null, role: 'lead' },
      { id: 'm2', full_name: "Sarah O'Brien", avatar_url: null, role: 'surveyor' },
    ],
  },
  {
    id: '2',
    name: 'Dublin Port Expansion AA',
    site_code: 'DPE-2024-002',
    status: 'active',
    current_phase: 'field_research',
    health_status: 'at_risk',
    expected_start_date: '2024-01-01',
    expected_end_date: '2024-03-15',
    progress: 65,
    client: { id: 'c2', name: 'Dublin Port Company' },
    members: [{ id: 'm1', full_name: 'Eoin Murphy', avatar_url: null, role: 'lead' }],
  },
  {
    id: '3',
    name: 'Galway Solar Farm Screening',
    site_code: 'GSF-2024-003',
    status: 'active',
    current_phase: 'reporting',
    health_status: 'on_track',
    expected_start_date: '2024-02-01',
    expected_end_date: '2024-03-30',
    progress: 85,
    client: { id: 'c3', name: 'SSE Renewables' },
    members: [],
  },
  {
    id: '4',
    name: 'Cork Harbour Marina NIS',
    site_code: 'CHM-2024-004',
    status: 'active',
    current_phase: 'desk_research',
    health_status: 'overdue',
    expected_start_date: '2023-12-01',
    expected_end_date: '2024-02-28',
    progress: 20,
    client: { id: 'c4', name: 'Cork County Council' },
    members: [],
  },
  {
    id: '5',
    name: 'Limerick Housing Development',
    site_code: 'LHD-2024-005',
    status: 'draft',
    current_phase: 'desk_research',
    health_status: 'on_track',
    expected_start_date: null,
    expected_end_date: null,
    progress: 0,
    client: { id: 'c5', name: 'Private Developer' },
    members: [],
  },
  {
    id: '6',
    name: 'Kerry Coastal Walk EcIA',
    site_code: 'KCW-2024-006',
    status: 'active',
    current_phase: 'field_research',
    health_status: 'on_track',
    expected_start_date: '2024-02-15',
    expected_end_date: '2024-05-30',
    progress: 45,
    client: { id: 'c6', name: 'Kerry County Council' },
    members: [],
  },
]

export default function ProjectsPage() {
  const { permissions, currentRole, roleConfig } = useRole()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = React.useState<FilterState>({
    status: [],
    phase: [],
    health: [],
  })

  // Filter projects based on search and filters
  let filteredProjects = mockProjects.filter((project) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        project.name.toLowerCase().includes(query) ||
        project.site_code?.toLowerCase().includes(query) ||
        project.client?.name.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(project.status)) {
      return false
    }

    // Phase filter
    if (filters.phase.length > 0 && !filters.phase.includes(project.current_phase)) {
      return false
    }

    // Health filter
    if (filters.health.length > 0 && !filters.health.includes(project.health_status)) {
      return false
    }

    return true
  })

  // For roles that can't view all projects, limit to assigned projects only (mock: first 2)
  if (!permissions.canViewAllProjects) {
    filteredProjects = filteredProjects.slice(0, 2)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Role-specific alert */}
        {permissions.isReadOnly && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertTitle>Read-Only Access</AlertTitle>
            <AlertDescription>
              You are viewing as a {roleConfig.label}. You can view project details and reports but cannot make changes.
            </AlertDescription>
          </Alert>
        )}

        {!permissions.canViewAllProjects && !permissions.isReadOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Limited Access</AlertTitle>
            <AlertDescription>
              You can only see projects you are assigned to. Contact a senior ecologist to be added to more projects.
            </AlertDescription>
          </Alert>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              {permissions.canViewAllProjects
                ? 'Manage all your ecological projects'
                : `Showing ${filteredProjects.length} assigned project(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permissions.canExportData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export project data as CSV</TooltipContent>
              </Tooltip>
            )}
            {permissions.canCreateProject ? (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Only Admin and Senior Ecologists can create new projects
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <StatusFilter filters={filters} onFiltersChange={setFilters} />
            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects Display */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <p className="text-muted-foreground">No projects found</p>
            {(searchQuery ||
              filters.status.length > 0 ||
              filters.phase.length > 0 ||
              filters.health.length > 0) && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('')
                  setFilters({ status: [], phase: [], health: [] })
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const phaseColors = PHASE_COLORS[project.current_phase]
                  const healthColors = HEALTH_STATUS_COLORS[project.health_status]

                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="hover:underline">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full', healthColors.bg)} />
                            <div>
                              <p className="font-medium">{project.name}</p>
                              <p className="text-muted-foreground text-sm">{project.site_code}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{project.client?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(phaseColors.bg, phaseColors.text, phaseColors.border)}
                        >
                          {project.current_phase.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress} className="h-2 w-20" />
                          <span className="text-muted-foreground text-sm">{project.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.expected_end_date ? formatDate(project.expected_end_date) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/projects/${project.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Project</TooltipContent>
                          </Tooltip>

                          {permissions.canEditProject && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Project</TooltipContent>
                            </Tooltip>
                          )}

                          {permissions.canDeleteProject && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Project</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Permissions Legend for Admins/Seniors */}
        {(currentRole === 'admin' || currentRole === 'senior_ecologist') && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-medium mb-2">Role Permissions Reference</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Admin:</span> Full access, settings, delete
              </div>
              <div>
                <span className="font-medium text-foreground">Senior:</span> Create, edit, approve, team
              </div>
              <div>
                <span className="font-medium text-foreground">Field:</span> Add observations, view reports
              </div>
              <div>
                <span className="font-medium text-foreground">GIS:</span> Edit maps, export data
              </div>
              <div>
                <span className="font-medium text-foreground">Junior:</span> Add observations only
              </div>
              <div>
                <span className="font-medium text-foreground">Client:</span> Read-only access
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
