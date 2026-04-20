'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MapControlSidebarProps {
  children: React.ReactNode
  className?: string
}

export function MapControlSidebar({ children, className }: MapControlSidebarProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)} data-map-control="true">
      <Button
        variant="secondary"
        size="icon"
        className="h-7 w-7 shrink-0 shadow-md"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Hide map controls' : 'Show map controls'}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </Button>
      <div
        className={cn(
          'flex flex-col items-start gap-1.5 overflow-hidden transition-all duration-200 ease-out',
          open ? 'max-h-[60vh] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        )}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  )
}
