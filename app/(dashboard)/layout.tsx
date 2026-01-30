'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderKanban,
  Users,
  Clock,
  History,
  LogOut,
  Leaf,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRole, type RolePermissions } from '@/contexts/role-context'

const navItems = [
  { label: 'Projects', href: '/projects', icon: FolderKanban, permission: null },
  {
    label: 'Team Members',
    href: '/team',
    icon: Users,
    permission: 'canManageTeam' as keyof RolePermissions,
  },
  {
    label: 'Timesheets',
    href: '/timesheets',
    icon: Clock,
    permission: 'canViewTimesheets' as keyof RolePermissions,
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
  const { currentRole, user, permissions } = useRole()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const visibleNavItems = navItems.filter(
    (item) => item.permission === null || permissions[item.permission]
  )

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none dark:bg-gray-900',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6 dark:border-gray-800">
          <Link href="/projects" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Dulra</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
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
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isActive ? 'text-green-600 dark:text-green-400' : '')}
                />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-green-500" />}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{currentRole}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-gray-600">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 lg:px-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search anything..."
                className="h-10 w-64 border-gray-200 bg-gray-50 pl-10 focus:bg-white dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-gray-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            <div className="hidden items-center gap-2 lg:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.name.split(' ')[0]}
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
