'use client'

import * as React from 'react'
import type L from 'leaflet'

interface HabitatPolygonLayerProps {
  habitatPolygons: GeoJSON.FeatureCollection
  habitatSelectionKey?: string
  /** react-leaflet GeoJSON component (passed to avoid duplicate require) */
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

// Leaflet diffs the `style` and `onEachFeature` props by reference and
// rebuilds the layer if they change. Keep both at module scope so each
// parent re-render reuses the same functions.
function habitatStyle(feature: GeoJSON.Feature | undefined) {
  const props = feature?.properties
  const fill = (props?.fillOpacity as number) ?? 0.35
  const isHighlighted = fill > 0.5
  const isFaded = fill < 0.1
  const habitatColor = (props?.color as string) || '#808080'
  return {
    color: isHighlighted ? '#000000' : '#1e293b',
    weight: isHighlighted ? 2.5 : isFaded ? 0 : 1.5,
    opacity: isFaded ? 0 : 0.8,
    fillColor: habitatColor,
    fillOpacity: fill,
  }
}

function habitatOnEachFeature(feature: GeoJSON.Feature, layer: L.Layer) {
  const props = feature.properties
  if (!props) return
  ;(layer as L.GeoJSON).bindPopup(`
    <div style="min-width:180px;padding:8px">
      <strong style="font-size:14px">${props.fossitt_name || ''}</strong>
      <div style="color:#374151;font-size:13px;margin-top:2px">${props.fossitt_code || ''}</div>
      ${props.nlc_label ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">NLC: ${props.nlc_label}</div>` : ''}
      ${props.area_hectares ? `<div style="font-size:13px;margin-top:4px">Area: ${props.area_hectares} ha</div>` : ''}
    </div>
  `)
  // FOSSITT labels — bind tooltip always but only show at zoom 14+
  if (props.fossitt_code && props.fossitt_code !== '\u2014') {
    ;(layer as L.GeoJSON).bindTooltip(props.fossitt_code, {
      permanent: true,
      direction: 'center',
      className: 'habitat-fossitt-label',
    })
  }
}

/**
 * Renders habitat polygons as a single GeoJSON layer.
 * Supports selection highlighting and FOSSITT code tooltips.
 */
export function HabitatPolygonLayer({
  habitatPolygons,
  habitatSelectionKey,
  GeoJSON,
}: HabitatPolygonLayerProps) {
  // Memoize the layer key so identical inputs produce identical key strings
  // (avoiding accidental remounts when the parent re-renders with the same
  // feature collection).
  const layerKey = React.useMemo(
    () => `habitats-${habitatSelectionKey || 'all'}-${habitatPolygons.features.length}`,
    [habitatSelectionKey, habitatPolygons.features.length]
  )

  if (!habitatPolygons.features.length) return null

  return (
    <GeoJSON
      key={layerKey}
      data={habitatPolygons}
      style={habitatStyle}
      onEachFeature={habitatOnEachFeature}
    />
  )
}
