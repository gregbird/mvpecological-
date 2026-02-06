/**
 * NPWS Site Data Lookup
 * Uses official NPWS Excel datasheets (SAC & SPA) converted to JSON.
 * Source: SAC_datasheets_20240514.xlsx, SPA_datasheets_20240514.xlsx
 *
 * Provides habitat, species, and SSCO PDF URL lookups by site code.
 */

import npwsSitesRaw from './npws-sites-data.json'

export interface NPWSSiteHabitat {
  code: string
  name: string
}

export interface NPWSSiteSpecies {
  code: string
  name: string
}

export interface NPWSSiteData {
  siteCode: string
  siteName: string
  date: string
  longitude: number
  latitude: number
  siteArea: number
  siNumber: string | null
  siDate: string | null
  siUrl: string | null
  sscoVersion: number | string | null
  sscoDate: string | null
  sscoUrl: string | null
  siteType: 'SAC' | 'SPA'
  // SAC fields
  habitats?: NPWSSiteHabitat[]
  species?: NPWSSiteSpecies[]
  // SPA fields
  birdSpecies?: NPWSSiteSpecies[]
  isWetland?: boolean
}

// Type the imported JSON (cast via unknown due to minor data variations)
const npwsSites = npwsSitesRaw as unknown as Record<string, NPWSSiteData>

/**
 * Get full site data by site code (e.g., 'IE0000006' or '000006')
 */
export function getNPWSSiteData(siteCode: string): NPWSSiteData | null {
  // Try exact match first
  if (npwsSites[siteCode]) return npwsSites[siteCode]

  // Try with IE prefix
  const withPrefix = siteCode.startsWith('IE') ? siteCode : `IE${siteCode}`
  if (npwsSites[withPrefix]) return npwsSites[withPrefix]

  // Try extracting numeric part and matching
  const numericPart = siteCode.replace(/^IE/, '').replace(/^0+/, '')
  for (const key of Object.keys(npwsSites)) {
    const keyNumeric = key.replace(/^IE/, '').replace(/^0+/, '')
    if (keyNumeric === numericPart) return npwsSites[key]
  }

  return null
}

/**
 * Get habitats for a site (SAC) - returns Annex I habitats
 */
export function getSiteHabitats(siteCode: string): NPWSSiteHabitat[] {
  const site = getNPWSSiteData(siteCode)
  return site?.habitats || []
}

/**
 * Get species for a site (SAC Annex II species or SPA bird SCIs)
 */
export function getSiteSpecies(siteCode: string): NPWSSiteSpecies[] {
  const site = getNPWSSiteData(siteCode)
  if (site?.siteType === 'SPA') return site.birdSpecies || []
  return site?.species || []
}

/**
 * Get SSCO PDF URL for a site
 */
export function getSSCOUrl(siteCode: string): string | null {
  const site = getNPWSSiteData(siteCode)
  return site?.sscoUrl || null
}

/**
 * Get SI (Statutory Instrument) URL for a site
 */
export function getSIUrl(siteCode: string): string | null {
  const site = getNPWSSiteData(siteCode)
  return site?.siUrl || null
}

/**
 * Search sites by name (partial match)
 */
export function searchSitesByName(query: string): NPWSSiteData[] {
  const lowerQuery = query.toLowerCase()
  return Object.values(npwsSites).filter((site) => site.siteName.toLowerCase().includes(lowerQuery))
}

/**
 * Get all site codes
 */
export function getAllSiteCodes(): string[] {
  return Object.keys(npwsSites)
}

/**
 * Get site count stats
 */
export function getSiteStats(): {
  totalSites: number
  sacCount: number
  spaCount: number
  withSSCO: number
  totalHabitats: number
  totalSpecies: number
} {
  const sites = Object.values(npwsSites)
  return {
    totalSites: sites.length,
    sacCount: sites.filter((s) => s.siteType === 'SAC').length,
    spaCount: sites.filter((s) => s.siteType === 'SPA').length,
    withSSCO: sites.filter((s) => !!s.sscoUrl).length,
    totalHabitats: sites.reduce((sum, s) => sum + (s.habitats?.length || 0), 0),
    totalSpecies: sites.reduce(
      (sum, s) => sum + (s.species?.length || 0) + (s.birdSpecies?.length || 0),
      0
    ),
  }
}
