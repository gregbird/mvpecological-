'use client'

import * as React from 'react'
import { Loader2, Eye, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapCaptureButton } from '@/components/maps/map-capture-button'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { HabitatDeepResearchModal } from '@/components/desk-research/habitat-deep-research-modal'
import { HabitatResultsPanel } from '@/components/steps/data-gathering/habitat-results-panel'
import { useHabitatSearch } from '@/hooks/data-gathering/use-habitat-search'
import { useHabitatAutoSave } from '@/hooks/data-gathering/use-habitat-auto-save'
import { useHabitatAi } from '@/hooks/data-gathering/use-habitat-ai'
import { useHabitatSave } from '@/hooks/data-gathering/use-habitat-save'
import { useHabitatSpatialFilter } from '@/hooks/data-gathering/use-habitat-spatial-filter'
import type { Project, DeskResearchFinding, WorkflowStep, Json } from '@/types/database'

/** Single-step cast for Supabase Json columns — avoids double casts per CLAUDE.md rules */
export function toJson(value: Record<string, unknown> | GeoJSON.Geometry | null): Json {
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

export interface HabitatDataSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId?: string | null
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
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
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  // ── Search hook ──
  const {
    cacheKey,
    isSearching,
    results,
    habitatPolygons,
    selectedBuffer,
    setSelectedBuffer,
    performSearch,
  } = useHabitatSearch({
    projectId: project.id,
    projectBoundary,
    projectCenter,
    allBoundaries,
    bufferDistances,
    autoSearchTrigger,
    onAutoSearchComplete,
  })

  const totalArea = React.useMemo(
    () => Math.round(results.reduce((sum, r) => sum + r.areaHectares, 0) * 100) / 100,
    [results]
  )

  // ── Per-card state (sessionStorage) ──
  const [notes, setNotes] = useSessionStorage<Record<string, string>>(`${cacheKey}-notes`, {})
  const [selectedHabitat, setSelectedHabitat] = React.useState<HabitatResult | null>(null)
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null)
  const [noteDraft, setNoteDraft] = React.useState('')
  const [deepResearchSite, setDeepResearchSite] = React.useState<HabitatResult | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)

  // Persist notes to sessionStorage
  React.useEffect(() => {
    if (Object.keys(notes).length === 0) return
    try {
      sessionStorage.setItem(`${cacheKey}-notes`, JSON.stringify(notes))
    } catch {
      // noop
    }
  }, [notes, cacheKey])

  // ── Geometry helper ──
  const getHabitatGeometry = React.useCallback(
    (nlcId: string): GeoJSON.Geometry | null => {
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
    },
    [habitatPolygons]
  )

  // ── Project sites (for per-site save in "All Sites" mode) ──
  const { data: projectSites = [] } = useProjectSites(project.id)

  // ── Auto-save hook ──
  const { getSavedFinding, autoSaveTriggeredRef } = useHabitatAutoSave({
    results,
    habitatPolygons,
    isSearching,
    projectId: project.id,
    siteId,
    userId,
    projectBoundary,
    selectedBuffer,
    savedFindings,
    getHabitatGeometry,
    projectSites,
  })

  // ── AI hook ──
  const {
    aiSummaries,
    loadingSummaries,
    overallAi,
    isOverallLoading,
    fetchAiSummary,
    generateOverallAnalysis,
  } = useHabitatAi({
    cacheKey,
    results,
    totalArea,
    selectedBuffer,
    projectName: project.name,
    workflowStep,
    getSavedFinding,
  })

  // ── Save hook ──
  const { savingIds, isSavingAll, handleSave, handleSaveAll, handleSaveDeepResearch } =
    useHabitatSave({
      projectId: project.id,
      siteId,
      userId,
      totalArea,
      selectedBuffer,
      projectBoundary,
      aiSummaries,
      notes,
      getHabitatGeometry,
      getSavedFinding,
      fetchAiSummary,
      projectSites,
      habitatPolygons,
    })

  // ── Spatial filter ──
  const { filteredResults, filteredTotalArea, styledPolygons } = useHabitatSpatialFilter({
    results,
    habitatPolygons,
    selectedBuffer,
    selectedHabitat,
    siteId,
    projectBoundary,
    allBoundaries,
  })

  // Reset UI state when site changes
  const prevSiteIdRef = React.useRef(siteId)
  React.useEffect(() => {
    if (prevSiteIdRef.current !== siteId) {
      prevSiteIdRef.current = siteId
      setSelectedHabitat(null)
    }
  }, [siteId])

  // Leaflet resize on tab activation
  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // ── Unsaved results ──
  const unsavedResults = React.useMemo(
    () => filteredResults.filter((r) => !getSavedFinding(r.nlcId)),
    [filteredResults, getSavedFinding]
  )
  const allSaved = filteredResults.length > 0 && unsavedResults.length === 0

  // ── Early return: no boundary ──
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
      <HabitatResultsPanel
        filteredResults={filteredResults}
        filteredTotalArea={filteredTotalArea}
        isSearching={isSearching}
        selectedBuffer={selectedBuffer}
        bufferDistances={bufferDistances}
        selectedHabitat={selectedHabitat}
        overallAi={overallAi}
        isOverallLoading={isOverallLoading}
        isSavingAll={isSavingAll}
        allSaved={allSaved}
        aiSummaries={aiSummaries}
        loadingSummaries={loadingSummaries}
        notes={notes}
        editingNoteId={editingNoteId}
        noteDraft={noteDraft}
        savingIds={savingIds}
        onBufferChange={setSelectedBuffer}
        onSearch={() => {
          autoSaveTriggeredRef.current = false
          performSearch()
        }}
        onRowClick={(r) => setSelectedHabitat((prev) => (prev?.nlcId === r.nlcId ? null : r))}
        onSave={handleSave}
        onSaveAll={() => handleSaveAll(unsavedResults)}
        onGenerateOverall={generateOverallAnalysis}
        onFetchAiSummary={fetchAiSummary}
        onOpenDeepResearch={(r) => {
          setDeepResearchSite(r)
          setIsDeepResearchOpen(true)
        }}
        onStartEditNote={(nlcId) => {
          setEditingNoteId(nlcId)
          setNoteDraft(notes[nlcId] || '')
        }}
        onCloseEditNote={() => setEditingNoteId(null)}
        onNoteDraftChange={setNoteDraft}
        onSaveNote={(nlcId) => {
          setNotes((prev) => ({ ...prev, [nlcId]: noteDraft }))
          setEditingNoteId(null)
        }}
        getSavedFinding={getSavedFinding}
      />

      {/* Map — only render when active to avoid Leaflet container conflicts */}
      {showMap && isActive && (
        <div className="relative flex-1" ref={mapContainerRef}>
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={11}
            boundary={projectBoundary}
            otherBoundaries={otherBoundaries}
            allBoundaries={allBoundaries}
            bufferDistances={bufferDistances.length > 0 ? bufferDistances : [selectedBuffer]}
            habitatPolygons={styledPolygons}
            habitatSelectionKey={selectedHabitat?.nlcId || 'all'}
            findings={[]}
          />
          <div className="absolute top-4 right-4 z-1000 flex items-center gap-2">
            <MapCaptureButton
              containerRef={mapContainerRef}
              projectId={project.id}
              stepName="habitat_data"
              userId={userId}
              className="shadow-md"
            />
          </div>
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
        onSaveAnalysis={(data) =>
          deepResearchSite && handleSaveDeepResearch(deepResearchSite, data, results)
        }
      />
    </div>
  )
}
