'use client'

import * as React from 'react'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

interface DataGatheringContextValue {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  selectedSite: ProjectSiteWithGeoJSON | null
  effectiveSiteId: string | null
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  savedFindings: DeskResearchFinding[]
  userId: string
  showMap: boolean
  onToggleMap: () => void
}

const DataGatheringContext = React.createContext<DataGatheringContextValue | null>(null)

export function DataGatheringProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: DataGatheringContextValue
}) {
  return <DataGatheringContext.Provider value={value}>{children}</DataGatheringContext.Provider>
}

export function useDataGatheringContext(): DataGatheringContextValue {
  const context = React.useContext(DataGatheringContext)
  if (!context) {
    throw new Error('useDataGatheringContext must be used within a DataGatheringProvider')
  }
  return context
}
