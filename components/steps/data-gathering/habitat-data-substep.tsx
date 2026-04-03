'use client'

import * as React from 'react'
import {
  Loader2,
  Search,
  Layers,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  FlaskConical,
  MessageSquare,
  Save,
  Check,
  CheckCheck,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import {
  searchNlcLandCover,
  fetchNlcPolygons,
  NLC_LEVEL1_COLORS,
  type AggregatedHabitat,
} from '@/lib/external-apis/osi'
import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import { MarkdownContent } from '@/components/desk-research/deep-research-shell'
import { HabitatDeepResearchModal } from '@/components/desk-research/habitat-deep-research-modal'
import {
  useCreateFinding,
  useDeleteFinding,
  useUpdateFinding,
} from '@/hooks/queries/use-finding-hooks'
import { useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import type { Project, DeskResearchFinding, WorkflowStep, Json } from '@/types/database'

/** Single-step cast for Supabase Json columns — avoids double casts per CLAUDE.md rules */
function toJson(value: Record<string, unknown> | GeoJSON.Geometry | null): Json {
  return value as Json
}

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

interface HabitatDataSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  /** Merged boundary for search (covers all sites); falls back to projectBoundary */
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  /** Active site ID for site-scoped caching and saving */
  siteId?: string | null
  /** Other site boundaries to show as dimmed overlays on the map */
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries — when provided, search each individually and merge */
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  userId: string
  savedFindings: DeskResearchFinding[]
  workflowStep?: WorkflowStep
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error') => void
}

export interface HabitatResult {
  nlcId: string
  nlcLabel: string
  nlcLevel1: string
  fossittCode: string
  fossittName: string
  areaHectares: number
  polygonCount: number
}

export function HabitatDataSubStep({
  project,
  projectBoundary,
  searchBoundary,
  projectCenter,
  bufferDistances,
  siteId,
  otherBoundaries,
  allBoundaries,
  showMap,
  onToggleMap,
  isActive,
  userId,
  savedFindings,
  workflowStep,
  autoSearchTrigger,
  onAutoSearchComplete,
}: HabitatDataSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()
  // Cache key is project-level — search covers all sites, filtering is at display time
  const cacheKey = `nlc-habitat-${project.id}`

  /** Build per-site bbox list for multi-site, or single bbox for single-site */
  const buildBboxList = React.useCallback(
    (buffer: number) => {
      if (allBoundaries && allBoundaries.length > 0) {
        return allBoundaries
          .map((b) => getBoundingBox(b, null, buffer))
          .filter(Boolean) as NonNullable<ReturnType<typeof getBoundingBox>>[]
      }
      const bbox = getBoundingBox(searchBoundary ?? projectBoundary, projectCenter, buffer)
      return bbox ? [bbox] : []
    },
    [allBoundaries, searchBoundary, projectBoundary, projectCenter]
  )

  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = useSessionStorage<HabitatResult[]>(cacheKey, [])
  const [habitatPolygons, setHabitatPolygons] = React.useState<GeoJSON.FeatureCollection | null>(
    null
  )
  const [selectedHabitat, setSelectedHabitat] = React.useState<HabitatResult | null>(null)
  const [selectedBuffer, setSelectedBuffer] = React.useState(bufferDistances[0] || 2)

  const totalArea = React.useMemo(
    () => Math.round(results.reduce((sum, r) => sum + r.areaHectares, 0) * 100) / 100,
    [results]
  )

  // Per-card state (sessionStorage)
  const [notes, setNotes] = useSessionStorage<Record<string, string>>(`${cacheKey}-notes`, {})
  const [aiSummaries, setAiSummaries] = useSessionStorage<Record<string, string>>(
    `${cacheKey}-summaries`,
    {}
  )

  // Debounced sessionStorage write — useSessionStorage only reads, callers must persist
  const cacheTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (results.length === 0) return
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(results))
      } catch {
        // SessionStorage full — habitat results are small, unlikely to fail
      }
    }, 1000)
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [results, cacheKey])

  React.useEffect(() => {
    if (Object.keys(notes).length === 0) return
    try {
      sessionStorage.setItem(`${cacheKey}-notes`, JSON.stringify(notes))
    } catch {
      // noop
    }
  }, [notes, cacheKey])

  React.useEffect(() => {
    if (Object.keys(aiSummaries).length === 0) return
    try {
      sessionStorage.setItem(`${cacheKey}-summaries`, JSON.stringify(aiSummaries))
    } catch {
      // noop
    }
  }, [aiSummaries, cacheKey])
  const updateWorkflowStep = useUpdateWorkflowStep()
  const [overallAi, setOverallAi] = React.useState<string>(() => {
    const meta = workflowStep?.metadata as Record<string, unknown> | null
    return (meta?.habitatOverallAnalysis as string) || ''
  })
  const [loadingSummaries, setLoadingSummaries] = React.useState<Set<string>>(new Set())
  const [isOverallLoading, setIsOverallLoading] = React.useState(false)
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set())
  const [isSavingAll, setIsSavingAll] = React.useState(false)

  // Note editing
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null)
  const [noteDraft, setNoteDraft] = React.useState('')

  // Deep research modal
  const [deepResearchSite, setDeepResearchSite] = React.useState<HabitatResult | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)

  // Refs for latest values — prevents stale closures in auto-save effect
  const savedFindingsRef = React.useRef(savedFindings)
  savedFindingsRef.current = savedFindings
  const projectBoundaryRef = React.useRef(projectBoundary)
  projectBoundaryRef.current = projectBoundary
  const selectedBufferRef = React.useRef(selectedBuffer)
  selectedBufferRef.current = selectedBuffer
  const createFindingRef = React.useRef(createFinding)
  createFindingRef.current = createFinding
  const toastRef = React.useRef(toast)
  toastRef.current = toast

  // ── Spatial filter: when a specific site is selected, filter polygons & results ──
  const siteFilterPolygon = React.useMemo(() => {
    if (allBoundaries && allBoundaries.length > 0) return null
    if (!siteId || !projectBoundary) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const turf = require('@turf/turf')
      return turf.buffer(projectBoundary, selectedBuffer, {
        units: 'kilometers',
      }) as GeoJSON.Feature<GeoJSON.Polygon>
    } catch {
      return null
    }
  }, [allBoundaries, siteId, projectBoundary, selectedBuffer])

  const filteredPolygons = React.useMemo((): GeoJSON.FeatureCollection | null => {
    if (!habitatPolygons) return null
    if (!siteFilterPolygon) return habitatPolygons
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const turf = require('@turf/turf')
    return {
      type: 'FeatureCollection',
      features: habitatPolygons.features.filter((f) => {
        try {
          return turf.booleanIntersects(f.geometry, siteFilterPolygon)
        } catch {
          return false
        }
      }),
    }
  }, [habitatPolygons, siteFilterPolygon])

  const filteredResults = React.useMemo((): HabitatResult[] => {
    if (!siteFilterPolygon || !filteredPolygons) return results
    // Collect nlcIds that have polygons in the filtered set
    const nlcIdsInSite = new Set<string>()
    for (const f of filteredPolygons.features) {
      const nlcId = f.properties?.nlc_id
      if (nlcId) nlcIdsInSite.add(String(nlcId).trim())
    }
    return results.filter((r) => nlcIdsInSite.has(r.nlcId))
  }, [results, siteFilterPolygon, filteredPolygons])

  // Total area derived from currently displayed (filtered) results
  const filteredTotalArea = React.useMemo(
    () => Math.round(filteredResults.reduce((sum, r) => sum + r.areaHectares, 0) * 100) / 100,
    [filteredResults]
  )

  // Style polygons for map highlight — 3-field fallback matching
  const styledPolygons = React.useMemo((): GeoJSON.FeatureCollection | undefined => {
    if (!filteredPolygons) return undefined
    return {
      type: 'FeatureCollection',
      features: filteredPolygons.features.map((f) => {
        let isMatch = false
        if (selectedHabitat) {
          const p = f.properties
          // Primary: nlc_id (LEVEL_2_ID)
          if (p?.nlc_id && String(p.nlc_id).trim() === selectedHabitat.nlcId) isMatch = true
          // Fallback 1: nlc_label (LEVEL_2_VALUE, case-insensitive)
          else if (
            p?.nlc_label &&
            String(p.nlc_label).trim().toLowerCase() ===
              selectedHabitat.nlcLabel.trim().toLowerCase()
          )
            isMatch = true
          // Fallback 2: fossitt_code
          else if (
            p?.fossitt_code &&
            selectedHabitat.fossittCode !== '\u2014' &&
            String(p.fossitt_code) === selectedHabitat.fossittCode
          )
            isMatch = true
        }
        return {
          ...f,
          properties: {
            ...f.properties,
            fillOpacity: !selectedHabitat ? 0.35 : isMatch ? 0.85 : 0.05,
          },
        }
      }),
    }
  }, [filteredPolygons, selectedHabitat])

  // Auto-refetch polygons when switching back to this tab (results exist from sessionStorage)
  const hasFetchedRef = React.useRef(false)
  React.useEffect(() => {
    if (results.length > 0 && !habitatPolygons && !isSearching && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      const bboxes = buildBboxList(selectedBuffer)
      if (bboxes.length > 0) {
        // Fetch sequentially to avoid ArcGIS timeouts
        ;(async () => {
          const allFeatures: GeoJSON.Feature[] = []
          for (const bbox of bboxes) {
            const fc = await fetchNlcPolygons({
              bbox: {
                minLat: bbox.minLat,
                maxLat: bbox.maxLat,
                minLng: bbox.minLng,
                maxLng: bbox.maxLng,
              },
            })
            allFeatures.push(...fc.features)
          }
          setHabitatPolygons({
            type: 'FeatureCollection',
            features: allFeatures,
          })
        })()
      }
    }
  }, [results, habitatPolygons, isSearching, buildBboxList, selectedBuffer])

  // Reset UI state when site changes — polygons stay (project-level), spatial filter handles display
  const prevSiteIdRef = React.useRef(siteId)
  React.useEffect(() => {
    if (prevSiteIdRef.current !== siteId) {
      prevSiteIdRef.current = siteId
      setSelectedHabitat(null)
    }
  }, [siteId])

  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // Auto-search: triggered by parent data-gathering-step
  const autoSearchTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (!autoSearchTrigger || autoSearchTriggeredRef.current) return
    if (!projectBoundary) {
      onAutoSearchComplete?.('error')
      return
    }
    // Already have cached results — skip
    if (results.length > 0) {
      onAutoSearchComplete?.('done')
      return
    }
    autoSearchTriggeredRef.current = true

    const bboxes = buildBboxList(selectedBuffer)
    if (bboxes.length === 0) {
      onAutoSearchComplete?.('error')
      return
    }

    setIsSearching(true)
    const bboxParamsList = bboxes.map((bbox) => ({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
    }))

    // Auto-search: fetch lightweight aggregate stats for each site, then merge
    Promise.all(bboxParamsList.map((p) => searchNlcLandCover(p)))
      .then((allAggregated) => {
        // Merge aggregated results by nlcId
        const mergedMap = new Map<string, AggregatedHabitat>()
        for (const aggregated of allAggregated) {
          for (const h of aggregated) {
            const existing = mergedMap.get(h.nlcId)
            if (existing) {
              existing.areaHectares += h.areaHectares
              existing.polygonCount += h.polygonCount
            } else {
              mergedMap.set(h.nlcId, { ...h })
            }
          }
        }
        const merged = Array.from(mergedMap.values())

        if (merged.length === 0) {
          onAutoSearchComplete?.('done')
          return
        }
        const mapped: HabitatResult[] = merged.map((h: AggregatedHabitat) => {
          const fossitt = mapNlcToFossitt(h.nlcId)
          return {
            nlcId: h.nlcId,
            nlcLabel: h.nlcLabel,
            nlcLevel1: h.nlcLevel1,
            fossittCode: fossitt?.fossittCode || '\u2014',
            fossittName: fossitt?.fossittName || h.nlcLabel,
            areaHectares: h.areaHectares,
            polygonCount: h.polygonCount,
          }
        })
        setResults(mapped)
        onAutoSearchComplete?.('done')
        // Fetch polygons in background (non-blocking) for map display
        Promise.all(bboxParamsList.map((p) => fetchNlcPolygons(p))).then((collections) => {
          const mergedPolygons: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: collections.flatMap((c) => c.features),
          }
          setHabitatPolygons(mergedPolygons)
          hasFetchedRef.current = true
        })
      })
      .catch(() => {
        onAutoSearchComplete?.('error')
      })
      .finally(() => {
        setIsSearching(false)
      })
  }, [
    autoSearchTrigger,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    results.length,
    onAutoSearchComplete,
  ])

  // Check if a habitat is already saved in DB — uses ref for latest data, scoped by site
  const getSavedFinding = React.useCallback(
    (nlcId: string): DeskResearchFinding | undefined =>
      savedFindingsRef.current.find((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        if (!(raw?.nlcId === nlcId && raw?.habitatFinding === true)) return false
        // Must match the current site scope (null == project-level)
        return (f.site_id ?? null) === (siteId ?? null)
      }),
    [siteId]
  )

  /** Extract merged geometry for a habitat from the polygon collection */
  const getHabitatGeometry = (nlcId: string): GeoJSON.Geometry | null => {
    if (!habitatPolygons) return null
    const matching = habitatPolygons.features.filter((f) => {
      const p = f.properties
      return p?.nlc_id && String(p.nlc_id).trim() === nlcId
    })
    if (matching.length === 0) return null
    if (matching.length === 1) return matching[0].geometry
    return {
      type: 'GeometryCollection',
      geometries: matching.map((f) => f.geometry),
    }
  }

  // Auto-save: when search completes and results + polygons are ready, save all unsaved habitats
  const autoSaveTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (
      results.length === 0 ||
      !habitatPolygons ||
      habitatPolygons.features.length === 0 ||
      isSearching ||
      isSavingAll ||
      autoSaveTriggeredRef.current
    )
      return

    const unsaved = results.filter((r) => !getSavedFinding(r.nlcId))
    if (unsaved.length === 0) return

    autoSaveTriggeredRef.current = true
    setIsSavingAll(true)

    const total = results.reduce((sum, r) => sum + r.areaHectares, 0)
    // Capture current ref values for the async operation
    const currentBoundary = projectBoundaryRef.current
    const currentBuffer = selectedBufferRef.current

    const saveSequentially = async () => {
      let count = 0
      const failed: string[] = []
      for (const r of unsaved) {
        const pct = total > 0 ? ((r.areaHectares / total) * 100).toFixed(1) : '0'
        const geometry = getHabitatGeometry(r.nlcId)
        const distKm = calculateDistanceFromBoundary(
          geometry ?? undefined,
          currentBoundary ?? undefined
        )
        try {
          await createFindingRef.current.mutateAsync({
            project_id: project.id,
            site_id: siteId ?? null,
            created_by: userId,
            source: 'manual' as const,
            data_type: 'habitat' as const,
            include_in_report: true,
            title: `${r.fossittCode} — ${r.fossittName}`,
            content: `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
            is_saved: true,
            notes: null,
            location: toJson(geometry),
            distance_from_boundary_km: distKm ?? null,
            raw_data: toJson({
              habitatFinding: true,
              nlcId: r.nlcId,
              nlcLabel: r.nlcLabel,
              nlcLevel1: r.nlcLevel1,
              fossittCode: r.fossittCode,
              fossittName: r.fossittName,
              areaHectares: r.areaHectares,
              polygonCount: r.polygonCount,
              percentCover: pct,
              aiSummary: null,
              bufferKm: currentBuffer,
              distance_from_boundary_km: distKm ?? null,
            }),
          })
          count++
        } catch {
          failed.push(r.fossittCode)
        }
      }
      if (count > 0) {
        const desc =
          failed.length > 0
            ? `${count} saved, ${failed.length} failed (${failed.join(', ')})`
            : `${count} habitat${count > 1 ? 's' : ''} automatically saved to findings.`
        toastRef.current({ title: 'Habitats auto-saved', description: desc })
      }
      setIsSavingAll(false)
    }

    saveSequentially()
    // Deps intentionally limited — refs provide latest values for captured closures.
    // Adding createFinding/toast/project.id would cause infinite re-runs since mutation
    // hooks return new references on every render.
  }, [results, habitatPolygons, isSearching, getSavedFinding])

  const performSearch = async () => {
    const bboxes = buildBboxList(selectedBuffer)
    if (bboxes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setResults([])
    setHabitatPolygons(null)
    hasFetchedRef.current = true
    autoSaveTriggeredRef.current = false

    const bboxParamsList = bboxes.map((bbox) => ({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
    }))

    try {
      // Fetch sequentially to avoid ArcGIS server timeouts with multiple large bboxes
      const allResults: [AggregatedHabitat[], GeoJSON.FeatureCollection][] = []
      for (const p of bboxParamsList) {
        const [aggregated, polygons] = await Promise.all([
          searchNlcLandCover(p),
          fetchNlcPolygons(p),
        ])
        allResults.push([aggregated, polygons])
      }

      // Merge aggregated results by nlcId
      const mergedMap = new Map<string, AggregatedHabitat>()
      for (const [aggregated] of allResults) {
        for (const h of aggregated) {
          const existing = mergedMap.get(h.nlcId)
          if (existing) {
            existing.areaHectares += h.areaHectares
            existing.polygonCount += h.polygonCount
          } else {
            mergedMap.set(h.nlcId, { ...h })
          }
        }
      }
      const mergedAggregated = Array.from(mergedMap.values())

      // Merge polygon collections
      const mergedPolygons: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allResults.flatMap(([, polygons]) => polygons.features),
      }

      if (mergedAggregated.length === 0) {
        toast({ title: 'No habitats found', description: 'No land cover data in buffer zone.' })
        setIsSearching(false)
        return
      }

      const mapped: HabitatResult[] = mergedAggregated.map((h: AggregatedHabitat) => {
        const fossitt = mapNlcToFossitt(h.nlcId)
        return {
          nlcId: h.nlcId,
          nlcLabel: h.nlcLabel,
          nlcLevel1: h.nlcLevel1,
          fossittCode: fossitt?.fossittCode || '\u2014',
          fossittName: fossitt?.fossittName || h.nlcLabel,
          areaHectares: h.areaHectares,
          polygonCount: h.polygonCount,
        }
      })

      setResults(mapped)
      setHabitatPolygons(mergedPolygons)

      const totalPolygons = mapped.reduce((sum, m) => sum + m.polygonCount, 0)
      toast({
        title: 'Habitat data loaded',
        description: `Found ${mapped.length} habitat types from ${totalPolygons.toLocaleString()} polygons.`,
      })
    } catch (error) {
      console.error('NLC search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch land cover data.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Per-type AI summary
  const fetchAiSummary = async (r: HabitatResult) => {
    setLoadingSummaries((prev) => new Set(prev).add(r.nlcId))
    try {
      const pct = totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
      const res = await fetch('/api/ai/habitat-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fossittCode: r.fossittCode,
          fossittName: r.fossittName,
          nlcLabel: r.nlcLabel,
          areaHectares: r.areaHectares,
          percentCover: pct,
          bufferKm: selectedBuffer,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummaries((prev) => ({ ...prev, [r.nlcId]: data.summary }))
        // Persist to DB if finding is already saved
        const existing = getSavedFinding(r.nlcId)
        if (existing) {
          const existingRaw = (existing.raw_data as Record<string, unknown>) || {}
          updateFinding.mutate({
            findingId: existing.id,
            updates: {
              content: data.summary,
              raw_data: toJson({ ...existingRaw, aiSummary: data.summary }),
            },
          })
        }
      }
    } finally {
      setLoadingSummaries((prev) => {
        const next = new Set(prev)
        next.delete(r.nlcId)
        return next
      })
    }
  }

  // Overall AI analysis
  const generateOverallAnalysis = async () => {
    if (results.length === 0) return
    setIsOverallLoading(true)
    try {
      const res = await fetch('/api/ai/habitat-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitats: results.map((r) => ({
            fossittCode: r.fossittCode,
            fossittName: r.fossittName,
            nlcLabel: r.nlcLabel,
            areaHectares: r.areaHectares,
          })),
          projectName: project.name,
          bufferKm: selectedBuffer,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOverallAi(data.analysis)
        // Persist to workflow step metadata
        if (workflowStep) {
          const existingMeta = (workflowStep.metadata as Record<string, unknown>) || {}
          updateWorkflowStep.mutate({
            stepId: workflowStep.id,
            updates: {
              metadata: toJson({
                ...existingMeta,
                habitatOverallAnalysis: data.analysis,
                habitatOverallAnalysisUpdatedAt: new Date().toISOString(),
              }),
            },
          })
        }
      }
    } finally {
      setIsOverallLoading(false)
    }
  }

  const openDeepResearch = (r: HabitatResult) => {
    setDeepResearchSite(r)
    setIsDeepResearchOpen(true)
  }

  const startEditNote = (nlcId: string) => {
    setEditingNoteId(nlcId)
    setNoteDraft(notes[nlcId] || '')
  }

  const saveNote = (nlcId: string) => {
    setNotes((prev) => ({ ...prev, [nlcId]: noteDraft }))
    setEditingNoteId(null)
  }

  const handleRowClick = (r: HabitatResult) => {
    setSelectedHabitat((prev) => (prev?.nlcId === r.nlcId ? null : r))
  }

  // Save a habitat finding to DB
  const handleSave = async (r: HabitatResult) => {
    setSavingIds((prev) => new Set(prev).add(r.nlcId))
    try {
      const existing = getSavedFinding(r.nlcId)
      if (existing) {
        await deleteFinding.mutateAsync(existing.id)
        toast({ title: 'Removed', description: `${r.fossittCode} removed from findings.` })
      } else {
        const pct = totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
        const geometry = getHabitatGeometry(r.nlcId)
        const distKm = calculateDistanceFromBoundary(
          geometry ?? undefined,
          projectBoundary ?? undefined
        )
        await createFinding.mutateAsync({
          project_id: project.id,
          site_id: siteId ?? null,
          created_by: userId,
          source: 'manual' as const,
          data_type: 'habitat' as const,
          include_in_report: true,
          title: `${r.fossittCode} — ${r.fossittName}`,
          content: aiSummaries[r.nlcId] || `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
          is_saved: true,
          notes: notes[r.nlcId] || null,
          location: toJson(geometry),
          distance_from_boundary_km: distKm ?? null,
          raw_data: toJson({
            habitatFinding: true,
            nlcId: r.nlcId,
            nlcLabel: r.nlcLabel,
            nlcLevel1: r.nlcLevel1,
            fossittCode: r.fossittCode,
            fossittName: r.fossittName,
            areaHectares: r.areaHectares,
            polygonCount: r.polygonCount,
            percentCover: pct,
            aiSummary: aiSummaries[r.nlcId] || null,
            bufferKm: selectedBuffer,
            distance_from_boundary_km: distKm ?? null,
          }),
        })
        toast({ title: 'Saved', description: `${r.fossittCode} saved to findings.` })
        // Auto-trigger AI summary if not already generated
        if (!aiSummaries[r.nlcId]) {
          fetchAiSummary(r)
        }
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save finding.' })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(r.nlcId)
        return next
      })
    }
  }

  // Save all unsaved habitats at once — uses filteredResults for site-scoped display
  const unsavedResults = React.useMemo(
    () => filteredResults.filter((r) => !getSavedFinding(r.nlcId)),
    [filteredResults, getSavedFinding]
  )
  const allSaved = filteredResults.length > 0 && unsavedResults.length === 0

  const handleSaveAll = async () => {
    if (unsavedResults.length === 0) return
    setIsSavingAll(true)
    let savedCount = 0
    try {
      for (const r of unsavedResults) {
        const pct = totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
        const geometry = getHabitatGeometry(r.nlcId)
        const distKm = calculateDistanceFromBoundary(
          geometry ?? undefined,
          projectBoundary ?? undefined
        )
        await createFinding.mutateAsync({
          project_id: project.id,
          site_id: siteId ?? null,
          created_by: userId,
          source: 'manual' as const,
          data_type: 'habitat' as const,
          include_in_report: true,
          title: `${r.fossittCode} — ${r.fossittName}`,
          content: aiSummaries[r.nlcId] || `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
          is_saved: true,
          notes: notes[r.nlcId] || null,
          location: toJson(geometry),
          distance_from_boundary_km: distKm ?? null,
          raw_data: toJson({
            habitatFinding: true,
            nlcId: r.nlcId,
            nlcLabel: r.nlcLabel,
            nlcLevel1: r.nlcLevel1,
            fossittCode: r.fossittCode,
            fossittName: r.fossittName,
            areaHectares: r.areaHectares,
            polygonCount: r.polygonCount,
            percentCover: pct,
            aiSummary: aiSummaries[r.nlcId] || null,
            bufferKm: selectedBuffer,
            distance_from_boundary_km: distKm ?? null,
          }),
        })
        savedCount++
        // Trigger AI summary for each
        if (!aiSummaries[r.nlcId]) {
          fetchAiSummary(r)
        }
      }
      toast({
        title: 'All habitats saved',
        description: `${savedCount} habitat${savedCount > 1 ? 's' : ''} saved to findings.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Saved ${savedCount} of ${unsavedResults.length}. Some failed.`,
      })
    } finally {
      setIsSavingAll(false)
    }
  }

  if (!projectBoundary) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No project boundary defined. Please complete Step 1 (GIS Mapping) first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4 text-green-600" />
            Habitat Data (NLC 2018)
          </h3>
          <div className="flex items-center gap-2">
            <Select
              value={selectedBuffer.toString()}
              onValueChange={(v) => setSelectedBuffer(parseFloat(v))}
            >
              <SelectTrigger className="w-30">
                <SelectValue placeholder="Buffer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Boundary only</SelectItem>
                <SelectItem value="0.1">100m</SelectItem>
                {(bufferDistances.length > 0 ? bufferDistances : [2, 5])
                  .filter((d) => d !== 0 && d !== 0.1)
                  .map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} km
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={performSearch}
              disabled={isSearching}
              className="flex-1 border-green-300 text-green-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Habitats
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-hidden">
          {filteredResults.length === 0 && !isSearching ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Layers className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-muted-foreground">Search to find habitat data</p>
            </div>
          ) : isSearching ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">{filteredResults.length} habitat types</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {filteredTotalArea.toLocaleString()} ha
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveAll}
                    disabled={isSavingAll || allSaved}
                    className="h-7 gap-1 text-xs text-emerald-600"
                  >
                    {isSavingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : allSaved ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <CheckCheck className="h-3 w-3" />
                    )}
                    {isSavingAll ? 'Saving...' : allSaved ? 'All Saved' : 'Save All'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateOverallAnalysis}
                    disabled={isOverallLoading}
                    className="h-7 gap-1 text-xs text-purple-600"
                  >
                    {isOverallLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {overallAi ? 'Regenerate' : 'AI Analysis'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 p-2">
                  {filteredResults.map((r) => {
                    const pct =
                      filteredTotalArea > 0
                        ? ((r.areaHectares / filteredTotalArea) * 100).toFixed(1)
                        : '0'
                    const color = NLC_LEVEL1_COLORS[r.nlcLevel1] || '#22c55e'
                    const isSelected = selectedHabitat?.nlcId === r.nlcId
                    const summary = aiSummaries[r.nlcId]
                    const isSummaryLoading = loadingSummaries.has(r.nlcId)
                    const note = notes[r.nlcId]
                    const isEditingNote = editingNoteId === r.nlcId
                    const isSaved = !!getSavedFinding(r.nlcId)
                    const isSaving = savingIds.has(r.nlcId)

                    return (
                      <div
                        key={r.nlcId}
                        className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
                          isSelected
                            ? 'border border-blue-400 bg-blue-50 ring-2 ring-blue-400 dark:border-blue-500 dark:bg-blue-950'
                            : isSaved
                              ? 'border-t border-r border-b border-l-4 border-gray-200 border-l-emerald-500 bg-emerald-50/60 dark:border-gray-700 dark:border-l-emerald-500 dark:bg-emerald-950/40'
                              : 'border hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleRowClick(r)}
                      >
                        {/* Title + save button row */}
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-3.5 w-3.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: color }}
                              />
                              <h4 className="line-clamp-2 text-sm leading-tight font-medium">
                                {r.fossittName}
                              </h4>
                            </div>
                          </div>
                          <button
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                              isSaved
                                ? 'text-emerald-600 hover:text-emerald-700'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                            }`}
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSave(r)
                            }}
                            title={isSaved ? 'Remove from saved' : 'Save finding'}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isSaved ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* AI Summary */}
                        <div className="mt-1.5">
                          {summary ? (
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              {summary}
                            </p>
                          ) : isSummaryLoading ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-purple-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Generating summary...
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                fetchAiSummary(r)
                              }}
                            >
                              <Sparkles className="h-3 w-3" />
                              AI Summary
                            </button>
                          )}
                        </div>

                        {/* Note display */}
                        {note && !isEditingNote && (
                          <div className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                            <p className="text-[11px] leading-relaxed text-amber-900">
                              <MessageSquare className="mr-1 inline h-3 w-3 text-amber-500" />
                              {note}
                            </p>
                          </div>
                        )}

                        {/* Badges row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                            {r.fossittCode}
                          </Badge>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {r.nlcLabel}
                          </Badge>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {r.areaHectares.toLocaleString()} ha ({pct}%)
                          </Badge>
                        </div>

                        {/* Action links row */}
                        <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                          <button
                            className="flex items-center gap-1 font-medium text-purple-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeepResearch(r)
                            }}
                          >
                            <FlaskConical className="h-3 w-3" />
                            Deep Research
                          </button>
                          <button
                            className={`flex items-center gap-1 hover:underline ${note ? 'text-amber-600' : 'text-gray-500'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isEditingNote) {
                                setEditingNoteId(null)
                              } else {
                                startEditNote(r.nlcId)
                              }
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                            {isEditingNote ? 'Close Note' : note ? 'Edit Note' : 'Add Note'}
                          </button>
                        </div>

                        {/* Note edit area */}
                        {isEditingNote && (
                          <div className="mt-1.5 space-y-1.5">
                            <textarea
                              autoFocus
                              rows={3}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Add a note about this finding..."
                              className="w-full rounded border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                className="flex h-6 items-center gap-1 rounded bg-amber-500 px-2 text-[11px] font-medium text-white hover:bg-amber-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  saveNote(r.nlcId)
                                }}
                              >
                                <Check className="h-3 w-3" />
                                Save
                              </button>
                              <button
                                className="flex h-6 items-center gap-1 rounded px-2 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingNoteId(null)
                                }}
                              >
                                <span className="text-[11px]">×</span>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Overall AI Analysis */}
                {overallAi && (
                  <div className="border-t p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">
                        Overall Habitat Analysis
                      </span>
                    </div>
                    <MarkdownContent text={overallAi} />
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Map — only render when active to avoid Leaflet container conflicts */}
      {showMap && isActive && (
        <div className="relative flex-1">
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={11}
            boundary={projectBoundary}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            bufferDistances={[selectedBuffer]}
            habitatPolygons={styledPolygons}
            habitatSelectionKey={selectedHabitat?.nlcId || 'all'}
            findings={[]}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-1000"
            onClick={onToggleMap}
            data-map-control="true"
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide Map
          </Button>
        </div>
      )}

      {(!showMap || !isActive) && (
        <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}

      {/* Deep Research Modal */}
      <HabitatDeepResearchModal
        open={isDeepResearchOpen}
        onOpenChange={setIsDeepResearchOpen}
        site={
          deepResearchSite
            ? {
                ...deepResearchSite,
                percentCover:
                  filteredTotalArea > 0
                    ? ((deepResearchSite.areaHectares / filteredTotalArea) * 100).toFixed(1)
                    : '0',
              }
            : null
        }
        projectName={project.name}
        bufferKm={selectedBuffer}
        onSaveAnalysis={async (data) => {
          if (deepResearchSite) {
            const r = deepResearchSite
            const existing = getSavedFinding(r.nlcId)
            if (existing) {
              // Update existing finding with deep research
              const existingRaw = (existing.raw_data as Record<string, unknown>) || {}
              updateFinding.mutate({
                findingId: existing.id,
                updates: {
                  raw_data: toJson({
                    ...existingRaw,
                    deepResearch: { aiAnalysis: data.aiAnalysis },
                  }),
                },
              })
            } else {
              // Auto-save finding with deep research (card not saved yet)
              const pct = totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
              await createFinding.mutateAsync({
                project_id: project.id,
                site_id: siteId ?? null,
                created_by: userId,
                source: 'manual' as const,
                data_type: 'habitat' as const,
                include_in_report: true,
                title: `${r.fossittCode} — ${r.fossittName}`,
                content:
                  aiSummaries[r.nlcId] || `${r.fossittName} (${r.areaHectares} ha, ${pct}% cover)`,
                is_saved: true,
                notes: notes[r.nlcId] || null,
                raw_data: toJson({
                  habitatFinding: true,
                  nlcId: r.nlcId,
                  nlcLabel: r.nlcLabel,
                  nlcLevel1: r.nlcLevel1,
                  fossittCode: r.fossittCode,
                  fossittName: r.fossittName,
                  areaHectares: r.areaHectares,
                  polygonCount: r.polygonCount,
                  percentCover: pct,
                  aiSummary: aiSummaries[r.nlcId] || null,
                  bufferKm: selectedBuffer,
                  deepResearch: { aiAnalysis: data.aiAnalysis },
                }),
              })
            }
            // Auto-trigger short AI summary if not already generated
            if (!aiSummaries[r.nlcId]) {
              const habitat = results.find((h) => h.nlcId === r.nlcId)
              if (habitat) fetchAiSummary(habitat)
            }
          }
        }}
      />
    </div>
  )
}
