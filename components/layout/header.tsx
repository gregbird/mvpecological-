'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, LogOut, User, Settings, HelpCircle, Shield, FlaskConical, Map, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRole, type UserRole } from '@/contexts/role-context'

interface HeaderProps {
  user?: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
}

const ROLE_STYLES: Record<UserRole, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin: { bg: 'bg-red-500/10', text: 'text-red-500', icon: Shield },
  senior_ecologist: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: FlaskConical },
  field_ecologist: { bg: 'bg-green-500/10', text: 'text-green-500', icon: Map },
  gis_specialist: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Map },
  junior_ecologist: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: User },
  client: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: Eye },
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  senior_ecologist: 'Senior Ecologist',
  field_ecologist: 'Field Ecologist',
  gis_specialist: 'GIS Specialist',
  junior_ecologist: 'Junior Ecologist',
  client: 'Client',
}

export function Header({ user }: HeaderProps) {
  const { currentRole, permissions } = useRole()
  const roleStyle = ROLE_STYLES[currentRole]
  const RoleIcon = roleStyle.icon

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex h-16 items-center justify-between border-b px-6 backdrop-blur">
      {/* Left side - Role indicator */}
      <div className="flex items-center gap-4">
        <div className={cn('flex items-center gap-2 rounded-full px-3 py-1.5', roleStyle.bg)}>
          <RoleIcon className={cn('h-4 w-4', roleStyle.text)} />
          <span className={cn('text-sm font-medium', roleStyle.text)}>
            {ROLE_LABELS[currentRole]}
          </span>
          {permissions.isReadOnly && (
            <Badge variant="outline" className="ml-1 text-xs">
              View Only
            </Badge>
          )}
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                3
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="font-medium">Project review needed</span>
                <span className="text-muted-foreground text-xs">
                  Ballymore Wind Farm requires approval
                </span>
                <span className="text-muted-foreground text-xs">2 hours ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="font-medium">Survey completed</span>
                <span className="text-muted-foreground text-xs">
                  Habitat survey for Dublin Port finished
                </span>
                <span className="text-muted-foreground text-xs">5 hours ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="font-medium">New team member</span>
                <span className="text-muted-foreground text-xs">Sarah joined the organization</span>
                <span className="text-muted-foreground text-xs">1 day ago</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-primary justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{user?.name || 'User'}</p>
                <p className="text-muted-foreground text-xs leading-none">
                  {user?.email || 'user@example.com'}
                </p>
                <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 mt-2', roleStyle.bg)}>
                  <RoleIcon className={cn('h-3 w-3', roleStyle.text)} />
                  <span className={cn('text-xs font-medium', roleStyle.text)}>
                    {ROLE_LABELS[currentRole]}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {permissions.canManageSettings && (
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
