/**
 * Article 12 Birds Directive Species Lookup
 * Breeding bird distribution data for Ireland (2013-2018)
 */

export interface Article12BirdSpecies {
  code: string
  scientificName: string
  commonName: string
  gridCount: number
}

interface Article12Data {
  source: string
  description: string
  
  gridType: string
  species: Article12BirdSpecies[]
}

let birdsData: Article12Data | null = null

/**
 * Load Article 12 birds data
 */
async function loadBirdsData(): Promise<Article12Data> {
  if (birdsData) return birdsData

  const response = await fetch('/data/article12-birds.json')
  birdsData = await response.json()
  return birdsData!
}

/**
 * Get all protected bird species
 */
export async function getAllBirdSpecies(): Promise<Article12BirdSpecies[]> {
  const data = await loadBirdsData()
  return data.species
}

/**
 * Search bird species by name
 */
export async function searchBirdSpecies(query: string): Promise<Article12BirdSpecies[]> {
  const data = await loadBirdsData()
  const q = query.toLowerCase()

  return data.species.filter(
    (s) =>
      s.scientificName.toLowerCase().includes(q) ||
      s.commonName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
  )
}

/**
 * Format Article 12 birds for AI prompt
 */
export function formatBirdsForPrompt(species: Article12BirdSpecies[]): string {
  if (species.length === 0) {
    return 'No Article 12 Birds Directive protected species data available.'
  }

  const lines = [
    `Article 12 Birds Directive - ${species.length} breeding bird species recorded in Ireland:`,
    '',
  ]

  // Sort by grid count (most widespread first)
  const sorted = [...species].sort((a, b) => b.gridCount - a.gridCount)

  for (const bird of sorted.slice(0, 20)) {
    lines.push(
      `- ${bird.commonName} (${bird.scientificName}) - recorded in ${bird.gridCount} 10km grid squares`
    )
  }

  if (species.length > 20) {
    lines.push(`  ... and ${species.length - 20} more species`)
  }

  lines.push('')
  lines.push(
    'These species are protected under the EU Birds Directive. Development proposals should consider potential impacts on breeding bird populations.'
  )

  return lines.join('\n')
}
