'use client'

import * as React from 'react'
import type L from 'leaflet'
import { NLC_NATIVE_LEVEL2_COLORS, NLC_LEVEL1_COLORS } from '@/lib/external-apis/osi'
import {
  ensurePatternDefs,
  getHeritagePatternShape,
  type PatternShape,
} from '@/lib/config/heritage-patterns'

interface HabitatPolygonLayerProps {
  habitatPolygons: GeoJSON.FeatureCollection
  habitatSelectionKey?: string
  /** react-leaflet GeoJSON component (passed to avoid duplicate require) */
  GeoJSON: React.ComponentType<Record<string, unknown>>
  /** react-leaflet useMap hook — required when useHatchPatterns is true so we
   * can inject SVG `<defs>` for the patterns. Optional otherwise. */
  useMap?: () => L.Map
  /**
   * When true, fill colour comes from NLC's native 37-shade palette
   * (buildings red, ways gray, hedgerows plum, etc.) instead of the
   * Heritage Council palette baked in at fetch time. Resolved per render
   * — toggling does not require a refetch.
   */
  useNativeColors?: boolean
  /**
   * When true, polygons render with Heritage Council Appendix 6 hatch
   * patterns (horizontal lines, crosshatch, diagonal stripes, etc.) on
   * top of the colour fill. Forces SVG renderer for this layer because
   * Leaflet canvas does not support SVG patterns.
   */
  useHatchPatterns?: boolean
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

function resolveColor(
  props: GeoJSON.GeoJsonProperties | undefined,
  useNativeColors: boolean
): string {
  if (useNativeColors) {
    const label = props?.nlc_label as string | undefined
    const native = label ? NLC_NATIVE_LEVEL2_COLORS[label] : undefined
    if (native) return native
    const level1 = props?.nlc_level1 as string | undefined
    return (level1 && NLC_LEVEL1_COLORS[level1]) || '#808080'
  }
  // Heritage Council palette is baked into props.color at fetch time.
  return (props?.color as string) || '#808080'
}

// Style function is built per-render so it can close over the active palette
// flag. Cheap — Leaflet only invokes it once per feature when the layer
// mounts.
function makeHabitatStyle(useNativeColors: boolean, svgRenderer: L.Renderer | null) {
  return (feature: GeoJSON.Feature | undefined) => {
    const props = feature?.properties
    const fill = (props?.fillOpacity as number) ?? 0.35
    const isHighlighted = fill > 0.5
    const isFaded = fill < 0.1
    const habitatColor = resolveColor(props, useNativeColors)
    const strokeColor = darkenHex(habitatColor)
    const style: L.PathOptions = {
      color: isFaded ? habitatColor : strokeColor,
      weight: isFaded ? 0 : isHighlighted ? 1.2 : 0.7,
      opacity: isFaded ? 0 : isHighlighted ? 0.9 : 0.6,
      fillColor: habitatColor,
      fillOpacity: fill,
    }
    // Force SVG renderer for this layer when patterns are active — canvas
    // doesn't support SVG <pattern> fills.
    if (svgRenderer) style.renderer = svgRenderer
    return style
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
  useMap,
  useNativeColors = false,
  useHatchPatterns = false,
}: HabitatPolygonLayerProps) {
  // SVG renderer is created lazily and only when patterns are active. It
  // lives in a ref so the same instance is reused across re-renders (and
  // therefore across child <GeoJSON> remounts triggered by layerKey).
  const svgRendererRef = React.useRef<L.Renderer | null>(null)
  // useMap may be undefined when the parent doesn't pass it (legacy callers
  // that don't use patterns). Guard with optional chaining.
  const map = useMap?.()

  if (useHatchPatterns && !svgRendererRef.current) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Llib = require('leaflet')
    svgRendererRef.current = Llib.svg({ padding: 0.1 })
  }
  const svgRendererForStyle = useHatchPatterns ? svgRendererRef.current : null

  // Inject pattern <defs> + record id map. We rebuild the id map whenever
  // the feature collection changes so newly-arrived habitat types get
  // their patterns ready before the layer paints.
  const patternIdMapRef = React.useRef<Map<string, string>>(new Map())
  React.useEffect(() => {
    if (!useHatchPatterns || !map || !svgRendererRef.current) return
    // Make sure the renderer is attached so its container exists.
    svgRendererRef.current.addTo(map)
    const container = (svgRendererRef.current as unknown as { _container?: SVGSVGElement })
      ._container
    if (!container) return
    const items: { shape: PatternShape; stroke: string }[] = []
    const seen = new Set<string>()
    for (const feature of habitatPolygons.features) {
      const fossittCode = feature.properties?.fossitt_code as string | undefined
      const colour = resolveColor(feature.properties, useNativeColors)
      const shape = getHeritagePatternShape(fossittCode)
      const stroke = darkenHex(colour, 0.55)
      const key = `${shape}|${stroke}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ shape, stroke })
    }
    patternIdMapRef.current = ensurePatternDefs(container, items)
  }, [useHatchPatterns, map, habitatPolygons, useNativeColors])

  const habitatStyle = React.useMemo(
    () => makeHabitatStyle(useNativeColors, svgRendererForStyle),
    [useNativeColors, svgRendererForStyle]
  )

  const onEachFeature = React.useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
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

      // Pattern fill — set on the SVG path after Leaflet creates it. We
      // hook into 'add' because _path is only attached then.
      if (useHatchPatterns) {
        const fossittCode = props.fossitt_code as string | undefined
        const colour = resolveColor(props, useNativeColors)
        const shape = getHeritagePatternShape(fossittCode)
        const stroke = darkenHex(colour, 0.55)
        const patternId = patternIdMapRef.current.get(`${shape}|${stroke}`)
        if (patternId && shape !== 'solid') {
          const apply = () => {
            const path = (layer as unknown as { _path?: SVGPathElement })._path
            if (path) path.setAttribute('fill', `url(#${patternId})`)
          }
          layer.on('add', apply)
          // Already added when `onEachFeature` runs from a re-render path.
          apply()
        }
      }

      // When a habitat is selected, the parent fades unrelated polygons via
      // fillOpacity < 0.1. Skip the label on those so only the highlighted
      // (selected) polygon shows its FOSSITT code.
      const fill = (props.fillOpacity as number) ?? 0.35
      if (fill < 0.1) return

      // Each parcel is now an individual feature, so without a guard the map
      // would stack "GA1, GA1, GA1..." labels on every field of the same type.
      // The fetcher (osi.ts) marks the largest parcel per habitat as the
      // label anchor — tooltip only that one.
      if (!props.is_label_anchor) return

      if (props.fossitt_code && props.fossitt_code !== '—') {
        ;(layer as L.GeoJSON).bindTooltip(props.fossitt_code, {
          permanent: true,
          direction: 'center',
          className: 'habitat-fossitt-label',
        })
      }
    },
    [useHatchPatterns, useNativeColors]
  )

  // Layer key includes everything that changes the visual output so Leaflet
  // rebuilds the layer when the user flips a toggle — setStyle() doesn't
  // re-evaluate the style function on already-mounted features.
  const layerKey = React.useMemo(
    () =>
      `habitats-${habitatSelectionKey || 'all'}-${habitatPolygons.features.length}-${useNativeColors ? 'nlc' : 'hc'}-${useHatchPatterns ? 'hatch' : 'flat'}`,
    [habitatSelectionKey, habitatPolygons.features.length, useNativeColors, useHatchPatterns]
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
