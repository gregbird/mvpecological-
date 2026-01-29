'use client'

import * as React from 'react'
import { Zap, Shield, User, Eye, FlaskConical, Map, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleProvider, useRole, ROLE_CONFIGS, type UserRole } from '@/contexts/role-context'

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  senior_ecologist: FlaskConical,
  field_ecologist: Map,
  gis_specialist: Map,
  junior_ecologist: User,
  client: Eye,
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { currentRole, setCurrentRole, user, roleConfig } = useRole()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  const isDev = process.env.NODE_ENV === 'development'

  const handleRoleChange = (roleId: UserRole) => {
    setCurrentRole(roleId)
    router.refresh()
  }

  const handleLogout = () => {
    Cookies.remove('dev_mode')
    Cookies.remove('dev_role')
    router.push('/login')
  }

  const Icon = ROLE_ICONS[currentRole] || User

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={currentRole}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="bg-muted/30 flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Floating Dev Mode Button - Only in development */}
      {isDev && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className={`fixed bottom-6 right-6 z-50 h-14 gap-2 rounded-full px-4 shadow-lg ${roleConfig?.bgColor || 'bg-amber-500'} hover:opacity-90`}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{roleConfig?.label || 'Dev'}</span>
              <Zap className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Dev Mode - Switch Role
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLE_CONFIGS.map((role) => {
              const RoleIcon = ROLE_ICONS[role.id] || User
              const isActive = currentRole === role.id
              return (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => handleRoleChange(role.id)}
                  className={`flex cursor-pointer items-start gap-3 py-3 ${isActive ? 'bg-muted' : ''}`}
                >
                  <RoleIcon className={`mt-0.5 h-5 w-5 ${role.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{role.label}</div>
                    <div className="text-muted-foreground text-xs">{role.description}</div>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex cursor-pointer items-center gap-2 text-red-500"
            >
              <LogOut className="h-4 w-4" />
              Exit Dev Mode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <DashboardContent>{children}</DashboardContent>
    </RoleProvider>
  )
}
