'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MapControlSidebarProps {
  children: React.ReactNode
  className?: string
  /** Initial open state. Use `true` for steps where the toolbar's existence
   * needs to be obvious (Step 4 Habitat Mapping, Step 5 Data Analysis) so the
   * user actually discovers NLC / Hatch / 200m without having to click the
   * disclosure chevron first. */
  defaultOpen?: boolean
}

export function MapControlSidebar({
  children,
  className,
  defaultOpen = false,
}: MapControlSidebarProps) {
  const [open, setOpen] = React.useState(defaultOpen)

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
