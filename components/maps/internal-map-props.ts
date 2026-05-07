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
  /** When true, NLC viewport detail layer (z16+) renders polygons with NLC's
   * native palette instead of the Heritage Council colours. */
  useNativeColors?: boolean
  /** When true, render Heritage Council Appendix 6 hatch patterns on top of
   * habitat fills (NLC viewport detail + user-drawn polygons). */
  useHatchPatterns?: boolean
  /** Bubbled up from ViewportHabitatDetail.onActiveChange so the wrapper can
   * conditionally render the Hatch toggle in the toolbar. */
  onViewportDetailActiveChange?: (active: boolean) => void
  /** FOSSITT code of the currently selected habitat — used at high zoom to
   * highlight matching NLC parcels in the viewport detail layer. Without
   * this, only the coarse saved boundary highlighted while the crisp NLC
   * parcels stayed unchanged. */
  selectedHabitatFossittCode?: string | null
  /** Fired on a map click that did NOT hit a habitat polygon. */
  onMapClick?: () => void
  /** When true, mount the high-zoom NLC ViewportHabitatDetail layer that
   * refetches the current viewport at sub-meter tolerance once the user
   * crosses z16. Off by default so habitat-irrelevant screens (Step 1 GIS
   * Mapping, target notes, designated sites, etc.) don't flash habitat
   * polygons over satellite imagery. Habitat-focused screens opt in. */
  enableHabitatViewportDetail?: boolean
}
