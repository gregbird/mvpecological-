'use client'

import * as React from 'react'
import { Circle, CircleOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BUFFER_COLORS } from '@/components/maps/map-types'

interface BufferControlProps {
  bufferDistances: number[]
  visibleBuffers: Set<number>
  onToggleBuffer: (distance: number) => void
  onToggleAll: (visible: boolean) => void
  portalContainer?: HTMLElement | null
}

function formatBufferLabel(d: number) {
  return d < 1 ? `${Math.round(d * 1000)}m buffer` : `${d}km buffer`
}

export function BufferControl({
  bufferDistances,
  visibleBuffers,
  onToggleBuffer,
  onToggleAll,
  portalContainer,
}: BufferControlProps) {
  const sorted = React.useMemo(() => [...bufferDistances].sort((a, b) => a - b), [bufferDistances])
  const allVisible = sorted.length > 0 && sorted.every((d) => visibleBuffers.has(d))
  const noneVisible = visibleBuffers.size === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="h-7 px-2 text-xs shadow-md">
          {noneVisible ? (
            <CircleOff className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Circle className="mr-1.5 h-3.5 w-3.5" />
          )}
          Buffers
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        container={portalContainer}
        className="z-9999"
      >
        <DropdownMenuLabel>Buffer Zones</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={allVisible}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
        >
          Show all
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {sorted.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            No buffers configured in Step 1
          </div>
        ) : (
          sorted.map((d) => (
            <DropdownMenuCheckboxItem
              key={d}
              checked={visibleBuffers.has(d)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggleBuffer(d)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full border"
                  style={{
                    backgroundColor: BUFFER_COLORS[d] || '#6b7280',
                    borderColor: BUFFER_COLORS[d] || '#6b7280',
                  }}
                />
                {formatBufferLabel(d)}
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
