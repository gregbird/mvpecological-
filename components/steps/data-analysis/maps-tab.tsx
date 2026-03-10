'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Camera, Layers, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { useHabitats } from '@/hooks/queries/use-habitat-hooks'
import { useTargetNotes } from '@/hooks/queries/use-target-note-hooks'
import { useMapScreenshot } from '@/hooks/use-map-screenshot'
import { saveScreenshot } from '@/lib/map-screenshots/storage'
import { STEP_LABELS } from '@/lib/map-screenshots/types'
import { ScreenshotGallery } from '@/components/maps/screenshot-gallery'
import { DATASET_GROUPS, getGroupColorClasses } from '@/lib/config/dataset-layers'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteMarker } from '@/components/maps/map-types'

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface MapsTabProps {
  projectId: string
  userId: string
  project: Project
}

/** Legend item display */
interface LegendEntry {
  label: string
  color: string
  type: 'line' | 'fill' | 'circle'
}

const FINDING_TYPE_LEGEND: Record<string, { label: string; color: string }> = {
  designated_site: { label: 'Designated Sites', color: '#22c55e' },
  species_record: { label: 'Species Records', color: '#3b82f6' },
  water_quality: { label: 'Water Quality', color: '#06b6d4' },
  catchment: { label: 'Catchments', color: '#38bdf8' },
  other: { label: 'Other Findings', color: '#f59e0b' },
}

export function MapsTab({ projectId, userId, project }: MapsTabProps) {
  const { toast } = useToast()
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  // Data hooks
  const { data: findings = [] } = useSavedFindings(projectId)
  const { data: habitats = [] } = useHabitats(projectId)
  const { data: targetNotes = [] } = useTargetNotes(projectId)

  // Layer visibility state
  const [visibleOverlays, setVisibleOverlays] = React.useState<Set<string>>(
    () => new Set(['boundary', 'findings', 'habitats', 'target-notes'])
  )
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['overlays'])

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

  // AI Legend state
  const [aiLegend, setAiLegend] = React.useState<string | null>(null)
  const [isGeneratingLegend, setIsGeneratingLegend] = React.useState(false)

  // Project data
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  // Convert findings to map format
  const mapFindings = React.useMemo(() => {
    if (!visibleOverlays.has('findings')) return []
    return findings
      .filter((f) => f.include_in_report && f.location)
      .map((f: DeskResearchFinding) => ({
        id: f.id,
        source: f.source,
        dataType: f.data_type,
        title: f.title,
        content: f.content || undefined,
        location: f.location as GeoJSON.Geometry | undefined,
        isSaved: true,
      }))
  }, [findings, visibleOverlays])

  // Convert habitats to GeoJSON FeatureCollection
  const habitatGeoJson: GeoJSON.FeatureCollection | undefined = React.useMemo(() => {
    if (!visibleOverlays.has('habitats')) return undefined
    const features = habitats
      .filter((h) => h.boundary != null)
      .map((h) => ({
        type: 'Feature' as const,
        properties: {
          id: h.id,
          fossittCode: h.fossitt_code,
          fossittName: h.fossitt_name,
          condition: h.condition,
          color: getHabitatByCode(h.fossitt_code)?.color || '#22c55e',
        },
        geometry: h.boundary as GeoJSON.Geometry,
      }))
    return features.length > 0 ? { type: 'FeatureCollection', features } : undefined
  }, [habitats, visibleOverlays])

  // Convert target notes to markers
  const targetNoteMarkers: TargetNoteMarker[] = React.useMemo(() => {
    if (!visibleOverlays.has('target-notes')) return []
    return targetNotes
      .filter((n) => n.location)
      .map((n) => ({
        id: n.id,
        category: n.category,
        title: n.title,
        description: n.description,
        priority: n.priority,
        isVerified: n.is_verified,
        location: n.location as { coordinates: [number, number] } | null,
      }))
  }, [targetNotes, visibleOverlays])

  // Toggle overlay visibility
  const toggleOverlay = (id: string) => {
    setVisibleOverlays((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Build legend entries from active layers
  const legendEntries: LegendEntry[] = React.useMemo(() => {
    const entries: LegendEntry[] = []

    if (visibleOverlays.has('boundary') && projectBoundary) {
      entries.push({ label: 'Site Boundary', color: '#ef4444', type: 'line' })
    }

    if (visibleOverlays.has('habitats') && habitats.length > 0) {
      const uniqueCodes = new Set(habitats.map((h) => h.fossitt_code))
      uniqueCodes.forEach((code) => {
        const info = getHabitatByCode(code)
        if (info) {
          entries.push({
            label: `${code} - ${info.name}`,
            color: info.color || '#22c55e',
            type: 'fill',
          })
        }
      })
    }

    if (visibleOverlays.has('findings') && findings.length > 0) {
      const types = new Set(findings.filter((f) => f.include_in_report).map((f) => f.data_type))
      types.forEach((type) => {
        const config = FINDING_TYPE_LEGEND[type] || FINDING_TYPE_LEGEND.other
        entries.push({ label: config.label, color: config.color, type: 'circle' })
      })
    }

    if (visibleOverlays.has('target-notes') && targetNotes.length > 0) {
      entries.push({ label: 'Target Notes', color: '#f59e0b', type: 'circle' })
    }

    return entries
  }, [visibleOverlays, projectBoundary, habitats, findings, targetNotes])

  // Screenshot handlers
  const handleCapture = async () => {
    const dataUrl = await capture()
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
      const container = mapContainerRef.current
      await saveScreenshot(
        projectId,
        pendingDataUrl,
        'data_analysis',
        screenshotName.trim(),
        {
          width: container?.offsetWidth || 0,
          height: container?.offsetHeight || 0,
        },
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

  // AI Legend generation
  const handleGenerateAiLegend = async () => {
    if (legendEntries.length === 0) {
      toast({ title: 'No layers visible', description: 'Enable some layers first.' })
      return
    }

    setIsGeneratingLegend(true)
    try {
      const layerDescriptions = legendEntries.map((e) => e.label).join(', ')
      const response = await fetch('/api/ai/legend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          location: [project.townland, project.county].filter(Boolean).join(', '),
          layers: layerDescriptions,
          habitatCount: habitats.length,
          findingsCount: findings.filter((f) => f.include_in_report).length,
          targetNotesCount: targetNotes.length,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate legend')
      const data = await response.json()
      setAiLegend(data.legend)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate AI legend. Try again later.',
      })
    } finally {
      setIsGeneratingLegend(false)
    }
  }

  const overlayOptions = [
    { id: 'boundary', label: 'Site Boundary', color: '#ef4444' },
    {
      id: 'findings',
      label: `Desk Findings (${findings.filter((f) => f.include_in_report).length})`,
      color: '#3b82f6',
    },
    { id: 'habitats', label: `Habitats (${habitats.length})`, color: '#22c55e' },
    { id: 'target-notes', label: `Target Notes (${targetNotes.length})`, color: '#f59e0b' },
  ]

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      {/* Left Panel - Layer Controls & Legend */}
      <div className="flex shrink-0 flex-col gap-4 md:w-[300px]">
        {/* Layer Controls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4" />
              Map Layers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-0">
            {/* Data Overlays */}
            <Collapsible
              open={expandedGroups.includes('overlays')}
              onOpenChange={() =>
                setExpandedGroups((prev) =>
                  prev.includes('overlays')
                    ? prev.filter((g) => g !== 'overlays')
                    : [...prev, 'overlays']
                )
              }
            >
              <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
                {expandedGroups.includes('overlays') ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Project Data
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-2 pl-5">
                {overlayOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: opt.color }} />
                      <span className="text-xs">{opt.label}</span>
                    </div>
                    <Switch
                      checked={visibleOverlays.has(opt.id)}
                      onCheckedChange={() => toggleOverlay(opt.id)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* NPWS / EPA layer groups from dataset config */}
            {DATASET_GROUPS.slice(0, 2).map((group) => {
              const colors = getGroupColorClasses(group.id)
              const isExpanded = expandedGroups.includes(group.id)
              return (
                <Collapsible
                  key={group.id}
                  open={isExpanded}
                  onOpenChange={() =>
                    setExpandedGroups((prev) =>
                      prev.includes(group.id)
                        ? prev.filter((g) => g !== group.id)
                        : [...prev, group.id]
                    )
                  }
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <span className={cn(colors.text)}>{group.label}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-2 pl-5">
                    {group.layers.map((layer) => (
                      <div
                        key={layer.id}
                        className="flex items-center gap-2"
                        title={layer.description}
                      >
                        <div
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="text-xs">{layer.label}</span>
                      </div>
                    ))}
                    <p className="text-muted-foreground text-[10px]">
                      Toggle in GIS Mapping step (Step 1)
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Legend</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleGenerateAiLegend}
                disabled={isGeneratingLegend || legendEntries.length === 0}
              >
                {isGeneratingLegend ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                AI Legend
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {legendEntries.length === 0 ? (
              <p className="text-muted-foreground text-xs">No layers visible</p>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5">
                  {legendEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {entry.type === 'line' ? (
                        <div className="h-0.5 w-4" style={{ backgroundColor: entry.color }} />
                      ) : entry.type === 'fill' ? (
                        <div
                          className="h-3 w-4 rounded-sm border"
                          style={{
                            backgroundColor: entry.color + '33',
                            borderColor: entry.color,
                          }}
                        />
                      ) : (
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                      )}
                      <span className="text-xs">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* AI-generated legend description */}
            {aiLegend && (
              <div className="bg-muted/50 mt-3 rounded-md border p-2">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                  AI Description
                </p>
                <p className="text-xs leading-relaxed">{aiLegend}</p>
              </div>
            )}
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
      </div>

      {/* Right - Map & Screenshots */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Map */}
        <Card className="flex min-h-80 flex-1 flex-col md:min-h-0">
          <CardContent className="flex min-h-0 flex-1 flex-col p-3">
            <div
              ref={mapContainerRef}
              className="min-h-64 flex-1 overflow-hidden rounded-lg border"
            >
              <DynamicProjectMap
                className="h-full"
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
                zoom={projectCenter ? 14 : 7}
                boundary={visibleOverlays.has('boundary') ? projectBoundary : undefined}
                bufferDistances={project.buffer_distances ?? undefined}
                habitatPolygons={habitatGeoJson}
                targetNotes={targetNoteMarkers}
                findings={mapFindings}
                showControls={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Saved Screenshots */}
        <Card className="shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saved Screenshots</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScreenshotGallery key={screenshotKey} projectId={projectId} />
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
