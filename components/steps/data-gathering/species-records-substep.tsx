'use client'

import * as React from 'react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import {
  SpeciesResearchModal,
  type SpeciesResearchData,
} from '@/components/desk-research/species-research-modal'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import {
  enrichSpeciesFromNBDC,
  searchRecordsByGridRefProxy,
  type NBDCRecord,
} from '@/lib/external-apis/nbdc'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import { searchSpeciesByGridRef, type Article17Species } from '@/lib/data/article17-species'
import { wgs84ToGridRef, wgs84ToItm, itmToGridRef } from '@/lib/utils/grid-reference'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import { useCreateFinding, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

interface SpeciesRecordsSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void
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

  // Enrichment state
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = React.useState<{
    current: number
    total: number
  } | null>(null)

  // Source filter — default to 'protected' (only show species with designation)
  const [sourceFilter, setSourceFilter] = React.useState<'all' | 'gbif' | 'nbdc' | 'protected'>(
    'protected'
  )

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

  // Auto-enrich findings with NBDC data
  const autoEnrich = async (
    findings: FindingDisplay[],
    setResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  ) => {
    setIsEnriching(true)
    setEnrichmentProgress({ current: 0, total: findings.length })

    const enriched = [...findings]

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i]
      const scientificName = finding.metadata?.scientificName

      setEnrichmentProgress({ current: i + 1, total: findings.length })

      if (finding.metadata?.nbdcEnriched || !scientificName) continue

      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 150))
      }

      try {
        const nbdcData = await enrichSpeciesFromNBDC(scientificName)

        if (nbdcData) {
          const contentParts = [finding.content]
          if (nbdcData.designations) {
            contentParts.push(`🛡️ ${nbdcData.designations}`)
          }
          if (nbdcData.totalRecordsInIreland > 0) {
            contentParts.push(`📊 ${nbdcData.totalRecordsInIreland.toLocaleString()} Irish records`)
          }

          enriched[i] = {
            ...finding,
            title: nbdcData.commonName || finding.title,
            content: contentParts.join(' '),
            metadata: {
              ...finding.metadata,
              commonName: nbdcData.commonName || finding.metadata?.commonName,
              isProtected: nbdcData.isProtected,
              isInvasive: nbdcData.isInvasive,
              isThreatened: nbdcData.isThreatened,
              nbdcTaxonId: nbdcData.taxonId,
              totalIrishRecords: nbdcData.totalRecordsInIreland,
              gridSquares10km: nbdcData.gridSquares10km,
              designations: nbdcData.designations || undefined,
              taxonGroup: nbdcData.taxonGroup || undefined,
              nbdcEnriched: true,
              gbifUrl: finding.sourceUrl,
              nbdcUrl: nbdcData.nbdcUrl,
              newestRecordDate: nbdcData.newestRecordDate || finding.metadata?.newestRecordDate,
            },
            rawData: {
              ...finding.rawData,
              nbdcData,
            },
          }
        }
      } catch (error) {
        console.warn(`Failed to enrich ${scientificName}:`, error)
      }
    }

    setResults([...enriched])
    setIsEnriching(false)
    setEnrichmentProgress(null)

    // Auto-generate AI summaries for designated/protected species
    const designatedSpecies = enriched.filter(
      (f) =>
        (f.metadata?.isProtected || f.metadata?.designations) &&
        !f.metadata?.aiSummary &&
        !f.metadata?.aiSummaryLoading
    )
    if (designatedSpecies.length > 0 && aiSummaryTriggerRef.current) {
      for (const species of designatedSpecies) {
        aiSummaryTriggerRef.current(species)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  // Handle species deep research
  const handleSpeciesDeepResearch = async (finding: FindingDisplay, sf: DeskResearchFinding[]) => {
    const scientificName = finding.metadata?.scientificName || finding.title

    let fpoRecords: FPORecord[] | undefined
    let article17Species: Article17Species[] | undefined
    let relatedSites: import('@/lib/data/npws-site-lookup').SiteWithSpecies[] | undefined

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
      totalIrishRecords: finding.metadata?.totalIrishRecords,
      gridSquares10km: finding.metadata?.gridSquares10km,
      gbifUrl: finding.metadata?.gbifUrl || finding.sourceUrl,
      nbdcUrl: finding.metadata?.nbdcUrl,
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
      // Card already saved — update with deep research data (not as aiSummary)
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
      // Card not saved — create finding first with deep research data
      try {
        const payload = {
          project_id: project.id,
          source: (deepResearchFinding.metadata?.nbdcEnriched ? 'nbdc' : 'gbif') as 'nbdc' | 'gbif',
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

  // Count protected and invasive species (needs access to searchResults from shell)
  // We pass these via findingsListExtraProps which gets updated via the config
  const [currentSearchResults, setCurrentSearchResults] = React.useState<FindingDisplay[]>([])

  const protectedCount = currentSearchResults.filter((f) => f.metadata?.isProtected).length
  const invasiveCount = currentSearchResults.filter((f) => f.metadata?.isInvasive).length
  const enrichedCount = currentSearchResults.filter((f) => f.metadata?.nbdcEnriched).length

  const config: SubstepShellConfig = React.useMemo(
    () => ({
      title: 'Species Records',
      description: 'Search Biodiversity Ireland (NBDC) by grid reference for species records.',
      searchButtonLabel: 'Search Species',
      searchButtonColor: 'border-purple-300 text-purple-700 hover:bg-gray-50',
      emptyMessage: 'Search to find species',
      cacheKeyPrefix: 'gbif',
      stepName: 'species_records',
      source: 'gbif',
      sourceFilter: ['gbif', 'nbdc'],
      isSearchDisabled: isEnriching,

      // Search — primary source is NBDC grid reference, fallback to GBIF bbox
      performSearch: async ({ bbox }) => {
        const findings: FindingDisplay[] = []

        // Calculate ALL grid squares intersecting the project buffer bbox
        const gridRefsToSearch: string[] = []
        let gridRef1km: string | null = null
        let searchLabel = ''

        // Grid step size in meters based on resolution
        const stepSize = gridResolution === '10km' ? 10000 : gridResolution === '2km' ? 1000 : 1000
        // Irish Grid precision: 1 = 10km, 2 = 1km
        const precision: 1 | 2 = gridResolution === '10km' ? 1 : 2
        // Max grid squares to search (avoid too many API calls)
        const maxSquares = gridResolution === '10km' ? 20 : gridResolution === '2km' ? 40 : 30

        if (projectCenter) {
          try {
            // Convert bbox corners to ITM
            const swItm = wgs84ToItm(bbox.minLat, bbox.minLng)
            const neItm = wgs84ToItm(bbox.maxLat, bbox.maxLng)

            // Floor to grid step boundaries
            const minE = Math.floor(swItm.easting / stepSize) * stepSize
            const minN = Math.floor(swItm.northing / stepSize) * stepSize
            const maxE = Math.floor(neItm.easting / stepSize) * stepSize
            const maxN = Math.floor(neItm.northing / stepSize) * stepSize

            // Iterate all grid squares in the bbox
            for (let e = minE; e <= maxE; e += stepSize) {
              for (let n = minN; n <= maxN; n += stepSize) {
                if (gridRefsToSearch.length >= maxSquares) break
                try {
                  const ref = itmToGridRef(e, n, precision, true)
                  if (!gridRefsToSearch.includes(ref)) {
                    gridRefsToSearch.push(ref)
                  }
                } catch {
                  // Square outside Irish Grid
                }
              }
              if (gridRefsToSearch.length >= maxSquares) break
            }

            searchLabel =
              gridRefsToSearch.length === 1
                ? gridRefsToSearch[0]
                : `${gridRefsToSearch.length} ${gridResolution} squares`

            gridRef1km = wgs84ToGridRef(projectCenter.lat, projectCenter.lng, 2, true)
          } catch {
            // Project is outside Irish Grid
          }
        }

        // --- NBDC Grid Reference Search (primary) ---
        const nbdcRecords: NBDCRecord[] = []
        if (gridRefsToSearch.length > 0) {
          try {
            // Fetch in batches of 5 to avoid overwhelming the API
            const batchSize = 5
            for (let i = 0; i < gridRefsToSearch.length; i += batchSize) {
              const batch = gridRefsToSearch.slice(i, i + batchSize)
              const results = await Promise.all(
                batch.map((ref) => searchRecordsByGridRefProxy(ref, 2015))
              )
              nbdcRecords.push(...results.flat())
              if (i + batchSize < gridRefsToSearch.length) {
                await new Promise((resolve) => setTimeout(resolve, 200))
              }
            }
          } catch {
            // NBDC grid search failed, will fallback to GBIF
          }
        }

        if (nbdcRecords.length > 0) {
          // Group NBDC records by species (LatinName)
          const speciesGroups = new Map<string, { count: number; records: NBDCRecord[] }>()

          for (const record of nbdcRecords) {
            const key = record.LatinName || 'Unknown'
            if (!speciesGroups.has(key)) {
              speciesGroups.set(key, { count: 0, records: [] })
            }
            const group = speciesGroups.get(key)!
            group.count += 1
            group.records.push(record)
          }

          for (const [latinName, { count, records }] of speciesGroups) {
            const firstRecord = records[0]

            // Build location from records that have coordinates
            const recordsWithCoords = records.filter((r) => r.Latitude && r.Longitude)
            let locationGeometry: GeoJSON.Geometry | undefined
            if (recordsWithCoords.length === 1) {
              locationGeometry = {
                type: 'Point',
                coordinates: [recordsWithCoords[0].Longitude!, recordsWithCoords[0].Latitude!],
              }
            } else if (recordsWithCoords.length > 1) {
              locationGeometry = {
                type: 'GeometryCollection',
                geometries: recordsWithCoords.map((r) => ({
                  type: 'Point' as const,
                  coordinates: [r.Longitude!, r.Latitude!],
                })),
              }
            }

            const distance = locationGeometry
              ? calculateDistanceFromBoundary(locationGeometry, projectBoundary)
              : undefined

            // Newest date from records
            const dates = records
              .map((r) => r.Date || (r.Year ? `${r.Year}` : null))
              .filter(Boolean)
              .sort()
              .reverse()
            const newestDate = dates[0] || undefined

            // Most common dataset name
            const datasetCounts = new Map<string, number>()
            for (const r of records) {
              if (r.DatasetName) {
                datasetCounts.set(r.DatasetName, (datasetCounts.get(r.DatasetName) || 0) + 1)
              }
            }
            let mostCommonDataset: string | undefined
            let maxDsCount = 0
            for (const [name, cnt] of datasetCounts) {
              if (cnt > maxDsCount) {
                maxDsCount = cnt
                mostCommonDataset = name
              }
            }

            findings.push({
              id: `nbdc-${latinName.replace(/\s+/g, '-')}`,
              source: 'nbdc',
              dataType: 'species_record',
              title: firstRecord.CommonName || latinName,
              content: `${count} record${count > 1 ? 's' : ''} in ${searchLabel}. Group: ${firstRecord.TaxonGroup || 'Unknown'}.`,
              location: locationGeometry,
              isSaved: false,
              sourceUrl: `https://maps.biodiversityireland.ie`,
              rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
              metadata: {
                scientificName: latinName,
                commonName: firstRecord.CommonName || undefined,
                taxonGroup: firstRecord.TaxonGroup || undefined,
                recordCount: count,
                distance,
                datasetName: mostCommonDataset,
                newestRecordDate: newestDate,
                gridReference: firstRecord.GridReference || gridRefsToSearch[0] || undefined,
                nbdcEnriched: false, // will be enriched in post-search
              },
            })
          }
        } else {
          // --- GBIF Fallback (if NBDC grid search returned nothing) ---
          const results = await searchOccurrences({
            bbox: {
              minLat: bbox.minLat,
              maxLat: bbox.maxLat,
              minLng: bbox.minLng,
              maxLng: bbox.maxLng,
            },
            limit: 100,
            year: `2015,${new Date().getFullYear()}`,
          })

          const speciesGroups = new Map<
            string,
            { count: number; records: typeof results.results }
          >()

          for (const record of results.results) {
            const key = record.scientificName || 'Unknown'
            if (!speciesGroups.has(key)) {
              speciesGroups.set(key, { count: 0, records: [] })
            }
            const group = speciesGroups.get(key)!
            group.count++
            group.records.push(record)
          }

          for (const [scientificName, { count, records }] of speciesGroups) {
            const firstRecord = records[0]

            let locationGeometry: GeoJSON.Geometry
            if (count === 1) {
              locationGeometry = {
                type: 'Point',
                coordinates: [firstRecord.decimalLongitude, firstRecord.decimalLatitude],
              }
            } else {
              const geometries: GeoJSON.Point[] = records
                .filter((r) => r.decimalLatitude && r.decimalLongitude)
                .map((r) => ({
                  type: 'Point' as const,
                  coordinates: [r.decimalLongitude, r.decimalLatitude],
                }))
              locationGeometry = { type: 'GeometryCollection', geometries }
            }

            const distance = calculateDistanceFromBoundary(locationGeometry, projectBoundary)

            const eventDates = records
              .map((r) => r.eventDate)
              .filter(Boolean)
              .sort()
              .reverse()
            const newestEventDate = eventDates[0] || undefined

            const datasetNames = records.map((r) => r.datasetName).filter(Boolean)
            const datasetNameCounts = new Map<string, number>()
            for (const name of datasetNames) {
              datasetNameCounts.set(name!, (datasetNameCounts.get(name!) || 0) + 1)
            }
            let mostCommonDataset: string | undefined
            let maxCount = 0
            for (const [name, cnt] of datasetNameCounts) {
              if (cnt > maxCount) {
                maxCount = cnt
                mostCommonDataset = name
              }
            }

            findings.push({
              id: `gbif-${scientificName.replace(/\s+/g, '-')}`,
              source: 'gbif',
              dataType: 'species_record',
              title: firstRecord.vernacularName || scientificName,
              content: `${count} record${count > 1 ? 's' : ''} found. Family: ${firstRecord.family || 'Unknown'}.`,
              location: locationGeometry,
              isSaved: false,
              sourceUrl: firstRecord.speciesKey
                ? `https://www.gbif.org/species/${firstRecord.speciesKey}`
                : `https://www.gbif.org/occurrence/search?scientificName=${encodeURIComponent(scientificName)}`,
              rawData: { recordCount: count, sampleRecords: records.slice(0, 3) },
              metadata: {
                scientificName,
                commonName: firstRecord.vernacularName,
                recordCount: count,
                distance,
                gbifUrl: firstRecord.speciesKey
                  ? `https://www.gbif.org/species/${firstRecord.speciesKey}`
                  : undefined,
                datasetName: mostCommonDataset,
                newestRecordDate: newestEventDate,
              },
            })
          }
        }

        // --- FPO and Article 17 search (always runs) ---
        if (projectCenter) {
          const gridRef = gridRef1km

          if (gridRef) {
            // FPO
            try {
              const fpoResults = await searchFPOByGridRef(gridRef)

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

                // Skip if already found via NBDC
                if (findings.some((f) => f.metadata?.scientificName === latinName)) continue

                findings.push({
                  id: `fpo-${latinName.replace(/\s+/g, '-')}`,
                  source: 'fpo',
                  dataType: 'species_record',
                  title: `${firstRecord.commonName || latinName}`,
                  content: `${count} FPO record${count > 1 ? 's' : ''} in hectad ${gridRef}. ${firstRecord.isSensitive ? '⚠️ Sensitive species.' : ''} ${locations.length > 0 ? `Recorded at: ${locations.slice(0, 2).join(', ')}${locations.length > 2 ? '...' : ''}` : ''}`,
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
              console.warn('FPO search error:', error)
            }

            // Article 17
            try {
              const annexSpecies = await searchSpeciesByGridRef(gridRef)

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

                // Skip if already found via NBDC
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
              console.warn('Article 17 search error:', error)
            }
          }
        }

        return findings
      },

      // Post-search: NBDC enrichment
      onPostSearch: (findings, setResults) => {
        // Track results for species counts
        setCurrentSearchResults(findings)
        return autoEnrich(findings, setResults)
      },

      // Matching
      matchPredicate: (sf, result) => {
        const rawData = sf.raw_data as Record<string, unknown>
        return rawData?.scientificName === result.metadata?.scientificName
      },
      minimalMetadataKeys: ['scientificName', 'recordCount'],

      // Save payload
      buildCreatePayload: (finding, { projectId, userId: uid }) => {
        const source = finding.metadata?.nbdcEnriched ? 'nbdc' : 'gbif'
        return {
          project_id: projectId,
          source: source as 'gbif' | 'nbdc',
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
      showDistanceFilter: true,

      // FindingsList extra props
      findingsListExtraProps: {
        showSpeciesHeader: true,
        speciesCounts: {
          total: currentSearchResults.length,
          protected: protectedCount,
          invasive: invasiveCount,
          enriched: enrichedCount,
        },
        enrichmentStatus:
          isEnriching && enrichmentProgress
            ? {
                isEnriching: true,
                current: enrichmentProgress.current,
                total: enrichmentProgress.total,
              }
            : null,
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
        source: (f.metadata?.nbdcEnriched ? 'nbdc' : 'gbif') as FindingSource,
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
        source: (f.metadata?.nbdcEnriched ? 'nbdc' : f.source) as FindingSource,
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
      isEnriching,
      enrichmentProgress,
      sourceFilter,
      gridResolution,
      currentSearchResults.length,
      protectedCount,
      invasiveCount,
      enrichedCount,
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
                  : 'text-muted-foreground hover:bg-gray-100'
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
