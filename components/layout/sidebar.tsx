'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import {
  FolderKanban,
  ChevronRight,
  Map,
  Search,
  FileCheck,
  Clipboard,
  Target,
  Sparkles,
  CheckCircle,
  LogOut,
  BarChart3,
  Users,
  History,
  Compass,
  FlaskConical,
  FileText,
  Loader2,
  LayoutDashboard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useRole, type RolePermissions } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'

// Admin-only menu items
const adminMenuItems = [
  {
    label: 'Team Members',
    href: '/team',
    icon: Users,
    permission: 'canManageTeam' as keyof RolePermissions,
  },
  {
    label: 'Audit Trail',
    href: '/audit',
    icon: History,
    permission: 'canViewAuditTrail' as keyof RolePermissions,
  },
]

// Workflow phases with their steps
const workflowPhases = [
  {
    id: 'initial-setup',
    label: 'Initial Setup',
    icon: Compass,
    steps: [{ number: 1, label: 'GIS Mapping', icon: Map }],
  },
  {
    id: 'desk-research',
    label: 'Desk Research',
    icon: Search,
    steps: [
      { number: 2, label: 'Initial Review', icon: FileCheck },
      { number: 3, label: 'Data Gathering', icon: Search },
      { number: 4, label: 'Desk Assessment', icon: FileText },
    ],
  },
  {
    id: 'field-research',
    label: 'Field Research',
    icon: FlaskConical,
    steps: [
      { number: 5, label: 'Field Survey', icon: Clipboard },
      { number: 6, label: 'Habitat Mapping', icon: Map },
      { number: 7, label: 'Target Notes', icon: Target },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: BarChart3,
    steps: [
      { number: 8, label: 'Data Analysis', icon: BarChart3 },
      { number: 9, label: 'AI Draft', icon: Sparkles },
      { number: 10, label: 'Quality Review', icon: CheckCircle },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const { user, permissions, isLoading } = useRole()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  // Track expanded phases
  const [expandedPhases, setExpandedPhases] = React.useState<string[]>(['desk-research'])

  // Are we on a project detail page?
  const isInProject = pathname.includes('/projects/') && params.id

  // Filter admin menu items based on permissions
  const visibleAdminItems = adminMenuItems.filter((item) => permissions[item.permission])

  // Get initials from user name
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId) ? prev.filter((id) => id !== phaseId) : [...prev, phaseId]
    )
  }

  // Get current phase based on step (default to step 1 when not in a project)
  const getCurrentPhase = (stepNumber: number) => {
    for (const phase of workflowPhases) {
      if (phase.steps.some((s) => s.number === stepNumber)) {
        return phase.id
      }
    }
    return 'initial-setup'
  }

  // Default current step (can be enhanced to track actual project progress)
  const currentStep = 1
  const currentPhase = getCurrentPhase(currentStep)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setIsSigningOut(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <aside className="flex h-screen w-70 flex-col items-center justify-center border-r border-gray-200 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </aside>
    )
  }

  return (
    <aside className="flex h-screen w-70 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <Link href="/dashboard" className="flex items-center">
          <img src="/dulra-logo.jpg" alt="Dulra" className="h-7" />
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={cn(
            'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        {/* My Projects Link */}
        <Link
          href="/projects"
          className={cn(
            'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/projects' || isInProject
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <FolderKanban className="h-5 w-5" />
          <span>My Projects</span>
          {isInProject && <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />}
        </Link>

        {/* Workflow Phases - Always visible, expandable */}
        <div className="mt-2 space-y-0.5">
          {workflowPhases.map((phase) => {
            const PhaseIcon = phase.icon
            const isExpanded = expandedPhases.includes(phase.id)
            const isCurrentPhase = phase.id === currentPhase
            const phaseStepNumbers = phase.steps.map((s) => s.number)
            const isPhaseCompleted = phaseStepNumbers.every((n) => n < currentStep)
            const isPhaseActive = phaseStepNumbers.some((n) => n === currentStep)

            return (
              <div key={phase.id}>
                <button
                  onClick={() => togglePhase(phase.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isCurrentPhase
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <PhaseIcon
                    className={cn(
                      'h-5 w-5',
                      isPhaseCompleted && 'text-emerald-500',
                      isPhaseActive && 'text-emerald-600'
                    )}
                  />
                  <span>{phase.label}</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto h-4 w-4 text-gray-400 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {/* Phase Steps */}
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-gray-100 pl-4">
                    {phase.steps.map((step) => {
                      const isCompleted = step.number < currentStep
                      const isCurrent = step.number === currentStep
                      const isLocked = step.number > currentStep

                      return (
                        <Link
                          key={step.number}
                          href={
                            isLocked || !isInProject
                              ? '#'
                              : `/projects/${params.id}?step=${step.number}`
                          }
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                            isCurrent && 'bg-emerald-50 font-medium text-emerald-700',
                            isCompleted && 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                            isLocked && 'cursor-not-allowed text-gray-400'
                          )}
                          onClick={(e) => (isLocked || !isInProject) && e.preventDefault()}
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
                              isCurrent && 'bg-emerald-500 text-white',
                              isCompleted && 'bg-emerald-100 text-emerald-600',
                              isLocked && 'bg-gray-100 text-gray-400'
                            )}
                          >
                            {isCompleted ? '✓' : step.number}
                          </span>
                          <span>{step.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Admin Menu Items */}
        {visibleAdminItems.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="mb-2 px-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
              Admin
            </div>
            <div className="space-y-0.5">
              {visibleAdminItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-emerald-100 text-sm font-medium text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'assessor'}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  )
}
