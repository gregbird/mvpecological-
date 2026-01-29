'use client'

import * as React from 'react'
import { Leaf, Zap, Shield, Clipboard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Dev mode roles - sadece 2 rol
const DEV_ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full system access, team & settings',
    icon: Shield,
    color: 'text-emerald-500',
  },
  {
    id: 'assessor',
    label: 'Assessor',
    description: 'Field work, data entry, reports',
    icon: Clipboard,
    color: 'text-blue-500',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isDev = process.env.NODE_ENV === 'development'
  const [selectedRole, setSelectedRole] = React.useState('assessor')

  const handleDevLogin = (roleId: string) => {
    Cookies.set('dev_mode', 'true', { expires: 7 })
    Cookies.set('dev_role', roleId, { expires: 7 })
    setSelectedRole(roleId)
    router.push('/projects')
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="bg-primary text-primary-foreground hidden flex-col justify-between p-12 lg:flex lg:w-1/2">
        <div className="flex items-center gap-2">
          <div className="bg-primary-foreground/20 flex h-10 w-10 items-center justify-center rounded-lg">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold">Dulra</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl leading-relaxed font-medium">
            &ldquo;Dulra has transformed how we manage ecological projects. The desk research
            automation alone has saved us countless hours.&rdquo;
          </blockquote>
          <div>
            <p className="font-semibold">Dr. Sarah O&apos;Brien</p>
            <p className="text-primary-foreground/80">Senior Ecologist, EcoSurvey Ireland</p>
          </div>
        </div>

        <div className="text-primary-foreground/60 text-sm">
          <p>Trusted by ecological consultancies across Ireland</p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Floating Dev Mode Button - Only in development */}
      {isDev && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-amber-500 shadow-lg hover:bg-amber-600"
            >
              <Zap className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Dev Mode - Select Role
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEV_ROLES.map((role) => {
              const Icon = role.icon
              return (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => handleDevLogin(role.id)}
                  className="flex cursor-pointer items-start gap-3 py-3"
                >
                  <Icon className={`mt-0.5 h-5 w-5 ${role.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{role.label}</div>
                    <div className="text-muted-foreground text-xs">{role.description}</div>
                  </div>
                  {selectedRole === role.id && (
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              Cookie-based auth bypass for development
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
