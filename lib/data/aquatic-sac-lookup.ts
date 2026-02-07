/**
 * Aquatic SAC Lookup
 * Matches EPA rivers/lakes to NPWS SAC sites based on name matching
 */

import npwsSitesData from './npws-sites-data.json'

export interface AquaticSACMatch {
  siteCode: string
  siteName: string
  siteType: 'SAC' | 'SPA'
  siteArea?: number
  latitude?: number
  longitude?: number
  sscoUrl?: string
  siUrl?: string
  habitats: Array<{ code: string; name: string }>
  species: Array<{ code: string; name: string }>
  matchScore: number // 0-100, higher is better match
  matchReason: string
}

// Aquatic-related habitat codes (Annex I)
export const AQUATIC_HABITAT_CODES: Record<string, string> = {
  '1110': 'Sandbanks which are slightly covered by sea water all the time',
  '1130': 'Estuaries',
  '1140': 'Mudflats and sandflats not covered by seawater at low tide',
  '1150': 'Coastal lagoons',
  '1160': 'Large shallow inlets and bays',
  '3110': 'Oligotrophic waters containing very few minerals of sandy plains',
  '3130': 'Oligotrophic to mesotrophic standing waters',
  '3140': 'Hard oligo-mesotrophic waters with benthic vegetation of Chara spp.',
  '3150': 'Natural eutrophic lakes with Magnopotamion or Hydrocharition',
  '3160': 'Natural dystrophic lakes and ponds',
  '3180': 'Turloughs',
  '3260': 'Water courses of plain to montane levels (Ranunculion fluitantis)',
  '3270': 'Rivers with muddy banks (Chenopodion rubri)',
  '91E0': 'Alluvial forests with Alnus glutinosa and Fraxinus excelsior',
  '91F0': 'Riparian mixed forests along great rivers',
}

// Aquatic-related species codes (Annex II)
export const AQUATIC_SPECIES_CODES: Record<string, string> = {
  '1029': 'Freshwater Pearl Mussel (Margaritifera margaritifera)',
  '1092': 'White-clawed Crayfish (Austropotamobius pallipes)',
  '1095': 'Sea Lamprey (Petromyzon marinus)',
  '1096': 'Brook Lamprey (Lampetra planeri)',
  '1099': 'River Lamprey (Lampetra fluviatilis)',
  '1102': 'Allis Shad (Alosa alosa)',
  '1103': 'Twaite Shad (Alosa fallax)',
  '1106': 'Atlantic Salmon (Salmo salar)',
  '1355': 'Otter (Lutra lutra)',
  '1990': 'Nore Freshwater Pearl Mussel (Margaritifera durrovensis)',
}

// Common river name variations for better matching
const RIVER_NAME_NORMALIZATIONS: Record<string, string[]> = {
  shannon: ['shannon', 'sionainn'],
  boyne: ['boyne', 'bóinn'],
  barrow: ['barrow'],
  nore: ['nore', 'feoir'],
  suir: ['suir', 'siúir'],
  blackwater: ['blackwater'],
  slaney: ['slaney', 'sláine'],
  liffey: ['liffey', 'life'],
  lee: ['lee'],
  corrib: ['corrib'],
  erne: ['erne', 'éirne'],
  moy: ['moy', 'muaidhe'],
  finn: ['finn'],
  foyle: ['foyle'],
  bann: ['bann'],
}

interface NPWSSiteData {
  siteCode: string
  siteName: string
  siteType?: string
  siteArea?: number
  latitude?: number
  longitude?: number
  sscoUrl?: string | null
  siUrl?: string | null
  siNumber?: string | null
  siDate?: string | null
  habitats?: Array<{ code: string; name: string }>
  species?: Array<{ code: string; name: string }>
  birdSpecies?: Array<{ code: string; name: string }>
}

const sitesData = npwsSitesData as unknown as Record<string, NPWSSiteData>

/**
 * Normalize a water body name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract key words from a water body name
 */
function extractKeyWords(name: string): string[] {
  const normalized = normalizeName(name)
  // Remove common suffixes/prefixes
  const cleaned = normalized
    .replace(
      /\b(river|lake|lough|loch|estuary|bay|harbour|harbor|stream|burn|water|catchment)\b/gi,
      ''
    )
    .replace(/\b(upper|lower|north|south|east|west|great|little|big|small)\b/gi, '')
    .trim()

  return cleaned.split(/\s+/).filter((w) => w.length > 2)
}

/**
 * Calculate match score between EPA water body and SAC
 */
function calculateMatchScore(
  waterBodyName: string,
  sacName: string
): { score: number; reason: string } {
  const wbNormalized = normalizeName(waterBodyName)
  const sacNormalized = normalizeName(sacName)

  // Exact match (unlikely but check)
  if (wbNormalized === sacNormalized) {
    return { score: 100, reason: 'Exact name match' }
  }

  // Check if water body name is contained in SAC name
  const wbKeyWords = extractKeyWords(waterBodyName)
  const sacKeyWords = extractKeyWords(sacName)

  // Check for major river name matches
  for (const [river, variants] of Object.entries(RIVER_NAME_NORMALIZATIONS)) {
    const wbHasRiver = variants.some((v) => wbNormalized.includes(v))
    const sacHasRiver = variants.some((v) => sacNormalized.includes(v))

    if (wbHasRiver && sacHasRiver) {
      return { score: 90, reason: `Major river match: ${river}` }
    }
  }

  // Check keyword overlap
  const matchedKeywords = wbKeyWords.filter((kw) =>
    sacKeyWords.some((sk) => sk.includes(kw) || kw.includes(sk))
  )

  if (matchedKeywords.length > 0) {
    const overlapRatio = matchedKeywords.length / Math.max(wbKeyWords.length, 1)
    const score = Math.min(80, 50 + overlapRatio * 30)
    return { score, reason: `Keyword match: ${matchedKeywords.join(', ')}` }
  }

  // Check if SAC name contains water body name or vice versa
  if (sacNormalized.includes(wbNormalized) || wbNormalized.includes(sacNormalized)) {
    return { score: 70, reason: 'Partial name containment' }
  }

  return { score: 0, reason: 'No match' }
}

/**
 * Check if a SAC has aquatic habitats or species
 */
function hasAquaticFeatures(site: NPWSSiteData): boolean {
  const hasAquaticHabitat =
    site.habitats?.some((h) => Object.keys(AQUATIC_HABITAT_CODES).includes(h.code)) || false

  const hasAquaticSpecies =
    site.species?.some((s) => Object.keys(AQUATIC_SPECIES_CODES).includes(s.code)) || false

  return hasAquaticHabitat || hasAquaticSpecies
}

/**
 * Find SACs that match a given water body name
 */
export function findMatchingSACs(
  waterBodyName: string,
  waterBodyType?: 'River' | 'Lake' | 'Catchment'
): AquaticSACMatch[] {
  const matches: AquaticSACMatch[] = []

  for (const [siteCode, site] of Object.entries(sitesData)) {
    // Skip non-SAC sites for now (SPAs don't have aquatic QIs)
    if (site.siteType !== 'SAC') continue

    // Calculate match score
    const { score, reason } = calculateMatchScore(waterBodyName, site.siteName)

    // Only include if score > 50 OR if it has aquatic features and score > 30
    const hasAquatic = hasAquaticFeatures(site)
    if (score < 50 && !(hasAquatic && score > 30)) continue

    // Boost score if SAC has aquatic features
    const finalScore = hasAquatic ? Math.min(100, score + 10) : score

    matches.push({
      siteCode: site.siteCode,
      siteName: site.siteName,
      siteType: 'SAC',
      siteArea: site.siteArea,
      latitude: site.latitude,
      longitude: site.longitude,
      sscoUrl: site.sscoUrl || undefined,
      siUrl: site.siUrl || undefined,
      habitats: site.habitats || [],
      species: site.species || [],
      matchScore: finalScore,
      matchReason: reason + (hasAquatic ? ' (has aquatic QIs)' : ''),
    })
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore)

  // Return top 3 matches
  return matches.slice(0, 3)
}

/**
 * Get SAC data by site code
 */
export function getSACBySiteCode(siteCode: string): AquaticSACMatch | null {
  const site = sitesData[siteCode]
  if (!site) return null

  return {
    siteCode: site.siteCode,
    siteName: site.siteName,
    siteType: (site.siteType as 'SAC' | 'SPA') || 'SAC',
    siteArea: site.siteArea,
    latitude: site.latitude,
    longitude: site.longitude,
    sscoUrl: site.sscoUrl || undefined,
    siUrl: site.siUrl || undefined,
    habitats: site.habitats || [],
    species: site.species || [],
    matchScore: 100,
    matchReason: 'Direct lookup',
  }
}

/**
 * Get aquatic habitats from a SAC
 */
export function getAquaticHabitats(
  habitats: Array<{ code: string; name: string }>
): Array<{ code: string; name: string; description: string }> {
  return habitats
    .filter((h) => Object.keys(AQUATIC_HABITAT_CODES).includes(h.code))
    .map((h) => ({
      code: h.code,
      name: h.name,
      description: AQUATIC_HABITAT_CODES[h.code] || h.name,
    }))
}

/**
 * Get aquatic species from a SAC
 */
export function getAquaticSpecies(
  species: Array<{ code: string; name: string }>
): Array<{ code: string; name: string; commonName: string }> {
  return species
    .filter((s) => Object.keys(AQUATIC_SPECIES_CODES).includes(s.code))
    .map((s) => ({
      code: s.code,
      name: s.name,
      commonName: AQUATIC_SPECIES_CODES[s.code] || s.name,
    }))
}

/**
 * Get all river/lake related SACs
 */
export function getAllAquaticSACs(): AquaticSACMatch[] {
  const results: AquaticSACMatch[] = []

  for (const [siteCode, site] of Object.entries(sitesData)) {
    if (site.siteType !== 'SAC') continue

    // Check if name suggests aquatic
    const nameLC = site.siteName.toLowerCase()
    const isAquaticName = /river|lake|lough|estuary|bay|water|turlough/.test(nameLC)

    // Check if has aquatic features
    const hasAquatic = hasAquaticFeatures(site)

    if (isAquaticName || hasAquatic) {
      results.push({
        siteCode: site.siteCode,
        siteName: site.siteName,
        siteType: 'SAC',
        siteArea: site.siteArea,
        latitude: site.latitude,
        longitude: site.longitude,
        sscoUrl: site.sscoUrl || undefined,
        siUrl: site.siUrl || undefined,
        habitats: site.habitats || [],
        species: site.species || [],
        matchScore: hasAquatic ? 100 : 80,
        matchReason: isAquaticName ? 'Aquatic site name' : 'Has aquatic qualifying interests',
      })
    }
  }

  return results.sort((a, b) => a.siteName.localeCompare(b.siteName))
}
