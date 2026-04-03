'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STANDARD_BUFFER_DISTANCES } from '@/lib/gis'
import { getBufferColor } from '@/lib/config/map-constants'

interface BufferZonePanelProps {
  enabledBuffers: number[]
  customBuffers: number[]
  customBufferInput: string
  onBufferToggle: (distance: number) => void
  onRemoveCustomBuffer: (distance: number) => void
  onAddCustomBuffer: () => boolean
  onCustomBufferInputChange: (value: string) => void
}

export function BufferZonePanel({
  enabledBuffers,
  customBuffers,
  customBufferInput,
  onBufferToggle,
  onRemoveCustomBuffer,
  onAddCustomBuffer,
  onCustomBufferInputChange,
}: BufferZonePanelProps) {
  return (
    <div className="border-border w-80 overflow-y-auto border-l p-6">
      <h3 className="mb-2 text-lg font-semibold">Buffer Zones</h3>
      <p className="text-muted-foreground mb-6 text-sm">
        Select buffer distances for designated site analysis
      </p>

      <div className="space-y-2">
        {STANDARD_BUFFER_DISTANCES.map((buffer) => {
          const isEnabled = enabledBuffers.includes(buffer.value)
          const color = getBufferColor(buffer.value)

          return (
            <button
              key={buffer.value}
              onClick={() => onBufferToggle(buffer.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                isEnabled
                  ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              )}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: color.stroke,
                  backgroundColor: isEnabled ? color.fill : 'transparent',
                }}
              >
                {isEnabled && <Check className="h-4 w-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{buffer.label}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.fill }} />
                </div>
                <div className="text-muted-foreground text-xs">{buffer.description}</div>
              </div>
            </button>
          )
        })}

        {/* Custom buffer distances */}
        {customBuffers.map((distance) => {
          const isEnabled = enabledBuffers.includes(distance)
          const color = getBufferColor(distance)

          return (
            <div key={distance} className="flex items-center gap-2">
              <button
                onClick={() => onBufferToggle(distance)}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                  isEnabled
                    ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: color.stroke,
                    backgroundColor: isEnabled ? color.fill : 'transparent',
                  }}
                >
                  {isEnabled && <Check className="h-4 w-4 text-white" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{distance} km</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.fill }} />
                  <Badge variant="outline" className="text-[10px]">
                    Custom
                  </Badge>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-red-500"
                onClick={() => onRemoveCustomBuffer(distance)}
              >
                <span className="text-lg">&times;</span>
              </Button>
            </div>
          )
        })}
      </div>

      {/* Add custom buffer */}
      <div className="mt-4 border-t pt-4">
        <label className="text-sm font-medium">Add Custom Buffer</label>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={customBufferInput}
            onChange={(e) => onCustomBufferInputChange(e.target.value)}
            placeholder="e.g. 3.5"
            className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddCustomBuffer()}
            disabled={!customBufferInput || parseFloat(customBufferInput) <= 0}
          >
            Add
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Enter distance in kilometers (0.1 - 50)
        </p>
        {customBufferInput && parseFloat(customBufferInput) > 15 && (
          <p className="mt-1 text-xs text-amber-600">
            Large buffers may slow down searches and map rendering
          </p>
        )}
      </div>

      {/* Selected summary */}
      <BufferSummary enabledBuffers={enabledBuffers} />
    </div>
  )
}

function BufferSummary({ enabledBuffers }: { enabledBuffers: number[] }) {
  return (
    <div className="mt-6 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Selected Buffers</span>
        <span className="text-muted-foreground text-sm">{enabledBuffers.length}</span>
      </div>
      {enabledBuffers.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">Select at least one buffer zone to proceed</p>
      )}
      {enabledBuffers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {enabledBuffers
            .sort((a, b) => a - b)
            .map((d) => {
              const color = getBufferColor(d)
              return (
                <Badge
                  key={d}
                  variant="secondary"
                  className="gap-1"
                  style={{ borderColor: color.stroke, borderWidth: 1 }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.fill }} />
                  {d} km
                </Badge>
              )
            })}
        </div>
      )}
    </div>
  )
}
