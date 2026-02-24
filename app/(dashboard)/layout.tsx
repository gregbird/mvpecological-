'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FolderKanban,
  Users,
  History,
  LogOut,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  Loader2,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRole, type RolePermissions } from '@/contexts/role-context'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null },
  { label: 'Projects', href: '/projects', icon: FolderKanban, permission: null },
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, permissions, isLoading } = useRole()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  // Check if we're on a project detail page (has project ID)
  const isProjectDetailPage = /^\/projects\/[^/]+/.test(pathname)

  const visibleNavItems = navItems.filter(
    (item) => item.permission === null || permissions[item.permission]
  )

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

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
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // If on project detail page, render minimal layout (project has its own sidebar)
  if (isProjectDetailPage) {
    return (
      <div className="bg-background flex h-screen">
        {/* Minimal Header for project pages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="border-border bg-card flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center">
                <img src="/dulra-logo.jpg" alt="Dulra" className="h-6" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-linear-to-br from-green-500 to-emerald-600 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content - Full height for project layout */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    )
  }

  // Regular dashboard layout for non-project pages
  return (
    <div className="bg-background flex h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'border-border bg-card fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="border-border flex h-16 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center">
            <img src="/dulra-logo.jpg" alt="Dulra" className="h-7" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:bg-muted rounded-lg p-2 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="text-muted-foreground mb-3 px-3 text-xs font-semibold tracking-wider uppercase">
            Menu
          </p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href === '/projects' && pathname.startsWith('/projects'))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-border border-t p-4">
          <div className="bg-muted mb-3 flex items-center gap-3 rounded-xl p-3">
            <Avatar className="border-background h-10 w-10 border-2 shadow-sm">
              <AvatarFallback className="bg-linear-to-br from-green-500 to-emerald-600 text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-semibold">
                {user?.full_name || 'User'}
              </p>
              <p className="text-muted-foreground text-xs capitalize">{user?.role || 'assessor'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground flex-1 justify-start gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex-1 justify-start gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {isSigningOut ? 'Signing out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-border bg-card flex h-16 items-center justify-between border-b px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:bg-muted rounded-lg p-2 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search anything..."
                className="border-border bg-muted focus:bg-background h-10 w-64 pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            <div className="hidden items-center gap-2 lg:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-linear-to-br from-green-500 to-emerald-600 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground text-sm font-medium">
                {user?.full_name?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
