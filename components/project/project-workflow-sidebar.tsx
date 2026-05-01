'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  PanelLeftClose,
  PanelLeft,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Pencil,
  Settings,
  Trash2,
  Loader2,
  Users,
  UserPlus,
  X,
  Search,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { useDeleteProject, useUpdateProject } from '@/hooks/queries/use-project-hooks'
import { useRole } from '@/contexts/role-context'
import { useProjectContext } from '@/contexts/project-context'
import {
  WORKFLOW_PHASES,
  getPhaseByStepNumber,
  getPhaseColorClasses,
  TOTAL_STEPS,
} from '@/lib/config/workflow'

export function ProjectWorkflowSidebar() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: roleUser, permissions } = useRole()
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()
  const {
    project,
    workflowSteps,
    currentStepNumber,
    progress,
    navigateToStep,
    getStepStatus,
    isLoading,
    isSidebarCollapsed,
    toggleSidebar,
  } = useProjectContext()

  // Determine which phases to expand by default
  const currentPhase = getPhaseByStepNumber(currentStepNumber)
  const defaultExpandedPhases = currentPhase ? [currentPhase.id] : ['desk-research']

  // Header collapse state - auto collapse when on GIS mapping step (step 1)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = React.useState(currentStepNumber === 1)

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  // Inline rename state
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [nameValue, setNameValue] = React.useState('')
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const canRenameProject = roleUser?.role !== 'client'

  const startRename = () => {
    if (!project) return
    setNameValue(project.name)
    setIsEditingName(true)
    setIsHeaderCollapsed(false)
  }

  const cancelRename = React.useCallback(() => {
    setIsEditingName(false)
    setNameValue('')
  }, [])

  const commitRename = async () => {
    if (!project) return
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === project.name) {
      cancelRename()
      return
    }
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: { name: trimmed },
      })
      toast({
        title: 'Project renamed',
        description: `Renamed to "${trimmed}"`,
      })
      setIsEditingName(false)
    } catch (err) {
      console.error('Rename project error:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to rename project',
      })
    }
  }

  React.useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [isEditingName])

  // Team management dialog
  const [showTeamDialog, setShowTeamDialog] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<
    Array<{
      id: string
      user_id: string
      role: string
      profile: Profile
    }>
  >([])
  const [availableMembers, setAvailableMembers] = React.useState<Profile[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = React.useState(false)
  const [isAddingMember, setIsAddingMember] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<'lead' | 'member' | 'reviewer' | 'viewer'>(
    'member'
  )

  const handleDeleteProject = async () => {
    if (!project) return

    try {
      const success = await deleteProject.mutateAsync(project.id)
      if (success) {
        toast({
          title: 'Project deleted',
          description: 'The project has been permanently deleted.',
        })
        router.push('/projects')
      } else {
        throw new Error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
      })
    }
    setShowDeleteDialog(false)
  }

  // Fetch team members when dialog opens
  const fetchTeamData = React.useCallback(async () => {
    if (!project) return

    setIsLoadingTeam(true)
    try {
      const supabase = createClient()

      // Fetch current project members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role')
        .eq('project_id', project.id)

      if (membersError) throw membersError

      // Fetch profiles for members
      const memberProfiles = []
      for (const member of members || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single()

        if (profile) {
          memberProfiles.push({
            ...member,
            profile,
          })
        }
      }

      setTeamMembers(memberProfiles)

      // Fetch available members (same organization, not already assigned)
      const { data: orgMembers, error: orgError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', project.organization_id)
        .neq('role', 'client') // Clients cannot be assigned to project steps

      if (orgError) throw orgError

      const assignedUserIds = members?.map((m) => m.user_id) || []
      const available = (orgMembers || []).filter((m) => !assignedUserIds.includes(m.id))

      setAvailableMembers(available)
    } catch (err) {
      console.error('Error fetching team data:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team data',
      })
    } finally {
      setIsLoadingTeam(false)
    }
  }, [project, toast])

  const handleAddMember = async (
    userId: string,
    role: 'lead' | 'member' | 'reviewer' | 'viewer' = 'member'
  ) => {
    if (!project) return

    setIsAddingMember(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: userId,
        role,
      })

      if (error) throw error

      toast({
        title: 'Member added',
        description: 'Team member has been added to the project',
      })

      // Refresh team data
      await fetchTeamData()
    } catch (err) {
      console.error('Error adding member:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add team member',
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase.from('project_members').delete().eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Member removed',
        description: 'Team member has been removed from the project',
      })

      // Refresh team data
      await fetchTeamData()
    } catch (err) {
      console.error('Error removing member:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove team member',
      })
    }
  }

  // Fetch team data when dialog opens
  React.useEffect(() => {
    if (showTeamDialog) {
      fetchTeamData()
    }
  }, [showTeamDialog, fetchTeamData])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'lead':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
      case 'member':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'reviewer':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
      case 'viewer':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getUserRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
      case 'project_manager':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      case 'ecologist':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'junior':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'
      case 'third_party':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getUserRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'project_manager':
        return 'PM'
      case 'ecologist':
        return 'Ecologist'
      case 'junior':
        return 'Junior'
      case 'third_party':
        return '3rd Party'
      case 'client':
        return 'Client'
      default:
        return role
    }
  }

  // Update header collapse when step changes
  React.useEffect(() => {
    if (currentStepNumber === 1) {
      setIsHeaderCollapsed(true)
    }
  }, [currentStepNumber])

  if (isLoading) {
    return (
      <aside
        className={cn(
          'bg-background border-border/50 flex h-full flex-col border-r transition-all duration-300',
          isSidebarCollapsed ? 'w-15' : 'w-75'
        )}
      >
        <div className="border-border/50 flex h-12 items-center border-b px-3">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </aside>
    )
  }

  const completedSteps = workflowSteps.filter((s) => s.status === 'approved').length

  // Collapsed view
  if (isSidebarCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <aside className="border-border bg-card flex h-full w-15 flex-col border-r transition-all duration-300">
          {/* Toggle Button */}
          <div className="border-border flex h-12 items-center justify-center border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7">
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>

          {/* Collapsed Progress */}
          <div className="border-border flex flex-col items-center gap-2 border-b py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative h-11 w-11">
                  <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-muted"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="2.5"
                      strokeDasharray={`${progress}, 100`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {completedSteps}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">
                  {completedSteps} of {TOTAL_STEPS} complete
                </p>
                <p className="text-muted-foreground text-xs">{Math.round(progress)}% progress</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Collapsed Phase Icons */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center gap-1 py-2">
              {WORKFLOW_PHASES.map((phase) => {
                const phaseSteps = phase.steps
                const completedInPhase = phaseSteps.filter(
                  (s) => getStepStatus(s.number) === 'completed'
                ).length
                const isPhaseComplete = completedInPhase === phaseSteps.length
                const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')
                const colors = getPhaseColorClasses(phase.id)

                return (
                  <Tooltip key={phase.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          const firstStep = phaseSteps[0]
                          if (firstStep) navigateToStep(firstStep.number)
                        }}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                          hasActiveStep ? colors.bgLight : 'hover:bg-muted',
                          hasActiveStep
                            ? colors.text
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <phase.icon
                          className={cn('h-5 w-5', isPhaseComplete && 'text-emerald-500')}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{phase.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {completedInPhase}/{phaseSteps.length} complete
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </ScrollArea>

          {/* Back to Projects */}
          <div className="border-border border-t py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/projects"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to Projects</TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
    )
  }

  // Expanded view
  return (
    <aside className="border-border bg-card flex h-full w-70 flex-col border-r transition-all duration-300">
      {/* Back Link + Toggle */}
      <div className="border-border flex h-12 items-center justify-between border-b px-3">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Project Header - Collapsible */}
      <div className="border-border border-b">
        {/* Collapsed Header - Always visible */}
        <div className="flex items-center gap-1 px-4 py-3">
          {isEditingName ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">
              <Input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelRename()
                  }
                }}
                disabled={updateProject.isPending}
                maxLength={200}
                className="h-7 text-sm"
                aria-label="Project name"
              />
              {updateProject.isPending && (
                <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              onDoubleClick={canRenameProject ? startRename : undefined}
              className="hover:bg-muted/50 flex min-w-0 flex-1 items-center justify-between rounded-md px-1 py-1 transition-colors"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h2 className="text-foreground truncate text-sm font-semibold">
                  {project?.name || 'Loading...'}
                </h2>
                <Badge
                  variant="outline"
                  className={cn('h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize', {
                    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400':
                      project?.status === 'active',
                    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400':
                      project?.status === 'archived',
                    'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400':
                      project?.status === 'completed',
                    'border-border bg-muted text-muted-foreground': project?.status === 'draft',
                  })}
                >
                  {project?.status}
                </Badge>
              </div>
              {isHeaderCollapsed ? (
                <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
            </button>
          )}

          {/* Project Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canRenameProject && (
                <DropdownMenuItem onClick={startRename}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename Project
                </DropdownMenuItem>
              )}
              {permissions.canManageTeam && (
                <DropdownMenuItem onClick={() => setShowTeamDialog(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                Project Settings
              </DropdownMenuItem>
              {permissions.canDeleteProject && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expanded Content */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isHeaderCollapsed ? 'max-h-0' : 'max-h-40'
          )}
        >
          <div className="space-y-3 px-4 pb-4">
            <code className="bg-muted text-muted-foreground inline-block rounded px-1.5 py-0.5 font-mono text-[11px]">
              {project?.site_code || project?.id?.slice(0, 8)}
            </code>

            {/* Progress - Segmented by phase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">Progress</span>
                <span className="text-foreground text-xs font-semibold">
                  {completedSteps} of {TOTAL_STEPS} steps
                </span>
              </div>
              {/* Segmented progress bar */}
              <div className="flex gap-1">
                {WORKFLOW_PHASES.map((phase) => {
                  const phaseSteps = phase.steps
                  const completedInPhase = phaseSteps.filter(
                    (s) => getStepStatus(s.number) === 'completed'
                  ).length
                  const phasePercentage = (completedInPhase / phaseSteps.length) * 100
                  const colors = getPhaseColorClasses(phase.id)

                  return (
                    <div
                      key={phase.id}
                      className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                    >
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                          colors.bg
                        )}
                        style={{ width: `${phasePercentage}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="text-muted-foreground flex justify-between text-[10px]">
                <span>Desk</span>
                <span>Field</span>
                <span>Report</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Phases */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          <Accordion type="multiple" defaultValue={defaultExpandedPhases}>
            {WORKFLOW_PHASES.map((phase) => {
              const phaseSteps = phase.steps
              const completedInPhase = phaseSteps.filter(
                (s) => getStepStatus(s.number) === 'completed'
              ).length
              const isPhaseComplete = completedInPhase === phaseSteps.length
              const hasActiveStep = phaseSteps.some((s) => getStepStatus(s.number) === 'active')
              const colors = getPhaseColorClasses(phase.id)

              return (
                <AccordionItem key={phase.id} value={phase.id} className="border-b-0">
                  <AccordionTrigger
                    className={cn(
                      'hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all hover:no-underline',
                      hasActiveStep && colors.text
                    )}
                  >
                    <phase.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isPhaseComplete
                          ? 'text-emerald-500'
                          : hasActiveStep
                            ? colors.text
                            : 'text-muted-foreground'
                      )}
                    />
                    <span className="flex-1 text-left">{phase.label}</span>
                    <span className="text-muted-foreground mr-1 text-[11px] font-normal">
                      {completedInPhase}/{phaseSteps.length}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1">
                    <div className="border-border ml-4 space-y-0.5 border-l pl-4">
                      {phaseSteps.map((step) => {
                        const status = getStepStatus(step.number)
                        const isActive = status === 'active'
                        const isCompleted = status === 'completed'
                        const isLocked = status === 'locked'
                        const isNeedsReview = status === 'needs_review'

                        return (
                          <button
                            key={step.number}
                            onClick={() => !isLocked && navigateToStep(step.number)}
                            disabled={isLocked}
                            className={cn(
                              'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all',
                              isActive && cn(colors.bgLight, 'font-medium', colors.text),
                              isCompleted &&
                                'text-muted-foreground hover:bg-muted hover:text-foreground',
                              isNeedsReview &&
                                'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50',
                              isLocked && 'cursor-not-allowed opacity-40',
                              !isActive &&
                                !isCompleted &&
                                !isLocked &&
                                !isNeedsReview &&
                                'text-foreground hover:bg-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                                isActive && cn(colors.bg, 'text-white'),
                                isCompleted &&
                                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
                                isNeedsReview &&
                                  'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
                                isLocked && 'bg-muted text-muted-foreground/50',
                                !isActive &&
                                  !isCompleted &&
                                  !isLocked &&
                                  !isNeedsReview &&
                                  'bg-muted text-muted-foreground'
                              )}
                            >
                              {isCompleted ? <Check className="h-3 w-3" /> : step.number}
                            </span>
                            <span className="flex-1 truncate text-left">{step.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <span className="font-semibold"> &quot;{project?.name}&quot;</span> and all associated
              data including surveys, findings, and reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Management Dialog */}
      <Dialog
        open={showTeamDialog}
        onOpenChange={(open) => {
          setShowTeamDialog(open)
          if (!open) {
            setSearchQuery('')
            setSelectedRole('member')
          }
        }}
      >
        <DialogContent className="flex max-h-[80vh] w-[90vw] max-w-4xl flex-col overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Project Team
            </DialogTitle>
            <DialogDescription>Manage team members assigned to this project</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-1 pr-3">
            {/* Current Team Members */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Assigned Members ({teamMembers.length})
              </h4>
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <Users className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-500">No team members assigned yet</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-emerald-100 text-sm text-emerald-700">
                            {getInitials(member.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.profile.full_name}</p>
                            <Badge
                              className={`text-xs ${getUserRoleBadgeColor(member.profile.role)}`}
                            >
                              {getUserRoleLabel(member.profile.role)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{member.profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                        {permissions.canManageTeam &&
                          !(
                            roleUser?.role === 'project_manager' && member.profile.role === 'admin'
                          ) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Team Members Section */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Add Members to Project
              </h4>

              {/* Search and Filter */}
              <div className="mb-4 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-40">
                  <select
                    value={selectedRole}
                    onChange={(e) =>
                      setSelectedRole(e.target.value as 'lead' | 'member' | 'reviewer' | 'viewer')
                    }
                    className="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  >
                    <option value="lead">Lead</option>
                    <option value="member">Member</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {/* Available Members List */}
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <UserPlus className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    All members are already assigned to this project
                  </p>
                </div>
              ) : (
                <div className="grid max-h-62.5 gap-2 overflow-y-auto">
                  {availableMembers
                    .filter((member) => {
                      if (!searchQuery) return true
                      const query = searchQuery.toLowerCase()
                      return (
                        member.full_name.toLowerCase().includes(query) ||
                        member.email.toLowerCase().includes(query)
                      )
                    })
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-dashed p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-sm text-blue-700">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.full_name}</p>
                              <Badge className={`text-xs ${getUserRoleBadgeColor(member.role)}`}>
                                {getUserRoleLabel(member.role)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddMember(member.id, selectedRole)}
                          disabled={isAddingMember}
                          className="min-w-25"
                        >
                          {isAddingMember ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add as {selectedRole}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  {availableMembers.filter((member) => {
                    if (!searchQuery) return true
                    const query = searchQuery.toLowerCase()
                    return (
                      member.full_name.toLowerCase().includes(query) ||
                      member.email.toLowerCase().includes(query)
                    )
                  }).length === 0 && (
                    <div className="py-4 text-center">
                      <p className="text-sm text-gray-500">No members found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
