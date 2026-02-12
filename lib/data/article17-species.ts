/**
 * Article 17 Habitats Directive Species Lookup
 * Protected species distribution data for Ireland (2019 report)
 */

export interface Article17Species {
  code: string
  commonName: string
  scientificName: string
  hectads: string[] // 10km grid squares where species occurs
  gridCount: number
}

interface Article17Data {
  source: string
  description: string
  species: Article17Species[]
}

let speciesData: Article17Data | null = null

/**
 * Load Article 17 species data
 */
async function loadSpeciesData(): Promise<Article17Data> {
  if (speciesData) return speciesData

  const response = await fetch('/data/article17-species.json')
  speciesData = await response.json()
  return speciesData!
}

/**
 * Get all Annex species
 */
export async function getAllAnnexSpecies(): Promise<Article17Species[]> {
  const data = await loadSpeciesData()
  return data.species
}

/**
 * Search species by hectad (10km grid reference)
 * @param hectad - e.g., "G74", "M65"
 */
export async function searchSpeciesByHectad(hectad: string): Promise<Article17Species[]> {
  const data = await loadSpeciesData()
  const h = hectad.toUpperCase()

  return data.species.filter((s) => s.hectads.some((grid) => grid.toUpperCase().startsWith(h)))
}

/**
 * Search species by grid reference (any precision)
 * @param gridRef - e.g., "G7045", "M653808"
 */
export async function searchSpeciesByGridRef(gridRef: string): Promise<Article17Species[]> {
  const data = await loadSpeciesData()

  // Normalize and extract hectad
  const normalized = gridRef.replace(/\s/g, '').toUpperCase()
  const hectad = normalized.substring(0, 3) // Letter + 2 digits

  return data.species.filter((s) =>
    s.hectads.some((grid) => {
      const gridHectad = grid.substring(0, 3).toUpperCase()
      return gridHectad === hectad
    })
  )
}

/**
 * Search species by name
 */
export async function searchSpeciesByName(query: string): Promise<Article17Species[]> {
  const data = await loadSpeciesData()
  const q = query.toLowerCase()

  return data.species.filter(
    (s) =>
      s.scientificName.toLowerCase().includes(q) ||
      (s.commonName && s.commonName.toLowerCase().includes(q)) ||
      s.code.includes(q)
  )
}

/**
 * Format Article 17 species for AI prompt
 */
export function formatArticle17ForPrompt(species: Article17Species[]): string {
  if (species.length === 0) {
    return 'No Annex II/IV/V species (Habitats Directive) records found in this area.'
  }

  const lines = [`Habitats Directive Annex Species in this area (${species.length} species):`, '']

  for (const sp of species) {
    const name = sp.commonName ? `${sp.commonName} (${sp.scientificName})` : sp.scientificName
    lines.push(`- ${name} [Annex species code: ${sp.code}] - ${sp.gridCount} grid squares`)
  }

  lines.push('')
  lines.push(
    'These species are protected under the EU Habitats Directive (Annex II/IV/V). Appropriate Assessment may be required for developments affecting these species.'
  )

  return lines.join('\n')
}
