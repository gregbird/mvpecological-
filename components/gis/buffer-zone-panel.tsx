'use client'

import * as React from 'react'
import { Circle, Eye, EyeOff, Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createBuffer, getBufferStyle, formatDistance, STANDARD_BUFFER_DISTANCES } from '@/lib/gis'
import type { Feature, Polygon, MultiPolygon } from 'geojson'

interface BufferZonePanelProps {
  boundary: Feature<Polygon | MultiPolygon> | null
  onBuffersChange: (buffers: Map<number, Feature<Polygon>>) => void
  className?: string
}

interface BufferState {
  distance: number
  enabled: boolean
  visible: boolean
}

export function BufferZonePanel({ boundary, onBuffersChange, className }: BufferZonePanelProps) {
  const [bufferStates, setBufferStates] = React.useState<BufferState[]>(
    STANDARD_BUFFER_DISTANCES.map((d) => ({
      distance: d.value,
      enabled: d.value === 2 || d.value === 5, // Default: 2km and 5km enabled
      visible: d.value === 2 || d.value === 5,
    }))
  )

  // Generate buffers when boundary or states change
  React.useEffect(() => {
    if (!boundary) {
      onBuffersChange(new Map())
      return
    }

    const newBuffers = new Map<number, Feature<Polygon>>()

    for (const state of bufferStates) {
      if (state.enabled && state.visible) {
        const buffered = createBuffer(boundary, state.distance, 'kilometers')
        if (buffered) {
          newBuffers.set(state.distance, buffered)
        }
      }
    }

    onBuffersChange(newBuffers)
  }, [boundary, bufferStates, onBuffersChange])

  const handleToggleEnabled = (distance: number) => {
    setBufferStates((prev) =>
      prev.map((s) =>
        s.distance === distance
          ? { ...s, enabled: !s.enabled, visible: !s.enabled ? true : s.visible }
          : s
      )
    )
  }

  const handleToggleVisible = (distance: number) => {
    setBufferStates((prev) =>
      prev.map((s) => (s.distance === distance ? { ...s, visible: !s.visible } : s))
    )
  }

  const enabledCount = bufferStates.filter((s) => s.enabled).length

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Circle className="h-4 w-4" />
          Buffer Zones
        </CardTitle>
        <CardDescription>
          Show buffer zones around the boundary for designated site analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!boundary ? (
          <p className="text-muted-foreground text-sm">
            Define a boundary first to create buffer zones.
          </p>
        ) : (
          <div className="space-y-3">
            {STANDARD_BUFFER_DISTANCES.map((bufferDef) => {
              const state = bufferStates.find((s) => s.distance === bufferDef.value)
              if (!state) return null

              const style = getBufferStyle(bufferDef.value)

              return (
                <div
                  key={bufferDef.value}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2 transition-colors',
                    state.enabled
                      ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full border-2"
                      style={{
                        borderColor: style.color,
                        backgroundColor: state.enabled ? style.fillColor : 'transparent',
                        opacity: state.enabled ? 0.5 : 0.3,
                      }}
                    />
                    <div>
                      <Label
                        htmlFor={`buffer-${bufferDef.value}`}
                        className="cursor-pointer font-medium"
                      >
                        {bufferDef.label}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="text-muted-foreground ml-1 inline h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{bufferDef.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {state.enabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleVisible(bufferDef.value)}
                      >
                        {state.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="text-muted-foreground h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Switch
                      id={`buffer-${bufferDef.value}`}
                      checked={state.enabled}
                      onCheckedChange={() => handleToggleEnabled(bufferDef.value)}
                    />
                  </div>
                </div>
              )
            })}

            <p className="text-muted-foreground text-xs">
              {enabledCount} buffer zone{enabledCount !== 1 ? 's' : ''} active
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
