/**
 * Habitat-Species Mapping for Smart Scoping
 *
 * Maps FOSSITT habitat codes to potential protected/notable species
 * that may be present. Used to generate field survey recommendations
 * based on desk study findings.
 *
 * Reference: Heritage Council FOSSITT Guide (2000)
 */

import data from './json/habitat-species-mapping.json'

export interface SpeciesRecommendation {
  species: string
  scientificName: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  surveyType: string
  optimalMonths: string[]
  protectionStatus: string[]
}

export interface HabitatSpeciesMapping {
  habitatName: string
  habitatCategory: string
  species: SpeciesRecommendation[]
}

/**
 * Core habitat-species mapping based on FOSSITT codes
 * This maps habitats to species that are likely to use them
 */
export const habitatSpeciesMapping: Record<string, HabitatSpeciesMapping> = data as Record<
  string,
  HabitatSpeciesMapping
>

/**
 * Get all species recommendations for a list of habitat codes
 */
export function getSpeciesForHabitats(habitatCodes: string[]): SpeciesRecommendation[] {
  const allSpecies: SpeciesRecommendation[] = []
  const seen = new Set<string>()

  for (const code of habitatCodes) {
    const mapping = habitatSpeciesMapping[code]
    if (mapping) {
      for (const species of mapping.species) {
        // Deduplicate by scientific name
        if (!seen.has(species.scientificName)) {
          seen.add(species.scientificName)
          allSpecies.push(species)
        }
      }
    }
  }

  // Sort by priority (high first)
  return allSpecies.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Get habitat name from FOSSITT code
 */
export function getHabitatName(code: string): string | null {
  return habitatSpeciesMapping[code]?.habitatName || null
}

/**
 * Calculate priority based on multiple factors
 */
export function calculateSpeciesPriority(
  baseSpecies: SpeciesRecommendation,
  gbifRecordCount: number,
  distanceToRecords: number,
  nearDesignatedSite: boolean,
  siteHasQualifyingInterest: boolean
): 'high' | 'medium' | 'low' {
  let score = 0

  // Base priority score
  if (baseSpecies.priority === 'high') score += 3
  else if (baseSpecies.priority === 'medium') score += 2
  else score += 1

  // GBIF records boost
  if (gbifRecordCount > 0) score += 2
  if (gbifRecordCount > 5) score += 1

  // Distance to records
  if (distanceToRecords < 2)
    score += 2 // Within 2km
  else if (distanceToRecords < 5) score += 1 // Within 5km

  // Designated site context
  if (nearDesignatedSite) score += 1
  if (siteHasQualifyingInterest) score += 2

  // Annex II/IV species get automatic boost
  if (
    baseSpecies.protectionStatus.includes('Annex II') ||
    baseSpecies.protectionStatus.includes('Annex IV')
  ) {
    score += 2
  }

  if (score >= 8) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}
