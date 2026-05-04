'use client'

import * as React from 'react'

import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { getHeritageColor } from '@/lib/config/map-constants'
import { mapFossittToNlcLabel } from '@/lib/data/nlc-to-fossitt'
import type { DeskResearchFinding, HabitatPolygon } from '@/types/database'
import type { FindingMarker, HabitatPolygonOverlay } from '@/components/maps/map-types'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

interface UseHabitatMapDataParams {
  habitats: HabitatPolygon[]
  savedFindings: DeskResearchFinding[]
  selectedSite: ProjectSiteWithGeoJSON | null
}

export function useHabitatMapData({
  habitats,
  savedFindings,
  selectedSite,
}: UseHabitatMapDataParams) {
  // Visibility toggles for finding groups on the map.
  // 'habitats' is the drawn habitat_polygons layer — ON by default since
  // this is the primary object in Step 5. Others match the Review & Export
  // pill set so the two maps share vocabulary.
  const [visibleFindingGroups, setVisibleFindingGroups] = React.useState<Set<string>>(
    () => new Set(['designated_site', 'species_record', 'aquatic', 'habitats'])
  )

  const toggleFindingGroup = React.useCallback((group: string) => {
    setVisibleFindingGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  // Filter habitats by selected site — site_id=null means project-level
  const filteredHabitats = React.useMemo(() => {
    if (!selectedSite) return habitats
    return habitats.filter((h) => h.site_id === selectedSite.id || h.site_id === null)
  }, [habitats, selectedSite])

  // Convert findings to map markers (filtered by visibility toggles)
  const findingMarkers: FindingMarker[] = React.useMemo(() => {
    return savedFindings
      .filter((f) => {
        if (!f.location) return false
        const group =
          f.data_type === 'water_quality' || f.data_type === 'catchment' ? 'aquatic' : f.data_type
        return visibleFindingGroups.has(group)
      })
      .map((f) => ({
        id: f.id,
        title: f.title,
        dataType: f.data_type,
        location: f.location as { coordinates: [number, number] } | null,
        isProtected: f.is_protected ?? undefined,
        source: f.source,
      }))
  }, [savedFindings, visibleFindingGroups])

  // NPWS layers to show on map when designated sites are visible
  const npwsVisibleLayers = React.useMemo(() => {
    if (!visibleFindingGroups.has('designated_site')) return []
    return ['sac', 'spa', 'nha', 'pnha']
  }, [visibleFindingGroups])

  // Convert saved habitats to map overlay format. FOSSITT Level-1 'F' =
  // freshwater habitats (FL Lakes, FW Watercourses, FP Ponds, etc.) —
  // route those through the Aquatic pill so water features stay grouped.
  // All other FOSSITT prefixes follow the Habitats pill.
  const habitatPolygonOverlays: HabitatPolygonOverlay[] = React.useMemo(() => {
    const aquaticOn = visibleFindingGroups.has('aquatic')
    const habitatsOn = visibleFindingGroups.has('habitats')
    return filteredHabitats
      .filter((h) => h.boundary != null)
      .filter((h) => {
        const isAquaticHabitat = h.fossitt_code?.toUpperCase().startsWith('F')
        return isAquaticHabitat ? aquaticOn : habitatsOn
      })
      .map((h) => {
        const fossittInfo = getHabitatByCode(h.fossitt_code)
        return {
          id: h.id,
          geometry: h.boundary as GeoJSON.Geometry,
          fossittCode: h.fossitt_code,
          fossittName: h.fossitt_name,
          condition: h.condition,
          color: getHeritageColor(h.fossitt_code),
          // Derive NLC Level 2 label from FOSSITT code so the NLC palette
          // toggle works on saved habitats too — at every zoom, not just
          // when the viewport detail layer kicks in at z16+. Approximate
          // for ambiguous FOSSITT codes (one representative per code).
          nlcLabel: mapFossittToNlcLabel(h.fossitt_code),
        }
      })
  }, [filteredHabitats, visibleFindingGroups])

  // Fly-to state for clicking a finding
  const [flyToLocation, setFlyToLocation] = React.useState<{
    center: [number, number]
    zoom: number
    key: string
  } | null>(null)

  const handleFindingClick = React.useCallback((finding: DeskResearchFinding) => {
    const location = finding.location as { coordinates: [number, number] } | null
    if (
      location?.coordinates &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length >= 2
    ) {
      const lng = Number(location.coordinates[0])
      const lat = Number(location.coordinates[1])
      if (!isNaN(lat) && !isNaN(lng)) {
        setFlyToLocation({
          center: [lat, lng],
          zoom: 15,
          key: `finding-${finding.id}-${Date.now()}`,
        })
      }
    }
  }, [])

  // Handle clicking a habitat polygon on the map
  const handleHabitatMapClick = React.useCallback(
    (id: string) => habitats.find((h) => h.id === id) ?? null,
    [habitats]
  )

  return {
    visibleFindingGroups,
    toggleFindingGroup,
    filteredHabitats,
    findingMarkers,
    npwsVisibleLayers,
    habitatPolygonOverlays,
    flyToLocation,
    handleFindingClick,
    handleHabitatMapClick,
  }
}
