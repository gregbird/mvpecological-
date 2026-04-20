'use client'

import * as React from 'react'
import { Info, Maximize2, Minimize2, Pentagon, Square } from 'lucide-react'
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
import type { InternalMapProps } from '@/components/maps/internal-map-props'
export type { FindingMarker, HabitatPolygonOverlay } from '@/components/maps/map-types'
import type { BufferColorConfig } from '@/components/maps/map-types'
import { getBufferZoneStyle } from '@/components/maps/map-types'

interface ProjectMapWithDrawProps {
  className?: string
  center?: [number, number]
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferZones?: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  bufferColors?: Record<number, BufferColorConfig>
  onBoundaryChange?: (features: GeoJSON.FeatureCollection, isEdit?: boolean) => void
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
  } = props

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
          <TileLayer key={currentStyle} url={tileConfig.url} attribution={tileConfig.attribution} />
        )}
        {currentStyle === 'hybrid' && (
          <TileLayer
            key="hybrid-labels"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            pane="overlayPane"
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
        {habitatPolygons.map((hp) => {
          const isSelected = hp.id === selectedHabitatId
          const fill = hp.color || '#22c55e'
          return (
            <GeoJSON
              key={`habitat-${hp.id}`}
              data={{ type: 'Feature', geometry: hp.geometry, properties: {} } as GeoJSON.Feature}
              style={() => ({
                color: isSelected ? '#facc15' : fill,
                weight: isSelected ? 4 : 2,
                fillColor: fill,
                fillOpacity: isSelected ? 0.35 : 0.2,
              })}
              onEachFeature={(_f: GeoJSON.Feature, layer: L.Layer) => {
                ;(layer as L.GeoJSON).bindPopup(
                  `<div style="min-width:160px"><strong>${hp.fossittCode}</strong> — ${hp.fossittName}${hp.condition ? `<br/><span style="color:#666">Condition: ${hp.condition}</span>` : ''}</div>`
                )
                layer.on('click', () => onHabitatClick?.(hp.id))
              }}
            />
          )
        })}
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
  onHabitatClick,
  allowMultipleDrawings = false,
  npwsSites: externalNpwsSites,
  onOverlapDetected,
}: ProjectMapWithDrawProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [internalStyle, setInternalStyle] = React.useState<MapStyle>('satellite')
  const currentStyle = baseMapStyle ?? internalStyle
  const setCurrentStyle = onBaseMapStyleChange ?? setInternalStyle
  const [isFullscreen, setIsFullscreen] = React.useState(false)
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
          onHabitatClick={onHabitatClick}
          allowMultipleDrawings={allowMultipleDrawings}
          onMapReady={setMapInstance}
          showBatRecords={showBatRecords}
          onOverlapDetected={onOverlapDetected}
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
        <MapControlSidebar>
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
