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

  const [pendingDataUrl, setPendingDataUrl] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState('')
  const [showNamingDialog, setShowNamingDialog] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleCapture = async () => {
    const dataUrl = await capture()

    if (dataUrl) {
      setPendingDataUrl(dataUrl)
      setFileName(STEP_LABELS[stepName])
      setShowNamingDialog(true)
    }
  }

  const handleSave = async () => {
    if (!pendingDataUrl || !fileName.trim()) return

    setIsSaving(true)
    try {
      const container = containerRef.current
      const result = await saveScreenshot(
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

      if (!result) {
        console.error('Failed to save screenshot')
      }
    } catch (error) {
      console.error('Screenshot save error:', error)
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
