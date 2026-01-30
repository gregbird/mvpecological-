'use client'

import * as React from 'react'
import { Zap, Shield, Clipboard, Move } from 'lucide-react'
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
  const [position, setPosition] = React.useState({ x: 24, y: 24 })
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef({ x: 0, y: 0, posX: 0, posY: 0 })

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

  // Drag handle mouse down
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      const newX = dragStartRef.current.posX - deltaX
      const newY = dragStartRef.current.posY + deltaY

      // Keep button within viewport
      const boundedX = Math.max(10, Math.min(window.innerWidth - 70, newX))
      const boundedY = Math.max(10, Math.min(window.innerHeight - 70, newY))

      setPosition({ x: boundedX, y: boundedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      localStorage.setItem('devButtonPosition', JSON.stringify(position))
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, position])

  const handleRoleSelect = (roleId: UserRole) => {
    Cookies.set('dev_mode', 'true', { expires: 7 })
    Cookies.set('dev_role', roleId, { expires: 7 })
    setCurrentRole(roleId)
    router.push('/projects')
  }

  if (!isDev) return null

  return (
    <div
      className="fixed z-[9999]"
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
    >
      {/* Drag Handle */}
      <div
        className="absolute -top-2 -left-2 flex h-6 w-6 cursor-move items-center justify-center rounded-full bg-amber-600 shadow-md transition-colors hover:bg-amber-700"
        onMouseDown={handleDragStart}
        title="Drag to move"
      >
        <Move className="h-3 w-3 text-white" />
      </div>

      {/* Main Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="h-14 w-14 rounded-full bg-amber-500 p-0 shadow-lg hover:bg-amber-600"
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
            const isSelected = currentRole === role.id
            return (
              <DropdownMenuItem
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="flex cursor-pointer items-start gap-3 py-3"
              >
                <Icon className={`mt-0.5 h-5 w-5 ${role.color}`} />
                <div className="flex-1">
                  <div className="font-medium">{role.label}</div>
                  <div className="text-muted-foreground text-xs">{role.description}</div>
                </div>
                {isSelected && (
                  <div className="h-2.5 w-2.5 self-center rounded-full bg-green-500" />
                )}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            Active: <span className="text-foreground font-medium capitalize">{currentRole}</span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
