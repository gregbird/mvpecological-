'use client'

import * as React from 'react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import {
  SpeciesResearchModal,
  type SpeciesResearchData,
} from '@/components/desk-research/species-research-modal'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { enrichSpeciesFromNBDC } from '@/lib/external-apis/nbdc'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import { searchSpeciesByGridRef, type Article17Species } from '@/lib/data/article17-species'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
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
  const { projectBoundary, projectCenter, savedFindings } = props
  const updateFinding = useUpdateFinding()

  // Species Deep Research modal state
  const [speciesResearchOpen, setSpeciesResearchOpen] = React.useState(false)
  const [selectedSpeciesResearch, setSelectedSpeciesResearch] =
    React.useState<SpeciesResearchData | null>(null)
  const [speciesExistingAnalysis, setSpeciesExistingAnalysis] = React.useState<string | undefined>()

  // Enrichment state
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = React.useState<{
    current: number
    total: number
  } | null>(null)

  // Source filter
  const [sourceFilter, setSourceFilter] = React.useState<'all' | 'gbif' | 'nbdc' | 'protected'>(
    'all'
  )

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
    setSpeciesExistingAnalysis(cachedAnalysis)
    setSpeciesResearchOpen(true)
  }

  // Handle saving Deep Research analysis to finding
  const handleSaveDeepResearchAnalysis = (data: {
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

    // Also persist to DB if finding is already saved
    const existingSaved = savedFindings.find(
      (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
    )
    if (existingSaved) {
      const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}
      const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}

      updateFinding
        .mutateAsync({
          findingId: existingSaved.id,
          updates: {
            raw_data: {
              ...existingRawData,
              metadata: existingMetadata,
              deepResearch: deepResearchData,
            } as unknown as Json,
          },
        })
        .catch((err) => console.error('Failed to persist deep research to finding:', err))
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
      description: 'Search GBIF for species occurrences and enrich with NBDC protection status.',
      searchButtonLabel: 'Search Species',
      searchButtonColor: 'border-purple-300 text-purple-700 hover:bg-gray-50',
      emptyMessage: 'Search to find species',
      cacheKeyPrefix: 'gbif',
      stepName: 'species_records',
      source: 'gbif',
      isSearchDisabled: isEnriching,

      // Search
      performSearch: async ({ bbox }) => {
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

        // Group by species
        const speciesGroups = new Map<string, { count: number; records: typeof results.results }>()

        for (const record of results.results) {
          const key = record.scientificName || 'Unknown'
          if (!speciesGroups.has(key)) {
            speciesGroups.set(key, { count: 0, records: [] })
          }
          const group = speciesGroups.get(key)!
          group.count++
          group.records.push(record)
        }

        const findings: FindingDisplay[] = []
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
            },
          })
        }

        // FPO and Article 17 search
        if (projectCenter) {
          let gridRef: string | null = null
          try {
            gridRef = wgs84ToGridRef(projectCenter.lat, projectCenter.lng, 2, true)
            console.log('🔍 Irish Grid ref calculated:', gridRef, 'for', projectCenter)
          } catch {
            console.log('📍 Project is outside Irish Grid - skipping FPO/Article17 search')
          }

          if (gridRef) {
            // FPO
            try {
              const fpoResults = await searchFPOByGridRef(gridRef)
              console.log('🔍 FPO Results:', fpoResults.length, 'records found')

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
                  },
                })
              }
            } catch (error) {
              console.warn('FPO search error:', error)
            }

            // Article 17
            try {
              const annexSpecies = await searchSpeciesByGridRef(gridRef)
              console.log('🔍 Article 17 Results:', annexSpecies.length, 'species found')

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
      currentSearchResults.length,
      protectedCount,
      invasiveCount,
      enrichedCount,
    ]
  )

  return (
    <DataGatheringSubstepShell
      {...props}
      config={config}
      renderDeepResearchModal={() => (
        <SpeciesResearchModal
          open={speciesResearchOpen}
          onOpenChange={setSpeciesResearchOpen}
          species={selectedSpeciesResearch}
          existingAnalysis={speciesExistingAnalysis}
          onSaveAnalysis={handleSaveDeepResearchAnalysis}
        />
      )}
    />
  )
}
