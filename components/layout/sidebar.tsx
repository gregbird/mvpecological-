'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  ChevronDown,
  Map,
  Search,
  FileCheck,
  Clipboard,
  Target,
  Sparkles,
  CheckCircle,
  Send,
  LogOut,
  RefreshCw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useRole } from '@/contexts/role-context'

// PRD'ye göre 10 adımlı workflow
const workflowCategories = [
  {
    id: 'initial-setup',
    label: 'Initial Setup',
    icon: Settings,
    items: [
      { number: 1, label: 'GIS Mapping', href: '/project/gis-mapping', icon: Map },
    ],
  },
  {
    id: 'desk-research',
    label: 'Desk Research',
    icon: Search,
    items: [
      { number: 2, label: 'Data Gathering', href: '/project/data-gathering', icon: Search },
      { number: 3, label: 'Desk Assessment', href: '/project/desk-assessment', icon: FileCheck },
    ],
  },
  {
    id: 'field-research',
    label: 'Field Research',
    icon: Clipboard,
    items: [
      { number: 4, label: 'Field Survey', href: '/project/field-survey', icon: Clipboard },
      { number: 5, label: 'Habitat Mapping', href: '/project/habitat-mapping', icon: Map },
      { number: 6, label: 'Target Notes', href: '/project/target-notes', icon: Target },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: FileCheck,
    items: [
      { number: 7, label: 'Data Analysis', href: '/project/data-analysis', icon: FileCheck },
      { number: 8, label: 'AI Draft Generation', href: '/project/ai-draft', icon: Sparkles },
      { number: 9, label: 'Quality Review', href: '/project/quality-review', icon: CheckCircle },
      { number: 10, label: 'Final Submission', href: '/project/final-submission', icon: Send },
    ],
  },
]

// Workspace menu
const workspaceItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentRole, setCurrentRole, user } = useRole()
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([
    'initial-setup',
    'desk-research',
    'field-research',
    'reporting'
  ])
  const [workspaceExpanded, setWorkspaceExpanded] = React.useState(true)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleSwitchRole = () => {
    setCurrentRole(currentRole === 'admin' ? 'assessor' : 'admin')
  }

  return (
    <aside className="bg-[#0f172a] flex h-screen w-[240px] flex-col text-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link href="/projects" className="flex items-center">
          <span className="text-xl font-semibold tracking-tight">dulra</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        {/* Workspace Section */}
        <div className="mb-1">
          <button
            onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Workspace</span>
            <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', !workspaceExpanded && '-rotate-90')} />
          </button>

          {workspaceExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5">
              {workspaceItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Workflow Categories */}
        <div className="space-y-1 mt-2">
          {workflowCategories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            const CategoryIcon = category.icon

            return (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/5"
                >
                  <CategoryIcon className="h-4 w-4" />
                  <span>{category.label}</span>
                  <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', !isExpanded && '-rotate-90')} />
                </button>

                {isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {category.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                          )}
                        >
                          <span className={cn(
                            'flex h-5 w-5 items-center justify-center rounded text-xs font-medium',
                            isActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-700 text-gray-300'
                          )}>
                            {item.number}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-600 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{currentRole}</p>
          </div>
        </div>

        <button
          onClick={handleSwitchRole}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Switch to {currentRole === 'admin' ? 'Assessor' : 'Admin'} View</span>
        </button>

        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
