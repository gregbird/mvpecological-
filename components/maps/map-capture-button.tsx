'use client'

import * as React from 'react'
import { Camera, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useMapScreenshot } from '@/hooks/use-map-screenshot'
import { saveScreenshot } from '@/lib/map-screenshots/storage'
import type { MapStepName } from '@/lib/map-screenshots/types'
import { STEP_LABELS } from '@/lib/map-screenshots/types'
import { useToast } from '@/hooks/use-toast'

// Supabase bucket hard limit is 2 MB. Reject upfront so the user gets a clear
// message instead of a silent 413 after a long upload stall.
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
// Network guard: anything past this is almost always a stuck upload, not a
// slow one. Cap the wait so the "Saving…" spinner doesn't become permanent.
const UPLOAD_TIMEOUT_MS = 60_000

function estimateBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx < 0) return 0
  const base64Len = dataUrl.length - commaIdx - 1
  // base64 → bytes: 4 chars encode 3 bytes
  return Math.floor((base64Len * 3) / 4)
}

interface MapCaptureButtonProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  projectId: string
  stepName: MapStepName
  userId?: string
  className?: string
}

export function MapCaptureButton({
  containerRef,
  projectId,
  stepName,
  userId,
  className,
}: MapCaptureButtonProps) {
  const { capture, isCapturing } = useMapScreenshot({
    containerRef,
    projectId,
    stepName,
  })
  const { toast } = useToast()

  const [pendingDataUrl, setPendingDataUrl] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState('')
  const [showNamingDialog, setShowNamingDialog] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleCapture = async () => {
    const dataUrl = await capture()

    if (!dataUrl) {
      toast({
        variant: 'destructive',
        title: 'Capture failed',
        description: 'Could not render the map to an image. Please retry.',
      })
      return
    }

    const bytes = estimateBytes(dataUrl)
    if (bytes > MAX_SCREENSHOT_BYTES) {
      const mb = (bytes / (1024 * 1024)).toFixed(1)
      toast({
        variant: 'destructive',
        title: 'Screenshot too large',
        description: `The capture is ${mb} MB — the server limit is 2 MB. Zoom out or hide overlays before retrying.`,
      })
      return
    }

    setPendingDataUrl(dataUrl)
    setFileName(STEP_LABELS[stepName])
    setShowNamingDialog(true)
  }

  const handleSave = async () => {
    if (!pendingDataUrl || !fileName.trim()) return

    setIsSaving(true)
    try {
      const container = containerRef.current
      const savePromise = saveScreenshot(
        projectId,
        pendingDataUrl,
        stepName,
        fileName.trim(),
        {
          width: container?.offsetWidth || 0,
          height: container?.offsetHeight || 0,
        },
        userId
      )

      // Bound the wait so a stalled network doesn't leave the dialog stuck
      // in "Saving…" forever (actual symptom the user reported).
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('upload_timeout')), UPLOAD_TIMEOUT_MS)
      )

      const result = await Promise.race([savePromise, timeoutPromise])

      if (!result) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: 'Server rejected the screenshot. Check your connection and retry.',
        })
        return
      }

      toast({
        title: 'Screenshot saved',
        description: `"${fileName.trim()}" is now in the gallery.`,
      })
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'upload_timeout'
      console.error('Screenshot save error:', error)
      toast({
        variant: 'destructive',
        title: isTimeout ? 'Upload timed out' : 'Save failed',
        description: isTimeout
          ? 'The upload took longer than a minute. Check your connection and retry.'
          : 'Something went wrong saving the screenshot. Please retry.',
      })
    } finally {
      setIsSaving(false)
      setShowNamingDialog(false)
      setPendingDataUrl(null)
      setFileName('')
    }
  }

  const handleCancel = () => {
    if (isSaving) return
    setShowNamingDialog(false)
    setPendingDataUrl(null)
    setFileName('')
  }

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        className={className}
        onClick={handleCapture}
        disabled={isCapturing}
        data-map-control="true"
        title="Capture map screenshot"
      >
        {isCapturing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>

      {/* Naming dialog */}
      <Dialog open={showNamingDialog} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Screenshot</DialogTitle>
          </DialogHeader>

          {/* Preview */}
          {pendingDataUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img src={pendingDataUrl} alt="Map preview" className="w-full" />
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <label htmlFor="screenshot-name" className="text-sm font-medium">
              Screenshot name
            </label>
            <Input
              id="screenshot-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Figure 1 - Designated Sites"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fileName.trim() && !isSaving) {
                  handleSave()
                }
              }}
              autoFocus
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!fileName.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
