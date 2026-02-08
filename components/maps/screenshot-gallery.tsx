'use client'

import * as React from 'react'
import { Trash2, ImageIcon, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAllScreenshots, removeScreenshot } from '@/lib/map-screenshots/storage'
import { STEP_LABELS, type MapScreenshot, type MapStepName } from '@/lib/map-screenshots/types'

interface ScreenshotGalleryProps {
  projectId: string
  className?: string
}

export function ScreenshotGallery({ projectId, className }: ScreenshotGalleryProps) {
  const [screenshots, setScreenshots] = React.useState<MapScreenshot[]>([])
  const [previewScreenshot, setPreviewScreenshot] = React.useState<MapScreenshot | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // Load screenshots on mount and when projectId changes
  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    getAllScreenshots(projectId).then((data) => {
      if (!cancelled) {
        setScreenshots(data)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleDelete = async (screenshot: MapScreenshot) => {
    setDeletingId(screenshot.id)
    const success = await removeScreenshot(screenshot.id, screenshot.storagePath)
    if (success) {
      setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id))
      if (previewScreenshot?.id === screenshot.id) {
        setPreviewScreenshot(null)
      }
    }
    setDeletingId(null)
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="text-muted-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading screenshots...
        </div>
      </div>
    )
  }

  if (screenshots.length === 0) {
    return (
      <div className={className}>
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
          <ImageIcon className="h-8 w-8 opacity-50" />
          <p>No map screenshots captured yet.</p>
          <p className="text-xs">
            Use the Capture button on any map to save screenshots for your report.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="group relative cursor-pointer overflow-hidden rounded-lg border"
            onClick={() => setPreviewScreenshot(screenshot)}
          >
            {/* Thumbnail */}
            <img
              src={screenshot.url}
              alt={screenshot.label}
              className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
            />

            {/* Overlay with info */}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2">
              <Badge variant="secondary" className="mb-1 bg-white/90 text-[10px] text-black">
                {STEP_LABELS[screenshot.stepName as MapStepName] || screenshot.stepName}
              </Badge>
              <p className="text-[10px] text-white/80">
                {new Date(screenshot.createdAt).toLocaleString('en-IE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Delete button */}
            <button
              className="absolute top-1 right-1 rounded-full bg-red-500/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(screenshot)
              }}
              disabled={deletingId === screenshot.id}
            >
              {deletingId === screenshot.id ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : (
                <Trash2 className="h-3 w-3 text-white" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Full-size preview dialog */}
      <Dialog
        open={!!previewScreenshot}
        onOpenChange={(open) => !open && setPreviewScreenshot(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewScreenshot && (
                <>
                  <Badge variant="outline">
                    {STEP_LABELS[previewScreenshot.stepName as MapStepName] ||
                      previewScreenshot.stepName}
                  </Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    {previewScreenshot.dimensions.width}×{previewScreenshot.dimensions.height}px
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {new Date(previewScreenshot.createdAt).toLocaleString('en-IE')}
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewScreenshot && (
            <div className="overflow-hidden rounded-lg border">
              <img src={previewScreenshot.url} alt={previewScreenshot.label} className="w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
