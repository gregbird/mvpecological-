'use client'

import type L from 'leaflet'

// ─── Province colour palette ─────────────────────────────────────────────────

const PROVINCE_COLORS: Record<string, string> = {
  Leinster: '#3b82f6',
  Munster: '#22c55e',
  Connacht: '#f59e0b',
  Ulster: '#ef4444',
}

// ─── County layer ────────────────────────────────────────────────────────────

interface CountyLayerProps {
  countiesData: GeoJSON.FeatureCollection
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

/** County boundaries with province-based colouring and popup. */
export function CountyLayer({ countiesData, GeoJSON }: CountyLayerProps) {
  return (
    <GeoJSON
      key="county-boundaries"
      data={countiesData}
      style={(feature: GeoJSON.Feature | undefined) => {
        const province = feature?.properties?.province as string | undefined
        const color = province ? PROVINCE_COLORS[province] || '#f97316' : '#f97316'
        return {
          color,
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
              <br/><small style="color: #999;">&copy; Tailte &Eacute;ireann (CC-BY 4.0)</small>
            </div>
          `)
        }
      }}
    />
  )
}

// ─── Townland layer ──────────────────────────────────────────────────────────

interface TownlandLayerProps {
  townlandsData: GeoJSON.FeatureCollection
  townlandsBboxKey: string | null
  currentZoom: number
  townlandsLoading: boolean
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

/** Townland boundaries rendered at zoom 12+ with loading/zoom hints. */
export function TownlandLayer({
  townlandsData,
  townlandsBboxKey,
  currentZoom,
  townlandsLoading,
  GeoJSON,
}: TownlandLayerProps) {
  return (
    <>
      {currentZoom >= 12 ? (
        <GeoJSON
          key={`townlands-${townlandsBboxKey}`}
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
                  <br/><small style="color: #999;">&copy; Tailte &Eacute;ireann (CC-BY 4.0)</small>
                </div>
              `)
            }
          }}
        />
      ) : (
        <div className="absolute top-4 right-4 z-1000 rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Zoom in to see townlands (zoom 12+)
        </div>
      )}
      {townlandsLoading && currentZoom >= 12 && (
        <div className="absolute top-4 right-4 z-1000 rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
          Loading townlands...
        </div>
      )}
    </>
  )
}

// ─── Grid overlay (NBDC searched squares) ────────────────────────────────────

interface GridOverlayLayerProps {
  gridOverlay: GeoJSON.FeatureCollection
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

/** NBDC grid square overlay with species count tooltips. */
export function GridOverlayLayer({ gridOverlay, GeoJSON }: GridOverlayLayerProps) {
  if (!gridOverlay.features.length) return null

  return (
    <GeoJSON
      key={`grid-overlay-${gridOverlay.features.length}`}
      data={gridOverlay}
      style={(feature: GeoJSON.Feature | undefined) => ({
        color: '#7c3aed',
        weight: 1.5,
        opacity: 0.7,
        fillColor: '#7c3aed',
        fillOpacity: feature?.properties?.fillOpacity ?? 0.08,
        dashArray: '4 4',
      })}
      onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = feature.properties
        if (props?.label) {
          ;(layer as L.Path).bindTooltip(
            `${props.label}${props.speciesCount ? ` · ${props.speciesCount} species` : ''}`,
            { sticky: true, className: 'text-xs' }
          )
        }
      }}
    />
  )
}
