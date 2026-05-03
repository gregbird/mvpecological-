/**
 * Heritage Council Habitat Symbology Patterns (Appendix 6)
 * Source: Heritage Council — Habitat Survey Guidelines (Draft No.2, April 2005)
 *
 * Each FOSSITT habitat prefix maps to one of ~10 base SVG pattern shapes
 * (horizontal lines, crosshatch, diagonal stripes, etc.). Pattern strokes
 * use a darker shade of the Heritage Council fill colour so the symbology
 * works on both white and satellite backgrounds.
 *
 * Used by the high-zoom viewport detail layer when the user toggles the
 * "Hatch" button on. The renderer overlays these as SVG patterns on top
 * of the existing solid colour fills.
 */

export type PatternShape =
  | 'solid'
  | 'horizontal-lines'
  | 'vertical-lines'
  | 'crosshatch'
  | 'diagonal-forward'
  | 'diagonal-backward'
  | 'diagonal-crosshatch'
  | 'dotted'
  | 'brick'
  | 'triple-hash'
  | 'rocky-cliffs'

interface PatternSpec {
  width: number
  height: number
  /** SVG body. `{stroke}` is replaced with the pattern stroke colour. */
  body: (stroke: string) => string
}

/**
 * Pattern shape recipes. Each is a small SVG tile (typically 8-12 px) that
 * tiles edge-to-edge via `patternUnits="userSpaceOnUse"`.
 */
export const PATTERN_SHAPES: Record<PatternShape, PatternSpec> = {
  solid: {
    width: 1,
    height: 1,
    body: () => '',
  },
  'horizontal-lines': {
    width: 8,
    height: 8,
    body: (s) => `<line x1="0" y1="4" x2="8" y2="4" stroke="${s}" stroke-width="1.2" />`,
  },
  'vertical-lines': {
    width: 8,
    height: 8,
    body: (s) => `<line x1="4" y1="0" x2="4" y2="8" stroke="${s}" stroke-width="1.2" />`,
  },
  crosshatch: {
    width: 8,
    height: 8,
    body: (s) =>
      `<line x1="0" y1="4" x2="8" y2="4" stroke="${s}" stroke-width="1" />` +
      `<line x1="4" y1="0" x2="4" y2="8" stroke="${s}" stroke-width="1" />`,
  },
  'diagonal-forward': {
    width: 8,
    height: 8,
    body: (s) =>
      `<line x1="0" y1="8" x2="8" y2="0" stroke="${s}" stroke-width="1.2" />` +
      // Repeat at edges so tiles align cleanly
      `<line x1="-2" y1="2" x2="2" y2="-2" stroke="${s}" stroke-width="1.2" />` +
      `<line x1="6" y1="10" x2="10" y2="6" stroke="${s}" stroke-width="1.2" />`,
  },
  'diagonal-backward': {
    width: 8,
    height: 8,
    body: (s) =>
      `<line x1="0" y1="0" x2="8" y2="8" stroke="${s}" stroke-width="1.2" />` +
      `<line x1="-2" y1="6" x2="2" y2="10" stroke="${s}" stroke-width="1.2" />` +
      `<line x1="6" y1="-2" x2="10" y2="2" stroke="${s}" stroke-width="1.2" />`,
  },
  'diagonal-crosshatch': {
    width: 10,
    height: 10,
    body: (s) =>
      `<line x1="0" y1="10" x2="10" y2="0" stroke="${s}" stroke-width="1" />` +
      `<line x1="0" y1="0" x2="10" y2="10" stroke="${s}" stroke-width="1" />`,
  },
  dotted: {
    width: 8,
    height: 8,
    body: (s) => `<circle cx="4" cy="4" r="1.2" fill="${s}" />`,
  },
  brick: {
    width: 12,
    height: 8,
    body: (s) =>
      `<line x1="0" y1="4" x2="12" y2="4" stroke="${s}" stroke-width="1" />` +
      `<line x1="6" y1="0" x2="6" y2="4" stroke="${s}" stroke-width="1" />` +
      `<line x1="0" y1="4" x2="0" y2="8" stroke="${s}" stroke-width="1" />` +
      `<line x1="12" y1="4" x2="12" y2="8" stroke="${s}" stroke-width="1" />`,
  },
  'triple-hash': {
    width: 10,
    height: 10,
    body: (s) =>
      `<text x="0" y="8" font-family="monospace" font-size="9" fill="${s}">+</text>` +
      `<text x="5" y="8" font-family="monospace" font-size="9" fill="${s}">+</text>`,
  },
  'rocky-cliffs': {
    // The "TTT" symbol from Appendix 6 for rocky sea cliffs.
    width: 12,
    height: 10,
    body: (s) =>
      `<path d="M2 8 L2 4 M0 4 L4 4" stroke="${s}" stroke-width="1" fill="none" />` +
      `<path d="M7 8 L7 4 M5 4 L9 4" stroke="${s}" stroke-width="1" fill="none" />`,
  },
}

/**
 * Map FOSSITT code prefix → pattern shape per Appendix 6.
 * Tries 3-letter, then 2-letter, then 1-letter prefix (matches the same
 * fallback chain as `getHeritageColor`).
 */
const FOSSITT_PATTERN_MAP: Record<string, PatternShape> = {
  // ── Freshwater ──────────────────────────────────────────────
  FL: 'horizontal-lines',
  FW1: 'horizontal-lines',
  FW2: 'horizontal-lines',
  FW3: 'dotted',
  FW4: 'dotted',
  FP1: 'dotted',
  FP2: 'dotted',
  FS: 'diagonal-forward',
  // ── Grassland & Marsh ───────────────────────────────────────
  GA: 'vertical-lines',
  GS1: 'crosshatch',
  GS2: 'crosshatch',
  GS3: 'crosshatch',
  GS4: 'diagonal-forward',
  GM: 'diagonal-forward',
  // ── Heath & Dense Bracken ───────────────────────────────────
  HH1: 'vertical-lines',
  HH2: 'vertical-lines',
  HH3: 'crosshatch',
  HH4: 'diagonal-forward',
  HD: 'diagonal-crosshatch',
  // ── Peatlands ───────────────────────────────────────────────
  PB1: 'vertical-lines',
  PB2: 'crosshatch',
  PB3: 'diagonal-forward',
  PB4: 'dotted',
  PB5: 'crosshatch',
  PF: 'brick',
  // ── Woodland & Scrub ────────────────────────────────────────
  WN: 'crosshatch',
  WD: 'vertical-lines',
  WS: 'triple-hash',
  WL1: 'triple-hash',
  WL2: 'horizontal-lines',
  // ── Exposed Rock & Disturbed Ground ─────────────────────────
  ER: 'horizontal-lines',
  EU: 'dotted',
  ED: 'diagonal-forward',
  // ── Cultivated & Built ──────────────────────────────────────
  BC: 'diagonal-forward',
  BL: 'solid',
  // ── Coastland ───────────────────────────────────────────────
  CS1: 'rocky-cliffs',
  CS2: 'dotted',
  CS3: 'horizontal-lines',
  CW: 'vertical-lines',
  CM: 'crosshatch',
  CB: 'horizontal-lines',
  CD1: 'dotted',
  CD2: 'vertical-lines',
  CD3: 'crosshatch',
  CD4: 'diagonal-forward',
  CD5: 'horizontal-lines',
  CD6: 'brick',
  CC: 'dotted',
  // ── Littoral / Sublittoral ──────────────────────────────────
  LR: 'horizontal-lines',
  LS: 'dotted',
  SR: 'crosshatch',
  SS: 'dotted',
  // ── Marine ──────────────────────────────────────────────────
  MW: 'vertical-lines',
}

/**
 * Resolve a pattern shape for a FOSSITT code via 3-step fallback:
 *   exact code → 2-letter prefix → 1-letter prefix → null
 */
export function getHeritagePatternShape(fossittCode: string | null | undefined): PatternShape {
  if (!fossittCode || fossittCode === '—') return 'solid'
  if (FOSSITT_PATTERN_MAP[fossittCode]) return FOSSITT_PATTERN_MAP[fossittCode]
  const l2 = fossittCode.slice(0, 2)
  if (FOSSITT_PATTERN_MAP[l2]) return FOSSITT_PATTERN_MAP[l2]
  const l1 = fossittCode[0]
  if (FOSSITT_PATTERN_MAP[l1]) return FOSSITT_PATTERN_MAP[l1]
  return 'solid'
}

/**
 * Build the inner SVG markup for a single `<pattern>` element. Caller wraps
 * this in `<pattern id=... width=... height=... patternUnits="userSpaceOnUse">`.
 */
export function buildPatternBody(shape: PatternShape, strokeColour: string): string {
  return PATTERN_SHAPES[shape].body(strokeColour)
}

export function getPatternDimensions(shape: PatternShape): { width: number; height: number } {
  const spec = PATTERN_SHAPES[shape]
  return { width: spec.width, height: spec.height }
}

/**
 * Inject a `<defs>` block into the given SVG element containing one
 * `<pattern>` per (shape × colour) combination needed by the current view.
 * Idempotent — safe to call multiple times; existing patterns are reused.
 *
 * Pattern IDs follow the format `hc-<shape>-<hexNoHash>` so callers can
 * resolve `fill="url(#<id>)"` deterministically.
 */
export function ensurePatternDefs(
  svgRoot: SVGSVGElement,
  needed: Iterable<{ shape: PatternShape; stroke: string }>
): Map<string, string> {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  let defs = svgRoot.querySelector('defs[data-heritage-patterns]') as SVGDefsElement | null
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs')
    defs.setAttribute('data-heritage-patterns', 'true')
    svgRoot.insertBefore(defs, svgRoot.firstChild)
  }
  const idMap = new Map<string, string>()
  for (const { shape, stroke } of needed) {
    if (shape === 'solid') continue
    const cleanStroke = stroke.replace('#', '').toLowerCase()
    const id = `hc-${shape}-${cleanStroke}`
    const key = `${shape}|${stroke}`
    idMap.set(key, id)
    if (defs.querySelector(`#${id}`)) continue
    const dim = getPatternDimensions(shape)
    const pattern = document.createElementNS(SVG_NS, 'pattern')
    pattern.setAttribute('id', id)
    pattern.setAttribute('width', String(dim.width))
    pattern.setAttribute('height', String(dim.height))
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    pattern.innerHTML = buildPatternBody(shape, stroke)
    defs.appendChild(pattern)
  }
  return idMap
}
