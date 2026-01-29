'use client'

import * as React from 'react'
import { Zap, Shield, Clipboard, GripVertical } from 'lucide-react'
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
import { useRole, type UserRole } from '@/contexts/role-context'

const DEV_ROLES = [
  {
    id: 'admin' as UserRole,
    label: 'Admin',
    description: 'Full system access, team & settings',
    icon: Shield,
    color: 'text-emerald-500',
  },
  {
    id: 'assessor' as UserRole,
    label: 'Assessor',
    description: 'Field work, data entry, reports',
    icon: Clipboard,
    color: 'text-blue-500',
  },
]

export function DevModeButton() {
  const router = useRouter()
  const { currentRole, setCurrentRole } = useRole()
  const isDev = process.env.NODE_ENV === 'development'

  // Draggable state
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const buttonRef = React.useRef<HTMLDivElement>(null)

  // Load saved position from localStorage
  React.useEffect(() => {
    const savedPosition = localStorage.getItem('devButtonPosition')
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        setPosition(parsed)
      } catch {
        // Use default position
      }
    }
  }, [])

  // Save position to localStorage
  const savePosition = (pos: { x: number; y: number }) => {
    localStorage.setItem('devButtonPosition', JSON.stringify(pos))
  }

  // Mouse/Touch handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    e.preventDefault()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    })
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep button within viewport
      const maxX = window.innerWidth - 60
      const maxY = window.innerHeight - 60
      const boundedX = Math.max(-window.innerWidth + 80, Math.min(maxX - 20, newX))
      const boundedY = Math.max(-window.innerHeight + 80, Math.min(maxY - 20, newY))

      setPosition({ x: boundedX, y: boundedY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y

      const maxX = window.innerWidth - 60
      const maxY = window.innerHeight - 60
      const boundedX = Math.max(-window.innerWidth + 80, Math.min(maxX - 20, newX))
      const boundedY = Math.max(-window.innerHeight + 80, Math.min(maxY - 20, newY))

      setPosition({ x: boundedX, y: boundedY })
    }

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false)
        savePosition(position)
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragStart, position])

  const handleDevLogin = (roleId: UserRole) => {
    Cookies.set('dev_mode', 'true', { expires: 7 })
    setCurrentRole(roleId)
  }

  if (!isDev) return null

  return (
    <div
      ref={buttonRef}
      className="fixed z-[9999] select-none"
      style={{
        bottom: `${24 - position.y}px`,
        right: `${24 - position.x}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-no-drag
            variant="default"
            className="h-14 w-14 rounded-full bg-amber-500 shadow-lg hover:bg-amber-600 p-0 relative group"
          >
            <Zap className="h-6 w-6" />
            <div className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-amber-300" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-no-drag align="end" className="w-64">
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
                {currentRole === role.id && (
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            Drag button to reposition • Cookie-based auth bypass
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
