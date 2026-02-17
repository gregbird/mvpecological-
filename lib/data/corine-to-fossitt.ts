/**
 * CORINE Land Cover 2018 → FOSSITT Level 2 Mapping
 *
 * Maps CORINE Level 3 codes to the closest FOSSITT (Fossitt, 2000) Level 2 habitat category.
 * This is an approximate mapping for desk study purposes — field verification is always required.
 *
 * Reference: Heritage Council (2005) "Best Practice Guidance for Habitat Survey and Mapping"
 */

interface CorineMapping {
  fossittCode: string
  fossittName: string
  corineLabel: string
}

/**
 * CORINE Level 3 code → FOSSITT Level 2 mapping
 */
const CORINE_TO_FOSSITT: Record<string, CorineMapping> = {
  // 1. Artificial surfaces
  '111': { fossittCode: 'BL', fossittName: 'Built land', corineLabel: 'Continuous urban fabric' },
  '112': {
    fossittCode: 'BL',
    fossittName: 'Built land',
    corineLabel: 'Discontinuous urban fabric',
  },
  '121': {
    fossittCode: 'BL',
    fossittName: 'Built land',
    corineLabel: 'Industrial or commercial units',
  },
  '122': {
    fossittCode: 'BL',
    fossittName: 'Built land',
    corineLabel: 'Road and rail networks',
  },
  '123': { fossittCode: 'BL', fossittName: 'Built land', corineLabel: 'Port areas' },
  '124': { fossittCode: 'BL', fossittName: 'Built land', corineLabel: 'Airports' },
  '131': {
    fossittCode: 'ED',
    fossittName: 'Exposed rock and disturbed ground',
    corineLabel: 'Mineral extraction sites',
  },
  '132': {
    fossittCode: 'ED',
    fossittName: 'Exposed rock and disturbed ground',
    corineLabel: 'Dump sites',
  },
  '133': {
    fossittCode: 'BL',
    fossittName: 'Built land',
    corineLabel: 'Construction sites',
  },
  '141': {
    fossittCode: 'GA',
    fossittName: 'Improved agricultural grassland',
    corineLabel: 'Green urban areas',
  },
  '142': {
    fossittCode: 'BL',
    fossittName: 'Built land',
    corineLabel: 'Sport and leisure facilities',
  },

  // 2. Agricultural areas
  '211': {
    fossittCode: 'BC',
    fossittName: 'Cultivated land',
    corineLabel: 'Non-irrigated arable land',
  },
  '222': {
    fossittCode: 'BC',
    fossittName: 'Cultivated land',
    corineLabel: 'Fruit trees and berry plantations',
  },
  '231': {
    fossittCode: 'GA',
    fossittName: 'Improved agricultural grassland',
    corineLabel: 'Pastures',
  },
  '242': {
    fossittCode: 'BC',
    fossittName: 'Cultivated land',
    corineLabel: 'Complex cultivation patterns',
  },
  '243': {
    fossittCode: 'GA',
    fossittName: 'Improved agricultural grassland',
    corineLabel: 'Agriculture with natural vegetation',
  },

  // 3. Forest and semi-natural areas
  '311': {
    fossittCode: 'WN',
    fossittName: 'Semi-natural woodland',
    corineLabel: 'Broad-leaved forest',
  },
  '312': {
    fossittCode: 'WD',
    fossittName: 'Conifer plantation',
    corineLabel: 'Coniferous forest',
  },
  '313': {
    fossittCode: 'WD',
    fossittName: 'Conifer plantation',
    corineLabel: 'Mixed forest',
  },
  '321': {
    fossittCode: 'GS',
    fossittName: 'Semi-natural grassland',
    corineLabel: 'Natural grasslands',
  },
  '322': { fossittCode: 'HH', fossittName: 'Heath', corineLabel: 'Moors and heathland' },
  '324': { fossittCode: 'WS', fossittName: 'Scrub', corineLabel: 'Transitional woodland-scrub' },
  '331': {
    fossittCode: 'ED',
    fossittName: 'Exposed rock and disturbed ground',
    corineLabel: 'Beaches, dunes, sands',
  },
  '332': {
    fossittCode: 'ER',
    fossittName: 'Exposed rock',
    corineLabel: 'Bare rocks',
  },
  '333': {
    fossittCode: 'ER',
    fossittName: 'Exposed rock',
    corineLabel: 'Sparsely vegetated areas',
  },
  '334': {
    fossittCode: 'ED',
    fossittName: 'Exposed rock and disturbed ground',
    corineLabel: 'Burnt areas',
  },

  // 4. Wetlands
  '411': { fossittCode: 'GM', fossittName: 'Marsh', corineLabel: 'Inland marshes' },
  '412': { fossittCode: 'PB', fossittName: 'Peatland', corineLabel: 'Peat bogs' },
  '421': {
    fossittCode: 'CS',
    fossittName: 'Saltmarsh',
    corineLabel: 'Salt marshes',
  },
  '423': {
    fossittCode: 'CS',
    fossittName: 'Saltmarsh',
    corineLabel: 'Intertidal flats',
  },

  // 5. Water bodies
  '511': { fossittCode: 'FL', fossittName: 'Lakes and ponds', corineLabel: 'Water courses' },
  '512': { fossittCode: 'FL', fossittName: 'Lakes and ponds', corineLabel: 'Water bodies' },
  '521': {
    fossittCode: 'CW',
    fossittName: 'Coastal waters',
    corineLabel: 'Coastal lagoons',
  },
  '522': { fossittCode: 'CW', fossittName: 'Coastal waters', corineLabel: 'Estuaries' },
  '523': {
    fossittCode: 'CW',
    fossittName: 'Coastal waters',
    corineLabel: 'Sea and ocean',
  },
}

/**
 * Map a CORINE Level 3 code to its FOSSITT Level 2 equivalent.
 * Returns undefined if no mapping exists.
 */
export function mapCorineToFossitt(
  corineCode: string
): { fossittCode: string; fossittName: string } | undefined {
  const mapping = CORINE_TO_FOSSITT[corineCode]
  if (!mapping) return undefined
  return { fossittCode: mapping.fossittCode, fossittName: mapping.fossittName }
}

/**
 * Get the CORINE display label for a given code.
 */
export function getCorineDisplayName(corineCode: string): string {
  return CORINE_TO_FOSSITT[corineCode]?.corineLabel || `CORINE ${corineCode}`
}

/**
 * Get all unique FOSSITT codes from the mapping (for reference).
 */
export function getAvailableFossittMappings(): string[] {
  const codes = new Set(Object.values(CORINE_TO_FOSSITT).map((m) => m.fossittCode))
  return Array.from(codes).sort()
}
