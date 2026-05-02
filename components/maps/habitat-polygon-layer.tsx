'use client'

import * as React from 'react'
import type L from 'leaflet'

interface HabitatPolygonLayerProps {
  habitatPolygons: GeoJSON.FeatureCollection
  habitatSelectionKey?: string
  /** react-leaflet GeoJSON component (passed to avoid duplicate require) */
  GeoJSON: React.ComponentType<Record<string, unknown>>
}

// Darken a hex colour for stroke contrast. Returns the input on parse failure.
function darkenHex(hex: string, factor = 0.65) {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex
  const expand = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
  const r = Math.round(parseInt(expand.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(expand.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(expand.slice(5, 7), 16) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Style function stays at module scope — pure, references no closures.
// Server-side quantization + polygon-clipping union now produce clean parcel
// boundaries (no TIN triangle artifacts). We can give each habitat a darker
// stroke so adjacent fields read as distinct shapes — matches Esri viewer.
function habitatStyle(feature: GeoJSON.Feature | undefined) {
  const props = feature?.properties
  const fill = (props?.fillOpacity as number) ?? 0.35
  const isHighlighted = fill > 0.5
  const isFaded = fill < 0.1
  const habitatColor = (props?.color as string) || '#808080'
  const strokeColor = darkenHex(habitatColor)
  return {
    color: isFaded ? habitatColor : strokeColor,
    weight: isFaded ? 0 : isHighlighted ? 1.2 : 0.7,
    opacity: isFaded ? 0 : isHighlighted ? 0.9 : 0.6,
    fillColor: habitatColor,
    fillOpacity: fill,
  }
}

/**
 * Renders habitat polygons as a single GeoJSON layer.
 * Supports selection highlighting, popup details, and selection-aware
 * FOSSITT code tooltips: when a habitat is selected (parent dims unrelated
 * polygons by setting `fillOpacity < 0.1`), only the highlighted polygon
 * keeps its FOSSITT label visible.
 */
export function HabitatPolygonLayer({
  habitatPolygons,
  habitatSelectionKey,
  GeoJSON,
}: HabitatPolygonLayerProps) {
  // Selection-aware tooltip binding. The layer key below includes
  // habitatSelectionKey, so Leaflet rebuilds the layer (and re-runs this
  // callback) whenever the user picks a different habitat — at which point
  // the parent's spatial filter has updated each feature's fillOpacity,
  // letting us decide here whether to bind a label.
  const onEachFeature = React.useCallback((feature: GeoJSON.Feature, layer: L.Layer) => {
    const props = feature.properties
    if (!props) return // Popup is always bound — independent of selection state.
    ;(layer as L.GeoJSON).bindPopup(`
      <div style="min-width:180px;padding:8px">
        <strong style="font-size:14px">${props.fossitt_name || ''}</strong>
        <div style="color:#374151;font-size:13px;margin-top:2px">${props.fossitt_code || ''}</div>
        ${props.nlc_label ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">NLC: ${props.nlc_label}</div>` : ''}
        ${props.area_hectares ? `<div style="font-size:13px;margin-top:4px">Area: ${props.area_hectares} ha</div>` : ''}
      </div>
    `)

    // When a habitat is selected, the parent fades unrelated polygons via
    // fillOpacity < 0.1. Skip the label on those so only the highlighted
    // (selected) polygon shows its FOSSITT code.
    const fill = (props.fillOpacity as number) ?? 0.35
    if (fill < 0.1) return

    if (props.fossitt_code && props.fossitt_code !== '\u2014') {
      ;(layer as L.GeoJSON).bindTooltip(props.fossitt_code, {
        permanent: true,
        direction: 'center',
        className: 'habitat-fossitt-label',
      })
    }
  }, [])

  // Layer key includes the selection so Leaflet rebuilds the layer when the
  // user picks a different habitat — necessary because tooltips are bound
  // during construction in `onEachFeature`.
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
      onEachFeature={onEachFeature}
    />
  )
}
