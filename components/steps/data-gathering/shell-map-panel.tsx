'use client'

import * as React from 'react'
import { Eye, Grid3X3, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { MapCaptureButton } from '@/components/maps/map-capture-button'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import type {
  FindingSource,
  FindingType,
  DeskResearchFinding as MapFinding,
} from '@/components/desk-research/finding-card'
import type { FindingDisplay } from './findings-list'
import type { SubstepShellConfig } from './data-gathering-substep-shell'
import type { DeskResearchFinding } from '@/types/database'
import type { MapStepName } from '@/lib/map-screenshots/types'

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

interface ShellMapPanelProps {
  showMap: boolean
  onToggleMap: () => void
  projectCenter?: { lat: number; lng: number }
  projectBoundary: GeoJSON.Feature<GeoJSON.Polygon>
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  selectedBuffer: number
  gridOverlay?: GeoJSON.FeatureCollection
  computedGridOverlay?: GeoJSON.FeatureCollection
  config: Pick<
    SubstepShellConfig,
    | 'gridOverlay'
    | 'computeGridOverlay'
    | 'matchPredicate'
    | 'mapFindingsMapper'
    | 'mapSelectedMapper'
    | 'mapFindingsSavedFilter'
    | 'stepName'
  >
  projectId: string
  userId: string
  // Findings data
  displayFindings: FindingDisplay[]
  savedFindings: DeskResearchFinding[]
  hiddenIds: Set<string>
  showSavedOnMap: boolean
  selectedFinding: FindingDisplay | null
  searchResults: FindingDisplay[]
  onFindingClick: (finding: FindingDisplay | null) => void
  onMapClick: () => void
}

// Default mapper for map findings
function defaultMapFindingsMapper(
  f: FindingDisplay,
  savedFindings: DeskResearchFinding[],
  matchPredicate: (saved: DeskResearchFinding, result: FindingDisplay) => boolean
): MapFinding {
  return {
    id: f.id,
    source: f.source as FindingSource,
    dataType: f.dataType as FindingType,
    title: f.title,
    content: f.content,
    location: f.location,
    isSaved: savedFindings.some((sf) => matchPredicate(sf, f)),
  }
}

function defaultMapSelectedMapper(f: FindingDisplay): MapFinding {
  return {
    id: f.id,
    source: f.source as FindingSource,
    dataType: f.dataType as FindingType,
    title: f.title,
    content: f.content,
    location: f.location,
    isSaved: false,
  }
}

export function ShellMapPanel({
  showMap,
  onToggleMap,
  projectCenter,
  projectBoundary,
  otherBoundaries,
  allBoundaries,
  selectedBuffer,
  computedGridOverlay,
  config,
  projectId,
  userId,
  displayFindings,
  savedFindings,
  hiddenIds,
  showSavedOnMap,
  selectedFinding,
  searchResults,
  onFindingClick,
  onMapClick,
}: ShellMapPanelProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const [showGridOverlay, setShowGridOverlay] = React.useState(true)

  const savedFilter = config.mapFindingsSavedFilter
    ? (f: FindingDisplay) => config.mapFindingsSavedFilter!(f, savedFindings)
    : (f: FindingDisplay) => savedFindings.some((sf) => config.matchPredicate(sf, f))

  const mapFindingsMapper = config.mapFindingsMapper
    ? (f: FindingDisplay) => config.mapFindingsMapper!(f, savedFindings)
    : (f: FindingDisplay) => defaultMapFindingsMapper(f, savedFindings, config.matchPredicate)

  const mapSelectedMapper = config.mapSelectedMapper
    ? (f: FindingDisplay): MapFinding => config.mapSelectedMapper!(f)
    : defaultMapSelectedMapper

  if (!showMap) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Button variant="outline" onClick={onToggleMap}>
          <Eye className="mr-2 h-4 w-4" />
          Show Map
        </Button>
      </div>
    )
  }

  const activeGridOverlay = showGridOverlay
    ? (computedGridOverlay ?? config.gridOverlay)
    : undefined

  return (
    <div className="relative flex-1" ref={mapContainerRef}>
      <ProjectMap
        className="h-full"
        center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
        zoom={11}
        boundary={projectBoundary}
        otherBoundaries={otherBoundaries}
        allBoundaries={allBoundaries}
        bufferDistances={[selectedBuffer]}
        gridOverlay={activeGridOverlay}
        findings={displayFindings
          .filter((f) => !hiddenIds.has(f.id))
          .filter((f) => !showSavedOnMap || savedFilter(f))
          .map(mapFindingsMapper)}
        selectedFinding={selectedFinding ? mapSelectedMapper(selectedFinding) : undefined}
        onFindingClick={(f) => {
          const found = searchResults.find((r) => r.id === f.id) || null
          onFindingClick(found?.id === selectedFinding?.id ? null : found)
        }}
        onMapClick={onMapClick}
      />

      <div className="absolute top-4 right-4 z-1000 flex items-center gap-2">
        {(config.gridOverlay || config.computeGridOverlay) && (
          <Button
            variant="secondary"
            size="sm"
            className={`shadow-md ${showGridOverlay ? 'bg-purple-100 text-purple-700' : ''}`}
            onClick={() => setShowGridOverlay((prev) => !prev)}
            data-map-control="true"
          >
            <Grid3X3 className="mr-1 h-4 w-4" />
            {showGridOverlay ? 'Hide Grid' : 'Show Grid'}
          </Button>
        )}
        <MapCaptureButton
          containerRef={mapContainerRef}
          projectId={projectId}
          stepName={config.stepName as MapStepName}
          userId={userId}
          className="shadow-md"
        />
      </div>
    </div>
  )
}
