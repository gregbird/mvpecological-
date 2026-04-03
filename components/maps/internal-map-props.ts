import type { Map as LeafletMap } from 'leaflet'
import type { MapStyle } from '@/lib/config/map-constants'
import type {
  FindingMarker,
  HabitatPolygonOverlay,
  BufferColorConfig,
} from '@/components/maps/map-types'

/** Props for the internal MapComponentWithDraw (rendered client-side via dynamic import) */
export interface InternalMapProps {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  currentStyle: MapStyle
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
  onViewChange?: (center: [number, number], zoom: number) => void
  editable: boolean
  mapRef: React.MutableRefObject<LeafletMap | null>
  countiesData?: GeoJSON.FeatureCollection | null
  showCounties?: boolean
  townlandsData?: GeoJSON.FeatureCollection | null
  showTownlands?: boolean
  currentZoom?: number
  onZoomChange?: (
    zoom: number,
    bounds?: { west: number; south: number; east: number; north: number }
  ) => void
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  findings?: FindingMarker[]
  onFindingClick?: (finding: FindingMarker) => void
  habitatPolygons?: HabitatPolygonOverlay[]
  selectedHabitatId?: string
  onHabitatClick?: (id: string) => void
  allowMultipleDrawings?: boolean
  onMapReady?: (map: LeafletMap) => void
  showBatRecords?: boolean
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
}
