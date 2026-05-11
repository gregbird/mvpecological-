/**
 * GBIF (Global Biodiversity Information Facility) API Client
 * Fetches species occurrence records
 */

const GBIF_API_URL = 'https://api.gbif.org/v1'

export interface GBIFOccurrence {
  key: number
  scientificName: string
  vernacularName?: string
  decimalLatitude: number
  decimalLongitude: number
  coordinateUncertaintyInMeters?: number
  eventDate?: string
  year?: number
  month?: number
  day?: number
  basisOfRecord: string
  datasetName?: string
  datasetKey?: string
  publishingOrgKey?: string
  institutionCode?: string
  collectionCode?: string
  catalogNumber?: string
  recordedBy?: string
  identifiedBy?: string
  taxonKey?: number
  speciesKey?: number
  species?: string
  genericName?: string
  specificEpithet?: string
  taxonRank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  countryCode?: string
  stateProvince?: string
  locality?: string
  issues?: string[]
  hasCoordinate: boolean
  hasGeospatialIssues: boolean
  license?: string
  mediaType?: string[]
  occurrenceStatus?: string
}

export interface GBIFSearchParams {
  bbox?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
  geometry?: string // WKT format
  taxonKey?: number
  scientificName?: string
  year?: number | string // Can be range like "2020,2024"
  month?: number
  basisOfRecord?: string[]
  hasCoordinate?: boolean
  hasGeospatialIssue?: boolean
  limit?: number
  offset?: number
  country?: string
}

export interface GBIFSearchResponse {
  offset: number
  limit: number
  endOfRecords: boolean
  count: number
  results: GBIFOccurrence[]
}

/**
 * Search for species occurrences in GBIF
 */
export async function searchOccurrences(params: GBIFSearchParams): Promise<GBIFSearchResponse> {
  const url = new URL(`${GBIF_API_URL}/occurrence/search`)

  // Build query parameters
  const queryParams = new URLSearchParams()

  // Ireland country code
  queryParams.set('country', params.country || 'IE')

  // Only records with coordinates elemetnerl demek ki olana daemek istediğim
  queryParams.set('hasCoordinate', String(params.hasCoordinate ?? true))
  queryParams.set('hasGeospatialIssue', String(params.hasGeospatialIssue ?? false))

  if (params.bbox) {
    // GBIF uses decimalLatitude and decimalLongitude with operators
    queryParams.set(
      'geometry',
      `POLYGON((${params.bbox.minLng} ${params.bbox.minLat},${params.bbox.maxLng} ${params.bbox.minLat},${params.bbox.maxLng} ${params.bbox.maxLat},${params.bbox.minLng} ${params.bbox.maxLat},${params.bbox.minLng} ${params.bbox.minLat}))`
    )
  }

  if (params.geometry) {
    queryParams.set('geometry', params.geometry)
  }

  if (params.taxonKey) {
    queryParams.set('taxonKey', params.taxonKey.toString())
  }

  if (params.scientificName) {
    queryParams.set('scientificName', params.scientificName)
  }

  if (params.year) {
    queryParams.set('year', params.year.toString())
  }

  if (params.month) {
    queryParams.set('month', params.month.toString())
  }

  if (params.basisOfRecord) {
    params.basisOfRecord.forEach((basis) => {
      queryParams.append('basisOfRecord', basis)
    })
  }

  queryParams.set('limit', (params.limit || 100).toString())
  queryParams.set('offset', (params.offset || 0).toString())

  url.search = queryParams.toString()

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching GBIF:', error)
    throw error
  }
}

/**
 * Get occurrence details by key
 */
export async function getOccurrence(key: number): Promise<GBIFOccurrence | null> {
  try {
    const response = await fetch(`${GBIF_API_URL}/occurrence/${key}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching occurrence:', error)
    return null
  }
}

/**
 * Search for species by name
 */
export async function searchSpecies(
  query: string,
  limit = 20
): Promise<
  Array<{
    key: number
    scientificName: string
    canonicalName?: string
    vernacularName?: string
    rank?: string
    kingdom?: string
    phylum?: string
    class?: string
    order?: string
    family?: string
    genus?: string
  }>
> {
  try {
    const url = new URL(`${GBIF_API_URL}/species/search`)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('rank', 'SPECIES')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`GBIF species search error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error searching species:', error)
    return []
  }
}

/**
 * Get species details by taxon key
 */
export async function getSpecies(taxonKey: number): Promise<{
  key: number
  scientificName: string
  canonicalName?: string
  vernacularNames?: Array<{ vernacularName: string; language?: string }>
  rank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  taxonomicStatus?: string
} | null> {
  try {
    const response = await fetch(`${GBIF_API_URL}/species/${taxonKey}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching species:', error)
    return null
  }
}

/**
 * Get vernacular names for a species
 */
export async function getVernacularNames(
  taxonKey: number
): Promise<Array<{ vernacularName: string; language?: string; source?: string }>> {
  try {
    const response = await fetch(`${GBIF_API_URL}/species/${taxonKey}/vernacularNames`)

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching vernacular names:', error)
    return []
  }
}

/**
 * Convert GBIF occurrences to GeoJSON FeatureCollection
 */
export function occurrencesToGeoJSON(
  occurrences: GBIFOccurrence[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: occurrences
      .filter((occ) => occ.decimalLatitude && occ.decimalLongitude)
      .map((occ) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [occ.decimalLongitude, occ.decimalLatitude],
        },
        properties: {
          key: occ.key,
          scientificName: occ.scientificName,
          vernacularName: occ.vernacularName,
          eventDate: occ.eventDate,
          year: occ.year,
          basisOfRecord: occ.basisOfRecord,
          datasetName: occ.datasetName,
          recordedBy: occ.recordedBy,
          coordinateUncertainty: occ.coordinateUncertaintyInMeters,
          kingdom: occ.kingdom,
          family: occ.family,
          genus: occ.genus,
          species: occ.species,
        },
      })),
  }
}

/**
 * Get basis of record display name
 */
export function getBasisOfRecordDisplayName(basis: string): string {
  const names: Record<string, string> = {
    PRESERVED_SPECIMEN: 'Preserved Specimen',
    FOSSIL_SPECIMEN: 'Fossil Specimen',
    LIVING_SPECIMEN: 'Living Specimen',
    OBSERVATION: 'Observation',
    HUMAN_OBSERVATION: 'Human Observation',
    MACHINE_OBSERVATION: 'Machine Observation',
    MATERIAL_SAMPLE: 'Material Sample',
    LITERATURE: 'Literature',
    UNKNOWN: 'Unknown',
  }
  return names[basis] || basis
}
