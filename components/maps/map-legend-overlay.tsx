'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  buildPatternBody,
  getPatternDimensions,
  type PatternShape,
} from '@/lib/config/heritage-patterns'

export interface MapLegendEntry {
  id: string
  label: string
  color: string
  /** When `type === 'pattern'`, render the Heritage Council hatch shape so
   * the legend matches what the user sees on the map (and what the PDF /
   * DOCX export will embed). */
  type: 'line' | 'fill' | 'circle' | 'pattern'
  /** Required when type='pattern'. Pulled from `getHeritagePatternShape()`. */
  patternShape?: PatternShape
}

function darkenForLegend(hex: string, factor = 0.55) {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex
  const expand = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
  const r = Math.round(parseInt(expand.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(expand.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(expand.slice(5, 7), 16) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function PatternSwatch({ shape, color }: { shape: PatternShape; color: string }) {
  // 16×12 px swatch — wide enough to show one tile of the pattern even for
  // the 12px-wide brick shape, narrow enough to stay aligned with the other
  // legend swatches. Stroke uses the same darkening factor as the map layer.
  const stroke = darkenForLegend(color)
  const dim = getPatternDimensions(shape)
  const patternId = React.useId().replace(/:/g, '')
  return (
    <svg width="16" height="12" className="shrink-0" aria-hidden="true">
      <defs>
        <pattern
          id={`legend-${patternId}`}
          width={dim.width}
          height={dim.height}
          patternUnits="userSpaceOnUse"
          dangerouslySetInnerHTML={{ __html: buildPatternBody(shape, stroke) }}
        />
      </defs>
      <rect width="16" height="12" fill={color + '55'} stroke={stroke} strokeWidth="0.75" rx="2" />
      <rect width="16" height="12" fill={`url(#legend-${patternId})`} rx="2" />
    </svg>
  )
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
              ) : entry.type === 'pattern' && entry.patternShape ? (
                <PatternSwatch shape={entry.patternShape} color={entry.color} />
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
