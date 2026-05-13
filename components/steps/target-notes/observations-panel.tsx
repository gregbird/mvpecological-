'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Download, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IRELAND_CENTER, getHeritageColor } from '@/lib/config/map-constants'
import {
  MapFindingGroupToggle,
  type FindingGroupKey,
} from '@/components/maps/map-finding-group-toggle'
import type { DeskResearchFinding as MapFinding } from '@/components/desk-research/finding-card'
import { ObservationListItem, TAXON_LABELS } from './observation-list-item'
import type { DeskResearchFinding, HabitatPolygon, SpeciesObservation } from '@/types/database'

// Dynamic import for map
const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-100 items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface Survey {
  id: string
  survey_type: string
  survey_date: string
  visit_group_id?: string | null
  visit_number?: number | null
}

interface ObservationsPanelProps {
  surveys: Survey[]
  filteredObservations: SpeciesObservation[]
  observationsByTaxon: Record<string, SpeciesObservation[]>
  activeTab: string
  onActiveTabChange: (tab: string) => void
  selectedObservation: SpeciesObservation | null
  onSelectObservation: (observation: SpeciesObservation) => void
  onEditObservation: (observation: SpeciesObservation) => void
  onDeleteObservation: (observation: SpeciesObservation) => void
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  /** Buffer distances (km) resolved from the project / selected site */
  bufferDistances?: number[]
  /** Habitats overlay — driven by the Habitats / Aquatic pills */
  habitats?: HabitatPolygon[]
  /** Desk-research findings — driven by the Sites / Aquatic pills */
  savedFindings?: DeskResearchFinding[]
  /** Project-bbox live NLC parcels — when provided, the Habitats / Aquatic
   * overlay uses these (parcel-level detail at every zoom) instead of the
   * merged DB geometry which loses individual parcel boundaries. */
  nlcReferencePolygons?: GeoJSON.FeatureCollection | null
  /** Called when the user clicks the panel's Add Observation button */
  onAddObservation?: () => void
  /** Disable Add Observation button (no survey, no site, etc.) */
  addObservationDisabled?: boolean
  /** Tooltip reason when Add Observation is disabled */
  addObservationDisabledReason?: string
  /** Called when the user clicks Import from Data Gathering */
  onImportSpecies?: () => void
  /** Count of importable species (used to show badge on import button) */
  importableCount?: number
  /** Whether the import is currently running */
  isImporting?: boolean
}

export function ObservationsPanel({
  surveys,
  filteredObservations,
  observationsByTaxon,
  activeTab,
  onActiveTabChange,
  selectedObservation,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  projectBoundary,
  projectCenter,
  bufferDistances,
  habitats = [],
  savedFindings = [],
  nlcReferencePolygons = null,
  onAddObservation,
  addObservationDisabled = false,
  addObservationDisabledReason,
  onImportSpecies,
  importableCount = 0,
  isImporting = false,
}: ObservationsPanelProps) {
  // Same Sites/Aquatic/Habitats overlay vocabulary as the Target Notes
  // panel and Habitat Mapping step.
  const [visibleGroups, setVisibleGroups] = React.useState<Set<string>>(
    () => new Set(['designated_site', 'aquatic', 'habitats'])
  )
  const toggleGroup = React.useCallback((group: FindingGroupKey) => {
    setVisibleGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  const filteredFindings = React.useMemo<MapFinding[]>(() => {
    return savedFindings
      .filter((f) => {
        if (!f.location) return false
        const group =
          f.data_type === 'water_quality' || f.data_type === 'catchment'
            ? 'aquatic'
            : f.data_type === 'designated_site'
              ? 'designated_site'
              : null
        return group ? visibleGroups.has(group) : false
      })
      .map((f) => ({
        id: f.id,
        source: f.source,
        dataType: f.data_type,
        title: f.title,
        content: f.content || undefined,
        location: f.location as GeoJSON.Geometry | undefined,
        isSaved: true,
      }))
  }, [savedFindings, visibleGroups])

  const npwsVisibleLayers = React.useMemo<string[]>(
    () => (visibleGroups.has('designated_site') ? ['sac', 'spa', 'nha', 'pnha'] : []),
    [visibleGroups]
  )

  // Live NLC parcels (parcel-level detail) preferred over merged DB rows
  // — same rationale as TargetNotesPanel.
  const habitatGeoJson = React.useMemo<GeoJSON.FeatureCollection | undefined>(() => {
    const aquaticOn = visibleGroups.has('aquatic')
    const habitatsOn = visibleGroups.has('habitats')
    if (!aquaticOn && !habitatsOn) return undefined

    if (nlcReferencePolygons && nlcReferencePolygons.features.length > 0) {
      const filtered = nlcReferencePolygons.features.filter((f) => {
        const code = String(f.properties?.fossitt_code || '')
        const isAquaticHabitat = code.toUpperCase().startsWith('F')
        return isAquaticHabitat ? aquaticOn : habitatsOn
      })
      return filtered.length > 0 ? { type: 'FeatureCollection', features: filtered } : undefined
    }

    const features = habitats
      .filter((h) => h.boundary != null)
      .filter((h) => {
        const isAquaticHabitat = h.fossitt_code?.toUpperCase().startsWith('F')
        return isAquaticHabitat ? aquaticOn : habitatsOn
      })
      .map((h) => ({
        type: 'Feature' as const,
        properties: {
          id: h.id,
          fossitt_code: h.fossitt_code,
          fossitt_name: h.fossitt_name,
          condition: h.condition,
          color: getHeritageColor(h.fossitt_code),
          area_hectares: h.area_hectares ?? 0,
          is_label_anchor: false,
        },
        geometry: h.boundary as GeoJSON.Geometry,
      }))
    const largest = new Map<string, number>()
    features.forEach((f, i) => {
      const code = String(f.properties.fossitt_code || '')
      if (!code) return
      const area = Number(f.properties.area_hectares || 0)
      const cur = largest.get(code)
      if (cur === undefined || area > Number(features[cur].properties.area_hectares || 0)) {
        largest.set(code, i)
      }
    })
    largest.forEach((i) => {
      features[i].properties.is_label_anchor = true
    })
    return features.length > 0 ? { type: 'FeatureCollection', features } : undefined
  }, [habitats, visibleGroups, nlcReferencePolygons])

  return (
    <div className="flex h-full flex-col">
      {surveys.length === 0 ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Surveys Available</AlertTitle>
          <AlertDescription>
            Create a survey in the Field Survey tab before adding species observations. Each
            observation must be linked to a survey.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Survey filter now lives in the step toolbar next to SiteSelector
          so the panel area stays fully dedicated to list + map. */}

      {/* Observations Content — side-by-side: list left, map right */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* Observation List — left column (matches Habitat Mapping structure) */}
        <Card className="flex h-[440px] shrink-0 flex-col lg:order-1 lg:h-full lg:w-[500px]">
          <Tabs
            value={activeTab}
            onValueChange={onActiveTabChange}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center gap-2 px-3 pt-3">
              <TabsList className="flex h-auto shrink-0 flex-wrap gap-1">
                <TabsTrigger value="all" className="text-xs">
                  All ({filteredObservations.length})
                </TabsTrigger>
                {Object.entries(observationsByTaxon)
                  .slice(0, 4)
                  .map(([taxon, obs]) => (
                    <TabsTrigger key={taxon} value={taxon} className="text-xs">
                      {TAXON_LABELS[taxon] || taxon} ({obs.length})
                    </TabsTrigger>
                  ))}
              </TabsList>
              <div className="ml-auto flex items-center gap-1.5">
                {onImportSpecies && importableCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onImportSpecies}
                    disabled={isImporting || addObservationDisabled}
                    title="Import species records from Data Gathering"
                  >
                    {isImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1 text-xs">{importableCount}</span>
                  </Button>
                )}
                {onAddObservation && (
                  <span
                    className="inline-block shrink-0"
                    title={
                      addObservationDisabled ? addObservationDisabledReason : 'Add observation'
                    }
                  >
                    <Button
                      size="icon"
                      onClick={onAddObservation}
                      disabled={addObservationDisabled}
                      aria-label="Add observation"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 px-3 pb-3">
              <TabsContent value="all" className="mt-3 h-full min-h-0 overflow-auto">
                {filteredObservations.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No observations yet. Click &quot;Add Observation&quot; to record species
                    sightings.
                  </div>
                ) : (
                  <div className="space-y-2 pr-1">
                    {filteredObservations.map((obs) => (
                      <ObservationListItem
                        key={obs.id}
                        observation={obs}
                        isSelected={selectedObservation?.id === obs.id}
                        onSelect={() => onSelectObservation(obs)}
                        onEdit={() => onEditObservation(obs)}
                        onDelete={() => onDeleteObservation(obs)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {Object.entries(observationsByTaxon).map(([taxon, taxonObs]) => (
                <TabsContent
                  key={taxon}
                  value={taxon}
                  className="mt-3 h-full min-h-0 overflow-auto"
                >
                  <div className="space-y-2 pr-1">
                    {taxonObs.map((obs) => (
                      <ObservationListItem
                        key={obs.id}
                        observation={obs}
                        isSelected={selectedObservation?.id === obs.id}
                        onSelect={() => onSelectObservation(obs)}
                        onEdit={() => onEditObservation(obs)}
                        onDelete={() => onDeleteObservation(obs)}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </Card>

        {/* Map — right column (no Card wrapper) */}
        <div className="relative h-[62vh] min-h-[440px] shrink-0 overflow-hidden rounded-lg border lg:order-2 lg:h-full lg:min-h-0 lg:flex-1">
          <MapFindingGroupToggle visibleGroups={visibleGroups} onToggle={toggleGroup} />
          <DynamicProjectMap
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={projectCenter ? 14 : 7}
            boundary={projectBoundary}
            bufferDistances={bufferDistances}
            habitatPolygons={habitatGeoJson}
            findings={filteredFindings}
            npwsVisibleLayers={npwsVisibleLayers}
            observationPoints={{
              type: 'FeatureCollection',
              features: filteredObservations
                .filter((o) => o.location)
                .map((o) => ({
                  type: 'Feature' as const,
                  geometry: o.location as GeoJSON.Point,
                  properties: {
                    id: o.id,
                    name: o.species_name_common || o.species_name_scientific,
                    isProtected: o.is_protected || false,
                  },
                })),
            }}
          />
        </div>
      </div>
    </div>
  )
}
