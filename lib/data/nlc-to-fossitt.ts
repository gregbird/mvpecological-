/**
 * National Land Cover (NLC) 2018 → FOSSITT Habitat Code Mapping
 *
 * Maps NLC Level 2 classes (36 categories) to the closest FOSSITT habitat codes.
 * NLC is coarser than FOSSITT — this is an approximate mapping for desk study purposes.
 * Field verification is always required for definitive habitat classification.
 *
 * Source: OSI National Land Cover 2018
 * https://data-osi.opendata.arcgis.com/datasets/osi::high-value-dataset-national-land-cover-2018
 */

export interface NlcToFossittMapping {
  /** NLC Level 2 ID (e.g. "510") */
  nlcId: string
  /** NLC Level 2 label (e.g. "Improved Grassland") */
  nlcLabel: string
  /** NLC Level 1 label (e.g. "GRASSLAND, SALTMARSH and SWAMP") */
  nlcLevel1: string
  /** Fossitt code — Level 3 where unambiguous, Level 2 otherwise */
  fossittCode: string
  /** Fossitt habitat name */
  fossittName: string
}

/**
 * NLC Level 2 ID → FOSSITT mapping.
 * Keys are NLC LEVEL_2_ID strings (e.g. "510", "460").
 */
const NLC_TO_FOSSITT: Record<string, NlcToFossittMapping> = {
  // ── ARTIFICIAL SURFACES (100) ───────────────────────────────────────────
  '110': {
    nlcId: '110',
    nlcLabel: 'Buildings',
    nlcLevel1: 'ARTIFICIAL SURFACES',
    fossittCode: 'BL3',
    fossittName: 'Buildings and artificial surfaces',
  },
  '120': {
    nlcId: '120',
    nlcLabel: 'Ways',
    nlcLevel1: 'ARTIFICIAL SURFACES',
    fossittCode: 'BL3',
    fossittName: 'Buildings and artificial surfaces',
  },
  '130': {
    nlcId: '130',
    nlcLabel: 'Other Artificial Surfaces',
    nlcLevel1: 'ARTIFICIAL SURFACES',
    fossittCode: 'BL3',
    fossittName: 'Buildings and artificial surfaces',
  },

  // ── EXPOSED SURFACES (200) ─────────────────────────────────────────────
  '210': {
    nlcId: '210',
    nlcLabel: 'Exposed Rock and Sediments',
    nlcLevel1: 'EXPOSED SURFACES',
    fossittCode: 'ER',
    fossittName: 'Exposed rock',
  },
  '220': {
    nlcId: '220',
    nlcLabel: 'Coastal Sediments',
    nlcLevel1: 'EXPOSED SURFACES',
    fossittCode: 'CB1',
    fossittName: 'Shingle and gravel shores',
  },
  '230': {
    nlcId: '230',
    nlcLabel: 'Mudflats',
    nlcLevel1: 'EXPOSED SURFACES',
    fossittCode: 'MS1',
    fossittName: 'Intertidal mud and sand flats',
  },
  '240': {
    nlcId: '240',
    nlcLabel: 'Bare Soil and Disturbed Ground',
    nlcLevel1: 'EXPOSED SURFACES',
    fossittCode: 'ED2',
    fossittName: 'Spoil and bare ground',
  },
  '250': {
    nlcId: '250',
    nlcLabel: 'Burnt Areas',
    nlcLevel1: 'EXPOSED SURFACES',
    fossittCode: 'ED3',
    fossittName: 'Recolonising bare ground',
  },

  // ── CULTIVATED LAND (300) ──────────────────────────────────────────────
  '310': {
    nlcId: '310',
    nlcLabel: 'Cultivated Land',
    nlcLevel1: 'CULTIVATED LAND',
    fossittCode: 'BC1',
    fossittName: 'Arable crops',
  },

  // ── FOREST, WOODLAND AND SCRUB (400) ───────────────────────────────────
  '410': {
    nlcId: '410',
    nlcLabel: 'Coniferous Forest',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WD3',
    fossittName: 'Conifer plantation',
  },
  '420': {
    nlcId: '420',
    nlcLabel: 'Mixed Forest',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WD2',
    fossittName: 'Mixed broadleaved/conifer woodland',
  },
  '430': {
    nlcId: '430',
    nlcLabel: 'Transitional Forest',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WS2',
    fossittName: 'Immature woodland',
  },
  '440': {
    nlcId: '440',
    nlcLabel: 'Broadleaved Forest and Woodland',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WN',
    fossittName: 'Semi-natural woodland',
  },
  '450': {
    nlcId: '450',
    nlcLabel: 'Scrub',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WS1',
    fossittName: 'Scrub',
  },
  '460': {
    nlcId: '460',
    nlcLabel: 'Hedgerows',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WL1',
    fossittName: 'Hedgerows',
  },
  '470': {
    nlcId: '470',
    nlcLabel: 'Treelines',
    nlcLevel1: 'FOREST, WOODLAND AND SCRUB',
    fossittCode: 'WL2',
    fossittName: 'Treelines',
  },

  // ── GRASSLAND, SALTMARSH and SWAMP (500) ───────────────────────────────
  '510': {
    nlcId: '510',
    nlcLabel: 'Improved Grassland',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'GA1',
    fossittName: 'Improved agricultural grassland',
  },
  '520': {
    nlcId: '520',
    nlcLabel: 'Amenity Grassland',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'GA2',
    fossittName: 'Amenity grassland (improved)',
  },
  '530': {
    nlcId: '530',
    nlcLabel: 'Dry Grassland',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'GS',
    fossittName: 'Semi-natural grassland',
  },
  '540': {
    nlcId: '540',
    nlcLabel: 'Wet Grassland',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'GS4',
    fossittName: 'Wet grassland',
  },
  '550': {
    nlcId: '550',
    nlcLabel: 'Saltmarsh',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'CM',
    fossittName: 'Salt marshes',
  },
  '560': {
    nlcId: '560',
    nlcLabel: 'Sand Dunes',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'CD',
    fossittName: 'Dunes',
  },
  '570': {
    nlcId: '570',
    nlcLabel: 'Swamp',
    nlcLevel1: 'GRASSLAND, SALTMARSH and SWAMP',
    fossittCode: 'FS1',
    fossittName: 'Reed and large sedge swamps',
  },

  // ── PEATLAND (600) ────────────────────────────────────────────────────
  '610': {
    nlcId: '610',
    nlcLabel: 'Raised Bog',
    nlcLevel1: 'PEATLAND',
    fossittCode: 'PB1',
    fossittName: 'Raised bog',
  },
  '620': {
    nlcId: '620',
    nlcLabel: 'Blanket Bog',
    nlcLevel1: 'PEATLAND',
    fossittCode: 'PB2',
    fossittName: 'Upland blanket bog',
  },
  '630': {
    nlcId: '630',
    nlcLabel: 'Cutover Bog',
    nlcLevel1: 'PEATLAND',
    fossittCode: 'PB4',
    fossittName: 'Cutover bog',
  },
  '640': {
    nlcId: '640',
    nlcLabel: 'Bare Peat',
    nlcLevel1: 'PEATLAND',
    fossittCode: 'PB4',
    fossittName: 'Cutover bog',
  },
  '650': {
    nlcId: '650',
    nlcLabel: 'Fens',
    nlcLevel1: 'PEATLAND',
    fossittCode: 'PF',
    fossittName: 'Fens and Flushes',
  },

  // ── HEATH and BRACKEN (700) ───────────────────────────────────────────
  '710': {
    nlcId: '710',
    nlcLabel: 'Bracken',
    nlcLevel1: 'HEATH and BRACKEN',
    fossittCode: 'HD1',
    fossittName: 'Dense bracken',
  },
  '720': {
    nlcId: '720',
    nlcLabel: 'Dry Heath',
    nlcLevel1: 'HEATH and BRACKEN',
    fossittCode: 'HH1',
    fossittName: 'Dry siliceous heath',
  },
  '730': {
    nlcId: '730',
    nlcLabel: 'Wet Heath',
    nlcLevel1: 'HEATH and BRACKEN',
    fossittCode: 'HH3',
    fossittName: 'Wet heath',
  },

  // ── WATERBODIES (800) ──────────────────────────────────────────────────
  '810': {
    nlcId: '810',
    nlcLabel: 'Rivers and Streams',
    nlcLevel1: 'WATERBODIES',
    fossittCode: 'FW',
    fossittName: 'Watercourses',
  },
  '820': {
    nlcId: '820',
    nlcLabel: 'Lakes and Ponds',
    nlcLevel1: 'WATERBODIES',
    fossittCode: 'FL',
    fossittName: 'Lakes and ponds',
  },
  '830': {
    nlcId: '830',
    nlcLabel: 'Artificial Waterbodies',
    nlcLevel1: 'WATERBODIES',
    fossittCode: 'FL8',
    fossittName: 'Other artificial lakes and ponds',
  },
  '840': {
    nlcId: '840',
    nlcLabel: 'Transitional Waterbodies',
    nlcLevel1: 'WATERBODIES',
    fossittCode: 'CW',
    fossittName: 'Brackish waters',
  },
  '850': {
    nlcId: '850',
    nlcLabel: 'Marine Water',
    nlcLevel1: 'WATERBODIES',
    fossittCode: 'MW',
    fossittName: 'Open marine water',
  },
}

/**
 * Map an NLC Level 2 ID to its FOSSITT equivalent.
 */
export function mapNlcToFossitt(
  nlcLevel2Id: string
): { fossittCode: string; fossittName: string } | undefined {
  const mapping = NLC_TO_FOSSITT[nlcLevel2Id]
  if (!mapping) return undefined
  return { fossittCode: mapping.fossittCode, fossittName: mapping.fossittName }
}

/**
 * Map an NLC Level 2 label (e.g. "Improved Grassland") to FOSSITT.
 * Useful when the API returns text labels instead of IDs.
 */
export function mapNlcLabelToFossitt(
  nlcLabel: string
): { fossittCode: string; fossittName: string; nlcId: string } | undefined {
  const normalized = nlcLabel.trim()
  const entry = Object.values(NLC_TO_FOSSITT).find(
    (m) => m.nlcLabel.toLowerCase() === normalized.toLowerCase()
  )
  if (!entry) return undefined
  return { fossittCode: entry.fossittCode, fossittName: entry.fossittName, nlcId: entry.nlcId }
}

/**
 * Get the full NLC mapping record by Level 2 ID.
 */
export function getNlcMapping(nlcLevel2Id: string): NlcToFossittMapping | undefined {
  return NLC_TO_FOSSITT[nlcLevel2Id]
}

/**
 * Get all mappings as an array (useful for reference tables).
 */
export function getAllNlcMappings(): NlcToFossittMapping[] {
  return Object.values(NLC_TO_FOSSITT)
}

/**
 * Reverse lookup: FOSSITT code → representative NLC Level 2 label.
 *
 * Many FOSSITT codes map back to multiple NLC labels (BL3 → Buildings, Ways,
 * Other Artificial Surfaces). For NLC native palette rendering on saved
 * habitats — where we no longer remember the original NLC label per parcel —
 * we deterministically pick the FIRST matching mapping. Saved BL3 habitats
 * render with "Buildings" red instead of the more granular Ways / OAS
 * shades, but they still get a meaningful NLC colour instead of the gray
 * fallback. ViewportHabitatDetail (z16+) keeps the exact per-parcel label
 * since it re-fetches with `nlc_label` on every feature.
 */
const FOSSITT_TO_NLC_LABEL: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const entry of Object.values(NLC_TO_FOSSITT)) {
    if (!map[entry.fossittCode]) map[entry.fossittCode] = entry.nlcLabel
  }
  return map
})()

export function mapFossittToNlcLabel(fossittCode: string | null | undefined): string | undefined {
  if (!fossittCode) return undefined
  return FOSSITT_TO_NLC_LABEL[fossittCode]
}
