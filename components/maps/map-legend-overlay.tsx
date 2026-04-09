'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface MapLegendEntry {
  id: string
  label: string
  color: string
  type: 'line' | 'fill' | 'circle'
}

interface MapLegendOverlayProps {
  entries: MapLegendEntry[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  defaultCollapsed?: boolean
  className?: string
}

const POSITION_CLASSES: Record<NonNullable<MapLegendOverlayProps['position']>, string> = {
  'top-right': 'top-3 right-3',
  'top-left': 'top-3 left-3',
  'bottom-right': 'bottom-3 right-3',
  'bottom-left': 'bottom-3 left-3',
}

/**
 * Floating legend overlay for Leaflet maps. Rendered inside a map container
 * with `position: relative` so it's captured by html-to-image screenshots
 * (see `hooks/use-map-screenshot.ts`). Collapsible via header click.
 */
export function MapLegendOverlay({
  entries,
  position = 'top-right',
  defaultCollapsed = false,
  className,
}: MapLegendOverlayProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)

  if (entries.length === 0) return null

  return (
    <div
      className={cn(
        'bg-background/90 absolute z-[1000] max-w-[220px] rounded-lg border shadow-lg backdrop-blur-sm',
        POSITION_CLASSES[position],
        className
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          'hover:bg-muted/60 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold',
          !collapsed && 'border-b'
        )}
        aria-label={collapsed ? 'Expand legend' : 'Collapse legend'}
      >
        <span>Legend</span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>
      {!collapsed && (
        <div className="space-y-1.5 p-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              {entry.type === 'line' ? (
                <div className="h-0.5 w-4 shrink-0" style={{ backgroundColor: entry.color }} />
              ) : entry.type === 'fill' ? (
                <div
                  className="h-3 w-4 shrink-0 rounded-sm border"
                  style={{
                    backgroundColor: entry.color + '33',
                    borderColor: entry.color,
                  }}
                />
              ) : (
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span className="text-xs leading-tight">{entry.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
