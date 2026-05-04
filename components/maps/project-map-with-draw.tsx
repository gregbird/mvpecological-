'use client'

import * as React from 'react'
import { Grid3x3, Info, Maximize2, Minimize2, Palette, Pentagon, Square } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet'
import type L from 'leaflet'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  IRELAND_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYERS,
  FINDING_TYPE_COLORS,
} from '@/lib/config/map-constants'
export type { MapStyle } from '@/lib/config/map-constants'
import type { MapStyle } from '@/lib/config/map-constants'
import { MeasureControl } from './measure-control'
import { useNPWSLayers } from './npws-layer-overlay'
import { useEPALayers } from './epa-layer-overlay'
import { useIWebsLayers } from './iwebs-layer-overlay'
import { useAdministrativeBoundaries } from '@/hooks/maps/use-administrative-boundaries'
import { MapLayersDropdown } from '@/components/maps/map-layers-dropdown'
import { MapControlSidebar } from '@/components/maps/map-control-sidebar'
import { BufferControl } from '@/components/maps/buffer-control'
import { ZoomControl } from '@/components/maps/zoom-control'
import { useVisibleBuffers } from '@/hooks/shared/use-visible-buffers'
import { DeleteConfirmDialog } from '@/components/maps/delete-confirm-dialog'
import { DrawMeasurementOverlay } from '@/components/maps/draw-measurement-overlay'
import type { DrawMeasurement } from '@/components/maps/draw-measurement-overlay'
import { MapBoundaryController } from '@/components/maps/map-boundary-controller'
import { DataLayersIndicator } from '@/components/maps/data-layers-indicator'
import { ViewportHabitatDetail } from '@/components/maps/viewport-habitat-detail'
import type { InternalMapProps } from '@/components/maps/internal-map-props'
export type { FindingMarker, HabitatPolygonOverlay } from '@/components/maps/map-types'
import type { BufferColorConfig } from '@/components/maps/map-types'
import { getBufferZoneStyle } from '@/components/maps/map-types'
import {
  ensurePatternDefs,
  getHeritagePatternShape,
  type PatternShape,
} from '@/lib/config/heritage-patterns'
import { NLC_NATIVE_LEVEL2_COLORS } from '@/lib/external-apis/osi'

interface ProjectMapWithDrawProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
  /** Fires when the user clicks empty map area (not on a habitat polygon).
   * Used to clear habitat selection — Leaflet's natural event order plus
   * our stopPropagation guard on habitat-layer clicks ensures this only
   * fires for true blank-area clicks. */
  onMapClick?: () => void
  onViewChange?: (center: [number, number], zoom: number) => void
  editable?: boolean
  showMeasureTool?: boolean
  showLayersControl?: boolean
  visibleLayers?: string[]
  npwsSearchRadius?: number
  baseMapStyle?: MapStyle
  onBaseMapStyleChange?: (style: MapStyle) => void
  ignoredItems?: Set<string>
  deletedItems?: Set<string>
  npwsSiteCount?: number
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  findings?: import('@/components/maps/map-types').FindingMarker[]
  onFindingClick?: (finding: import('@/components/maps/map-types').FindingMarker) => void
  habitatPolygons?: import('@/components/maps/map-types').HabitatPolygonOverlay[]
  selectedHabitatId?: string
  /** FOSSITT code of the selected habitat — when set, the high-zoom NLC
   * layer fades non-matching parcels and emphasises matching ones, instead
   * of the highlight only landing on the coarse saved boundary. */
  selectedHabitatFossittCode?: string | null
  onHabitatClick?: (id: string) => void
  allowMultipleDrawings?: boolean
  npwsSites?: import('@/lib/external-apis/npws').NPWSDesignatedSite[]
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
}

// ── Bridge component: must be defined OUTSIDE MapComponentWithDraw so that
//    React sees a stable component type and does not unmount/remount every render.
interface BoundaryControllerBridgeProps {
  mapRef: React.MutableRefObject<LeafletMap | null>
  featureGroupRef: React.RefObject<LeafletFeatureGroup | null>
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  editable: boolean
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
  onViewChange?: (center: [number, number], zoom: number) => void
  onZoomChange?: (
    zoom: number,
    bounds?: { west: number; south: number; east: number; north: number }
  ) => void
  flyToLocation?: { center: [number, number]; zoom: number; key: string }
  allowMultipleDrawings: boolean
  habitatPolygons: import('@/components/maps/map-types').HabitatPolygonOverlay[]
  otherBoundaries: GeoJSON.Feature<GeoJSON.Polygon>[]
  onOverlapDetected?: (info: {
    overlapAreaM2: number
    habitatName: string
    newPolygon: GeoJSON.Feature<GeoJSON.Polygon>
    overlappingPolygon: GeoJSON.Feature<GeoJSON.Polygon>
  }) => void
  onMapReady?: (map: LeafletMap) => void
  onDeleteConfirmChange: React.Dispatch<React.SetStateAction<boolean>>
  pendingDeleteLayerRef: React.MutableRefObject<L.Layer | null>
  onDrawMeasurementChange: (measurement: DrawMeasurement | null) => void
  collectFeaturesRef: React.MutableRefObject<() => GeoJSON.Feature[]>
  bufferDistances?: number[]
}

function BoundaryControllerBridge({
  mapRef,
  featureGroupRef,
  boundary,
  editable,
  onBoundaryChange,
  onViewChange,
  onZoomChange,
  flyToLocation,
  allowMultipleDrawings,
  habitatPolygons,
  otherBoundaries,
  onOverlapDetected,
  onMapReady,
  onDeleteConfirmChange,
  pendingDeleteLayerRef,
  onDrawMeasurementChange,
  collectFeaturesRef,
  bufferDistances,
}: BoundaryControllerBridgeProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet')
  const map = useMap()

  const handleCollectFeaturesReady = React.useCallback(
    (fn: () => GeoJSON.Feature[]) => {
      collectFeaturesRef.current = fn
    },
    [collectFeaturesRef]
  )

  if (!map) return null
  return (
    <MapBoundaryController
      map={map}
      mapRef={mapRef}
      featureGroupRef={featureGroupRef}
      boundary={boundary}
      editable={editable}
      onBoundaryChange={onBoundaryChange}
      onViewChange={onViewChange}
      onZoomChange={onZoomChange}
      flyToLocation={flyToLocation}
      allowMultipleDrawings={allowMultipleDrawings}
      habitatPolygons={habitatPolygons}
      otherBoundaries={otherBoundaries}
      onOverlapDetected={onOverlapDetected}
      onMapReady={onMapReady}
      onDeleteConfirmChange={onDeleteConfirmChange}
      pendingDeleteLayerRef={pendingDeleteLayerRef}
      onDrawMeasurementChange={onDrawMeasurementChange}
      onCollectFeaturesReady={handleCollectFeaturesReady}
      bufferDistances={bufferDistances}
    />
  )
}

// ── User-drawn habitat overlay with optional Heritage hatch patterns ────────
// Lives outside MapComponentWithDraw so React keeps a stable component type
// (avoids unmount/remount on every parent render). Rendered as a sibling of
// the boundary FeatureGroup, NOT inside it — Geoman edit/drag/delete is
// already configured to ignore non-FeatureGroup layers.

interface UserDrawnHabitatLayerProps {
  habitatPolygons: import('@/components/maps/map-types').HabitatPolygonOverlay[]
  selectedHabitatId?: string
  onHabitatClick?: (id: string) => void
  useHatchPatterns: boolean
  /** When true, fill colour comes from NLC's native 37-shade palette via the
   * habitat overlay's `nlcLabel`. The label is approximate for ambiguous
   * FOSSITT codes (one representative per code), but it lets the NLC button
   * actually do something at low/mid zoom — at z16+ the live ViewportHabitat
   * Detail layer takes over with exact per-parcel labels. Heritage Council
   * is the default fallback. */
  useNativeColors: boolean
  useMap: () => L.Map
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

function darkenHexShade(hex: string, factor = 0.55) {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex
  const expand = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
  const r = Math.round(parseInt(expand.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(expand.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(expand.slice(5, 7), 16) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

// Resolve a habitat overlay's fill colour. NLC native palette uses the
// `nlcLabel` if present (set by use-habitat-map-data via FOSSITT→NLC reverse
// lookup), falling back to Heritage Council so saved habitats without an
// nlcLabel still get a meaningful colour rather than gray. Heritage Council
// stays the default — same convention as HabitatPolygonLayer.
function resolveOverlayFill(
  hp: import('@/components/maps/map-types').HabitatPolygonOverlay,
  useNativeColors: boolean
): string {
  if (useNativeColors) {
    const native = hp.nlcLabel ? NLC_NATIVE_LEVEL2_COLORS[hp.nlcLabel] : undefined
    if (native) return native
  }
  return hp.color || '#22c55e'
}

function UserDrawnHabitatLayer({
  habitatPolygons,
  selectedHabitatId,
  onHabitatClick,
  useHatchPatterns,
  useNativeColors,
  useMap,
  GeoJSON,
}: UserDrawnHabitatLayerProps) {
  const map = useMap()
  // Lazy SVG renderer — only created when patterns are active. Same instance
  // is reused across re-renders so Leaflet doesn't churn renderers.
  const svgRendererRef = React.useRef<L.Renderer | null>(null)
  const patternIdMapRef = React.useRef<Map<string, string>>(new Map())

  if (useHatchPatterns && !svgRendererRef.current) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Llib = require('leaflet')
    svgRendererRef.current = Llib.svg({ padding: 0.1 })
  }

  React.useEffect(() => {
    if (!useHatchPatterns || !map || !svgRendererRef.current) return
    svgRendererRef.current.addTo(map)
    const container = (svgRendererRef.current as unknown as { _container?: SVGSVGElement })
      ._container
    if (!container) return
    const items: { shape: PatternShape; stroke: string }[] = []
    const seen = new Set<string>()
    for (const hp of habitatPolygons) {
      const fill = resolveOverlayFill(hp, useNativeColors)
      const shape = getHeritagePatternShape(hp.fossittCode)
      const stroke = darkenHexShade(fill, 0.55)
      const key = `${shape}|${stroke}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ shape, stroke })
    }
    patternIdMapRef.current = ensurePatternDefs(container, items)
  }, [useHatchPatterns, useNativeColors, map, habitatPolygons])

  return (
    <>
      {habitatPolygons.map((hp) => {
        const isSelected = hp.id === selectedHabitatId
        const fill = resolveOverlayFill(hp, useNativeColors)
        const stroke = darkenHexShade(fill, 0.65)
        const renderer = useHatchPatterns ? svgRendererRef.current : undefined
        return (
          <GeoJSON
            key={`habitat-${hp.id}-${useHatchPatterns ? 'hatch' : 'flat'}-${useNativeColors ? 'nlc' : 'hc'}`}
            data={{ type: 'Feature', geometry: hp.geometry, properties: {} } as GeoJSON.Feature}
            // Style mirrors HabitatPolygonLayer (NLC layer) so saved user
            // drawings sit naturally next to the live NLC viewport detail
            // overlay — same stroke darkening, same default fill opacity.
            // Selected state keeps the habitat's own colour (just emphasised
            // via heavier stroke + denser fill); matches HabitatPolygonLayer
            // and avoids the bright-yellow override that visually divorced
            // selected habitats from their FOSSITT colour cue.
            style={() => {
              const selectedStroke = darkenHexShade(fill, 0.5)
              const opts: L.PathOptions = {
                color: isSelected ? selectedStroke : stroke,
                weight: isSelected ? 2 : 0.7,
                opacity: isSelected ? 1 : 0.7,
                fillColor: fill,
                fillOpacity: isSelected ? 0.7 : 0.35,
              }
              if (renderer) opts.renderer = renderer
              return opts
            }}
            onEachFeature={(_f: GeoJSON.Feature, layer: L.Layer) => {
              const code = escapeHtml(hp.fossittCode || '')
              const name = escapeHtml(hp.fossittName || '')
              const condition = hp.condition ? escapeHtml(hp.condition) : null
              ;(layer as L.GeoJSON).bindPopup(
                `<div style="min-width:160px"><strong>${code}</strong> — ${name}${condition ? `<br/><span style="color:#666">Condition: ${condition}</span>` : ''}</div>`
              )
              // Stop the click from bubbling up to the map so the
              // empty-area `onMapClick` (which clears selection) does not
              // immediately undo the selection we just made.
              layer.on('click', (e: L.LeafletMouseEvent) => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('leaflet').DomEvent.stopPropagation(e)
                onHabitatClick?.(hp.id)
              })

              if (useHatchPatterns) {
                const shape = getHeritagePatternShape(hp.fossittCode)
                const stroke = darkenHexShade(fill, 0.55)
                const patternId = patternIdMapRef.current.get(`${shape}|${stroke}`)
                if (patternId && shape !== 'solid') {
                  const apply = () => {
                    const path = (layer as unknown as { _path?: SVGPathElement })._path
                    if (path) path.setAttribute('fill', `url(#${patternId})`)
                  }
                  layer.on('add', apply)
                  apply()
                }
              }
            }}
          />
        )
      })}
    </>
  )
}

// Tiny bridge that lives inside <MapContainer> so it can call useMap. Wires
// `onMapClick` to Leaflet's click event — fires only for empty-area clicks
// because UserDrawnHabitatLayer stops propagation on habitat-polygon clicks.
function MapClickBridge({ onMapClick }: { onMapClick: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet')
  const map = useMap() as LeafletMap | null
  // Keep callback in a ref so the effect doesn't tear down on every parent
  // re-render with a fresh function identity.
  const onClickRef = React.useRef(onMapClick)
  onClickRef.current = onMapClick

  React.useEffect(() => {
    if (!map) return
    const handler = () => onClickRef.current()
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map])

  return null
}

// ── Internal map component (rendered client-side only via dynamic import) ────

function MapComponentWithDraw(props: InternalMapProps) {
  const {
    center,
    zoom,
    boundary,
    bufferZones,
    bufferColors,
    currentStyle,
    onBoundaryChange,
    onViewChange,
    editable,
    mapRef,
    countiesData,
    showCounties,
    townlandsData,
    showTownlands,
    currentZoom = 7,
    onZoomChange,
    flyToLocation,
    otherBoundaries = [],
    findings = [],
    onFindingClick,
    habitatPolygons = [],
    selectedHabitatId,
    onHabitatClick,
    allowMultipleDrawings = false,
    onMapReady,
    showBatRecords,
    onOverlapDetected,
    useNativeColors = false,
    useHatchPatterns = false,
    onViewportDetailActiveChange,
    selectedHabitatFossittCode = null,
    onMapClick,
  } = props

  // Local mirror of viewport detail state — used to hide the coarse saved
  // habitat layer at high zoom so it does not stack on top of the NLC live
  // overlay with subtly different geometry. project-map.tsx uses the same
  // pattern for its read-only habitat layer.
  const [viewportDetailActive, setViewportDetailActive] = React.useState(false)

  const mapInstanceId = React.useId()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rl = require('react-leaflet')
  const { MapContainer, TileLayer, WMSTileLayer, GeoJSON, FeatureGroup, CircleMarker, Popup } = rl
  const tileConfig = TILE_LAYERS[currentStyle]
  const featureGroupRef = React.useRef<LeafletFeatureGroup | null>(null)
  const pendingDeleteLayerRef = React.useRef<L.Layer | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [drawMeasurement, setDrawMeasurement] = React.useState<DrawMeasurement | null>(null)
  const collectFeaturesRef = React.useRef<() => GeoJSON.Feature[]>(() => [])

  const confirmDelete = React.useCallback(() => {
    const layer = pendingDeleteLayerRef.current
    if (layer && mapRef.current) {
      mapRef.current.removeLayer(layer)
      if (featureGroupRef.current?.hasLayer(layer)) featureGroupRef.current.removeLayer(layer)
    }
    pendingDeleteLayerRef.current = null
    setShowDeleteConfirm(false)
    const features = collectFeaturesRef.current()
    onBoundaryChange?.({ type: 'FeatureCollection', features }, false)
  }, [onBoundaryChange, mapRef])

  const cancelDelete = React.useCallback(() => {
    const layer = pendingDeleteLayerRef.current
    if (layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((layer as any).setStyle)
        (layer as any).setStyle({ opacity: 1, fillOpacity: 0.1, dashArray: '' })
      if (mapRef.current) mapRef.current.removeLayer(layer)
      featureGroupRef.current?.addLayer(layer)
    }
    pendingDeleteLayerRef.current = null
    setShowDeleteConfirm(false)
  }, [mapRef])

  const bufferZonesArray = React.useMemo(() => {
    if (!bufferZones) return []
    return Array.from(bufferZones.entries()).sort((a, b) => b[0] - a[0])
  }, [bufferZones])

  return (
    <>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <DrawMeasurementOverlay measurement={drawMeasurement} />
      <MapContainer
        key={mapInstanceId}
        center={center}
        zoom={zoom}
        className="h-full min-h-100 w-full"
        style={{ height: '100%', minHeight: '400px' }}
        zoomControl={false}
        // Default Leaflet maxZoom is 18 (~30m scale) — bump it so users can
        // zoom past the 30m wall to inspect individual buildings/parcels.
        // Viewport detail layer keeps refetching at sub-meter tolerance so
        // habitat polygons stay crisp even when satellite tiles upscale.
        maxZoom={22}
      >
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
        <BoundaryControllerBridge
          mapRef={mapRef}
          featureGroupRef={featureGroupRef}
          boundary={boundary}
          editable={editable}
          onBoundaryChange={onBoundaryChange}
          onViewChange={onViewChange}
          onZoomChange={onZoomChange}
          flyToLocation={flyToLocation}
          allowMultipleDrawings={allowMultipleDrawings}
          habitatPolygons={habitatPolygons}
          otherBoundaries={otherBoundaries}
          onOverlapDetected={onOverlapDetected}
          onMapReady={onMapReady}
          onDeleteConfirmChange={setShowDeleteConfirm}
          pendingDeleteLayerRef={pendingDeleteLayerRef}
          onDrawMeasurementChange={setDrawMeasurement}
          collectFeaturesRef={collectFeaturesRef}
          bufferDistances={bufferZones ? Array.from(bufferZones.keys()) : undefined}
        />
        {onMapClick && <MapClickBridge onMapClick={onMapClick} />}

        {showCounties && countiesData && (
          <GeoJSON
            key="county-boundaries"
            data={countiesData}
            style={(feature: GeoJSON.Feature | undefined) => {
              const province = feature?.properties?.province as string | undefined
              const colors: Record<string, string> = {
                Leinster: '#3b82f6',
                Munster: '#22c55e',
                Connacht: '#f59e0b',
                Ulster: '#ef4444',
              }
              const c = province ? colors[province] || '#f97316' : '#f97316'
              return { color: c, weight: 1.5, fillColor: c, fillOpacity: 0.03, dashArray: '4, 4' }
            }}
            onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
              const p = feature.properties as Record<string, string> | null
              if (p)
                (layer as L.GeoJSON).bindPopup(
                  `<div style="min-width:150px"><strong>${p.name || 'Unknown'}</strong>${p.nameIrish ? `<br/><em>${p.nameIrish}</em>` : ''}<br/><span style="color:#666">Province: ${p.province || 'Unknown'}</span><br/><small style="color:#999">&copy; Tailte &Eacute;ireann (CC-BY 4.0)</small></div>`
                )
            }}
          />
        )}
        {showTownlands && townlandsData && currentZoom >= 12 && (
          <GeoJSON
            key={`townlands-${townlandsData.features?.length || 0}`}
            data={townlandsData}
            style={() => ({
              color: '#a855f7',
              weight: 1,
              fillColor: '#a855f7',
              fillOpacity: 0.02,
              dashArray: '2, 2',
            })}
            onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
              const p = feature.properties as Record<string, string | number | null> | null
              if (p)
                (layer as L.GeoJSON).bindPopup(
                  `<div style="min-width:180px"><strong>${p.name || 'Unknown Townland'}</strong>${p.nameIrish ? `<br/><em>${p.nameIrish}</em>` : ''}${p.areaHectares ? `<br/><span style="color:#666">Area: ${p.areaHectares} ha</span>` : ''}<br/><small style="color:#999">&copy; Tailte &Eacute;ireann (CC-BY 4.0)</small></div>`
                )
            }}
          />
        )}
        {otherBoundaries.map((feat, idx) => (
          <GeoJSON
            key={`other-boundary-${idx}-${feat.geometry.coordinates[0]?.[0]?.[0]}`}
            data={feat}
            style={() => ({
              color: '#94a3b8',
              weight: 2,
              fillColor: '#94a3b8',
              fillOpacity: 0.08,
              dashArray: '6, 4',
            })}
          />
        ))}
        {bufferZonesArray.map(([distance, bufferFeature]) => (
          <GeoJSON
            key={`buffer-${distance}`}
            data={bufferFeature}
            style={() => getBufferZoneStyle(distance, bufferColors?.[distance])}
          />
        ))}
        {findings.map((finding) => {
          if (!finding.location?.coordinates) return null
          const coords = finding.location.coordinates
          let lat: number | undefined, lng: number | undefined
          if (Array.isArray(coords) && coords.length >= 2) {
            const pLng = typeof coords[0] === 'number' ? coords[0] : parseFloat(String(coords[0]))
            const pLat = typeof coords[1] === 'number' ? coords[1] : parseFloat(String(coords[1]))
            if (!isNaN(pLng) && !isNaN(pLat)) {
              lng = pLng
              lat = pLat
            }
          }
          if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null
          const color = FINDING_TYPE_COLORS[finding.dataType] || FINDING_TYPE_COLORS.other
          return (
            <CircleMarker
              key={finding.id}
              center={[lat, lng]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
              eventHandlers={{ click: () => onFindingClick?.(finding) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{finding.title}</strong>
                  <br />
                  <span className="text-gray-500 capitalize">
                    {finding.dataType.replace('_', ' ')}
                  </span>
                  {finding.isProtected && (
                    <>
                      <br />
                      <span className="font-medium text-red-600">Protected</span>
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
        {/* NLC viewport detail. At z16+ this becomes the primary habitat
            visualisation — the saved (coarse) UserDrawnHabitatLayer below
            hides itself in that case so the two layers do not stack with
            mismatched geometries. Selection key is forwarded so matching
            NLC parcels highlight when the user picks a habitat from the
            list. */}
        <ViewportHabitatDetail
          enabled
          useMap={rl.useMap}
          GeoJSON={GeoJSON}
          useNativeColors={useNativeColors}
          useHatchPatterns={useHatchPatterns}
          selectedFossittCode={selectedHabitatFossittCode}
          onActiveChange={(active) => {
            setViewportDetailActive(active)
            onViewportDetailActiveChange?.(active)
          }}
        />
        {/* Saved-boundary layer — only at low/mid zoom. At z16+ the live
            NLC layer above shows parcel-level detail; rendering both stacked
            previously caused user confusion (same place, two slightly
            different polygons). */}
        {!viewportDetailActive && (
          <UserDrawnHabitatLayer
            habitatPolygons={habitatPolygons}
            selectedHabitatId={selectedHabitatId}
            onHabitatClick={onHabitatClick}
            useHatchPatterns={useHatchPatterns}
            useNativeColors={useNativeColors}
            useMap={rl.useMap}
            GeoJSON={GeoJSON}
          />
        )}
        {editable ? (
          <FeatureGroup
            ref={(ref: LeafletFeatureGroup | null) => {
              featureGroupRef.current = ref
            }}
          />
        ) : (
          boundary && (
            <GeoJSON
              data={boundary}
              style={{ color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.1 }}
            />
          )
        )}
      </MapContainer>
    </>
  )
}

const DynamicMapComponentWithDraw = dynamic(() => Promise.resolve(MapComponentWithDraw), {
  ssr: false,
})

// ── Exported wrapper ─────────────────────────────────────────────────────────

export function ProjectMapWithDraw({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  bufferZones,
  bufferColors,
  onBoundaryChange,
  onViewChange,
  editable = true,
  showMeasureTool = true,
  showLayersControl = true,
  visibleLayers = [],
  npwsSearchRadius = 5,
  baseMapStyle,
  onBaseMapStyleChange,
  ignoredItems = new Set(),
  deletedItems = new Set(),
  npwsSiteCount,
  flyToLocation,
  otherBoundaries = [],
  findings = [],
  onFindingClick,
  habitatPolygons = [],
  selectedHabitatId,
  selectedHabitatFossittCode,
  onHabitatClick,
  allowMultipleDrawings = false,
  npwsSites: externalNpwsSites,
  onOverlapDetected,
  onMapClick,
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [internalStyle, setInternalStyle] = React.useState<MapStyle>('satellite')
  const currentStyle = baseMapStyle ?? internalStyle
  const setCurrentStyle = onBaseMapStyleChange ?? setInternalStyle
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  // Heritage Council palette default — switching to NLC native (37 colours)
  // is a per-user preference for high-zoom inspection. Mirrors project-map.
  const [useNativeColors, setUseNativeColors] = React.useState(false)
  // Heritage Council Appendix 6 hatch overlay. Off by default; toggle button
  // only renders while viewport detail is active (z16+) — patterns only read
  // at parcel-level zoom.
  const [useHatchPatterns, setUseHatchPatterns] = React.useState(false)
  const [viewportDetailActive, setViewportDetailActive] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const [mapInstance, setMapInstance] = React.useState<LeafletMap | null>(null)

  const [showDrawingHint, setShowDrawingHint] = React.useState(true)
  React.useEffect(() => {
    if (!editable || boundary) return
    const timer = setTimeout(() => setShowDrawingHint(false), 5000)
    return () => clearTimeout(timer)
  }, [editable, boundary])

  const [showBatRecords, setShowBatRecords] = React.useState(false)
  const bufferDistancesList = React.useMemo(
    () => (bufferZones ? Array.from(bufferZones.keys()) : []),
    [bufferZones]
  )
  const {
    visible: visibleBuffers,
    toggle: toggleBuffer,
    setAll: setAllBuffers,
  } = useVisibleBuffers(bufferDistancesList)
  const filteredBufferZones = React.useMemo(() => {
    if (!bufferZones) return undefined
    const next = new Map<number, GeoJSON.Feature<GeoJSON.Polygon>>()
    for (const [distance, feature] of bufferZones.entries()) {
      if (visibleBuffers.has(distance)) next.set(distance, feature)
    }
    return next
  }, [bufferZones, visibleBuffers])
  const {
    showCounties,
    setShowCounties,
    countiesData,
    showTownlands,
    setShowTownlands,
    townlandsData,
    currentZoom,
    handleZoomChange,
  } = useAdministrativeBoundaries(zoom)

  const allBoundaries = React.useMemo(() => {
    return [boundary, ...(otherBoundaries ?? [])].filter(
      Boolean
    ) as GeoJSON.Feature<GeoJSON.Polygon>[]
  }, [boundary, otherBoundaries])

  const { sites: npwsSitesRaw, isLoading: npwsLoading } = useNPWSLayers(
    mapInstance,
    allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : [],
    visibleLayers,
    npwsSearchRadius,
    ignoredItems,
    deletedItems,
    externalNpwsSites
  )
  const npwsSites = React.useMemo(
    () =>
      npwsSitesRaw.filter((site) => {
        const k = `npws-${site.SITE_TYPE}-${site.SITECODE}`
        return !ignoredItems.has(k) && !deletedItems.has(k)
      }),
    [npwsSitesRaw, ignoredItems, deletedItems]
  )

  const { counts: epaCounts, isLoading: epaLoading } = useEPALayers(
    mapInstance,
    allBoundaries.length > 0 ? allBoundaries : boundary ? [boundary] : [],
    visibleLayers,
    npwsSearchRadius,
    ignoredItems,
    deletedItems
  )

  const [iwebsVisibleLayers, setIwebsVisibleLayers] = React.useState<string[]>([])
  useIWebsLayers(mapInstance, boundary ?? null, iwebsVisibleLayers)

  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

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
        <DynamicMapComponentWithDraw
          center={center}
          zoom={zoom}
          boundary={boundary}
          bufferZones={filteredBufferZones}
          bufferColors={bufferColors}
          currentStyle={currentStyle}
          onBoundaryChange={onBoundaryChange}
          onViewChange={onViewChange}
          editable={editable}
          mapRef={mapRef}
          countiesData={countiesData}
          showCounties={showCounties}
          townlandsData={townlandsData}
          showTownlands={showTownlands}
          currentZoom={currentZoom}
          onZoomChange={handleZoomChange}
          flyToLocation={flyToLocation}
          otherBoundaries={otherBoundaries}
          findings={findings}
          onFindingClick={onFindingClick}
          habitatPolygons={habitatPolygons}
          selectedHabitatId={selectedHabitatId}
          selectedHabitatFossittCode={selectedHabitatFossittCode}
          onHabitatClick={onHabitatClick}
          allowMultipleDrawings={allowMultipleDrawings}
          onMapReady={setMapInstance}
          showBatRecords={showBatRecords}
          onOverlapDetected={onOverlapDetected}
          useNativeColors={useNativeColors}
          useHatchPatterns={useHatchPatterns}
          onViewportDetailActiveChange={setViewportDetailActive}
          onMapClick={onMapClick}
        />
      </div>

      {editable && !boundary && showDrawingHint && (
        <div
          data-map-control="true"
          className="bg-card/95 absolute top-4 right-20 z-1000 max-w-xs rounded-lg border p-3 shadow-lg backdrop-blur transition-opacity duration-500"
        >
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" /> Draw Site Boundary
          </h4>
          <div className="text-muted-foreground space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <Pentagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                <strong>Polygon:</strong> Click points to draw, double-click to finish
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span>
                <strong>Rectangle:</strong> Click and drag to create
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-1000">
        {/* Open by default — Step 1 / Step 4 users need to discover the
            NLC palette and Hatch toggles without first clicking a hidden
            chevron. */}
        <MapControlSidebar defaultOpen>
          {showLayersControl && (
            <MapLayersDropdown
              currentStyle={currentStyle}
              setCurrentStyle={setCurrentStyle}
              mapRef={mapRef}
              portalContainer={containerRef.current}
              showCounties={showCounties}
              onToggleCounties={() => setShowCounties(!showCounties)}
              showTownlands={showTownlands}
              onToggleTownlands={() => setShowTownlands(!showTownlands)}
              showBatRecords={showBatRecords}
              onToggleBatRecords={setShowBatRecords}
              iwebsVisibleLayers={iwebsVisibleLayers}
              onToggleIwebsLayer={(layerId, checked) =>
                setIwebsVisibleLayers((prev) =>
                  checked ? [...prev, layerId] : prev.filter((id) => id !== layerId)
                )
              }
            />
          )}
          <BufferControl
            bufferDistances={bufferDistancesList}
            visibleBuffers={visibleBuffers}
            onToggleBuffer={toggleBuffer}
            onToggleAll={setAllBuffers}
            portalContainer={containerRef.current}
          />
          {/* Habitat colour palette toggle — Heritage Council (CIEEM/PDF
              convention) ↔ NLC native 37-shade. Same toggle as project-map
              so Step 1/Step 4 share the read-only map's behaviour. */}
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
              so it appears only while viewport detail is active. */}
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
          {/* Quick-jump to z16 — where the viewport detail layer activates. */}
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
          {showMeasureTool && <MeasureControl map={mapRef.current} />}
        </MapControlSidebar>
      </div>

      <ZoomControl mapRef={mapRef} className="absolute right-4 bottom-4 z-1000" />

      <DataLayersIndicator
        visibleLayers={visibleLayers}
        npwsLoading={npwsLoading}
        npwsSiteCount={npwsSiteCount ?? npwsSites.length}
        epaLoading={epaLoading}
        epaCounts={epaCounts}
        hasBoundary={!!boundary}
      />
    </div>
  )
}
