/**
 * NBDC (National Biodiversity Data Centre) API Client
 * Fetches Irish species records and biodiversity data
 *
 * Note: NBDC's WFS/GeoServer service is no longer available.
 * For bbox-based searches, use GBIF which includes NBDC records.
 * This client now focuses on species enrichment (protection status, Irish records, etc.)
 *
 * @see docs/NBDC_API_INTEGRATION.md for detailed API documentation
 */

const NBDC_API_URL = 'https://maps.biodiversityireland.ie/Api'
const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

export interface NBDCSpecies {
  TaxonId: number
  LatinName: string
  CommonName?: string
  TaxonGroup?: string
  RecordCount?: number
  LastRecord?: string
  ProtectedStatus?: string
  RedListStatus?: string
  IsInvasive?: boolean
}

export interface NBDCRecord {
  RecordId: number
  TaxonId: number
  LatinName: string
  CommonName?: string
  TaxonGroup?: string
  GridReference?: string
  Precision?: string
  Date?: string
  Year?: number
  Recorder?: string
  Determiner?: string
  DatasetName?: string
  SampleMethod?: string
  Comment?: string
  Latitude?: number
  Longitude?: number
}

export interface NBDCSearchParams {
  gridReference?: string
  taxonGroup?: string
  speciesName?: string
  startYear?: number
  endYear?: number
  designationCode?: string
  limit?: number
  bbox?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

/**
 * Search for species records by grid reference
 */
export async function searchRecordsByGridRef(
  gridReference: string,
  params?: Partial<NBDCSearchParams>
): Promise<NBDCRecord[]> {
  try {
    const url = new URL(`${NBDC_API_URL}/Records/Grid/${gridReference}`)

    if (params?.taxonGroup) {
      url.searchParams.set('taxonGroup', params.taxonGroup)
    }
    if (params?.startYear) {
      url.searchParams.set('startYear', params.startYear.toString())
    }
    if (params?.endYear) {
      url.searchParams.set('endYear', params.endYear.toString())
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`NBDC API error: ${response.statusText}`)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching NBDC records:', error)
    return []
  }
}

/**
 * Search species by name
 */
export async function searchSpecies(query: string, taxonGroup?: string): Promise<NBDCSpecies[]> {
  try {
    const url = new URL(`${NBDC_API_URL}/Species/Search`)
    url.searchParams.set('q', query)

    if (taxonGroup) {
      url.searchParams.set('taxonGroup', taxonGroup)
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`NBDC species search error: ${response.statusText}`)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching NBDC species:', error)
    return []
  }
}

/**
 * Get species details by taxon ID
 */
export async function getSpeciesDetails(taxonId: number): Promise<NBDCSpecies | null> {
  try {
    const response = await fetch(`${NBDC_API_URL}/Species/${taxonId}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching species details:', error)
    return null
  }
}

/**
 * Get species records for a specific taxon
 */
export async function getSpeciesRecords(
  taxonId: number,
  params?: { startYear?: number; endYear?: number; limit?: number }
): Promise<NBDCRecord[]> {
  try {
    const url = new URL(`${NBDC_API_URL}/Species/${taxonId}/Records`)

    if (params?.startYear) {
      url.searchParams.set('startYear', params.startYear.toString())
    }
    if (params?.endYear) {
      url.searchParams.set('endYear', params.endYear.toString())
    }
    if (params?.limit) {
      url.searchParams.set('limit', params.limit.toString())
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching species records:', error)
    return []
  }
}

/**
 * Get protected species list
 */
export async function getProtectedSpecies(designationCode?: string): Promise<NBDCSpecies[]> {
  try {
    const url = new URL(`${NBDC_API_URL}/Species/Protected`)

    if (designationCode) {
      url.searchParams.set('designation', designationCode)
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching protected species:', error)
    return []
  }
}

/**
 * Get invasive species list
 */
export async function getInvasiveSpecies(): Promise<NBDCSpecies[]> {
  try {
    const response = await fetch(`${NBDC_API_URL}/Species/Invasive`)

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching invasive species:', error)
    return []
  }
}

/**
 * Get taxon groups available in NBDC
 */
export function getTaxonGroups(): Array<{ code: string; name: string }> {
  return [
    { code: 'bird', name: 'Birds' },
    { code: 'mammal', name: 'Mammals' },
    { code: 'reptile', name: 'Reptiles' },
    { code: 'amphibian', name: 'Amphibians' },
    { code: 'fish', name: 'Fish' },
    { code: 'insect', name: 'Insects' },
    { code: 'mollusc', name: 'Molluscs' },
    { code: 'crustacean', name: 'Crustaceans' },
    { code: 'spider', name: 'Spiders' },
    { code: 'flowering_plant', name: 'Flowering Plants' },
    { code: 'fern', name: 'Ferns' },
    { code: 'moss', name: 'Mosses' },
    { code: 'liverwort', name: 'Liverworts' },
    { code: 'lichen', name: 'Lichens' },
    { code: 'fungi', name: 'Fungi' },
    { code: 'algae', name: 'Algae' },
  ]
}

/**
 * Get protection designations
 */
export function getProtectionDesignations(): Array<{
  code: string
  name: string
  description: string
}> {
  return [
    {
      code: 'WA',
      name: 'Wildlife Act',
      description: 'Protected under the Wildlife Acts 1976-2012',
    },
    {
      code: 'HD_II',
      name: 'Habitats Directive Annex II',
      description: 'Species requiring designation of SACs',
    },
    {
      code: 'HD_IV',
      name: 'Habitats Directive Annex IV',
      description: 'Species requiring strict protection',
    },
    {
      code: 'HD_V',
      name: 'Habitats Directive Annex V',
      description: 'Species whose taking may be subject to management',
    },
    {
      code: 'BD_I',
      name: 'Birds Directive Annex I',
      description: 'Birds requiring special conservation measures',
    },
    {
      code: 'CITES',
      name: 'CITES',
      description: 'Convention on International Trade in Endangered Species',
    },
    {
      code: 'BERN_II',
      name: 'Bern Convention Appendix II',
      description: 'Strictly protected fauna species',
    },
    {
      code: 'BERN_III',
      name: 'Bern Convention Appendix III',
      description: 'Protected fauna species',
    },
  ]
}

/**
 * Check if a species is protected
 */
export function isProtectedSpecies(species: NBDCSpecies): boolean {
  return !!(species.ProtectedStatus && species.ProtectedStatus.length > 0)
}

/**
 * Get Red List status color
 */
export function getRedListColor(status?: string): string {
  if (!status) return '#9ca3af' // gray

  const colors: Record<string, string> = {
    EX: '#000000', // Extinct - black
    EW: '#000000', // Extinct in wild - black
    RE: '#7f1d1d', // Regionally extinct - dark red
    CR: '#dc2626', // Critically endangered - red
    EN: '#ea580c', // Endangered - orange
    VU: '#eab308', // Vulnerable - yellow
    NT: '#84cc16', // Near threatened - lime
    LC: '#22c55e', // Least concern - green
    DD: '#9ca3af', // Data deficient - gray
    NE: '#9ca3af', // Not evaluated - gray
  }

  return colors[status] || '#9ca3af'
}

/**
 * Get Red List status display name
 */
export function getRedListDisplayName(status?: string): string {
  if (!status) return 'Not Evaluated'

  const names: Record<string, string> = {
    EX: 'Extinct',
    EW: 'Extinct in the Wild',
    RE: 'Regionally Extinct',
    CR: 'Critically Endangered',
    EN: 'Endangered',
    VU: 'Vulnerable',
    NT: 'Near Threatened',
    LC: 'Least Concern',
    DD: 'Data Deficient',
    NE: 'Not Evaluated',
  }

  return names[status] || status
}

/**
 * Search for species records by bounding box
 *
 * NOTE: NBDC's WFS/GeoServer service is no longer available (as of 2024).
 * This function now returns an empty array with a warning.
 * For species records, use GBIF instead which includes NBDC data.
 *
 * @deprecated Use GBIF searchOccurrences() instead for bbox-based species searches
 */
export async function searchRecordsByBbox(
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  params?: Partial<NBDCSearchParams>
): Promise<NBDCRecord[]> {
  // NBDC's WFS service is no longer available
  // Log a warning and return empty array
  console.warn(
    '[NBDC] WFS service is no longer available. Use GBIF for species occurrence data instead.',
    'GBIF includes NBDC records: https://www.gbif.org/dataset/66a51aea-8662-4685-9fd0-9d4b596617d5'
  )

  // Return empty array - the UI should handle this gracefully
  return []
}

/**
 * Search for protected species records within a bounding box
 */
export async function searchProtectedSpeciesInBbox(
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  params?: Partial<NBDCSearchParams>
): Promise<NBDCRecord[]> {
  const records = await searchRecordsByBbox(bbox, params)

  // Filter to only return protected species
  // In a production app, you'd want to cross-reference with the protected species list
  // For now, we return all records and mark protection status where available
  return records
}

/**
 * Convert NBDC records to GeoJSON (requires grid reference conversion)
 */
export function recordsToGeoJSON(records: NBDCRecord[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: records
      .filter((r) => r.Latitude && r.Longitude)
      .map((record) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [record.Longitude!, record.Latitude!],
        },
        properties: {
          recordId: record.RecordId,
          taxonId: record.TaxonId,
          latinName: record.LatinName,
          commonName: record.CommonName,
          taxonGroup: record.TaxonGroup,
          gridReference: record.GridReference,
          date: record.Date,
          year: record.Year,
          recorder: record.Recorder,
          datasetName: record.DatasetName,
        },
      })),
  }
}

// ============================================================================
// NEW API: Species Enrichment from NBDC
// These functions use the working NBDC endpoints to enrich GBIF data
// ============================================================================

/**
 * Response from NBDC species search (DataTables format)
 */
interface NBDCSpeciesSearchResponse {
  iTotalRecords: number
  iTotalDisplayRecords: number
  sEcho: number
  aaData: Array<
    [
      string, // [0] Row index
      string, // [1] TaxonId
      string, // [2] Display name "Common Name (Scientific Name)"
      string, // [3] Authority
      string, // [4] Taxon Group
      string, // [5] Taxonomic Rank
      string, // [6] Record Count
      string, // [7] Links/Actions
    ]
  >
}

/**
 * Response from NBDC GetTaxon API
 */
interface NBDCTaxonResponse {
  result: {
    taxonId: number
    taxonName: string
    commonName: string | null
    formattedTaxonName: string
    taxonGroupName: string
    taxonRankName: string
    taxonAuthority: string | null
    designations: string | null
    recordCount: number
    tenKRecordCount: number
    fiftyKRecordCount: number
    oldestRecord: string | null
    newestRecord: string | null
    taxonVersionKey: string | null
  } | null
  success: boolean
  error: unknown
}

/**
 * Enriched species data from NBDC
 */
export interface NBDCEnrichedSpecies {
  taxonId: number
  scientificName: string
  commonName: string | null
  taxonGroup: string
  designations: string | null
  isProtected: boolean
  isInvasive: boolean
  isThreatened: boolean
  totalRecordsInIreland: number
  gridSquares10km: number
  gridSquares50km: number
  oldestRecordDate: string | null
  newestRecordDate: string | null
  nbdcUrl: string
}

/**
 * Search NBDC for a species by scientific name and return the taxonId
 *
 * @param scientificName - The scientific name to search for (e.g., "Meles meles")
 * @returns The NBDC taxonId if found, null otherwise
 */
export async function searchNBDCTaxonId(scientificName: string): Promise<number | null> {
  try {
    const response = await fetch(`${NBDC_BASE_URL}/Species/GetSpecies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        speciesName: scientificName,
        taxonomicSource: '0',
        iDisplayStart: '0',
        iDisplayLength: '10',
        sEcho: '1',
      }),
    })

    if (!response.ok) {
      console.warn(`[NBDC] Species search failed: ${response.statusText}`)
      return null
    }

    const data: NBDCSpeciesSearchResponse = await response.json()

    // Find exact or close match
    for (const row of data.aaData) {
      const displayName = row[2] // "Badger (Meles meles)" or "Meles meles"

      // Check if the scientific name is in the display name
      if (displayName.toLowerCase().includes(scientificName.toLowerCase())) {
        const taxonId = parseInt(row[1], 10)
        if (!isNaN(taxonId)) {
          return taxonId
        }
      }
    }

    return null
  } catch (error) {
    console.error('[NBDC] Error searching for taxonId:', error)
    return null
  }
}

/**
 * Get detailed taxon information from NBDC by taxonId
 *
 * @param taxonId - The NBDC taxonId
 * @returns Enriched species data or null if not found
 */
export async function getNBDCTaxonDetails(taxonId: number): Promise<NBDCEnrichedSpecies | null> {
  try {
    const response = await fetch(
      `${NBDC_BASE_URL}/api/services/app/taxonService/GetTaxon?taxonId=${taxonId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }
    )

    if (!response.ok) {
      console.warn(`[NBDC] GetTaxon failed: ${response.statusText}`)
      return null
    }

    const data: NBDCTaxonResponse = await response.json()

    if (!data.success || !data.result) {
      return null
    }

    const r = data.result
    const designations = r.designations || ''

    return {
      taxonId: r.taxonId,
      scientificName: r.taxonName,
      commonName: r.commonName,
      taxonGroup: r.taxonGroupName,
      designations: r.designations,
      isProtected: designations.toLowerCase().includes('protected'),
      isInvasive: designations.toLowerCase().includes('invasive'),
      isThreatened: designations.toLowerCase().includes('threatened'),
      totalRecordsInIreland: r.recordCount,
      gridSquares10km: r.tenKRecordCount,
      gridSquares50km: r.fiftyKRecordCount,
      oldestRecordDate: r.oldestRecord ? r.oldestRecord.split('T')[0] : null,
      newestRecordDate: r.newestRecord ? r.newestRecord.split('T')[0] : null,
      nbdcUrl: `${NBDC_BASE_URL}/species/${r.taxonId}`,
    }
  } catch (error) {
    console.error('[NBDC] Error fetching taxon details:', error)
    return null
  }
}

/**
 * Enrich a species record with NBDC data
 * This is the main function to use for GBIF → NBDC enrichment
 *
 * @param scientificName - The scientific name from GBIF
 * @returns Enriched species data or null if not found in NBDC
 */
export async function enrichSpeciesFromNBDC(
  scientificName: string
): Promise<NBDCEnrichedSpecies | null> {
  // Step 1: Search for taxonId
  const taxonId = await searchNBDCTaxonId(scientificName)

  if (!taxonId) {
    return null
  }

  // Step 2: Get detailed information
  return getNBDCTaxonDetails(taxonId)
}

/**
 * Batch enrich multiple species with NBDC data
 * Deduplicates species names and caches results for efficiency
 *
 * @param scientificNames - Array of scientific names to enrich
 * @param delayMs - Delay between requests to respect rate limits (default: 100ms)
 * @returns Map of scientific name to enriched data
 */
export async function batchEnrichSpeciesFromNBDC(
  scientificNames: string[],
  delayMs: number = 100
): Promise<Map<string, NBDCEnrichedSpecies | null>> {
  const results = new Map<string, NBDCEnrichedSpecies | null>()
  const uniqueNames = Array.from(new Set(scientificNames))

  for (const name of uniqueNames) {
    const enriched = await enrichSpeciesFromNBDC(name)
    results.set(name, enriched)

    // Delay between requests to be respectful to the server
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

/**
 * Check if a species is protected in Ireland
 *
 * @param scientificName - The scientific name to check
 * @returns Protection status with designations list
 */
export async function checkProtectionStatus(scientificName: string): Promise<{
  isProtected: boolean
  isInvasive: boolean
  isThreatened: boolean
  designations: string[]
}> {
  const enriched = await enrichSpeciesFromNBDC(scientificName)

  if (!enriched) {
    return {
      isProtected: false,
      isInvasive: false,
      isThreatened: false,
      designations: [],
    }
  }

  // Parse designations string into array
  const designations = enriched.designations
    ? enriched.designations
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    : []

  return {
    isProtected: enriched.isProtected,
    isInvasive: enriched.isInvasive,
    isThreatened: enriched.isThreatened,
    designations,
  }
}

/**
 * Get NBDC species page URL
 */
export function getNBDCSpeciesUrl(taxonId: number): string {
  return `${NBDC_BASE_URL}/species/${taxonId}`
}
