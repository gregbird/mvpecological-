'use client'

import * as React from 'react'
import { Scissors } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ClipSource {
  label: string
  group: string
  feature: GeoJSON.Feature<GeoJSON.Polygon>
}

type ClipMode = 'keep-inside' | 'remove-overlap'

interface BoundaryClipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: ClipSource[]
  onApply: (source: ClipSource, mode: ClipMode) => void
}

export function BoundaryClipDialog({
  open,
  onOpenChange,
  sources,
  onApply,
}: BoundaryClipDialogProps) {
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null)
  const [mode, setMode] = React.useState<ClipMode>('keep-inside')

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIdx(null)
      setMode('keep-inside')
    }
  }, [open])

  const groups = React.useMemo(() => {
    const map = new Map<string, { source: ClipSource; idx: number }[]>()
    sources.forEach((s, idx) => {
      const list = map.get(s.group) ?? []
      list.push({ source: s, idx })
      map.set(s.group, list)
    })
    return map
  }, [sources])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Clip Boundary
          </DialogTitle>
          <DialogDescription>
            Select a polygon to use as a cookie cutter on the active site boundary.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="bg-muted flex gap-1 rounded-lg p-1">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'keep-inside'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('keep-inside')}
          >
            Keep inside
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'remove-overlap'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('remove-overlap')}
          >
            Remove overlap
          </button>
        </div>

        {/* Source list */}
        <div className="max-h-64 overflow-y-auto rounded-md border">
          {sources.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              No polygon layers available for clipping.
            </p>
          ) : (
            Array.from(groups.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="bg-muted text-muted-foreground sticky top-0 px-3 py-1.5 text-xs font-semibold">
                  {group}
                </div>
                {items.map(({ source, idx }) => (
                  <button
                    key={idx}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      selectedIdx === idx
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <div
                      className={cn(
                        'h-3 w-3 shrink-0 rounded-full border-2',
                        selectedIdx === idx
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-muted-foreground/30'
                      )}
                    />
                    {source.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedIdx === null}
            onClick={() => {
              if (selectedIdx !== null) {
                onApply(sources[selectedIdx], mode)
                onOpenChange(false)
              }
            }}
          >
            Apply Clip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
