'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IRELAND_CENTER, getHeritageColor } from '@/lib/config/map-constants'
import { TargetNoteCard, TARGET_NOTE_CATEGORIES } from '@/components/field-surveys/target-note-card'
import {
  MapFindingGroupToggle,
  type FindingGroupKey,
} from '@/components/maps/map-finding-group-toggle'
import type { DeskResearchFinding as MapFinding } from '@/components/desk-research/finding-card'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import type { DeskResearchFinding, HabitatPolygon } from '@/types/database'

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

interface TargetNotesPanelProps {
  targetNotes: TargetNoteWithCreator[]
  targetNotesByCategory: Record<string, TargetNoteWithCreator[]>
  selectedTargetNote: TargetNoteWithCreator | null
  activeCategoryTab: string
  onCategoryTabChange: (tab: string) => void
  onSelectNote: (note: TargetNoteWithCreator) => void
  onEditNote: (note: TargetNoteWithCreator) => void
  onDeleteNote: (note: TargetNoteWithCreator) => void
  onVerifyNote: (note: TargetNoteWithCreator) => void
  onMapClick: (latlng: { lat: number; lng: number } | undefined) => void
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
  /** When true, map clicks won't open the new-note dialog (multi-site, no site picked) */
  addDisabled?: boolean
  /** Called when the user clicks the panel's Add Note button */
  onAddNote?: () => void
}

export function TargetNotesPanel({
  targetNotes,
  targetNotesByCategory,
  selectedTargetNote,
  activeCategoryTab,
  onCategoryTabChange,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onVerifyNote,
  onMapClick,
  projectBoundary,
  projectCenter,
  bufferDistances,
  habitats = [],
  savedFindings = [],
  nlcReferencePolygons = null,
  addDisabled = false,
  onAddNote,
}: TargetNotesPanelProps) {
  // Shared overlay vocabulary with Habitat Mapping — Sites (NPWS designated),
  // Aquatic (water-quality / catchments / freshwater FOSSITT habitats),
  // Habitats (terrestrial FOSSITT habitats). All ON by default so target
  // notes always land on the same map context the ecologist saw upstream.
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

  // Findings filtered by the pill toggles + mapped from the DB shape
  // (snake_case) to the UI shape consumed by ProjectMap. water_quality and
  // catchment route to the Aquatic pill; designated sites keep their own
  // group. Species records have no markers (handled via grid overlays).
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

  // FOSSITT Level-1 'F' (FL/FW/FP — freshwater) routes through Aquatic.
  // Everything else follows Habitats. Built as a FeatureCollection so it
  // plugs straight into ProjectMap.habitatPolygons.
  //
  // Prefers live NLC parcels (parcel-level detail, every zoom) over the
  // saved DB rows. The DB version merges all parcels per FOSSITT code into
  // a single MultiPolygon which renders as a coarse blob at low zoom.
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

    // Fallback: saved DB habitats when NLC hasn't loaded yet.
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
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* Target Notes List — left column (matches Habitat Mapping list structure) */}
      <Card className="flex h-[440px] shrink-0 flex-col lg:order-1 lg:h-full lg:w-[500px]">
        <Tabs
          value={activeCategoryTab}
          onValueChange={onCategoryTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-center gap-2 px-3 pt-3">
            <TabsList className="flex h-auto shrink-0 flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs">
                All ({targetNotes.length})
              </TabsTrigger>
              {Object.entries(TARGET_NOTE_CATEGORIES)
                .filter(([key]) => targetNotesByCategory[key]?.length)
                .slice(0, 4)
                .map(([key, config]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {config.label} ({targetNotesByCategory[key]?.length || 0})
                  </TabsTrigger>
                ))}
            </TabsList>
            {onAddNote && (
              <span
                className="ml-auto inline-block shrink-0"
                title={addDisabled ? 'Select a site first to add a note.' : 'Add note'}
              >
                <Button
                  size="icon"
                  onClick={onAddNote}
                  disabled={addDisabled}
                  aria-label="Add note"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 px-3 pb-3">
            <TabsContent value="all" className="mt-3 h-full min-h-0 overflow-auto">
              {targetNotes.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No target notes yet. Click &quot;Add Note&quot; or tap the map to create one.
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {targetNotes.map((note) => (
                    <TargetNoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedTargetNote?.id === note.id}
                      onSelect={() => onSelectNote(note)}
                      onEdit={() => onEditNote(note)}
                      onDelete={() => onDeleteNote(note)}
                      onVerify={() => onVerifyNote(note)}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {Object.entries(targetNotesByCategory).map(([category, notes]) => (
              <TabsContent
                key={category}
                value={category}
                className="mt-3 h-full min-h-0 overflow-auto"
              >
                <div className="space-y-2 pr-1">
                  {notes.map((note) => (
                    <TargetNoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedTargetNote?.id === note.id}
                      onSelect={() => onSelectNote(note)}
                      onEdit={() => onEditNote(note)}
                      onDelete={() => onDeleteNote(note)}
                      onVerify={() => onVerifyNote(note)}
                      compact
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </Card>

      {/* Map — right column (no Card wrapper so it matches habitat-mapping-step) */}
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
          targetNotes={targetNotes.map((n) => ({
            id: n.id,
            category: n.category,
            title: n.title,
            description: n.description,
            priority: n.priority,
            isVerified: n.is_verified,
            location: n.location as { coordinates: [number, number] } | null,
          }))}
          selectedTargetNote={
            selectedTargetNote
              ? {
                  id: selectedTargetNote.id,
                  category: selectedTargetNote.category,
                  title: selectedTargetNote.title,
                  description: selectedTargetNote.description,
                  priority: selectedTargetNote.priority,
                  isVerified: selectedTargetNote.is_verified,
                  location: selectedTargetNote.location as {
                    coordinates: [number, number]
                  } | null,
                }
              : null
          }
          onTargetNoteClick={(note) => {
            const found = targetNotes.find((t) => t.id === note.id)
            if (found) onSelectNote(found)
          }}
          onMapClick={(latlng) => {
            if (addDisabled) return
            if (latlng) {
              onMapClick(latlng)
            }
          }}
        />
      </div>
    </div>
  )
}
