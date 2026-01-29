'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Users,
  ChevronLeft,
  Leaf,
  Plus,
  FileText,
  Map,
  FlaskConical,
  Eye,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useRole, type UserRole } from '@/contexts/role-context'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  userRole?: UserRole
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  roles?: UserRole[] // If undefined, all roles can see it
  badge?: string
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/projects',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'New Project',
    href: '/projects/new',
    icon: Plus,
    roles: ['admin', 'senior_ecologist'], // Only admins and seniors can create projects
  },
]

const bottomNavItems: NavItem[] = [
  {
    title: 'Team',
    href: '/projects', // Placeholder - no team page yet
    icon: Users,
    roles: ['admin', 'senior_ecologist'], // Only admins and seniors can see team
  },
  {
    title: 'Settings',
    href: '/projects', // Placeholder - no settings page yet
    icon: Settings,
    roles: ['admin'], // Only admins can see settings
  },
]

// Role-specific quick info
const ROLE_INFO: Record<UserRole, { title: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  admin: { title: 'Administrator', icon: Settings, color: 'bg-red-500' },
  senior_ecologist: { title: 'Senior Ecologist', icon: FlaskConical, color: 'bg-purple-500' },
  field_ecologist: { title: 'Field Ecologist', icon: Map, color: 'bg-green-500' },
  gis_specialist: { title: 'GIS Specialist', icon: Map, color: 'bg-blue-500' },
  junior_ecologist: { title: 'Junior Ecologist', icon: FlaskConical, color: 'bg-orange-500' },
  client: { title: 'Client (Read-Only)', icon: Eye, color: 'bg-gray-500' },
}

export function Sidebar({ isCollapsed, onToggle, userRole = 'senior_ecologist' }: SidebarProps) {
  const pathname = usePathname()
  const { permissions, roleConfig } = useRole()
  const roleInfo = ROLE_INFO[userRole]
  const RoleIcon = roleInfo.icon

  // Filter nav items based on user role
  const filterByRole = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true // No role restriction
      return item.roles.includes(userRole)
    })
  }

  const visibleMainItems = filterByRole(mainNavItems)
  const visibleBottomItems = filterByRole(bottomNavItems)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-background relative flex h-screen flex-col border-r transition-all duration-300',
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-16 items-center border-b px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link href="/projects" className="flex items-center gap-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Leaf className="text-primary-foreground h-5 w-5" />
            </div>
            {!isCollapsed && <span className="text-lg font-semibold">Dulra</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              isCollapsed &&
                'bg-background absolute top-6 -right-3 z-10 rounded-full border shadow-md'
            )}
            onClick={onToggle}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
            />
          </Button>
        </div>

        {/* Role Indicator */}
        {!isCollapsed && (
          <div className="border-b px-3 py-3">
            <div className={cn('rounded-lg p-3', 'bg-muted/50')}>
              <div className="flex items-center gap-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', roleInfo.color)}>
                  <RoleIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{roleInfo.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {permissions.isReadOnly ? 'View Only' : 'Full Access'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center py-3 border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', roleInfo.color)}>
                  <RoleIcon className="h-4 w-4 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{roleInfo.title}</p>
                <p className="text-xs text-muted-foreground">
                  {permissions.isReadOnly ? 'View Only' : 'Full Access'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Permissions Quick View (non-collapsed only) */}
        {!isCollapsed && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Permissions</p>
            <div className="flex flex-wrap gap-1">
              {permissions.canCreateProject && (
                <Badge variant="secondary" className="text-xs">Create</Badge>
              )}
              {permissions.canEditProject && (
                <Badge variant="secondary" className="text-xs">Edit</Badge>
              )}
              {permissions.canApproveWorkflow && (
                <Badge variant="secondary" className="text-xs">Approve</Badge>
              )}
              {permissions.canExportData && (
                <Badge variant="secondary" className="text-xs">Export</Badge>
              )}
              {permissions.isReadOnly && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Read Only</Badge>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {visibleMainItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href + item.title}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.title}
                      {item.description && (
                        <span className="text-muted-foreground text-xs">({item.description})</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        {visibleBottomItems.length > 0 && (
          <div className="border-t px-3 py-4">
            <Separator className="mb-4" />
            <nav className="flex flex-col gap-1">
              {visibleBottomItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href + item.title}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
