/**
 * Site-specific Conservation Objectives (SSCO) Lookup
 * Performs spatial queries to find SAC/SPA habitats that intersect with project boundary
 */

import * as turf from '@turf/turf'

export interface SSCOHabitat {
  siteCode: string
  habitatCode: string
  habitatName: string
  sourceFile: string
}

export interface SSCOResult {
  siteCode: string
  siteName: string
  habitats: SSCOHabitat[]
  intersectionArea?: number // in hectares
  geometry?: GeoJSON.Geometry // combined geometry from intersecting features
}

// Cache for SSCO data
let sscoData: GeoJSON.FeatureCollection | null = null

/**
 * Load SSCO GeoJSON data
 */
async function loadSSCOData(): Promise<GeoJSON.FeatureCollection> {
  if (sscoData) return sscoData

  const response = await fetch('/data/ssco-sac-habitats.json')
  sscoData = await response.json()
  return sscoData!
}

/**
 * SAC site names lookup (common ones)
 */
const SAC_SITE_NAMES: Record<string, string> = {
  '000627': 'Cuilcagh - Anierin Uplands SAC',
  '000623': 'Ben Bulben, Gleniff and Glenade Complex SAC',
  '000606': 'Lough Melvin SAC',
  '000165': 'Slieve Bloom Mountains SAC',
  '000162': 'River Barrow And River Nore SAC',
  '000770': 'Blackwater River (Cork/Waterford) SAC',
  '002165': 'Lower River Shannon SAC',
  '002170': 'Blackwater River (Kerry) SAC',
  '002171': 'Bandon River SAC',
  '001957': 'Boyne Coast And Estuary SAC',
  '000696': 'Ballyhoura Mountains SAC',
  '002298': 'River Moy SAC',
  '002301': 'River Finn SAC',
  '000147': 'Lough Ree SAC',
  '000216': 'River Shannon Callows SAC',
}

/**
 * Find SSCO habitats that intersect with a project boundary
 * @param boundary - Project boundary as GeoJSON polygon
 * @param bufferKm - Optional buffer distance in km to extend search area
 */
export async function findIntersectingSSCO(
  boundary: GeoJSON.Feature<GeoJSON.Polygon>,
  bufferKm: number = 0
): Promise<SSCOResult[]> {
  const data = await loadSSCOData()

  // Apply buffer if specified
  let searchArea = boundary
  if (bufferKm > 0) {
    searchArea = turf.buffer(boundary, bufferKm, {
      units: 'kilometers',
    }) as GeoJSON.Feature<GeoJSON.Polygon>
  }

  const results = new Map<string, SSCOResult>()

  for (const feature of data.features) {
    try {
      // Check if geometries intersect
      const intersects = turf.booleanIntersects(searchArea, feature)

      if (intersects) {
        const props = feature.properties as SSCOHabitat
        const siteCode = props.siteCode

        if (!results.has(siteCode)) {
          results.set(siteCode, {
            siteCode,
            siteName: SAC_SITE_NAMES[siteCode] || `SAC ${siteCode}`,
            habitats: [],
            geometry: feature.geometry,
          })
        }

        const result = results.get(siteCode)!

        // Normalize and add habitats
        const normalizedCodes = normalizeHabitatCode(props.habitatCode)
        for (const habitatCode of normalizedCodes) {
          const habitatExists = result.habitats.some((h) => h.habitatCode === habitatCode)
          if (!habitatExists) {
            result.habitats.push({
              siteCode: props.siteCode,
              habitatCode: habitatCode,
              habitatName: props.habitatName || getHabitatDescription(habitatCode),
              sourceFile: props.sourceFile,
            })
          }
        }

        // Calculate intersection area
        try {
          const intersection = turf.intersect(
            turf.featureCollection([searchArea, feature as GeoJSON.Feature<GeoJSON.Polygon>])
          )
          if (intersection) {
            const areaM2 = turf.area(intersection)
            const areaHa = areaM2 / 10000
            result.intersectionArea = (result.intersectionArea || 0) + areaHa
          }
        } catch {
          // Intersection calculation failed, skip area
        }
      }
    } catch {
      // Skip invalid geometries
      continue
    }
  }

  return Array.from(results.values())
}

/**
 * Get habitat description by EU code
 */
export function getHabitatDescription(code: string): string {
  const descriptions: Record<string, string> = {
    '1110': 'Sandbanks which are slightly covered by sea water all the time',
    '1130': 'Estuaries',
    '1140': 'Mudflats and sandflats not covered by seawater at low tide',
    '1150': 'Coastal lagoons',
    '1160': 'Large shallow inlets and bays',
    '1170': 'Reefs',
    '1210': 'Annual vegetation of drift lines',
    '1220': 'Perennial vegetation of stony banks',
    '1230': 'Vegetated sea cliffs of the Atlantic and Baltic coasts',
    '3110': 'Oligotrophic waters',
    '3130': 'Oligotrophic to mesotrophic standing waters',
    '3150': 'Natural eutrophic lakes',
    '3160': 'Natural dystrophic lakes and ponds',
    '3180': 'Turloughs',
    '3260': 'Water courses of plain to montane levels',
    '4010': 'Northern Atlantic wet heaths',
    '4030': 'European dry heaths',
    '4060': 'Alpine and Boreal heaths',
    '5130': 'Juniperus communis formations',
    '6130': 'Calaminarian grasslands',
    '6210': 'Semi-natural dry grasslands',
    '6230': 'Species-rich Nardus grasslands',
    '6410': 'Molinia meadows',
    '6430': 'Hydrophilous tall herb fringe communities',
    '6510': 'Lowland hay meadows',
    '7110': 'Active raised bogs',
    '7120': 'Degraded raised bogs',
    '7130': 'Blanket bogs',
    '7140': 'Transition mires and quaking bogs',
    '7150': 'Depressions on peat substrates',
    '7210': 'Calcareous fens',
    '7220': 'Petrifying springs',
    '7230': 'Alkaline fens',
    '8110': 'Siliceous scree',
    '8120': 'Calcareous scree',
    '8210': 'Calcareous rocky slopes',
    '8220': 'Siliceous rocky slopes',
    '8240': 'Limestone pavements',
    '8310': 'Caves not open to the public',
    '8330': 'Submerged or partially submerged sea caves',
    '91A0': 'Old sessile oak woods',
    '91D0': 'Bog woodland',
    '91E0': 'Alluvial forests',
    '91J0': 'Taxus baccata woods',
  }
  return descriptions[code] || `EU Habitat ${code}`
}

/**
 * Normalize habitat code - clean up messy SSCO data
 * Handles: empty strings, "1310 / 1330" splits, "Potential 1330" prefixes
 */
function normalizeHabitatCode(code: string): string[] {
  if (!code || code.trim() === '') return []

  // Remove "Potential " prefix
  const cleaned = code.replace(/^Potential\s+/i, '')

  // Split by " / " for combined codes like "1310 / 1330"
  const parts = cleaned.split(/\s*\/\s*/)

  // Clean each part and filter valid 4-digit codes
  return parts.map((p) => p.trim()).filter((p) => /^\d{4}$/.test(p))
}

/**
 * Get habitats for a specific site code from SSCO data
 * @param siteCode - The SAC site code (e.g., '000627')
 */
export async function getHabitatsBySiteCode(siteCode: string): Promise<SSCOHabitat[]> {
  const data = await loadSSCOData()

  const habitats: SSCOHabitat[] = []
  const seenCodes = new Set<string>()

  for (const feature of data.features) {
    const props = feature.properties as SSCOHabitat
    if (props.siteCode === siteCode) {
      // Normalize habitat codes (handles empty, combined, prefixed codes)
      const normalizedCodes = normalizeHabitatCode(props.habitatCode)

      for (const habitatCode of normalizedCodes) {
        if (!seenCodes.has(habitatCode)) {
          seenCodes.add(habitatCode)
          habitats.push({
            siteCode: props.siteCode,
            habitatCode: habitatCode,
            habitatName: props.habitatName || getHabitatDescription(habitatCode),
            sourceFile: props.sourceFile,
          })
        }
      }
    }
  }

  return habitats
}

/**
 * Format SSCO results for display
 */
export function formatSSCOForPrompt(results: SSCOResult[]): string {
  if (results.length === 0) {
    return 'No Site-specific Conservation Objectives (SSCO) areas found within the project boundary.'
  }

  const lines = [
    `Found ${results.length} SAC site(s) with conservation objectives in or near the project area:`,
    '',
  ]

  for (const result of results) {
    lines.push(`📍 ${result.siteName} (${result.siteCode})`)
    if (result.intersectionArea) {
      lines.push(`   Overlap: ~${result.intersectionArea.toFixed(2)} hectares`)
    }
    lines.push(`   Protected habitats:`)
    for (const habitat of result.habitats) {
      lines.push(`   - [${habitat.habitatCode}] ${habitat.habitatName}`)
    }
    lines.push('')
  }

  lines.push(
    'These sites have legally binding conservation objectives. Development proposals must assess potential impacts on these habitats.'
  )

  return lines.join('\n')
}
