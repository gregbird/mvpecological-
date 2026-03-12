'use client'

import * as React from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap } from 'leaflet'
import type L from 'leaflet'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IRELAND_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '@/lib/config/map-constants'
export type { MapStyle } from '@/lib/config/map-constants'
import type { MapStyle } from '@/lib/config/map-constants'
import type { DeskResearchFinding } from '@/components/desk-research/finding-card'
import { useIWebsLayers } from '@/components/maps/iwebs-layer-overlay'
export type { MapLayer, TargetNoteMarker } from '@/components/maps/map-types'
import type { MapLayer, TargetNoteMarker } from '@/components/maps/map-types'
import { TARGET_NOTE_COLORS, BUFFER_COLORS } from '@/components/maps/map-types'
import { MapLayersDropdown } from '@/components/maps/map-layers-dropdown'
import { FindingMarkers } from '@/components/maps/finding-markers'

interface ProjectMapProps {
  className?: string
  center?: [number, number] // [lat, lng] for Leaflet
  zoom?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferDistances?: number[] // Buffer zones in km to display
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  targetNotes?: TargetNoteMarker[]
  selectedTargetNote?: TargetNoteMarker | null
  onTargetNoteClick?: (note: TargetNoteMarker) => void
  findings?: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  visibleFindingTypes?: string[]
  onBoundaryChange?: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onFindingClick?: (finding: DeskResearchFinding) => void
  onMapClick?: (latlng?: { lat: number; lng: number }) => void // Called when clicking on the map (not on a finding)
  onMapReady?: () => void
  editable?: boolean
  showControls?: boolean
}

// The actual map component that uses react-leaflet
function MapComponent({
  center,
  zoom,
  boundary,
  bufferDistances,
  habitatPolygons,
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
}: {
  center: [number, number]
  zoom: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferDistances?: number[]
  habitatPolygons?: GeoJSON.FeatureCollection
  observationPoints?: GeoJSON.FeatureCollection
  targetNotes?: TargetNoteMarker[]
  selectedTargetNote?: TargetNoteMarker | null
  onTargetNoteClick?: (note: TargetNoteMarker) => void
  findings?: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  visibleFindingTypes?: string[]
  currentStyle: MapStyle
  layers: MapLayer[]
  onMapReady?: () => void
  onFindingClick?: (finding: DeskResearchFinding) => void
  onMapClick?: (latlng?: { lat: number; lng: number }) => void
  mapRef: React.MutableRefObject<LeafletMap | null>
  showBatRecords?: boolean
  iwebsVisibleLayers?: string[]
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- react-leaflet must be client-side only
  const rl = require('react-leaflet')
  const { MapContainer, TileLayer, WMSTileLayer, GeoJSON, CircleMarker, Popup, useMap } = rl

  const boundaryLayer = layers.find((l) => l.id === 'boundary')
  const habitatLayer = layers.find((l) => l.id === 'habitats')
  const obsLayer = layers.find((l) => l.id === 'observations')
  const targetNotesLayer = layers.find((l) => l.id === 'target-notes')
  const countiesLayer = layers.find((l) => l.id === 'counties')
  const townlandsLayer = layers.find((l) => l.id === 'townlands')
  const tileConfig = TILE_LAYERS[currentStyle]

  // County boundaries data
  const [countiesData, setCountiesData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [countiesLoading, setCountiesLoading] = React.useState(false)

  // Townlands data (loaded on-demand based on viewport)
  const [townlandsData, setTownlandsData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [townlandsLoading, setTownlandsLoading] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(zoom)
  const townlandsBboxRef = React.useRef<string | null>(null)

  // Load county boundaries when layer becomes visible
  React.useEffect(() => {
    if (countiesLayer?.visible && !countiesData && !countiesLoading) {
      setCountiesLoading(true)
      fetch('/data/counties-ireland.geojson')
        .then((res) => res.json())
        .then((data) => {
          setCountiesData(data)
          setCountiesLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load county boundaries:', err)
          setCountiesLoading(false)
        })
    }
  }, [countiesLayer?.visible, countiesData, countiesLoading])

  // Function to load townlands for a given bbox
  const loadTownlandsForBbox = React.useCallback(
    async (bbox: string) => {
      if (townlandsLoading || bbox === townlandsBboxRef.current) return

      setTownlandsLoading(true)
      townlandsBboxRef.current = bbox

      try {
        const response = await fetch(`/api/boundaries/townlands?bbox=${bbox}&limit=500`)
        if (response.ok) {
          const data = await response.json()
          setTownlandsData(data)
        } else {
          console.error('Failed to load townlands:', response.status)
        }
      } catch (err) {
        console.error('Failed to load townlands:', err)
      } finally {
        setTownlandsLoading(false)
      }
    },
    [townlandsLoading]
  )

  // Track if we've EVER fit to a boundary in this component instance
  // This ref is at MapComponent level so it persists when MapController re-renders
  const hasFitToBoundaryRef = React.useRef(false)

  // Component to fit bounds and handle zoom to selected finding
  function MapController({
    boundary,
    selectedFinding,
    onMapClick,
  }: {
    boundary?: GeoJSON.Feature<GeoJSON.Polygon>
    selectedFinding?: DeskResearchFinding | null
    onMapClick?: (latlng?: { lat: number; lng: number }) => void
  }) {
    const map = useMap()

    // Add scale control
    React.useEffect(() => {
      if (!map) return
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const leaflet = require('leaflet')
      const scale = leaflet.control.scale({ metric: true, imperial: false, position: 'bottomleft' })
      scale.addTo(map)
      return () => {
        scale.remove()
      }
    }, [map])

    // Handle map click to clear selection and pass coordinates
    React.useEffect(() => {
      if (!map || !onMapClick) return

      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      }

      map.on('click', handleClick)

      return () => {
        map.off('click', handleClick)
      }
    }, [map, onMapClick])

    // Re-enable dragging when popup closes (fixes Leaflet bug where dragging stays disabled)
    React.useEffect(() => {
      if (!map) return

      const handlePopupClose = () => {
        // Small delay to ensure popup is fully closed
        setTimeout(() => {
          if (!map.dragging.enabled()) {
            map.dragging.enable()
          }
          if (!map.scrollWheelZoom.enabled()) {
            map.scrollWheelZoom.enable()
          }
        }, 10)
      }

      map.on('popupclose', handlePopupClose)

      return () => {
        map.off('popupclose', handlePopupClose)
      }
    }, [map])

    // Fit to boundary on initial load ONLY
    // Uses hasFitToBoundaryRef from parent scope so it persists across re-renders
    React.useEffect(() => {
      if (boundary && map && !hasFitToBoundaryRef.current) {
        // Check if center is at default position (user hasn't panned)
        // IRELAND_CENTER = [53.1424, -7.6921]
        const isDefaultCenter =
          Math.abs(center[0] - 53.1424) < 0.0001 && Math.abs(center[1] - -7.6921) < 0.0001

        // Only fit bounds if we haven't done it AND center is at default
        if (isDefaultCenter) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const L = require('leaflet')
          const geoJsonLayer = L.geoJSON(boundary)
          const bounds = geoJsonLayer.getBounds()
          map.fitBounds(bounds, { padding: [50, 50] })
        }
        // Mark as done regardless of whether we actually fit
        hasFitToBoundaryRef.current = true
      }
    }, [boundary, map])

    // Store map reference
    React.useEffect(() => {
      if (map) {
        mapRef.current = map
        onMapReady?.()
      }
    }, [map])

    // Track last zoomed finding ID to prevent re-zoom on data changes
    const lastZoomedFindingId = React.useRef<string | null>(null)

    // Zoom to selected finding - use setView instead of flyTo to avoid animation conflicts
    // Only zoom when the finding ID changes, not when other properties change
    React.useEffect(() => {
      if (selectedFinding?.location && map) {
        // Skip if we already zoomed to this finding
        if (lastZoomedFindingId.current === selectedFinding.id) {
          return
        }
        lastZoomedFindingId.current = selectedFinding.id

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet')
        try {
          const location = selectedFinding.location

          if (location.type === 'Point') {
            const [lng, lat] = location.coordinates as [number, number]
            map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
          } else if (location.type === 'Polygon' || location.type === 'MultiPolygon') {
            const geoJsonLayer = L.geoJSON(location)
            const bounds = geoJsonLayer.getBounds()
            map.fitBounds(bounds, { padding: [50, 50], animate: true })
          } else if (location.type === 'GeometryCollection') {
            // For GeometryCollection, zoom to first geometry
            const firstGeom = (location as GeoJSON.GeometryCollection).geometries[0]
            if (firstGeom?.type === 'Point') {
              const [lng, lat] = (firstGeom as GeoJSON.Point).coordinates
              map.setView([lat, lng], 14, { animate: true, duration: 0.3 })
            }
          } else if (location.type === 'LineString' || location.type === 'MultiLineString') {
            const geoJsonLayer = L.geoJSON(location)
            const bounds = geoJsonLayer.getBounds()
            map.fitBounds(bounds, { padding: [50, 50], animate: true })
          }
        } catch (error) {
          console.warn('Error zooming to finding:', error)
        }
      } else if (!selectedFinding) {
        // Reset tracking when selection is cleared
        lastZoomedFindingId.current = null
      }
    }, [selectedFinding, map])

    // Track zoom level and load townlands when appropriate
    React.useEffect(() => {
      if (!map) return

      const handleZoomEnd = () => {
        const newZoom = map.getZoom()
        setCurrentZoom(newZoom)

        // Load townlands only at zoom 12+ and when layer is visible
        if (newZoom >= 12 && townlandsLayer?.visible) {
          const bounds = map.getBounds()
          const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
          loadTownlandsForBbox(bbox)
        }
      }

      const handleMoveEnd = () => {
        const currentZoomLevel = map.getZoom()
        // Reload townlands when panning at high zoom
        if (currentZoomLevel >= 12 && townlandsLayer?.visible) {
          const bounds = map.getBounds()
          const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
          loadTownlandsForBbox(bbox)
        }
      }

      map.on('zoomend', handleZoomEnd)
      map.on('moveend', handleMoveEnd)

      // Initial check
      handleZoomEnd()

      return () => {
        map.off('zoomend', handleZoomEnd)
        map.off('moveend', handleMoveEnd)
      }
    }, [map, townlandsLayer?.visible, loadTownlandsForBbox])

    // I-WEBS layers — fetch and render BirdWatch Ireland wetland bird survey data
    useIWebsLayers(map, boundary ?? null, iwebsVisibleLayers ?? [])

    return null
  }

  // Filter findings by visible types
  const visibleFindings = React.useMemo(() => {
    if (!findings) return []
    if (!visibleFindingTypes || visibleFindingTypes.length === 0) return findings
    return findings.filter((f) => visibleFindingTypes.includes(f.dataType))
  }, [findings, visibleFindingTypes])

  const findingsLayer = layers.find((l) => l.id === 'findings')

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full min-h-100 w-full"
      style={{ height: '100%', minHeight: '400px' }}
      zoomControl={false}
    >
      {/* Base map — WMS, TMS, or regular tile depending on style */}
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
      {/* Labels overlay for hybrid mode */}
      {currentStyle === 'hybrid' && (
        <TileLayer
          key="hybrid-labels"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          pane="overlayPane"
        />
      )}
      {/* GBIF bat records overlay */}
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
      <MapController
        boundary={boundary}
        selectedFinding={selectedFinding}
        onMapClick={onMapClick}
      />

      {/* County Boundaries - render at bottom as reference layer */}
      {countiesLayer?.visible && countiesData && (
        <GeoJSON
          key="county-boundaries"
          data={countiesData}
          style={(feature: GeoJSON.Feature | undefined) => {
            const province = feature?.properties?.province as string | undefined
            // Province-based coloring
            const provinceColors: Record<string, string> = {
              Leinster: '#3b82f6',
              Munster: '#22c55e',
              Connacht: '#f59e0b',
              Ulster: '#ef4444',
            }
            const color = province ? provinceColors[province] || '#f97316' : '#f97316'
            return {
              color: color,
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.03,
              dashArray: '4, 4',
            }
          }}
          onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
            const props = feature.properties as Record<string, string> | null
            if (props) {
              ;(layer as L.GeoJSON).bindPopup(`
                <div style="min-width: 150px;">
                  <strong>${props.name || 'Unknown'}</strong>
                  ${props.nameIrish ? `<br/><em>${props.nameIrish}</em>` : ''}
                  <br/><span style="color: #666;">Province: ${props.province || 'Unknown'}</span>
                  <br/><small style="color: #999;">© Tailte Éireann (CC-BY 4.0)</small>
                </div>
              `)
            }
          }}
        />
      )}

      {/* Townland Boundaries - render only at high zoom levels */}
      {townlandsLayer?.visible && townlandsData && currentZoom >= 12 && (
        <GeoJSON
          key={`townlands-${townlandsBboxRef.current}`}
          data={townlandsData}
          style={() => ({
            color: '#a855f7',
            weight: 1,
            fillColor: '#a855f7',
            fillOpacity: 0.02,
            dashArray: '2, 2',
          })}
          onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
            const props = feature.properties as Record<string, string | number | null> | null
            if (props) {
              ;(layer as L.GeoJSON).bindPopup(`
                <div style="min-width: 180px;">
                  <strong>${props.name || 'Unknown Townland'}</strong>
                  ${props.nameIrish ? `<br/><em>${props.nameIrish}</em>` : ''}
                  ${props.areaHectares ? `<br/><span style="color: #666;">Area: ${props.areaHectares} ha</span>` : ''}
                  <br/><small style="color: #999;">© Tailte Éireann (CC-BY 4.0)</small>
                </div>
              `)
            }
          }}
        />
      )}

      {/* Townlands loading indicator */}
      {townlandsLayer?.visible && townlandsLoading && currentZoom >= 12 && (
        <div className="absolute top-4 right-4 z-1000 rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Loading townlands...
        </div>
      )}

      {/* Townlands zoom hint */}
      {townlandsLayer?.visible && currentZoom < 12 && (
        <div className="absolute top-4 right-4 z-1000 rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Zoom in to see townlands (zoom 12+)
        </div>
      )}

      {/* Buffer Zones - render largest first (underneath) */}
      {boundary &&
        bufferDistances &&
        bufferDistances.length > 0 &&
        [...bufferDistances]
          .sort((a, b) => b - a) // Largest first so they render underneath
          .map((distance) => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const turf = require('@turf/turf')
            try {
              const buffered = turf.buffer(boundary, distance, { units: 'kilometers' })
              const color = BUFFER_COLORS[distance] || '#6b7280'
              return (
                <GeoJSON
                  key={`buffer-${distance}`}
                  data={buffered}
                  style={{
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.05,
                    dashArray: '5, 5',
                  }}
                />
              )
            } catch (error) {
              console.warn(`Error creating buffer for ${distance}km:`, error)
              return null
            }
          })}

      {/* Project Boundary */}
      {boundary && boundaryLayer?.visible && (
        <GeoJSON
          key={`boundary-${JSON.stringify(boundary).slice(0, 100)}`}
          data={boundary}
          style={{
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.1,
          }}
        />
      )}

      {/* Habitat Polygons — rendered as single GeoJSON for performance */}
      {habitatPolygons && habitatPolygons.features.length > 0 && habitatLayer?.visible && (
        <GeoJSON
          key={`habitats-${String(habitatPolygons.features[0]?.properties?._highlight ?? 'all')}-${habitatPolygons.features.length}`}
          data={habitatPolygons}
          style={(feature: GeoJSON.Feature | undefined) => {
            const props = feature?.properties
            const opacity = (props?.fillOpacity as number) ?? 0.5
            return {
              color: (props?.color as string) || '#22c55e',
              weight: opacity > 0.3 ? 1.5 : 0.5,
              fillColor: (props?.color as string) || '#22c55e',
              fillOpacity: opacity,
            }
          }}
          onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
            const props = feature.properties
            if (props) {
              ;(layer as L.GeoJSON).bindPopup(`
                  <div style="min-width:180px;padding:8px">
                    <strong style="font-size:14px">${props.fossitt_name || ''}</strong>
                    <div style="color:#374151;font-size:13px;margin-top:2px">${props.fossitt_code || ''}</div>
                    ${props.nlc_label ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">NLC: ${props.nlc_label}</div>` : ''}
                    ${props.area_hectares ? `<div style="font-size:13px;margin-top:4px">Area: ${props.area_hectares} ha</div>` : ''}
                  </div>
                `)
            }
          }}
        />
      )}

      {/* Observation Points */}
      {observationPoints &&
        observationPoints.features.length > 0 &&
        obsLayer?.visible &&
        observationPoints.features.map((feature, index) => {
          const coords = (feature.geometry as GeoJSON.Point).coordinates
          const props = feature.properties
          const isProtected = props?.is_protected

          return (
            <CircleMarker
              key={`obs-${index}`}
              center={[coords[1], coords[0]]} // Leaflet uses [lat, lng]
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: isProtected ? '#ef4444' : '#22c55e',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">
                    {props?.species_name_common || props?.species_name_scientific}
                  </h3>
                  <p className="text-sm text-gray-600">{props?.species_name_scientific}</p>
                  {isProtected && (
                    <span className="rounded bg-red-100 px-1 text-xs text-red-800">Protected</span>
                  )}
                  {props?.count && <p className="mt-1 text-sm">Count: {props.count}</p>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {/* Target Notes */}
      {targetNotes &&
        targetNotes.length > 0 &&
        (targetNotesLayer?.visible ?? true) &&
        targetNotes.map((note) => {
          if (!note.location?.coordinates) return null

          const [lng, lat] = note.location.coordinates
          const isSelected = selectedTargetNote?.id === note.id
          const color = TARGET_NOTE_COLORS[note.category] || '#8b5cf6'
          const isHighPriority = note.priority === 'high'
          const baseRadius = isHighPriority ? 10 : 8

          return (
            <CircleMarker
              key={`target-note-${note.id}`}
              center={[lat, lng]}
              radius={isSelected ? baseRadius + 4 : baseRadius}
              pathOptions={{
                color: isSelected ? '#fbbf24' : '#ffffff',
                weight: isSelected ? 3 : 2,
                fillColor: note.isVerified ? '#22c55e' : color,
                fillOpacity: isSelected ? 1 : 0.85,
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const L = require('leaflet')
                  L.DomEvent.stopPropagation(e)
                  onTargetNoteClick?.(note)
                },
              }}
            >
              <Popup>
                <div className="max-w-xs p-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white capitalize"
                      style={{ backgroundColor: color }}
                    >
                      {note.category.replace('_', ' ')}
                    </span>
                    {isHighPriority && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                        High Priority
                      </span>
                    )}
                    {note.isVerified && (
                      <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
                        Verified
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{note.title}</h3>
                  {note.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{note.description}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {/* Desk Research Findings */}
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

// Dynamic import wrapper
const DynamicMapComponent = dynamic(() => Promise.resolve(MapComponent), { ssr: false })

export function ProjectMap({
  className,
  center = IRELAND_CENTER,
  zoom = DEFAULT_ZOOM,
  boundary,
  bufferDistances,
  habitatPolygons,
  observationPoints,
  targetNotes,
  selectedTargetNote,
  onTargetNoteClick,
  findings,
  selectedFinding,
  visibleFindingTypes,
  onFindingClick,
  onMapClick,
  onMapReady,
  showControls = true,
}: ProjectMapProps) {
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [currentStyle, setCurrentStyle] = React.useState<MapStyle>('satellite')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [showBatRecords, setShowBatRecords] = React.useState(false)
  const [iwebsVisibleLayers, setIwebsVisibleLayers] = React.useState<string[]>([])
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

  // Set map loaded on mount
  React.useEffect(() => {
    setMapLoaded(true)
  }, [])

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
    )
  }

  // Toggle fullscreen
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
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        <div className="bg-muted/50 flex h-full min-h-100 w-full items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Map container */}
      <div className="h-full min-h-100 w-full">
        <DynamicMapComponent
          center={center}
          zoom={zoom}
          boundary={boundary}
          bufferDistances={bufferDistances}
          habitatPolygons={habitatPolygons}
          observationPoints={observationPoints}
          targetNotes={targetNotes}
          selectedTargetNote={selectedTargetNote}
          onTargetNoteClick={onTargetNoteClick}
          findings={findings}
          selectedFinding={selectedFinding}
          visibleFindingTypes={visibleFindingTypes}
          currentStyle={currentStyle}
          layers={layers}
          onMapReady={onMapReady}
          onFindingClick={onFindingClick}
          onMapClick={onMapClick}
          mapRef={mapRef}
          showBatRecords={showBatRecords}
          iwebsVisibleLayers={iwebsVisibleLayers}
        />
      </div>

      {/* Map controls overlay */}
      {showControls && (
        <div
          data-map-control="true"
          className="pointer-events-auto absolute top-4 left-4 z-9999 flex flex-col gap-2"
        >
          {/* Layers dropdown */}
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

          {/* Fullscreen toggle */}
          <Button variant="secondary" size="icon" className="shadow-md" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
