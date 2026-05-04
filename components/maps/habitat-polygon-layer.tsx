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

// Escape user/server values before injecting into the popup HTML below.
// Properties come from the NLC FeatureServer today, but a future code path
// could surface saved findings whose names round-tripped through user input —
// cheap defense in depth.
function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
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
  // Hook rules: useMap MUST be called every render to keep hook order
  // stable. Conditional optional-chaining call (`useMap?.()`) varied the
  // hook count between renders — flagged by the React lint and could trip
  // a `Rendered fewer hooks than expected` error in production. The dummy
  // fallback fn returns null and is invoked unconditionally.
  const useMapHook = useMap ?? (() => null as unknown as L.Map)
  const map = useMapHook()

  if (useHatchPatterns && !svgRendererRef.current) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Llib = require('leaflet')
    svgRendererRef.current = Llib.svg({ padding: 0.1 })
  }
  const svgRendererForStyle = useHatchPatterns ? svgRendererRef.current : null

  // The GeoJSON instance — needed to walk the rendered child paths after
  // pattern defs are injected, since onEachFeature runs synchronously
  // during the layer constructor (before any useEffect can populate
  // patternIdMapRef on the very first render with hatch on).
  const geoJsonRef = React.useRef<L.GeoJSON | null>(null)

  // Inject pattern <defs> AND back-fill `fill="url(#...)"` on every path
  // that's already been constructed. The double-pass is necessary because
  // react-leaflet's GeoJSON child effect runs before this parent effect:
  // by the time we land here the paths exist but their fills are still the
  // Leaflet default. Without the back-fill the user had to toggle Hatch
  // off+on to see patterns on the first activation.
  const patternIdMapRef = React.useRef<Map<string, string>>(new Map())
  React.useEffect(() => {
    if (!useHatchPatterns || !map || !svgRendererRef.current) return
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

    // Back-fill paths that were constructed before defs were ready, AND
    // re-resolve patterns when palette toggle (useNativeColors) shifted
    // colours under the existing layer.
    const gj = geoJsonRef.current
    if (gj) {
      gj.eachLayer((sub) => {
        const feat = (sub as unknown as { feature?: GeoJSON.Feature }).feature
        if (!feat?.properties) return
        const fc = feat.properties.fossitt_code as string | undefined
        const colour = resolveColor(feat.properties, useNativeColors)
        const shape = getHeritagePatternShape(fc)
        if (shape === 'solid') return
        const stroke = darkenHex(colour, 0.55)
        const id = patternIdMapRef.current.get(`${shape}|${stroke}`)
        if (!id) return
        const path = (sub as unknown as { _path?: SVGPathElement })._path
        if (path) path.setAttribute('fill', `url(#${id})`)
      })
    }
  }, [useHatchPatterns, map, habitatPolygons, useNativeColors])

  const habitatStyle = React.useMemo(
    () => makeHabitatStyle(useNativeColors, svgRendererForStyle),
    [useNativeColors, svgRendererForStyle]
  )

  const onEachFeature = React.useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      const props = feature.properties
      if (!props) return
      const name = escapeHtml(props.fossitt_name)
      const code = escapeHtml(props.fossitt_code)
      const nlcLabel = props.nlc_label ? escapeHtml(props.nlc_label) : ''
      const area = props.area_hectares ? escapeHtml(props.area_hectares) : ''
      ;(layer as L.GeoJSON).bindPopup(`
      <div style="min-width:180px;padding:8px">
        <strong style="font-size:14px">${name}</strong>
        <div style="color:#374151;font-size:13px;margin-top:2px">${code}</div>
        ${nlcLabel ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">NLC: ${nlcLabel}</div>` : ''}
        ${area ? `<div style="font-size:13px;margin-top:4px">Area: ${area} ha</div>` : ''}
      </div>
    `)

      // Pattern fill — resolve patternId LAZILY inside `apply` so the call
      // reads the latest patternIdMapRef even when registered before the
      // injector effect has populated it. The `add` listener fires when
      // Leaflet attaches the path; the second invocation handles the case
      // where this feature is being processed during a re-render path
      // (layer already in the DOM).
      if (useHatchPatterns) {
        const apply = () => {
          const path = (layer as unknown as { _path?: SVGPathElement })._path
          if (!path) return
          const colour = resolveColor(props, useNativeColors)
          const shape = getHeritagePatternShape(props.fossitt_code as string | undefined)
          if (shape === 'solid') return
          const stroke = darkenHex(colour, 0.55)
          const id = patternIdMapRef.current.get(`${shape}|${stroke}`)
          if (id) path.setAttribute('fill', `url(#${id})`)
        }
        layer.on('add', apply)
        apply()
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
      ref={(instance: L.GeoJSON | null) => {
        geoJsonRef.current = instance
      }}
      data={habitatPolygons}
      style={habitatStyle}
      onEachFeature={onEachFeature}
    />
  )
}
