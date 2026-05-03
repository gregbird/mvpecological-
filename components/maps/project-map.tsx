'use client'

import * as React from 'react'
import { Grid3x3, Maximize2, Minimize2, Palette } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap } from 'leaflet'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IRELAND_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '@/lib/config/map-constants'
import type { MapStyle } from '@/lib/config/map-constants'
import type { DeskResearchFinding } from '@/components/desk-research/finding-card'
import type { MapLayer, TargetNoteMarker } from '@/components/maps/map-types'
export type { MapStyle } from '@/lib/config/map-constants'
export type { MapLayer, TargetNoteMarker } from '@/components/maps/map-types'
import { MapLayersDropdown } from '@/components/maps/map-layers-dropdown'
import { MapControlSidebar } from '@/components/maps/map-control-sidebar'
import { BufferControl } from '@/components/maps/buffer-control'
import { ZoomControl } from '@/components/maps/zoom-control'
import { useVisibleBuffers } from '@/hooks/shared/use-visible-buffers'
import { FindingMarkers } from '@/components/maps/finding-markers'
import { MapController } from '@/components/maps/map-controller'
import { BufferZoneLayer } from '@/components/maps/buffer-zone-layer'
import { HabitatPolygonLayer } from '@/components/maps/habitat-polygon-layer'
import { NlcTileLayer } from '@/components/maps/nlc-tile-layer'
import { ViewportHabitatDetail } from '@/components/maps/viewport-habitat-detail'
import { TargetNoteMarkers } from '@/components/maps/target-note-markers'
import { ObservationMarkers } from '@/components/maps/observation-markers'
import {
  CountyLayer,
  TownlandLayer,
  GridOverlayLayer,
} from '@/components/maps/administrative-layers'
import { useCountyBoundaries } from '@/hooks/maps/use-county-boundaries'
import { useTownlandsLoader } from '@/hooks/maps/use-townlands-loader'

interface ProjectMapProps {
  className?: string
  center?: [number, number] // [lat, lng] for Leaflet
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  /** Other site boundaries to display as non-editable dimmed overlays */
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries — when provided, render buffers for every boundary (multi-site "All Sites" mode) */
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  bufferDistances?: number[] // Buffer zones in km to display
  habitatPolygons?: GeoJSON.FeatureCollection
  habitatSelectionKey?: string
  gridOverlay?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  targetNotes?: TargetNoteMarker[]
  selectedTargetNote?: TargetNoteMarker | null
  onTargetNoteClick?: (note: TargetNoteMarker) => void
  findings?: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  visibleFindingTypes?: string[]
  onFindingClick?: (finding: DeskResearchFinding) => void
  onMapClick?: (latlng?: { lat: number; lng: number }) => void
  onMapReady?: () => void
  showControls?: boolean
  skipFitBounds?: boolean
  /** NPWS designated site layers to show (e.g. ['sac', 'spa', 'nha', 'pnha']) */
  npwsVisibleLayers?: string[]
  /** Show NLC vector tile layer (whole-Ireland NLC 2018 land cover overlay) */
  showNlcOverlay?: boolean
}

/** Props for the inner MapComponent (adds runtime state that ProjectMap manages) */
type MapComponentProps = Omit<ProjectMapProps, 'className' | 'showControls'> & {
  center: [number, number]
  zoom: number
  currentStyle: MapStyle
  layers: MapLayer[]
  mapRef: React.MutableRefObject<LeafletMap | null>
  showBatRecords?: boolean
  iwebsVisibleLayers?: string[]
  /** When true, habitat polygons render with NLC's native palette instead
   * of the Heritage Council palette. Toggleable from the layers dropdown. */
  useNativeColors?: boolean
  /** When true, render Heritage Council Appendix 6 hatch patterns on top of
   * habitat fills. Only effective at viewport-detail zoom (z16+). */
  useHatchPatterns?: boolean
  /** Bubbled up from ViewportHabitatDetail.onActiveChange so the wrapper
   * can render the Hatch toggle only while viewport detail is active. */
  onViewportDetailActiveChange?: (active: boolean) => void
}

// Stable style objects / key derivation — declared at module scope so that
// Leaflet's layer diffing doesn't see a fresh reference on every parent
// re-render and rebuild GeoJSON layers.
const PRIMARY_BOUNDARY_STYLE = {
  color: '#ef4444',
  weight: 3,
  fillColor: '#ef4444',
  fillOpacity: 0.1,
} as const

const OTHER_BOUNDARY_STYLE = {
  color: '#94a3b8',
  weight: 2,
  fillColor: '#94a3b8',
  fillOpacity: 0.08,
  dashArray: '6, 4',
} as const

function boundaryCoordKey(feat: GeoJSON.Feature<GeoJSON.Polygon>): string {
  const ring = feat.geometry.coordinates[0]
  if (!ring || ring.length === 0) return 'empty'
  const first = ring[0]
  const last = ring[ring.length - 1]
  // First + last + length is enough to uniquely identify a polygon ring
  // without the O(N) cost of stringifying every coordinate.
  return `${first?.[0]?.toFixed(5)}_${first?.[1]?.toFixed(5)}_${last?.[0]?.toFixed(5)}_${last?.[1]?.toFixed(5)}_${ring.length}`
}

function MapComponent({
  center,
  zoom,
  boundary,
  otherBoundaries = [],
  allBoundaries,
  bufferDistances,
  habitatPolygons,
  habitatSelectionKey,
  observationPoints,
  targetNotes,
  selectedTargetNote,
  onTargetNoteClick,
  findings,
  selectedFinding,
  visibleFindingTypes,
  currentStyle,
  layers,
  onMapReady,
  onFindingClick,
  onMapClick,
  mapRef,
  showBatRecords,
  iwebsVisibleLayers,
  gridOverlay,
  skipFitBounds,
  npwsVisibleLayers,
  showNlcOverlay,
  useNativeColors = false,
  useHatchPatterns = false,
  onViewportDetailActiveChange,
}: MapComponentProps) {
  const mapInstanceId = React.useId()
  // Local mirror of viewport detail state for hiding the project habitat
  // layer at high zoom. Parent (ProjectMap wrapper) gets the same signal
  // via onViewportDetailActiveChange to conditionally render the Hatch
  // button in the toolbar.
  const [viewportDetailActive, setViewportDetailActive] = React.useState(false)

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- react-leaflet must be client-side only
  const rl = require('react-leaflet')
  const { MapContainer, TileLayer, WMSTileLayer, GeoJSON, CircleMarker, Popup } = rl

  const layer = (id: string) => layers.find((l) => l.id === id)
  const boundaryLayer = layer('boundary')
  const habitatLayer = layer('habitats')
  const obsLayer = layer('observations')
  const targetNotesLayer = layer('target-notes')
  const countiesLayer = layer('counties')
  const townlandsLayer = layer('townlands')
  const findingsLayer = layer('findings')
  const tileConfig = TILE_LAYERS[currentStyle]

  const { countiesData } = useCountyBoundaries(!!countiesLayer?.visible)
  const {
    townlandsData,
    townlandsLoading,
    currentZoom,
    setCurrentZoom,
    townlandsBboxRef,
    loadTownlandsForBbox,
  } = useTownlandsLoader(zoom)
  const hasFitToBoundaryRef = React.useRef(false)

  const visibleFindings = React.useMemo(() => {
    if (!findings) return []
    // undefined/null = no filter (show all) — callers that don't pass the prop.
    // [] = explicit empty filter (show nothing) — all floating buttons off.
    if (!visibleFindingTypes) return findings
    return findings.filter((f) => visibleFindingTypes.includes(f.dataType))
  }, [findings, visibleFindingTypes])

  return (
    <MapContainer
      key={mapInstanceId}
      center={center}
      zoom={zoom}
      className="h-full min-h-100 w-full"
      style={{ height: '100%', minHeight: '400px' }}
      zoomControl={false}
      // Default Leaflet maxZoom is 18 (~30m scale) — bump it so users can
      // zoom past the 30m wall to inspect individual buildings/parcels.
      // The viewport detail layer keeps refetching at sub-meter tolerance
      // so habitat polygons stay crisp even when satellite tiles upscale.
      maxZoom={22}
      // Canvas renderer is dramatically faster than SVG when dozens of
      // polygons are on screen (multi-site projects draw 20+ boundaries
      // plus buffer rings plus habitat layers).
      preferCanvas
    >
      {/* ── Base tiles ─────────────────────────────────────────────────── */}
      {tileConfig.wms && tileConfig.wms.transparent && (
        <TileLayer
          key="base-streets"
          url={TILE_LAYERS.streets.url}
          attribution={TILE_LAYERS.streets.attribution}
        />
      )}
      {tileConfig.wms ? (
        <WMSTileLayer
          key={currentStyle}
          url={tileConfig.url}
          params={tileConfig.wms}
          maxZoom={tileConfig.maxZoom}
          attribution={tileConfig.attribution}
        />
      ) : (
        <TileLayer
          key={currentStyle}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          // Esri World Imagery has native tiles up to z19 in most areas
          // (z20-23 in built-up zones); set maxNativeZoom so Leaflet
          // upscales the deepest available tile rather than showing blank
          // squares when the user zooms past the source's true ceiling.
          maxZoom={22}
          maxNativeZoom={19}
        />
      )}
      {currentStyle === 'hybrid' && (
        <TileLayer
          key="hybrid-labels"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          pane="overlayPane"
          maxZoom={22}
          maxNativeZoom={19}
        />
      )}
      {showBatRecords && (
        <TileLayer
          key="gbif-bats"
          url="https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=734&country=IE&style=orange.point"
          attribution="Bat records &copy; GBIF"
          pane="overlayPane"
          tileSize={512}
          zoomOffset={-1}
        />
      )}

      {/* ── Controller (scale, fit-bounds, zoom-to-finding, townlands) ─ */}
      <MapController
        boundary={boundary}
        allBoundaries={allBoundaries}
        selectedFinding={selectedFinding}
        onMapClick={onMapClick}
        onMapReady={onMapReady}
        mapRef={mapRef}
        skipFitBounds={skipFitBounds}
        hasFitToBoundaryRef={hasFitToBoundaryRef}
        townlandsLayer={townlandsLayer}
        loadTownlandsForBbox={loadTownlandsForBbox}
        setCurrentZoom={setCurrentZoom}
        iwebsVisibleLayers={iwebsVisibleLayers ?? []}
        npwsVisibleLayers={npwsVisibleLayers ?? []}
        useMap={rl.useMap}
        bufferDistances={bufferDistances}
      />

      {/* ── County boundaries ──────────────────────────────────────────── */}
      {countiesLayer?.visible && countiesData && (
        <CountyLayer countiesData={countiesData} GeoJSON={GeoJSON} />
      )}

      {/* ── Townland boundaries (zoom 12+) ─────────────────────────────── */}
      {townlandsLayer?.visible && townlandsData && (
        <TownlandLayer
          townlandsData={townlandsData}
          townlandsBboxKey={townlandsBboxRef.current}
          currentZoom={currentZoom}
          townlandsLoading={townlandsLoading}
          GeoJSON={GeoJSON}
        />
      )}

      {/* ── Buffer zones ───────────────────────────────────────────────── */}
      <BufferZoneLayer
        boundary={boundary}
        allBoundaries={allBoundaries}
        otherBoundaries={otherBoundaries}
        bufferDistances={bufferDistances}
        GeoJSON={GeoJSON}
      />

      {/* ── Project boundary ───────────────────────────────────────────── */}
      {boundary && boundaryLayer?.visible && (
        <GeoJSON
          key={`boundary-${boundaryCoordKey(boundary)}`}
          data={boundary}
          style={PRIMARY_BOUNDARY_STYLE}
        />
      )}

      {/* ── All / other site boundaries ────────────────────────────────── */}
      {allBoundaries && allBoundaries.length > 0
        ? allBoundaries
            .filter((feat) => {
              if (!boundary) return true
              const a = feat.geometry.coordinates[0]?.[0]
              const b = boundary.geometry.coordinates[0]?.[0]
              return !(a && b && a[0] === b[0] && a[1] === b[1])
            })
            .map((feat) => (
              <GeoJSON
                key={`all-boundary-${boundaryCoordKey(feat)}`}
                data={feat}
                style={PRIMARY_BOUNDARY_STYLE}
              />
            ))
        : otherBoundaries.map((feat) => (
            <GeoJSON
              key={`other-boundary-${boundaryCoordKey(feat)}`}
              data={feat}
              style={OTHER_BOUNDARY_STYLE}
            />
          ))}

      {/* NLC vector tile overlay — renders below user habitat polygons */}
      {showNlcOverlay && <NlcTileLayer />}

      {habitatPolygons &&
        habitatLayer?.visible &&
        (!visibleFindingTypes || visibleFindingTypes.includes('habitat')) && (
          <>
            {/* Project-bbox layer is hidden at high zoom because its coarse
                tolerance produces visible TIN triangles when you zoom in,
                and those clash with the crisp viewport detail layer. */}
            {!viewportDetailActive && (
              <HabitatPolygonLayer
                habitatPolygons={habitatPolygons}
                habitatSelectionKey={habitatSelectionKey}
                GeoJSON={GeoJSON}
                useMap={rl.useMap}
                useNativeColors={useNativeColors}
              />
            )}
            {/* High-zoom viewport detail layer — refetches the current
                viewport with sub-meter tolerance at z16+ to match Esri viewer
                parity in dense built-up areas. Brings its own FOSSITT labels
                (one per habitat type within the viewport) since the project
                layer is hidden when this is active. */}
            <ViewportHabitatDetail
              enabled
              useMap={rl.useMap}
              GeoJSON={GeoJSON}
              onActiveChange={(active) => {
                setViewportDetailActive(active)
                onViewportDetailActiveChange?.(active)
              }}
              useNativeColors={useNativeColors}
              useHatchPatterns={useHatchPatterns}
            />
          </>
        )}
      {gridOverlay && <GridOverlayLayer gridOverlay={gridOverlay} GeoJSON={GeoJSON} />}
      {observationPoints && observationPoints.features.length > 0 && obsLayer?.visible && (
        <ObservationMarkers observationPoints={observationPoints} rl={{ CircleMarker, Popup }} />
      )}
      {targetNotes && targetNotes.length > 0 && (targetNotesLayer?.visible ?? true) && (
        <TargetNoteMarkers
          targetNotes={targetNotes}
          selectedTargetNote={selectedTargetNote}
          onTargetNoteClick={onTargetNoteClick}
          rl={{ CircleMarker, Popup }}
        />
      )}
      {visibleFindings.length > 0 && findingsLayer?.visible && (
        <FindingMarkers
          findings={visibleFindings}
          selectedFinding={selectedFinding}
          onFindingClick={onFindingClick}
          rl={{ CircleMarker, GeoJSON, Popup }}
        />
      )}
    </MapContainer>
  )
}

const DynamicMapComponent = dynamic(() => Promise.resolve(MapComponent), { ssr: false })

export function ProjectMap({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  showControls = true,
  skipFitBounds = false,
  ...mapProps
}: ProjectMapProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('satellite')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [showBatRecords, setShowBatRecords] = React.useState(false)
  const [iwebsVisibleLayers, setIwebsVisibleLayers] = React.useState<string[]>([])
  const {
    visible: visibleBuffers,
    toggle: toggleBuffer,
    setAll: setAllBuffers,
  } = useVisibleBuffers(mapProps.bufferDistances)
  const filteredBufferDistances = React.useMemo(
    () => (mapProps.bufferDistances ?? []).filter((d) => visibleBuffers.has(d)),
    [mapProps.bufferDistances, visibleBuffers]
  )
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const [layers, setLayers] = React.useState<MapLayer[]>([
    { id: 'boundary', name: 'Project Boundary', visible: true, color: '#ef4444' },
    { id: 'habitats', name: 'Habitat Polygons', visible: true },
    { id: 'observations', name: 'Species Observations', visible: true },
    { id: 'target-notes', name: 'Target Notes', visible: true, color: '#8b5cf6' },
    { id: 'findings', name: 'Desk Research Findings', visible: true, color: '#3b82f6' },
    { id: 'counties', name: 'County Boundaries', visible: false, color: '#f97316' },
    { id: 'townlands', name: 'Townlands (zoom 12+)', visible: false, color: '#a855f7' },
  ])
  // Default OFF → Heritage Council palette (CIEEM convention, matches PDF
  // reports). When ON, both project and viewport-detail layers switch to
  // NLC's native 37-shade palette (buildings red, ways gray, etc.).
  const [useNativeColors, setUseNativeColors] = React.useState(false)
  // Heritage Council Appendix 6 hatch fill overlay (horizontal lines for
  // grasslands, crosshatch for woodland, etc.). Off by default. The toggle
  // button is only rendered while the viewport detail layer is active —
  // hatch only reads at parcel-level zoom.
  const [useHatchPatterns, setUseHatchPatterns] = React.useState(false)
  // Mirrored from MapComponent's ViewportHabitatDetail.onActiveChange so we
  // can show/hide the Hatch toggle in the toolbar.
  const [viewportDetailActive, setViewportDetailActive] = React.useState(false)

  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

  // When the container resizes (tab becomes visible, sidebar toggle, fullscreen,
  // page-size change), Leaflet needs invalidateSize() or it keeps rendering at
  // the dimensions it measured at init time — which is 0×0 if mounted inside a
  // display:none parent (Step 5 Data Analysis tabs).
  React.useEffect(() => {
    if (!containerRef.current) return
    const onResize = () => {
      setTimeout(() => {
        try {
          mapRef.current?.invalidateSize()
        } catch {
          /* ignore */
        }
      }, 100)
    }
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(containerRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
  }, [mapLoaded])

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
    )
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  if (!mapLoaded) {
    return (
      <div className={cn('relative h-full overflow-hidden rounded-lg', className)}>
        <div className="bg-muted/50 flex h-full min-h-100 w-full items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative h-full overflow-hidden rounded-lg', className)}>
      <div className="h-full min-h-100 w-full">
        <DynamicMapComponent
          {...mapProps}
          bufferDistances={filteredBufferDistances}
          center={center}
          zoom={zoom}
          skipFitBounds={skipFitBounds}
          currentStyle={currentStyle}
          layers={layers}
          mapRef={mapRef}
          showBatRecords={showBatRecords}
          iwebsVisibleLayers={iwebsVisibleLayers}
          useNativeColors={useNativeColors}
          useHatchPatterns={useHatchPatterns}
          onViewportDetailActiveChange={setViewportDetailActive}
        />
      </div>

      {showControls && (
        <div className="pointer-events-auto absolute top-4 left-4 z-9999">
          <MapControlSidebar>
            <MapLayersDropdown
              currentStyle={currentStyle}
              setCurrentStyle={setCurrentStyle}
              mapRef={mapRef}
              portalContainer={containerRef.current}
              dataLayers={layers}
              onToggleLayer={toggleLayer}
              showBatRecords={showBatRecords}
              onToggleBatRecords={setShowBatRecords}
              iwebsVisibleLayers={iwebsVisibleLayers}
              onToggleIwebsLayer={(layerId, checked) =>
                setIwebsVisibleLayers((prev) =>
                  checked ? [...prev, layerId] : prev.filter((id) => id !== layerId)
                )
              }
            />
            <BufferControl
              bufferDistances={mapProps.bufferDistances ?? []}
              visibleBuffers={visibleBuffers}
              onToggleBuffer={toggleBuffer}
              onToggleAll={setAllBuffers}
              portalContainer={containerRef.current}
            />
            {/* Habitat colour palette toggle. Default OFF = Heritage Council
                (CIEEM convention, matches PDF reports). ON = NLC native
                37-shade palette (buildings red, ways gray, etc.) — easier
                to distinguish habitats at high-zoom inspection. */}
            <Button
              variant={useNativeColors ? 'default' : 'secondary'}
              size="sm"
              className="h-7 px-2 text-xs shadow-md"
              onClick={() => setUseNativeColors((v) => !v)}
              aria-pressed={useNativeColors}
              title={
                useNativeColors
                  ? 'Switch back to Heritage Council palette'
                  : 'Switch to NLC native palette (37 distinct colours)'
              }
            >
              <Palette className="mr-1.5 h-3.5 w-3.5" />
              NLC
            </Button>
            {/* Hatch toggle — only meaningful at parcel-level zoom (z16+),
                so it lives next to NLC but appears only while the viewport
                detail layer is active. Per Heritage Council Appendix 6. */}
            {viewportDetailActive && (
              <Button
                variant={useHatchPatterns ? 'default' : 'secondary'}
                size="sm"
                className="h-7 px-2 text-xs shadow-md"
                onClick={() => setUseHatchPatterns((v) => !v)}
                aria-pressed={useHatchPatterns}
                title={
                  useHatchPatterns
                    ? 'Hide Heritage Council hatch patterns'
                    : 'Show Heritage Council hatch patterns (Appendix 6)'
                }
              >
                <Grid3x3 className="mr-1.5 h-3.5 w-3.5" />
                Hatch
              </Button>
            )}
            {/* Quick-jump to z16 — the scale (~200m) where the viewport
                detail layer activates. Lets the user see crisp parcel-level
                rendering with one click instead of multiple zoom-ins. */}
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs shadow-md"
              onClick={() => {
                const map = mapRef.current
                if (!map) return
                map.setView(map.getCenter(), 16, { animate: true })
              }}
              aria-label="Zoom to 200m detail view"
              title="Zoom to ~200m scale (NLC detail view)"
            >
              200m
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 shadow-md"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </MapControlSidebar>
        </div>
      )}

      {showControls && (
        <ZoomControl
          mapRef={mapRef}
          className="pointer-events-auto absolute right-4 bottom-4 z-1000"
        />
      )}
    </div>
  )
}
