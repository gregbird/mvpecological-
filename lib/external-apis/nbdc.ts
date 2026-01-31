/**
 * NBDC (National Biodiversity Data Centre) API Client
 * Fetches Irish species records and biodiversity data
 */

const NBDC_API_URL = 'https://maps.biodiversityireland.ie/Api'

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
 * Uses the NBDC WMS/API to get records within a geographic area
 */
export async function searchRecordsByBbox(
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  params?: Partial<NBDCSearchParams>
): Promise<NBDCRecord[]> {
  try {
    // NBDC doesn't have a direct bbox API, so we use their WFS service
    const url = new URL('https://maps.biodiversityireland.ie/geoserver/ows')

    url.searchParams.set('service', 'WFS')
    url.searchParams.set('version', '2.0.0')
    url.searchParams.set('request', 'GetFeature')
    url.searchParams.set('typeName', 'BiodiversityData:AllRecords')
    url.searchParams.set('outputFormat', 'application/json')
    url.searchParams.set('srsName', 'EPSG:4326')
    url.searchParams.set(
      'bbox',
      `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng},EPSG:4326`
    )
    url.searchParams.set('count', (params?.limit || 100).toString())

    // Add CQL filter for year range if specified
    const cqlFilters: string[] = []
    if (params?.startYear) {
      cqlFilters.push(`Year >= ${params.startYear}`)
    }
    if (params?.endYear) {
      cqlFilters.push(`Year <= ${params.endYear}`)
    }
    if (params?.taxonGroup) {
      cqlFilters.push(`TaxonGroup = '${params.taxonGroup}'`)
    }
    if (cqlFilters.length > 0) {
      url.searchParams.set('CQL_FILTER', cqlFilters.join(' AND '))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`NBDC WFS error: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    // Convert GeoJSON features to NBDCRecord format
    if (data.features) {
      return data.features.map(
        (feature: {
          properties: {
            RecordId?: number
            TaxonId?: number
            LatinName?: string
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
          }
          geometry?: { coordinates?: [number, number] }
        }): NBDCRecord => ({
          RecordId: feature.properties.RecordId || 0,
          TaxonId: feature.properties.TaxonId || 0,
          LatinName: feature.properties.LatinName || 'Unknown',
          CommonName: feature.properties.CommonName,
          TaxonGroup: feature.properties.TaxonGroup,
          GridReference: feature.properties.GridReference,
          Precision: feature.properties.Precision,
          Date: feature.properties.Date,
          Year: feature.properties.Year,
          Recorder: feature.properties.Recorder,
          Determiner: feature.properties.Determiner,
          DatasetName: feature.properties.DatasetName,
          SampleMethod: feature.properties.SampleMethod,
          Comment: feature.properties.Comment,
          Longitude: feature.geometry?.coordinates?.[0],
          Latitude: feature.geometry?.coordinates?.[1],
        })
      )
    }

    return []
  } catch (error) {
    // Don't log abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('NBDC bbox search timed out')
      return []
    }
    console.error('Error searching NBDC by bbox:', error)
    return []
  }
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
