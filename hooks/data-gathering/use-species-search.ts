import * as React from 'react'

import { fetchNBDCGridReport, type NBDCGridReportSpecies } from '@/lib/external-apis/nbdc'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import { searchSpeciesByGridRef } from '@/lib/data/article17-species'
import { wgs84ToItm, itmToGridRef } from '@/lib/utils/grid-reference'
import { itmToIng } from '@/hooks/data-gathering/use-grid-overlay'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'

/**
 * Parse NBDC report species name: "Common Name (Scientific Name)" or just "Scientific Name"
 */
function parseSpeciesName(name: string): { scientificName: string; commonName?: string } {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (match) {
    return { commonName: match[1].trim(), scientificName: match[2].trim() }
  }
  return { scientificName: name.trim() }
}

/**
 * Parse NBDC designation string to determine protection/invasive/threatened status
 */
function parseDesignation(designation: string | null): {
  isProtected: boolean
  isInvasive: boolean
  isThreatened: boolean
} {
  if (!designation) return { isProtected: false, isInvasive: false, isThreatened: false }
  const d = designation.toLowerCase()
  return {
    isProtected:
      /wildlife act|habitats directive|birds directive|flora protection|protected|annex|bern convention|bonn convention|cites/.test(
        d
      ),
    isInvasive: /invasive|ias regulation|third schedule/.test(d),
    isThreatened:
      /critically endangered|endangered|vulnerable|near threatened|red list|red data|threatened|amber list/.test(
        d
      ),
  }
}

/**
 * Compare two date strings in DD/MM/YYYY or YYYY-MM-DD format.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareDates(a: string, b: string): number {
  const parseDate = (d: string): number => {
    const dmy = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`).getTime()
    return new Date(d).getTime()
  }
  return parseDate(a) - parseDate(b)
}

/** Common names for well-known Article 17 species */
const ARTICLE_17_COMMON_NAMES: Record<string, string> = {
  '1355': 'Otter',
  '1357': 'Pine Marten',
  '1334': 'Irish Hare',
  '1303': 'Lesser Horseshoe Bat',
  '1309': 'Common Pipistrelle',
  '1314': "Daubenton's Bat",
  '1106': 'Atlantic Salmon',
  '1029': 'Freshwater Pearl Mussel',
  '1065': 'Marsh Fritillary',
  '1024': 'Kerry Slug',
  '1213': 'Common Frog',
  '1092': 'White-clawed Crayfish',
}

interface SpeciesSearchParams {
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  buffer: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
}

/**
 * Build the performSearch function for species records substep.
 * Searches NBDC Grid Report API, FPO, and Article 17 species.
 */
export function buildPerformSearch(
  gridResolution: '10km' | '2km' | '1km',
  projectCenter?: { lat: number; lng: number },
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
) {
  return async ({
    bbox,
    buffer,
    boundary: searchBoundary,
  }: SpeciesSearchParams): Promise<FindingDisplay[]> => {
    const findings: FindingDisplay[] = []
    const gridRefsToSearch: string[] = []
    let gridRef1km: string | null = null
    let searchLabel = ''

    const resolutionMeters =
      gridResolution === '10km' ? 10000 : gridResolution === '2km' ? 2000 : 1000
    const stepSize = resolutionMeters
    const precision: 1 | 2 = gridResolution === '10km' ? 1 : 2

    if (projectCenter) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const turf = require('@turf/turf')
        const sourceGeometry =
          searchBoundary ?? projectBoundary ?? turf.point([projectCenter.lng, projectCenter.lat])
        const bufferPoly = turf.buffer(sourceGeometry, buffer, { units: 'kilometers' })

        const swItm = wgs84ToItm(bbox.minLat, bbox.minLng)
        const neItm = wgs84ToItm(bbox.maxLat, bbox.maxLng)
        const swIng = itmToIng(swItm.easting, swItm.northing)
        const neIng = itmToIng(neItm.easting, neItm.northing)

        const minE = Math.floor(swIng.easting / stepSize) * stepSize
        const minN = Math.floor(swIng.northing / stepSize) * stepSize
        const maxE = Math.floor(neIng.easting / stepSize) * stepSize
        const maxN = Math.floor(neIng.northing / stepSize) * stepSize

        const seenSearchRefs = new Set<string>()
        for (let e = minE; e <= maxE; e += stepSize) {
          for (let n = minN; n <= maxN; n += stepSize) {
            try {
              const ref = itmToGridRef(e, n, precision, true)
              if (seenSearchRefs.has(ref)) continue
              seenSearchRefs.add(ref)

              const { itmToWgs84: toWgs84 } = await import('@/lib/utils/grid-reference')
              const sw = toWgs84(e + 400000, n + 500000)
              const ne = toWgs84(e + resolutionMeters + 400000, n + resolutionMeters + 500000)
              const gridPoly = turf.polygon([
                [
                  [sw.lng, sw.lat],
                  [ne.lng, sw.lat],
                  [ne.lng, ne.lat],
                  [sw.lng, ne.lat],
                  [sw.lng, sw.lat],
                ],
              ])
              if (turf.booleanIntersects(gridPoly, bufferPoly)) {
                gridRefsToSearch.push(ref)
              }
            } catch {
              // Square outside Irish Grid
            }
          }
        }

        searchLabel =
          gridRefsToSearch.length === 1
            ? gridRefsToSearch[0]
            : `${gridRefsToSearch.length} ${gridResolution} squares`

        const centerItm = wgs84ToItm(projectCenter.lat, projectCenter.lng)
        const centerIng = itmToIng(centerItm.easting, centerItm.northing)
        try {
          gridRef1km = itmToGridRef(centerIng.easting, centerIng.northing, 2, true)
        } catch {
          // Outside grid
        }
      } catch {
        // Project is outside Irish Grid
      }
    }

    // --- NBDC Grid Report Search ---
    if (gridRefsToSearch.length > 0) {
      processNBDCReport(gridRefsToSearch, resolutionMeters, searchLabel, findings)
    }

    // --- FPO and Article 17 search (supplementary) ---
    if (projectCenter && gridRef1km) {
      await searchFPOSpecies(gridRef1km, findings)
      await searchArticle17Species(gridRef1km, findings)
    }

    return findings
  }
}

async function processNBDCReport(
  gridRefsToSearch: string[],
  resolutionMeters: number,
  searchLabel: string,
  findings: FindingDisplay[]
) {
  const cleanRefs = gridRefsToSearch.map((r) => r.replace(/\s+/g, ''))
  const report = await fetchNBDCGridReport(cleanRefs, resolutionMeters)

  const speciesMap = new Map<
    string,
    {
      totalCount: number
      species: NBDCGridReportSpecies
      gridSquares: Set<string>
      newestDate: string | null
      datasets: Map<string, number>
    }
  >()

  for (const s of report.species) {
    const key = s.speciesName
    if (!speciesMap.has(key)) {
      speciesMap.set(key, {
        totalCount: 0,
        species: s,
        gridSquares: new Set(),
        newestDate: null,
        datasets: new Map(),
      })
    }
    const entry = speciesMap.get(key)!
    entry.totalCount += s.recordCount
    entry.gridSquares.add(s.gridSquare)
    if (s.designation && !entry.species.designation) {
      entry.species = { ...entry.species, designation: s.designation }
    }
    if (s.dateOfLastRecord) {
      if (!entry.newestDate || compareDates(s.dateOfLastRecord, entry.newestDate) > 0) {
        entry.newestDate = s.dateOfLastRecord
      }
    }
    if (s.datasetTitle) {
      entry.datasets.set(s.datasetTitle, (entry.datasets.get(s.datasetTitle) || 0) + 1)
    }
  }

  let speciesIdx = 0
  for (const [name, { totalCount, species, gridSquares, newestDate, datasets }] of speciesMap) {
    speciesIdx++
    const { scientificName, commonName } = parseSpeciesName(name)
    const { isProtected, isInvasive, isThreatened } = parseDesignation(species.designation)

    let mostCommonDataset: string | undefined
    let maxDsCount = 0
    for (const [dsName, cnt] of datasets) {
      if (cnt > maxDsCount) {
        maxDsCount = cnt
        mostCommonDataset = dsName
      }
    }

    findings.push({
      id: `nbdc-${speciesIdx}-${name.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 60)}`,
      source: 'nbdc',
      dataType: 'species_record',
      title: commonName || scientificName,
      content: `${totalCount} record${totalCount > 1 ? 's' : ''} in ${searchLabel}. Group: ${species.speciesGroup}.`,
      isSaved: false,
      sourceUrl: 'https://maps.biodiversityireland.ie',
      rawData: { recordCount: totalCount },
      metadata: {
        scientificName,
        commonName,
        taxonGroup: species.speciesGroup,
        recordCount: totalCount,
        datasetName: mostCommonDataset,
        newestRecordDate: newestDate || undefined,
        designations: species.designation || undefined,
        isProtected,
        isInvasive,
        isThreatened,
        nbdcEnriched: true,
        gridReference: gridRefsToSearch[0]?.replace(/\s+/g, ''),
        gridSquares10km: gridSquares.size,
        gridSquares: Array.from(gridSquares),
      },
    })
  }
}

async function searchFPOSpecies(gridRef1km: string, findings: FindingDisplay[]) {
  try {
    const fpoResults = await searchFPOByGridRef(gridRef1km)
    const fpoSpeciesGroups = new Map<string, { count: number; records: FPORecord[] }>()
    for (const record of fpoResults) {
      const key = record.latinName
      if (!fpoSpeciesGroups.has(key)) {
        fpoSpeciesGroups.set(key, { count: 0, records: [] })
      }
      const group = fpoSpeciesGroups.get(key)!
      group.count++
      group.records.push(record)
    }

    for (const [latinName, { count, records }] of fpoSpeciesGroups) {
      const firstRecord = records[0]
      const locations = [...new Set(records.map((r) => r.locationName).filter(Boolean))]
      if (findings.some((f) => f.metadata?.scientificName === latinName)) continue

      findings.push({
        id: `fpo-${latinName.replace(/\s+/g, '-')}`,
        source: 'fpo',
        dataType: 'species_record',
        title: `${firstRecord.commonName || latinName}`,
        content: `${count} FPO record${count > 1 ? 's' : ''} in hectad ${gridRef1km}. ${firstRecord.isSensitive ? '⚠️ Sensitive species.' : ''} ${locations.length > 0 ? `Recorded at: ${locations.slice(0, 2).join(', ')}${locations.length > 2 ? '...' : ''}` : ''}`,
        isSaved: false,
        sourceUrl: 'https://www.npws.ie/legislation/irish-law/flora-protection-order',
        rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
        metadata: {
          scientificName: latinName,
          commonName: firstRecord.commonName,
          recordCount: count,
          isProtected: true,
          designation: 'Flora Protection Order 2022',
          datasetName: 'Flora Protection Order 2022',
          newestRecordDate: records
            .map((r) => r.year)
            .filter(Boolean)
            .sort()
            .reverse()[0]
            ?.toString(),
        },
      })
    }
  } catch {
    // FPO search is supplementary — skip silently on failure
  }
}

async function searchArticle17Species(gridRef1km: string, findings: FindingDisplay[]) {
  try {
    const annexSpecies = await searchSpeciesByGridRef(gridRef1km)
    for (const species of annexSpecies) {
      const commonName = ARTICLE_17_COMMON_NAMES[species.code] || ''
      const displayName = commonName || species.scientificName
      if (findings.some((f) => f.metadata?.scientificName === species.scientificName)) continue

      findings.push({
        id: `art17-${species.code}`,
        source: 'npws',
        dataType: 'species_record',
        title: displayName,
        content: `Habitats Directive Annex species. Recorded in ${species.gridCount} grid squares across Ireland. Scientific name: ${species.scientificName}`,
        isSaved: false,
        sourceUrl: `https://www.npws.ie/protected-sites/sac`,
        rawData: { annexCode: species.code, hectads: species.hectads.slice(0, 10) },
        metadata: {
          scientificName: species.scientificName,
          commonName,
          recordCount: species.gridCount,
          isProtected: true,
          designation: 'Habitats Directive Annex II/IV/V',
          datasetName: 'Habitats Directive Reporting',
        },
      })
    }
  } catch {
    // Article 17 lookup is supplementary — skip silently on failure
  }
}

/**
 * Build the post-search hook that auto-generates AI summaries for designated species.
 */
export function buildPostSearchHook(
  aiSummaryTriggerRef: React.RefObject<((finding: FindingDisplay) => void) | null>
) {
  return async (findings: FindingDisplay[], _setResults: unknown) => {
    const designatedSpecies = findings
      .filter(
        (f) =>
          (f.metadata?.isProtected || f.metadata?.designations) &&
          !f.metadata?.aiSummary &&
          !f.metadata?.aiSummaryLoading
      )
      .slice(0, 15)

    if (designatedSpecies.length > 0 && aiSummaryTriggerRef.current) {
      const BATCH = 5
      for (let i = 0; i < designatedSpecies.length; i += BATCH) {
        const chunk = designatedSpecies.slice(i, i + BATCH)
        await Promise.allSettled(chunk.map((species) => aiSummaryTriggerRef.current?.(species)))
      }
    }
  }
}
