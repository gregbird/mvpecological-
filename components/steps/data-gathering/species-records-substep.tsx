'use client'

import * as React from 'react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import {
  SpeciesResearchModal,
  type SpeciesResearchData,
} from '@/components/desk-research/species-research-modal'
import { fetchNBDCGridReport, type NBDCGridReportSpecies } from '@/lib/external-apis/nbdc'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import { searchSpeciesByGridRef, type Article17Species } from '@/lib/data/article17-species'
import { wgs84ToItm, itmToGridRef, itmToWgs84 } from '@/lib/utils/grid-reference'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import { useCreateFinding, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

interface SpeciesRecordsSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId?: string | null
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void
}

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
 * Convert ITM (EPSG:2157) to approximate ING (EPSG:29903) coordinates.
 * The Irish Grid reference system uses ING, not ITM.
 * This approximation is accurate enough for grid square identification (~100m error).
 */
function itmToIng(itmEasting: number, itmNorthing: number) {
  return {
    easting: itmEasting - 400000,
    northing: itmNorthing - 500000,
  }
}

export function SpeciesRecordsSubStep(props: SpeciesRecordsSubStepProps) {
  const { projectBoundary, projectCenter, savedFindings, project, userId } = props
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()

  // Species Deep Research modal state
  const [speciesResearchOpen, setSpeciesResearchOpen] = React.useState(false)
  const [selectedSpeciesResearch, setSelectedSpeciesResearch] =
    React.useState<SpeciesResearchData | null>(null)
  const [speciesExistingAnalysis, setSpeciesExistingAnalysis] = React.useState<string | undefined>()
  const [deepResearchFinding, setDeepResearchFinding] = React.useState<FindingDisplay | null>(null)

  // Ref to trigger short AI summary from the shell
  const aiSummaryTriggerRef = React.useRef<((finding: FindingDisplay) => void) | null>(null)

  // Source filter — default to 'protected' (only show species with designation)
  const [sourceFilter, setSourceFilter] = React.useState<
    'all' | 'protected' | 'invasive' | 'threatened'
  >('protected')

  // Grid resolution for NBDC search: '10km' | '2km' | '1km'
  const gridResolutionKey = `species-grid-res-${project.id}`
  const [gridResolution, setGridResolution] = React.useState<'10km' | '2km' | '1km'>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(gridResolutionKey)
      if (cached === '10km' || cached === '2km' || cached === '1km') return cached
    }
    return '10km'
  })
  React.useEffect(() => {
    sessionStorage.setItem(gridResolutionKey, gridResolution)
  }, [gridResolution, gridResolutionKey])

  // Grid overlay for map — compute based on buffer + resolution
  // Only includes grid squares that intersect the actual buffer polygon
  const computeGridOverlay = React.useCallback(
    (bufferKm: number): GeoJSON.FeatureCollection | undefined => {
      if (!projectCenter && !projectBoundary) return undefined

      const resolutionMeters =
        gridResolution === '10km' ? 10000 : gridResolution === '2km' ? 2000 : 1000
      const stepSize = resolutionMeters
      const precision: 1 | 2 = gridResolution === '10km' ? 1 : 2

      try {
        // Use the same bbox calculation as the actual search
        const bbox = getBoundingBox(projectBoundary, projectCenter, bufferKm)
        if (!bbox) return undefined

        // Build the actual buffer polygon for intersection testing
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const turf = require('@turf/turf')
        const sourceGeometry =
          projectBoundary ?? turf.point([projectCenter!.lng, projectCenter!.lat])
        const bufferPoly = turf.buffer(sourceGeometry, bufferKm, { units: 'kilometers' })

        const swItm = wgs84ToItm(bbox.minLat, bbox.minLng)
        const neItm = wgs84ToItm(bbox.maxLat, bbox.maxLng)
        const swIng = itmToIng(swItm.easting, swItm.northing)
        const neIng = itmToIng(neItm.easting, neItm.northing)

        const minE = Math.floor(swIng.easting / stepSize) * stepSize
        const minN = Math.floor(swIng.northing / stepSize) * stepSize
        const maxE = Math.floor(neIng.easting / stepSize) * stepSize
        const maxN = Math.floor(neIng.northing / stepSize) * stepSize

        const features: GeoJSON.Feature[] = []
        const seenRefs = new Set<string>()
        for (let e = minE; e <= maxE; e += stepSize) {
          for (let n = minN; n <= maxN; n += stepSize) {
            try {
              const ref = itmToGridRef(e, n, precision, true)
              if (seenRefs.has(ref)) continue
              seenRefs.add(ref)

              // Convert grid square corners to WGS84
              const sw = itmToWgs84(e + 400000, n + 500000)
              const ne = itmToWgs84(e + resolutionMeters + 400000, n + resolutionMeters + 500000)
              const gridPoly = turf.polygon([
                [
                  [sw.lng, sw.lat],
                  [ne.lng, sw.lat],
                  [ne.lng, ne.lat],
                  [sw.lng, ne.lat],
                  [sw.lng, sw.lat],
                ],
              ])

              // Only include grid squares that intersect the buffer polygon
              if (!turf.booleanIntersects(gridPoly, bufferPoly)) continue

              const cleanRef = ref.replace(/\s+/g, '')
              features.push({
                type: 'Feature' as const,
                properties: { label: cleanRef },
                geometry: gridPoly.geometry,
              })
            } catch {
              // Outside Irish Grid
            }
          }
        }

        return { type: 'FeatureCollection', features }
      } catch {
        return undefined
      }
    },
    [projectCenter, projectBoundary, gridResolution]
  )

  // Handle species deep research
  const handleSpeciesDeepResearch = async (finding: FindingDisplay, sf: DeskResearchFinding[]) => {
    const scientificName = finding.metadata?.scientificName || finding.title

    let fpoRecords: FPORecord[] | undefined
    let article17Species: Article17Species[] | undefined
    let relatedSites: import('@/lib/data/npws-site-lookup').SiteWithSpecies[] | undefined

    // Enrich with NBDC taxon details (Irish records, grid squares) on-demand
    let totalIrishRecords = finding.metadata?.totalIrishRecords
    let gridSquares10km = finding.metadata?.gridSquares10km
    let nbdcUrl = finding.metadata?.nbdcUrl

    if (!totalIrishRecords && scientificName) {
      try {
        const { enrichSpeciesFromNBDC } = await import('@/lib/external-apis/nbdc')
        const nbdcData = await enrichSpeciesFromNBDC(scientificName)
        if (nbdcData) {
          totalIrishRecords = nbdcData.totalRecordsInIreland
          gridSquares10km = nbdcData.gridSquares10km
          nbdcUrl = nbdcData.nbdcUrl
        }
      } catch {
        // NBDC enrichment failed — not critical
      }
    }

    try {
      const [art17Module, npwsModule] = await Promise.all([
        import('@/lib/data/article17-species'),
        import('@/lib/data/npws-site-lookup'),
      ])

      if (finding.source === 'fpo' && finding.rawData?.sampleRecords) {
        fpoRecords = finding.rawData.sampleRecords as FPORecord[]
      }

      try {
        article17Species = await art17Module.searchSpeciesByName(scientificName)
      } catch {
        // silently skip
      }

      try {
        relatedSites = npwsModule.findSitesWithSpecies(scientificName)
      } catch {
        // silently skip
      }
    } catch {
      // Dynamic import failed
    }

    // Check for existing deep research analysis
    let cachedAnalysis: string | undefined
    const deepResearchFromRaw = (finding.rawData as Record<string, unknown>)?.deepResearch as
      | Record<string, unknown>
      | undefined
    if (deepResearchFromRaw?.aiAnalysis) {
      cachedAnalysis = deepResearchFromRaw.aiAnalysis as string
    } else {
      const savedMatch = sf.find(
        (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
      )
      if (savedMatch) {
        const rawData = savedMatch.raw_data as Record<string, unknown>
        const deepResearch = rawData?.deepResearch as Record<string, unknown> | undefined
        if (deepResearch?.aiAnalysis) {
          cachedAnalysis = deepResearch.aiAnalysis as string
        }
      }
    }

    setSelectedSpeciesResearch({
      scientificName,
      commonName: finding.metadata?.commonName,
      taxonGroup: finding.metadata?.taxonGroup,
      recordCount: finding.metadata?.recordCount,
      designations: finding.metadata?.designations,
      distance: finding.metadata?.distance,
      isProtected: finding.metadata?.isProtected,
      isInvasive: finding.metadata?.isInvasive,
      isThreatened: finding.metadata?.isThreatened,
      totalIrishRecords,
      gridSquares10km,
      gbifUrl: finding.metadata?.gbifUrl || finding.sourceUrl,
      nbdcUrl,
      source: finding.source,
      fpoRecords,
      article17Species,
      relatedSites,
    })
    setDeepResearchFinding(finding)
    setSpeciesExistingAnalysis(cachedAnalysis)
    setSpeciesResearchOpen(true)
  }

  // Handle saving Deep Research analysis to finding
  const handleSaveDeepResearchAnalysis = async (data: {
    aiAnalysis: string
    relatedSites?: import('@/lib/data/npws-site-lookup').SiteWithSpecies[]
    fpoRecords?: FPORecord[]
    article17Species?: Article17Species[]
  }) => {
    if (!selectedSpeciesResearch) return

    const scientificName = selectedSpeciesResearch.scientificName

    const deepResearchData = {
      aiAnalysis: data.aiAnalysis,
      relatedSites: data.relatedSites?.slice(0, 10),
      fpoRecordCount: data.fpoRecords?.length || 0,
      article17Species: data.article17Species,
      generatedAt: new Date().toISOString(),
    }

    const existingSaved = savedFindings.find(
      (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
    )

    if (existingSaved) {
      const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}

      updateFinding
        .mutateAsync({
          findingId: existingSaved.id,
          updates: {
            raw_data: {
              ...existingRawData,
              deepResearch: deepResearchData,
            } as unknown as Json,
          },
        })
        .catch((err) => console.error('Failed to persist deep research to finding:', err))
    } else if (deepResearchFinding) {
      try {
        const payload = {
          project_id: project.id,
          source: 'nbdc' as const,
          data_type: 'species_record' as const,
          title: deepResearchFinding.title,
          content: deepResearchFinding.content || null,
          raw_data: {
            ...deepResearchFinding.rawData,
            scientificName,
            metadata: deepResearchFinding.metadata,
            deepResearch: deepResearchData,
          } as unknown as Json,
          location: deepResearchFinding.location as unknown as Json,
          is_saved: true,
          distance_from_boundary_km: deepResearchFinding.metadata?.distance || null,
          is_protected: deepResearchFinding.metadata?.isProtected || false,
          created_by: userId,
        }
        await createFinding.mutateAsync(payload)
      } catch (error) {
        console.error('Failed to create finding from deep research:', error)
      }
    }

    // Trigger short AI summary for the card
    if (deepResearchFinding) {
      aiSummaryTriggerRef.current?.(deepResearchFinding)
    }
  }

  // Count protected, invasive, and threatened species (single pass)
  const [currentSearchResults, setCurrentSearchResults] = React.useState<FindingDisplay[]>([])

  const { protectedCount, invasiveCount, threatenedCount } = React.useMemo(() => {
    let prot = 0
    let inv = 0
    let thr = 0
    for (const f of currentSearchResults) {
      if (f.metadata?.isProtected || f.metadata?.designations) prot++
      if (f.metadata?.isInvasive) inv++
      if (f.metadata?.isThreatened) thr++
    }
    return { protectedCount: prot, invasiveCount: inv, threatenedCount: thr }
  }, [currentSearchResults])

  const config: SubstepShellConfig = React.useMemo(
    () => ({
      title: 'Species Records',
      description: 'Search Biodiversity Ireland (NBDC) by grid reference for species records.',
      searchButtonLabel: 'Search Species',
      searchButtonColor:
        'border-purple-300 text-purple-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      emptyMessage: 'Search to find species',
      cacheKeyPrefix: `nbdc-report-${gridResolution}`,
      stepName: 'species_records',
      source: 'nbdc',
      computeGridOverlay,

      // Search — NBDC grid report API (generates XLSX per grid square)
      performSearch: async ({ bbox, buffer, boundary: searchBoundary }) => {
        const findings: FindingDisplay[] = []

        // Calculate grid squares intersecting the project buffer bbox
        const gridRefsToSearch: string[] = []
        let gridRef1km: string | null = null
        let searchLabel = ''

        // Resolution parameters
        const resolutionMeters =
          gridResolution === '10km' ? 10000 : gridResolution === '2km' ? 2000 : 1000
        const stepSize = resolutionMeters
        const precision: 1 | 2 = gridResolution === '10km' ? 1 : 2

        if (projectCenter) {
          try {
            // Build buffer polygon for intersection testing
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const turf = require('@turf/turf')
            const sourceGeometry =
              searchBoundary ??
              projectBoundary ??
              turf.point([projectCenter.lng, projectCenter.lat])
            const bufferPoly = turf.buffer(sourceGeometry, buffer, { units: 'kilometers' })

            // Convert bbox corners to ING (Irish National Grid) via ITM offset
            const swItm = wgs84ToItm(bbox.minLat, bbox.minLng)
            const neItm = wgs84ToItm(bbox.maxLat, bbox.maxLng)
            const swIng = itmToIng(swItm.easting, swItm.northing)
            const neIng = itmToIng(neItm.easting, neItm.northing)

            // Floor to grid step boundaries
            const minE = Math.floor(swIng.easting / stepSize) * stepSize
            const minN = Math.floor(swIng.northing / stepSize) * stepSize
            const maxE = Math.floor(neIng.easting / stepSize) * stepSize
            const maxN = Math.floor(neIng.northing / stepSize) * stepSize

            // Collect grid squares that intersect the buffer polygon
            const seenSearchRefs = new Set<string>()
            for (let e = minE; e <= maxE; e += stepSize) {
              for (let n = minN; n <= maxN; n += stepSize) {
                try {
                  const ref = itmToGridRef(e, n, precision, true)
                  if (seenSearchRefs.has(ref)) continue
                  seenSearchRefs.add(ref)

                  // Check intersection with buffer polygon
                  const sw = itmToWgs84(e + 400000, n + 500000)
                  const ne = itmToWgs84(
                    e + resolutionMeters + 400000,
                    n + resolutionMeters + 500000
                  )
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

            // 1km grid ref for FPO/Article 17 lookup
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
          const cleanRefs = gridRefsToSearch.map((r) => r.replace(/\s+/g, ''))
          const report = await fetchNBDCGridReport(cleanRefs, resolutionMeters)

          // Group species by name (consolidate across multiple grid squares)
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

            // Merge designation — take the first non-null designation found
            if (s.designation && !entry.species.designation) {
              entry.species = { ...entry.species, designation: s.designation }
            }

            // Track newest date
            if (s.dateOfLastRecord) {
              if (!entry.newestDate || compareDates(s.dateOfLastRecord, entry.newestDate) > 0) {
                entry.newestDate = s.dateOfLastRecord
              }
            }

            // Track most common dataset
            if (s.datasetTitle) {
              entry.datasets.set(s.datasetTitle, (entry.datasets.get(s.datasetTitle) || 0) + 1)
            }
          }

          let speciesIdx = 0
          for (const [
            name,
            { totalCount, species, gridSquares, newestDate, datasets },
          ] of speciesMap) {
            speciesIdx++
            const { scientificName, commonName } = parseSpeciesName(name)
            const { isProtected, isInvasive, isThreatened } = parseDesignation(species.designation)

            // Most common dataset
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
              rawData: {
                recordCount: totalCount,
                gridSquares: [...gridSquares],
              },
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
                gridReference: cleanRefs[0],
              },
            })
          }
        }

        // --- FPO and Article 17 search (supplementary) ---
        if (projectCenter && gridRef1km) {
          // FPO
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

              // Skip if already found via NBDC report
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
          } catch (error) {
            // FPO search is supplementary — skip silently on failure
          }

          // Article 17
          try {
            const annexSpecies = await searchSpeciesByGridRef(gridRef1km)

            const commonNames: Record<string, string> = {
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

            for (const species of annexSpecies) {
              const commonName = commonNames[species.code] || ''
              const displayName = commonName || species.scientificName

              // Skip if already found via NBDC report
              if (findings.some((f) => f.metadata?.scientificName === species.scientificName))
                continue

              findings.push({
                id: `art17-${species.code}`,
                source: 'npws',
                dataType: 'species_record',
                title: displayName,
                content: `Habitats Directive Annex species. Recorded in ${species.gridCount} grid squares across Ireland. Scientific name: ${species.scientificName}`,
                isSaved: false,
                sourceUrl: `https://www.npws.ie/protected-sites/sac`,
                rawData: {
                  annexCode: species.code,
                  hectads: species.hectads.slice(0, 10),
                },
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
          } catch (error) {
            // Article 17 lookup is supplementary — skip silently on failure
          }
        }

        return findings
      },

      // Post-search: track results and trigger AI summaries for top designated species
      onPostSearch: async (findings, _setResults) => {
        setCurrentSearchResults(findings)

        // Auto-generate AI summaries for top 15 designated species
        const designatedSpecies = findings
          .filter(
            (f) =>
              (f.metadata?.isProtected || f.metadata?.designations) &&
              !f.metadata?.aiSummary &&
              !f.metadata?.aiSummaryLoading
          )
          .slice(0, 15)

        if (designatedSpecies.length > 0 && aiSummaryTriggerRef.current) {
          for (const species of designatedSpecies) {
            aiSummaryTriggerRef.current(species)
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      },

      // Matching
      matchPredicate: (sf, result) => {
        const rawData = sf.raw_data as Record<string, unknown>
        return rawData?.scientificName === result.metadata?.scientificName
      },
      minimalMetadataKeys: ['scientificName', 'recordCount'],

      // Save payload
      buildCreatePayload: (finding, { projectId, userId: uid, siteId }) => {
        return {
          project_id: projectId,
          site_id: siteId ?? null,
          source: 'nbdc' as const,
          data_type: 'species_record',
          title: finding.title,
          content: finding.content || null,
          raw_data: {
            ...finding.rawData,
            scientificName: finding.metadata?.scientificName,
            metadata: finding.metadata,
          } as unknown as Json,
          location: finding.location as unknown as Json,
          is_saved: true,
          distance_from_boundary_km: finding.metadata?.distance || null,
          is_protected: finding.metadata?.isProtected || false,
          red_list_status: finding.metadata?.redListStatus || null,
          created_by: uid,
        }
      },

      // AI summary
      aiSummaryEndpoint: '/api/ai/species-summary',
      buildAiSummaryBody: (finding) => ({
        scientificName: finding.metadata?.scientificName || finding.title,
        commonName: finding.metadata?.commonName,
        taxonGroup: finding.metadata?.taxonGroup,
        designations: finding.metadata?.designations,
        isProtected: finding.metadata?.isProtected,
        isInvasive: finding.metadata?.isInvasive,
        isThreatened: finding.metadata?.isThreatened,
        totalIrishRecords: finding.metadata?.totalIrishRecords,
        gridSquares10km: finding.metadata?.gridSquares10km,
        recordCount: finding.metadata?.recordCount,
        distance: finding.metadata?.distance,
        source: finding.source,
        hasFPO:
          finding.source === 'fpo' ||
          finding.metadata?.designation === 'Flora Protection Order 2022',
        hasArticle17: finding.metadata?.designation === 'Habitats Directive Annex II/IV/V',
        relatedSitesCount: finding.metadata?.relatedSitesCount,
      }),
      summarizeFilter: (f) => f.dataType === 'species_record' && !f.metadata?.aiSummary,

      // Distance/proximity filter
      showDistanceFilter: false,

      // FindingsList extra props
      findingsListExtraProps: {
        showSpeciesHeader: true,
        speciesCounts: {
          total: currentSearchResults.length,
          protected: protectedCount,
          invasive: invasiveCount,
          threatened: threatenedCount,
          enriched: currentSearchResults.length, // all are from NBDC report
        },
        sourceFilter,
        onSourceFilterChange: setSourceFilter,
      },

      // Map findings customization
      mapFindingsSavedFilter: (f, sf) =>
        sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.scientificName ===
            f.metadata?.scientificName
        ),
      mapFindingsMapper: (f, sf) => ({
        id: f.id,
        source: 'nbdc' as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.scientificName ===
            f.metadata?.scientificName
        ),
        metadata: f.metadata,
      }),
      mapSelectedMapper: (f) => ({
        id: f.id,
        source: 'nbdc' as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: false,
        metadata: f.metadata,
      }),

      // Deep Research
      onDeepResearch: handleSpeciesDeepResearch,
    }),

    [
      projectBoundary,
      projectCenter,
      sourceFilter,
      gridResolution,
      computeGridOverlay,
      currentSearchResults.length,
      protectedCount,
      invasiveCount,
      threatenedCount,
    ]
  )

  const renderResolutionControls = React.useCallback(
    () => (
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs">Grid Resolution:</span>
        <div className="flex gap-1">
          {(['10km', '2km', '1km'] as const).map((res) => (
            <button
              key={res}
              onClick={() => setGridResolution(res)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                gridResolution === res
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>
    ),
    [gridResolution]
  )

  return (
    <>
      <DataGatheringSubstepShell
        {...props}
        config={config}
        aiSummaryTriggerRef={aiSummaryTriggerRef}
        renderExtraControls={renderResolutionControls}
      />
      <SpeciesResearchModal
        open={speciesResearchOpen}
        onOpenChange={setSpeciesResearchOpen}
        species={selectedSpeciesResearch}
        existingAnalysis={speciesExistingAnalysis}
        onSaveAnalysis={handleSaveDeepResearchAnalysis}
      />
    </>
  )
}

/**
 * Compare two date strings in DD/MM/YYYY or YYYY-MM-DD format.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareDates(a: string, b: string): number {
  const parseDate = (d: string): number => {
    // DD/MM/YYYY format
    const dmy = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`).getTime()
    // YYYY-MM-DD or any parseable format
    return new Date(d).getTime()
  }
  return parseDate(a) - parseDate(b)
}
