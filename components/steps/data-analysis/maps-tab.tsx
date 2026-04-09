'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import {
  Loader2,
  Camera,
  Download,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { useToast } from '@/hooks/use-toast'
import { useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { useHabitats } from '@/hooks/queries/use-habitat-hooks'
import { useTargetNotes } from '@/hooks/queries/use-target-note-hooks'
import { useProjectObservations } from '@/hooks/queries/use-observation-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useMapScreenshot } from '@/hooks/use-map-screenshot'
import { saveScreenshot } from '@/lib/map-screenshots/storage'
import { STEP_LABELS } from '@/lib/map-screenshots/types'
import { ScreenshotGallery } from '@/components/maps/screenshot-gallery'
import { DATASET_GROUPS, getGroupColorClasses } from '@/lib/config/dataset-layers'
import { downloadShapefile } from '@/lib/gis/shapefile-export'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { MapLegendOverlay } from '@/components/maps/map-legend-overlay'
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
  siteId?: string | null
  userId: string
  project: Project
}

/** Legend item display */
interface LegendEntry {
  id: string
  label: string
  color: string
  type: 'line' | 'fill' | 'circle'
}

type PageSize = 'a5' | 'a4' | 'a3'
type Orientation = 'landscape' | 'portrait'

/** Map container dimensions in pixels for each page size + orientation */
const PAGE_SIZE_CONFIG: Record<
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

const FINDING_TYPE_LEGEND: Record<string, { label: string; color: string }> = {
  designated_site: { label: 'Designated Sites', color: '#22c55e' },
  species_record: { label: 'Species Records', color: '#3b82f6' },
  water_quality: { label: 'Water Quality', color: '#06b6d4' },
  catchment: { label: 'Catchments', color: '#38bdf8' },
  other: { label: 'Other Findings', color: '#f59e0b' },
}

export function MapsTab({ projectId, siteId, userId, project }: MapsTabProps) {
  const { toast } = useToast()
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  // Data hooks (filtered by site when selected)
  const { data: findings = [] } = useSavedFindings(projectId, siteId)
  const { data: habitats = [] } = useHabitats(projectId, siteId)
  const { data: targetNotes = [] } = useTargetNotes(projectId, siteId)
  const { data: observations = [] } = useProjectObservations(projectId, siteId)
  const { data: projectSites = [] } = useProjectSites(projectId)

  // Layer visibility state
  const [visibleOverlays, setVisibleOverlays] = React.useState<Set<string>>(
    () => new Set(['boundary', 'findings', 'habitats', 'target-notes', 'observations'])
  )
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['overlays'])

  // Map layout state
  const [pageSize, setPageSize] = React.useState<PageSize>('a4')
  const [orientation, setOrientation] = React.useState<Orientation>('landscape')

  // Legend selection state — track deselected items (all selected by default)
  const [deselectedLegendIds, setDeselectedLegendIds] = React.useState<Set<string>>(new Set())

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

  // Shapefile export state
  const [isExportingShapefile, setIsExportingShapefile] = React.useState(false)

  // Project data
  const { projectBoundary, projectCenter } = useProjectBoundary(project)

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

  // Convert observations to GeoJSON FeatureCollection
  const observationPoints: GeoJSON.FeatureCollection | undefined = React.useMemo(() => {
    if (!visibleOverlays.has('observations')) return undefined
    const features = observations
      .filter((o) => o.location)
      .map((o) => ({
        type: 'Feature' as const,
        geometry: o.location as GeoJSON.Point,
        properties: {
          id: o.id,
          name: o.species_name_common || o.species_name_scientific,
          isProtected: o.is_protected || false,
        },
      }))
    return features.length > 0 ? { type: 'FeatureCollection', features } : undefined
  }, [observations, visibleOverlays])

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

  // Build all possible legend entries from active layers
  const legendEntries: LegendEntry[] = React.useMemo(() => {
    const entries: LegendEntry[] = []

    if (visibleOverlays.has('boundary') && projectBoundary) {
      entries.push({ id: 'boundary', label: 'Site Boundary', color: '#ef4444', type: 'line' })
    }

    if (visibleOverlays.has('habitats') && habitats.length > 0) {
      const uniqueCodes = new Set(habitats.map((h) => h.fossitt_code))
      uniqueCodes.forEach((code) => {
        const info = getHabitatByCode(code)
        if (info) {
          entries.push({
            id: `habitat-${code}`,
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
        entries.push({
          id: `finding-${type}`,
          label: config.label,
          color: config.color,
          type: 'circle',
        })
      })
    }

    if (visibleOverlays.has('observations') && observations.length > 0) {
      const protectedCount = observations.filter((o) => o.is_protected).length
      if (protectedCount > 0) {
        entries.push({
          id: 'observations-protected',
          label: `Protected Species (${protectedCount})`,
          color: '#ef4444',
          type: 'circle',
        })
      }
      const unprotectedCount = observations.length - protectedCount
      if (unprotectedCount > 0) {
        entries.push({
          id: 'observations-other',
          label: `Other Species (${unprotectedCount})`,
          color: '#3b82f6',
          type: 'circle',
        })
      }
    }

    if (visibleOverlays.has('target-notes') && targetNotes.length > 0) {
      entries.push({
        id: 'target-notes',
        label: 'Target Notes',
        color: '#f59e0b',
        type: 'circle',
      })
    }

    return entries
  }, [visibleOverlays, projectBoundary, habitats, findings, targetNotes, observations])

  // Toggle legend item selection
  const toggleLegendItem = (id: string) => {
    setDeselectedLegendIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Selected legend entries for display (all selected unless explicitly deselected)
  const displayedLegendEntries = legendEntries.filter((e) => !deselectedLegendIds.has(e.id))

  // Map container style based on page size + orientation
  const mapContainerStyle = React.useMemo(() => {
    const config = PAGE_SIZE_CONFIG[pageSize]
    const dims = config[orientation]
    return {
      aspectRatio: `${dims.w} / ${dims.h}`,
      maxHeight: orientation === 'portrait' ? '70vh' : undefined,
    }
  }, [pageSize, orientation])

  // Screenshot handlers — capture at configured page size dimensions
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

  // AI Legend generation
  const handleGenerateAiLegend = async () => {
    if (displayedLegendEntries.length === 0) {
      toast({ title: 'No legend items selected', description: 'Select some legend items first.' })
      return
    }

    setIsGeneratingLegend(true)
    try {
      const layerDescriptions = displayedLegendEntries.map((e) => e.label).join(', ')
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
    { id: 'observations', label: `Observations (${observations.length})`, color: '#8b5cf6' },
    { id: 'target-notes', label: `Target Notes (${targetNotes.length})`, color: '#f59e0b' },
  ]

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      {/* Left Panel - Layer Controls & Legend */}
      <div className="flex shrink-0 flex-col gap-4 md:w-[300px]">
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
                <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
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
                    onClick={() => setOrientation('landscape')}
                    title="Landscape"
                  >
                    <RectangleHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={orientation === 'portrait' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setOrientation('portrait')}
                    title="Portrait"
                  >
                    <RectangleVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Legend with selection */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Legend</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleGenerateAiLegend}
                disabled={isGeneratingLegend || displayedLegendEntries.length === 0}
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
                  {legendEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`legend-${entry.id}`}
                        checked={!deselectedLegendIds.has(entry.id)}
                        onCheckedChange={() => toggleLegendItem(entry.id)}
                        className="h-3.5 w-3.5"
                      />
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
                      <label
                        htmlFor={`legend-${entry.id}`}
                        className={cn(
                          'cursor-pointer text-xs',
                          deselectedLegendIds.has(entry.id) && 'text-muted-foreground line-through'
                        )}
                      >
                        {entry.label}
                      </label>
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

        {/* Shapefile Export */}
        <Button
          variant="outline"
          className="w-full"
          disabled={isExportingShapefile}
          onClick={async () => {
            // Multi-site: prefer project_sites with attributes, fall back to legacy single boundary
            const sitesWithBoundary = projectSites.filter((s) => s.boundary)
            const boundaries =
              sitesWithBoundary.length > 0
                ? sitesWithBoundary.map((s) => ({
                    boundary: s.boundary as GeoJSON.Feature<GeoJSON.Polygon>,
                    siteName: s.site_name ?? undefined,
                    siteCode: s.site_code ?? undefined,
                    county: s.county ?? undefined,
                    gridReference: s.grid_reference ?? undefined,
                    attributes: s.attributes,
                  }))
                : projectBoundary
                  ? [
                      {
                        boundary: projectBoundary,
                        siteName: project.name,
                        county: project.county ?? undefined,
                        gridReference: project.grid_reference ?? undefined,
                      },
                    ]
                  : []

            if (boundaries.length === 0) {
              toast({ title: 'No boundary', description: 'No project boundary to export.' })
              return
            }
            setIsExportingShapefile(true)
            try {
              await downloadShapefile({
                projectName: project.name,
                boundaries,
                targetNotes: targetNotes
                  .filter((tn) => tn.location && (tn.location as GeoJSON.Point).coordinates)
                  .map((tn, i) => ({
                    coordinates: (tn.location as GeoJSON.Point).coordinates as [number, number],
                    noteNumber: `N${i + 1}`,
                    category: (tn.category as string) ?? '',
                    label: (tn.title as string) ?? `N${i + 1}`,
                    description: (tn.description as string) ?? '',
                    date: tn.created_at?.split('T')[0] ?? '',
                  })),
                habitats: habitats
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
              console.error('Shapefile export error:', err)
              toast({
                title: 'Export failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive',
              })
            } finally {
              setIsExportingShapefile(false)
            }
          }}
        >
          {isExportingShapefile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExportingShapefile ? 'Exporting...' : 'Export Shapefile'}
        </Button>
      </div>

      {/* Right - Map & Screenshots */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Map */}
        <Card className="flex flex-1 flex-col md:min-h-0">
          <CardContent className="flex min-h-0 flex-1 flex-col p-3">
            <div
              ref={mapContainerRef}
              className="relative w-full overflow-hidden rounded-lg border"
              style={mapContainerStyle}
            >
              <DynamicProjectMap
                className="h-full"
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
                zoom={projectCenter ? 14 : 7}
                boundary={visibleOverlays.has('boundary') ? projectBoundary : undefined}
                bufferDistances={project.buffer_distances ?? undefined}
                habitatPolygons={habitatGeoJson}
                observationPoints={observationPoints}
                targetNotes={targetNoteMarkers}
                findings={mapFindings}
                showControls={false}
                npwsVisibleLayers={
                  Array.isArray(project.visible_layers)
                    ? project.visible_layers.filter((v): v is string => typeof v === 'string')
                    : undefined
                }
              />

              {/* Floating legend overlay — rendered inside mapContainerRef so
                  html-to-image captures it in exported screenshots. The sidebar
                  legend is interactive (users toggle items); this overlay is
                  display-only and shows whatever is currently selected. */}
              <MapLegendOverlay entries={displayedLegendEntries} />
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
