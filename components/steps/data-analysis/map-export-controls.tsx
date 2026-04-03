'use client'

import * as React from 'react'
import { Loader2, Camera, Download, RectangleHorizontal, RectangleVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useMapScreenshot } from '@/hooks/use-map-screenshot'
import { saveScreenshot } from '@/lib/map-screenshots/storage'
import { STEP_LABELS } from '@/lib/map-screenshots/types'
import { ScreenshotGallery } from '@/components/maps/screenshot-gallery'
import { downloadShapefile } from '@/lib/gis/shapefile-export'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

export type PageSize = 'a5' | 'a4' | 'a3'
export type Orientation = 'landscape' | 'portrait'

/** Map container dimensions in pixels for each page size + orientation */
export const PAGE_SIZE_CONFIG: Record<
  PageSize,
  { label: string; landscape: { w: number; h: number }; portrait: { w: number; h: number } }
> = {
  a5: {
    label: 'A5',
    landscape: { w: 840, h: 594 },
    portrait: { w: 594, h: 840 },
  },
  a4: {
    label: 'A4',
    landscape: { w: 1190, h: 842 },
    portrait: { w: 842, h: 1190 },
  },
  a3: {
    label: 'A3',
    landscape: { w: 1587, h: 1123 },
    portrait: { w: 1123, h: 1587 },
  },
}

interface ShapefileData {
  projectName: string
  projectBoundary: GeoJSON.Feature<GeoJSON.Polygon> | undefined
  county?: string
  gridReference?: string
  targetNotes: TargetNoteWithCreator[]
  habitats: Array<{
    boundary: unknown
    fossitt_code: string | null
    fossitt_name: string | null
    condition: string | null
  }>
}

interface MapExportControlsProps {
  projectId: string
  userId: string
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  pageSize: PageSize
  onPageSizeChange: (size: PageSize) => void
  orientation: Orientation
  onOrientationChange: (orientation: Orientation) => void
  shapefileData: ShapefileData
}

export function MapExportControls({
  projectId,
  userId,
  mapContainerRef,
  pageSize,
  onPageSizeChange,
  orientation,
  onOrientationChange,
  shapefileData,
}: MapExportControlsProps) {
  const { toast } = useToast()

  // Screenshot state
  const { capture, isCapturing } = useMapScreenshot({
    containerRef: mapContainerRef,
    projectId,
    stepName: 'data_analysis',
  })
  const [pendingDataUrl, setPendingDataUrl] = React.useState<string | null>(null)
  const [screenshotName, setScreenshotName] = React.useState('')
  const [showNamingDialog, setShowNamingDialog] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [screenshotKey, setScreenshotKey] = React.useState(0)

  // Shapefile export state
  const [isExportingShapefile, setIsExportingShapefile] = React.useState(false)

  const handleCapture = async () => {
    const config = PAGE_SIZE_CONFIG[pageSize]
    const targetDims = config[orientation]
    const dataUrl = await capture(targetDims.w)
    if (dataUrl) {
      setPendingDataUrl(dataUrl)
      setScreenshotName(STEP_LABELS.data_analysis)
      setShowNamingDialog(true)
    }
  }

  const handleSaveScreenshot = async () => {
    if (!pendingDataUrl || !screenshotName.trim()) return
    setIsSaving(true)
    try {
      const config = PAGE_SIZE_CONFIG[pageSize]
      const targetDims = config[orientation]
      await saveScreenshot(
        projectId,
        pendingDataUrl,
        'data_analysis',
        screenshotName.trim(),
        { width: targetDims.w, height: targetDims.h },
        userId
      )
      toast({ title: 'Screenshot saved' })
      setScreenshotKey((k) => k + 1)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save screenshot.' })
    } finally {
      setIsSaving(false)
      setShowNamingDialog(false)
      setPendingDataUrl(null)
      setScreenshotName('')
    }
  }

  const handleExportShapefile = async () => {
    if (!shapefileData.projectBoundary) {
      toast({ title: 'No boundary', description: 'No project boundary to export.' })
      return
    }
    setIsExportingShapefile(true)
    try {
      await downloadShapefile({
        projectName: shapefileData.projectName,
        boundaries: [
          {
            boundary: shapefileData.projectBoundary,
            siteName: shapefileData.projectName,
            county: shapefileData.county,
            gridReference: shapefileData.gridReference,
          },
        ],
        targetNotes: shapefileData.targetNotes
          .filter((tn) => tn.location && (tn.location as GeoJSON.Point).coordinates)
          .map((tn, i) => ({
            coordinates: (tn.location as GeoJSON.Point).coordinates as [number, number],
            noteNumber: `N${i + 1}`,
            category: (tn.category as string) ?? '',
            label: (tn.title as string) ?? `N${i + 1}`,
            description: (tn.description as string) ?? '',
            date: tn.created_at?.split('T')[0] ?? '',
          })),
        habitats: shapefileData.habitats
          .filter((h) => h.boundary != null)
          .map((h) => ({
            geometry: h.boundary as GeoJSON.Polygon,
            fossittCode: h.fossitt_code ?? undefined,
            fossittName: h.fossitt_name ?? undefined,
            condition: h.condition ?? undefined,
          })),
      })
      toast({ title: 'Shapefile exported' })
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsExportingShapefile(false)
    }
  }

  return (
    <>
      {/* Map Size & Orientation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Map Output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-muted-foreground mb-1 block text-[10px] font-medium">
                Page Size
              </label>
              <Select value={pageSize} onValueChange={(v) => onPageSizeChange(v as PageSize)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a5">A5</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[10px] font-medium">
                Orientation
              </label>
              <div className="flex gap-1">
                <Button
                  variant={orientation === 'landscape' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onOrientationChange('landscape')}
                  title="Landscape"
                >
                  <RectangleHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  variant={orientation === 'portrait' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onOrientationChange('portrait')}
                  title="Portrait"
                >
                  <RectangleVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Button */}
      <Button variant="outline" className="w-full" onClick={handleCapture} disabled={isCapturing}>
        {isCapturing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Camera className="mr-2 h-4 w-4" />
        )}
        Capture Screenshot
      </Button>

      {/* Shapefile Export */}
      <Button
        variant="outline"
        className="w-full"
        disabled={isExportingShapefile}
        onClick={handleExportShapefile}
      >
        {isExportingShapefile ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isExportingShapefile ? 'Exporting...' : 'Export Shapefile'}
      </Button>

      {/* Saved Screenshots */}
      <Card className="shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saved Screenshots</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ScreenshotGallery key={screenshotKey} projectId={projectId} />
        </CardContent>
      </Card>

      {/* Screenshot Naming Dialog */}
      <Dialog
        open={showNamingDialog}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setShowNamingDialog(false)
            setPendingDataUrl(null)
            setScreenshotName('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Screenshot</DialogTitle>
          </DialogHeader>

          {pendingDataUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img src={pendingDataUrl} alt="Map preview" className="w-full" />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="screenshot-label" className="text-sm font-medium">
              Screenshot name
            </label>
            <Input
              id="screenshot-label"
              value={screenshotName}
              onChange={(e) => setScreenshotName(e.target.value)}
              placeholder="e.g. Figure 1 - Site Overview"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && screenshotName.trim() && !isSaving) {
                  handleSaveScreenshot()
                }
              }}
              autoFocus
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNamingDialog(false)
                setPendingDataUrl(null)
                setScreenshotName('')
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveScreenshot} disabled={!screenshotName.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-1 h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
