'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, LogOut, User, Settings, Shield, Map, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

const ROLE_STYLES: Record<
  UserRole,
  { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: Shield },
  assessor: { bg: 'bg-blue-500/10', text: 'text-blue-600', icon: Map },
  client: { bg: 'bg-gray-500/10', text: 'text-gray-600', icon: User },
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  assessor: 'Assessor',
  client: 'Client',
}

export function Header() {
  const router = useRouter()
  const { user, permissions, isLoading } = useRole()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  const currentRole = user?.role || 'assessor'
  const roleStyle = ROLE_STYLES[currentRole]
  const RoleIcon = roleStyle.icon

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
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

  if (isLoading) {
    return (
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex h-16 items-center justify-between border-b px-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </header>
    )
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex h-16 items-center justify-between border-b px-6 backdrop-blur">
      {/* Left side - Role indicator */}
      <div className="flex items-center gap-4">
        <div className={cn('flex items-center gap-2 rounded-full px-3 py-1.5', roleStyle.bg)}>
          <RoleIcon className={cn('h-4 w-4', roleStyle.text)} />
          <span className={cn('text-sm font-medium', roleStyle.text)}>
            {ROLE_LABELS[currentRole]}
          </span>
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
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} alt={user?.full_name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{user?.full_name || 'User'}</p>
                <p className="text-muted-foreground text-xs leading-none">
                  {user?.email || 'user@example.com'}
                </p>
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
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive"
            >
              {isSigningOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
