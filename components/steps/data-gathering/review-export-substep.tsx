'use client'

import * as React from 'react'
import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Shield,
  AlertCircle,
  ClipboardList,
  Waves,
  Bug,
  Sparkles,
  BookOpen,
  Plus,
  Layers,
  FileText,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { TargetNoteForm } from './target-note-form'
import { ReviewFindingsTable } from './review-findings-table'
import { ExportPanel } from './export-panel'
import { ScreenshotGallery } from '@/components/maps/screenshot-gallery'
import { getAISummary, getDeepResearch } from '@/hooks/data-gathering/use-export-findings'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { buildHabitatPolygonsFromFindings } from '@/lib/utils/habitat-polygons-from-findings'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

// Dynamic import for map
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface ReviewExportSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances?: number[]
  /** Other site boundaries to render dimmed alongside the active site */
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries — render every boundary in "All Sites" mode */
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** Selected site (null = "All Sites" view) — drives header label, export
   *  filenames, and target-note site_id assignment. */
  selectedSite?: ProjectSiteWithGeoJSON | null
  /** Project-wide finding count, ignoring the site filter — used so that the
   *  "Complete Data Gathering" button isn't disabled when the user is viewing
   *  a single site that has no findings yet, but other sites in the project
   *  do have findings. */
  projectWideFindingsCount?: number
  userId: string
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  findingsStats?: {
    total: number
    byType: { type: string; count: number }[]
    bySource: { source: string; count: number }[]
  } | null
  /** True when this substep is currently visible — used to refresh data
   *  (e.g. ScreenshotGallery) since the substep stays mounted between visits. */
  isActive?: boolean
  onComplete: () => void
  isCompleting: boolean
  isComplete: boolean
}

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  npws: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  gbif: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  nbdc: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epa: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  catchments: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  company_reports: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  access_point: 'Access Point',
  check_feature: 'Check Feature',
  habitat: 'Habitat',
  fauna: 'Fauna',
  flora: 'Flora',
  management: 'Management',
  damage: 'Damage',
  ownership: 'Ownership',
}

// Saved-findings groups, ordered to mirror the Data Gathering wizard so the
// review summary reads top-to-bottom in step order.
type FindingGroupKey = 'sites' | 'species' | 'aquatic' | 'habitats' | 'reports' | 'other'

interface FindingGroupConfig {
  key: FindingGroupKey
  label: string
  icon: React.ElementType
  iconClass: string
  matches: (f: DeskResearchFinding) => boolean
}

const FINDING_GROUPS: FindingGroupConfig[] = [
  {
    key: 'sites',
    label: 'Designated Sites',
    icon: MapPin,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    matches: (f) => f.data_type === 'designated_site',
  },
  {
    key: 'species',
    label: 'Species Records',
    icon: Bug,
    iconClass: 'text-purple-600 dark:text-purple-400',
    matches: (f) => f.data_type === 'species_record',
  },
  {
    key: 'aquatic',
    label: 'Aquatic Features',
    icon: Waves,
    iconClass: 'text-cyan-600 dark:text-cyan-400',
    matches: (f) => f.data_type === 'water_quality' || f.data_type === 'catchment',
  },
  {
    key: 'habitats',
    label: 'Habitat Data',
    icon: Layers,
    iconClass: 'text-green-600 dark:text-green-400',
    matches: (f) => f.data_type === 'habitat',
  },
  {
    key: 'reports',
    label: 'Company Reports',
    icon: FileText,
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    matches: (f) => f.data_type === 'company_report',
  },
]

export function ReviewExportSubStep({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
  otherBoundaries,
  allBoundaries,
  selectedSite,
  projectWideFindingsCount,
  userId,
  savedFindings,
  targetNotes,
  isActive,
  onComplete,
  isCompleting,
  isComplete,
}: ReviewExportSubStepProps) {
  const [showNoteForm, setShowNoteForm] = React.useState(false)

  // Header label: "All Sites" vs the selected site code/name
  const scopeLabel = selectedSite
    ? selectedSite.site_code
      ? `${selectedSite.site_code}${selectedSite.site_name ? ` — ${selectedSite.site_name}` : ''}`
      : (selectedSite.site_name ?? 'Selected Site')
    : (allBoundaries && allBoundaries.length > 1) || (otherBoundaries && otherBoundaries.length > 0)
      ? 'All Sites'
      : null

  // Build a proper habitat FeatureCollection so the map renders NLC polygons
  // with Heritage Council FOSSITT styling via HabitatPolygonLayer — matches
  // the Desk Assessment "AI Analysis" view exactly, instead of the washed-out
  // grey polygons that FindingMarkers would render for `data_type='habitat'`.
  const habitatPolygonsFromFindings = React.useMemo(
    () => buildHabitatPolygonsFromFindings(savedFindings),
    [savedFindings]
  )

  // Stats calculations (single pass)
  const stats = React.useMemo(() => {
    let aiSummary = 0
    let deepResearch = 0
    let designatedSites = 0
    let speciesRecords = 0
    let waterFeatures = 0
    let protectedItems = 0
    for (const f of savedFindings) {
      if (getAISummary(f) !== null) aiSummary++
      if (getDeepResearch(f) !== null) deepResearch++
      if (f.data_type === 'designated_site') designatedSites++
      if (f.data_type === 'species_record') speciesRecords++
      if (f.data_type === 'water_quality' || f.data_type === 'catchment') waterFeatures++
      if (f.is_protected) protectedItems++
    }
    return {
      aiSummary,
      deepResearch,
      designatedSites,
      speciesRecords,
      waterFeatures,
      protectedItems,
    }
  }, [savedFindings])

  // Group findings by source
  const findingsBySource = React.useMemo(() => {
    const groups: Record<string, DeskResearchFinding[]> = {}
    for (const finding of savedFindings) {
      if (!groups[finding.source]) {
        groups[finding.source] = []
      }
      groups[finding.source].push(finding)
    }
    return groups
  }, [savedFindings])

  // Group findings by wizard step (one bucket per substep) so the saved
  // findings list can be rendered as collapsible toggles instead of one
  // long flat list.
  const findingsByGroup = React.useMemo(() => {
    const groups: Record<FindingGroupKey, DeskResearchFinding[]> = {
      sites: [],
      species: [],
      aquatic: [],
      habitats: [],
      reports: [],
      other: [],
    }
    for (const finding of savedFindings) {
      const matched = FINDING_GROUPS.find((g) => g.matches(finding))
      if (matched) {
        groups[matched.key].push(finding)
      } else {
        groups.other.push(finding)
      }
    }
    return groups
  }, [savedFindings])

  // Track which finding groups are expanded — default collapsed so the user
  // sees a clean overview and can drill into the steps they care about.
  const [expandedGroups, setExpandedGroups] = React.useState<Set<FindingGroupKey>>(() => new Set())
  const toggleGroup = React.useCallback((key: FindingGroupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Map layer filter — controls which finding data_types render on the map.
  // Defaults to designated sites + aquatic visible (clean view); habitats are
  // hidden by default because their dense polygon coverage dominates the map.
  type MapLayerKey = 'sites' | 'aquatic' | 'habitats'
  const [visibleMapLayers, setVisibleMapLayers] = React.useState<Set<MapLayerKey>>(
    () => new Set<MapLayerKey>(['sites', 'aquatic'])
  )
  const toggleMapLayer = React.useCallback((key: MapLayerKey) => {
    setVisibleMapLayers((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Translate layer toggles into the data_type list ProjectMap accepts.
  const visibleFindingTypes = React.useMemo(() => {
    const types: string[] = []
    if (visibleMapLayers.has('sites')) types.push('designated_site')
    if (visibleMapLayers.has('aquatic')) types.push('water_quality', 'catchment')
    if (visibleMapLayers.has('habitats')) types.push('habitat')
    return types
  }, [visibleMapLayers])

  // Use project-wide finding count for completion gating so a single-site
  // view with no findings doesn't disable the button while other sites do
  // have data. Falls back to the local count when the prop isn't supplied.
  const completionFindingCount = projectWideFindingsCount ?? savedFindings.length
  const canComplete = completionFindingCount > 0 && !isComplete

  return (
    <div className="flex h-full">
      {/* Left Panel - Summary (55%) */}
      <div className="bg-background flex w-[55%] shrink-0 flex-col border-r">
        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {/* Compact stat strip — 4 inline cards instead of large p-3 boxes */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="flex items-center gap-1.5 rounded-md border bg-emerald-50 px-2 py-1.5 dark:bg-emerald-950">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {stats.designatedSites}
                  </div>
                  <div className="truncate text-[9px] text-emerald-600 dark:text-emerald-500">
                    Sites
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border bg-purple-50 px-2 py-1.5 dark:bg-purple-950">
                <Bug className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold text-purple-700 dark:text-purple-400">
                    {stats.speciesRecords}
                  </div>
                  <div className="truncate text-[9px] text-purple-600 dark:text-purple-500">
                    Species
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border bg-cyan-50 px-2 py-1.5 dark:bg-cyan-950">
                <Waves className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
                    {stats.waterFeatures}
                  </div>
                  <div className="truncate text-[9px] text-cyan-600 dark:text-cyan-500">
                    Aquatic
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border bg-red-50 px-2 py-1.5 dark:bg-red-950">
                <Shield className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold text-red-700 dark:text-red-400">
                    {stats.protectedItems}
                  </div>
                  <div className="truncate text-[9px] text-red-600 dark:text-red-500">
                    Protected
                  </div>
                </div>
              </div>
            </div>

            {/* Protected Species Warning */}
            {stats.protectedItems > 0 && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  <strong>{stats.protectedItems}</strong> protected species/sites found — ensure
                  mitigation measures are addressed in the assessment.
                </AlertDescription>
              </Alert>
            )}

            {/* Sources + AI Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">Data Sources</h4>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(findingsBySource).map(([source, findings]) => (
                    <Badge key={source} className={`${SOURCE_COLORS[source] || ''}`}>
                      {source.toUpperCase()} ({findings.length})
                    </Badge>
                  ))}
                  {Object.keys(findingsBySource).length === 0 && (
                    <span className="text-muted-foreground text-sm">No data yet</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">AI Enrichment</h4>
                <div className="flex flex-wrap gap-1.5">
                  {stats.aiSummary > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {stats.aiSummary} AI Summaries
                    </Badge>
                  )}
                  {stats.deepResearch > 0 && (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                    >
                      <BookOpen className="h-3 w-3" />
                      {stats.deepResearch} Deep Research
                    </Badge>
                  )}
                  {stats.aiSummary === 0 && stats.deepResearch === 0 && (
                    <span className="text-muted-foreground text-sm">No AI data</span>
                  )}
                </div>
              </div>
            </div>

            {/* Map Screenshots */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-sm font-medium">Map Screenshots</h4>
              <ScreenshotGallery projectId={project.id} isActive={isActive} />
            </div>

            {/* Saved Findings — grouped by wizard step, collapsible */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Saved Findings ({savedFindings.length})</h4>
              </div>
              {savedFindings.length === 0 ? (
                <p className="text-muted-foreground py-3 text-center text-xs">
                  No findings saved yet
                </p>
              ) : (
                <div className="space-y-2">
                  {FINDING_GROUPS.map((group) => {
                    const items = findingsByGroup[group.key]
                    if (items.length === 0) return null
                    const Icon = group.icon
                    const isOpen = expandedGroups.has(group.key)
                    return (
                      <Collapsible
                        key={group.key}
                        open={isOpen}
                        onOpenChange={() => toggleGroup(group.key)}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-center justify-between gap-2 rounded-md border bg-gray-50 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isOpen && 'bg-gray-100 dark:bg-gray-700'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn('h-4 w-4 shrink-0', group.iconClass)} />
                              <span className="font-medium">{group.label}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {items.length}
                              </Badge>
                            </div>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                                isOpen && 'rotate-180'
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <ReviewFindingsTable savedFindings={items} />
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                  {findingsByGroup.other.length > 0 && (
                    <Collapsible
                      open={expandedGroups.has('other')}
                      onOpenChange={() => toggleGroup('other')}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-md border bg-gray-50 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700',
                            expandedGroups.has('other') && 'bg-gray-100 dark:bg-gray-700'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="font-medium">Other</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {findingsByGroup.other.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                              expandedGroups.has('other') && 'rotate-180'
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <ReviewFindingsTable savedFindings={findingsByGroup.other} />
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
            </div>

            {/* Target Notes */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Target Notes ({targetNotes.length})</h4>
                <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Target Note</DialogTitle>
                      <DialogDescription>
                        Add a note for field surveyors to check during their visit.
                      </DialogDescription>
                    </DialogHeader>
                    <TargetNoteForm
                      projectId={project.id}
                      userId={userId}
                      siteId={selectedSite?.id ?? null}
                      onSuccess={() => setShowNoteForm(false)}
                      onCancel={() => setShowNoteForm(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              {targetNotes.length === 0 ? (
                <div className="py-3 text-center">
                  <ClipboardList className="mx-auto mb-1 h-6 w-6 text-gray-300" />
                  <p className="text-muted-foreground text-xs">No target notes yet</p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Add notes for features to investigate in the field
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {targetNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border bg-gray-50 p-2.5 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm font-medium">{note.title}</span>
                        <div className="flex items-center gap-1">
                          {note.priority === 'high' && (
                            <Badge variant="destructive" className="text-[9px]">
                              High
                            </Badge>
                          )}
                          {note.priority === 'low' && (
                            <Badge variant="outline" className="text-[9px] text-gray-500">
                              Low
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[9px]">
                            {CATEGORY_LABELS[note.category] || note.category}
                          </Badge>
                        </div>
                      </div>
                      {note.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {note.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <ExportPanel
              project={project}
              savedFindings={savedFindings}
              targetNotes={targetNotes}
              selectedSite={selectedSite}
            />

            {/* Validation Warning — gated on project-wide count so a single
                site with no findings doesn't block completion when other
                sites in the project do have data. */}
            {completionFindingCount === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Save at least one finding {scopeLabel ? 'in any site' : ''} to complete this step.
                </AlertDescription>
              </Alert>
            )}
            {completionFindingCount > 0 && savedFindings.length === 0 && selectedSite != null && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No findings saved for <strong>{scopeLabel}</strong> yet, but other sites in this
                  project have data. Switch to &ldquo;All Sites&rdquo; or another site to review
                  them.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        {/* Complete Button - Fixed at bottom */}
        <div className="bg-background border-t p-4">
          <Button
            onClick={onComplete}
            disabled={!canComplete || isCompleting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : isComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Data Gathering
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right - Map (45%) */}
      <div className="relative w-[45%] shrink-0">
        {/* Floating layer filter — sits above map controls so the user can
            quickly cull the noisy habitat layer (or any other type) without
            opening the full Layers dropdown. */}
        <div
          data-map-control="true"
          className="bg-background/90 pointer-events-auto absolute top-4 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1 shadow-md backdrop-blur-sm"
        >
          {(
            [
              {
                key: 'sites' as const,
                label: 'Sites',
                icon: MapPin,
                activeClass:
                  'bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600',
              },
              {
                key: 'aquatic' as const,
                label: 'Aquatic',
                icon: Waves,
                activeClass:
                  'bg-cyan-500 text-white border-cyan-500 dark:bg-cyan-600 dark:border-cyan-600',
              },
              {
                key: 'habitats' as const,
                label: 'Habitats',
                icon: Layers,
                activeClass:
                  'bg-green-500 text-white border-green-500 dark:bg-green-600 dark:border-green-600',
              },
            ] as const
          ).map(({ key, label, icon: Icon, activeClass }) => {
            const active = visibleMapLayers.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMapLayer(key)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? activeClass
                    : 'border-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
                title={`${active ? 'Hide' : 'Show'} ${label}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            )
          })}
        </div>

        <ProjectMap
          className="h-full"
          center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
          zoom={12}
          boundary={projectBoundary}
          otherBoundaries={otherBoundaries}
          allBoundaries={allBoundaries}
          bufferDistances={bufferDistances}
          habitatPolygons={habitatPolygonsFromFindings}
          visibleFindingTypes={visibleFindingTypes}
          findings={savedFindings.map((f) => {
            const raw = f.raw_data as Record<string, unknown> | null
            const meta = raw?.metadata as Record<string, unknown> | undefined
            return {
              id: f.id,
              source: f.source as
                | 'npws'
                | 'gbif'
                | 'nbdc'
                | 'epa'
                | 'catchments'
                | 'fpo'
                | 'manual',
              dataType: f.data_type as
                | 'designated_site'
                | 'species_record'
                | 'water_quality'
                | 'catchment'
                | 'habitat'
                | 'company_report'
                | 'other',
              title: f.title,
              content: f.content || undefined,
              location: f.location as GeoJSON.Geometry | undefined,
              isSaved: true,
              metadata: {
                siteCode: meta?.siteCode as string | undefined,
                siteType: meta?.siteType as string | undefined,
                scientificName: meta?.scientificName as string | undefined,
                commonName: meta?.commonName as string | undefined,
                recordCount: meta?.recordCount as number | undefined,
                isProtected: f.is_protected || (meta?.isProtected as boolean | undefined),
                isInvasive: meta?.isInvasive as boolean | undefined,
                isThreatened: meta?.isThreatened as boolean | undefined,
                designation: meta?.designation as string | undefined,
                designations: meta?.designations as string | undefined,
                distance: f.distance_from_boundary_km ?? (meta?.distance as number | undefined),
                taxonGroup: meta?.taxonGroup as string | undefined,
                totalIrishRecords: meta?.totalIrishRecords as number | undefined,
              },
            }
          })}
        />
      </div>
    </div>
  )
}
