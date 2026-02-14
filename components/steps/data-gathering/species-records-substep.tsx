'use client'

import * as React from 'react'
import { Search, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useCreateFinding, useDeleteFinding, useUpdateFinding } from '@/hooks/use-project-data'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { enrichSpeciesFromNBDC, type NBDCEnrichedSpecies } from '@/lib/external-apis/nbdc'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import { searchSpeciesByGridRef, type Article17Species } from '@/lib/data/article17-species'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
import { FindingsList, type FindingDisplay } from './findings-list'
import {
  SpeciesResearchModal,
  type SpeciesResearchData,
} from '@/components/desk-research/species-research-modal'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { useSubstepSearch } from '@/hooks/shared/use-substep-search'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'
import { MapCaptureButton } from '@/components/maps/map-capture-button'

// Dynamic import for map
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

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

export function SpeciesRecordsSubStep({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
  userId,
  savedFindings,
  showMap,
  onToggleMap,
  isActive,
  autoSearchTrigger,
  onAutoSearchComplete,
}: SpeciesRecordsSubStepProps) {
  const { toast } = useToast()
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const updateFinding = useUpdateFinding()

  // Cache key for sessionStorage
  const cacheKey = `gbif-search-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [searchResults, setSearchResults] = useSessionStorage<FindingDisplay[]>(cacheKey, [])
  const [enrichmentProgress, setEnrichmentProgress] = React.useState<{
    current: number
    total: number
  } | null>(null)
  // Source filter: 'all' | 'gbif' | 'nbdc' | 'protected'
  const [sourceFilter, setSourceFilter] = React.useState<'all' | 'gbif' | 'nbdc' | 'protected'>(
    'all'
  )
  // Map container ref for screenshot capture
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  // Delay map render by one tick to ensure container is in DOM
  const [mapReady, setMapReady] = React.useState(false)
  React.useEffect(() => {
    if (showMap) {
      const timer = requestAnimationFrame(() => setMapReady(true))
      return () => cancelAnimationFrame(timer)
    }
    setMapReady(false)
  }, [showMap])

  // Shared substep search logic (auto-search, visibility toggle, session cache, location restore)
  const performSearchRef = React.useRef<(() => Promise<void>) | null>(null)
  const MINIMAL_METADATA_KEYS = React.useMemo(() => ['scientificName', 'recordCount'], [])
  const matchPredicate = React.useCallback((sf: DeskResearchFinding, result: FindingDisplay) => {
    const rawData = sf.raw_data as Record<string, unknown>
    return rawData?.scientificName === result.metadata?.scientificName
  }, [])
  const {
    selectedFinding,
    setSelectedFinding,
    selectedBuffer,
    setSelectedBuffer,
    hiddenIds,
    handleToggleVisibility,
    savingIds,
    setSavingIds,
    showSavedOnMap,
    setShowSavedOnMap,
  } = useSubstepSearch(
    {
      searchResults,
      setSearchResults,
      cacheKey,
      savedFindings,
      autoSearchTrigger,
      onAutoSearchComplete,
      isActive,
      projectBoundary,
      performSearchRef,
      matchPredicate,
      minimalMetadataKeys: MINIMAL_METADATA_KEYS,
    },
    bufferDistances[0] || 2
  )

  // Species Deep Research modal state
  const [speciesResearchOpen, setSpeciesResearchOpen] = React.useState(false)
  const [selectedSpeciesResearch, setSelectedSpeciesResearch] =
    React.useState<SpeciesResearchData | null>(null)
  const [speciesExistingAnalysis, setSpeciesExistingAnalysis] = React.useState<string | undefined>()
  // AI Summary batch state
  const [isSummarizing, setIsSummarizing] = React.useState(false)

  // Filter results based on source filter
  const filteredResults = React.useMemo(() => {
    if (sourceFilter === 'all') return searchResults

    return searchResults.filter((finding) => {
      switch (sourceFilter) {
        case 'gbif':
          // GBIF only (not enriched with NBDC)
          return finding.source === 'gbif' && !finding.metadata?.nbdcEnriched
        case 'nbdc':
          // NBDC enriched results
          return finding.metadata?.nbdcEnriched === true
        case 'protected':
          // Protected or threatened species
          return (
            finding.metadata?.isProtected ||
            finding.metadata?.isThreatened ||
            finding.source === 'fpo'
          )
        default:
          return true
      }
    })
  }, [searchResults, sourceFilter])

  // Calculate distance from finding location to project boundary
  const calculateDistanceFromBoundary = React.useCallback(
    (location?: GeoJSON.Geometry): number | undefined => {
      if (!location || !projectBoundary) return undefined

      try {
        let findingPoint: GeoJSON.Feature<GeoJSON.Point>

        if (location.type === 'Point') {
          findingPoint = turf.point(location.coordinates)
        } else if (location.type === 'GeometryCollection') {
          const firstGeom = location.geometries[0]
          if (firstGeom?.type === 'Point') {
            findingPoint = turf.point(firstGeom.coordinates)
          } else {
            return undefined
          }
        } else {
          return undefined
        }

        if (turf.booleanPointInPolygon(findingPoint, projectBoundary)) {
          return 0
        }

        const nearestPoint = turf.nearestPointOnLine(
          turf.polygonToLine(projectBoundary) as GeoJSON.Feature<GeoJSON.LineString>,
          findingPoint
        )

        const distance = turf.distance(findingPoint, nearestPoint, { units: 'kilometers' })
        return Math.round(distance * 100) / 100
      } catch (error) {
        console.warn('Error calculating distance:', error)
        return undefined
      }
    },
    [projectBoundary]
  )

  // Auto-enrich findings with NBDC data (called automatically after search)
  const autoEnrich = async (findings: FindingDisplay[]) => {
    // Clear selected finding to prevent map zoom during enrichment
    setSelectedFinding(null)
    setIsEnriching(true)
    setEnrichmentProgress({ current: 0, total: findings.length })

    const enriched = [...findings]

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i]
      const scientificName = finding.metadata?.scientificName

      // Update progress
      setEnrichmentProgress({ current: i + 1, total: findings.length })

      // Skip if already enriched or no scientific name
      if (finding.metadata?.nbdcEnriched || !scientificName) continue

      // Add small delay to respect NBDC rate limits
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 150))
      }

      try {
        const nbdcData = await enrichSpeciesFromNBDC(scientificName)

        if (nbdcData) {
          // Build enriched content
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
              // Keep both URLs
              gbifUrl: finding.sourceUrl,
              nbdcUrl: nbdcData.nbdcUrl,
            },
            rawData: {
              ...finding.rawData,
              nbdcData,
            },
          }
          // Don't update UI during loop — final update happens after loop ends
        }
      } catch (error) {
        console.warn(`Failed to enrich ${scientificName}:`, error)
      }
    }

    // Final update with all enriched results
    setSearchResults([...enriched])
    setIsEnriching(false)
    setEnrichmentProgress(null)
  }

  // Search GBIF only
  const performSearch = async () => {
    const bbox = getBoundingBox(projectBoundary, projectCenter, selectedBuffer)
    if (!bbox) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Please define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
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

      // Create findings from GBIF data
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

        const distance = calculateDistanceFromBoundary(locationGeometry)

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

      // Also search FPO (Flora Protection Order) and Article 17 protected species
      // These use Irish Grid Reference, so only works for projects in Ireland
      if (projectCenter) {
        let gridRef: string | null = null
        try {
          // Use clampToGrid=true to handle coordinates near Irish borders (sea, Northern Ireland)
          gridRef = wgs84ToGridRef(projectCenter.lat, projectCenter.lng, 2, true) // Hectad level (2 digits), clamp to grid
          console.log('🔍 Irish Grid ref calculated:', gridRef, 'for', projectCenter)
        } catch (gridError) {
          console.log('📍 Project is outside Irish Grid - skipping FPO/Article17 search')
        }

        // Only search if we have a valid Irish grid reference
        if (gridRef) {
          // Search FPO
          try {
            const fpoResults = await searchFPOByGridRef(gridRef)
            console.log('🔍 FPO Results:', fpoResults.length, 'records found')

            // Group by species
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

            // Create findings for each FPO species
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

          // Search Article 17 Habitats Directive Annex species
          try {
            const annexSpecies = await searchSpeciesByGridRef(gridRef)
            console.log('🔍 Article 17 Results:', annexSpecies.length, 'species found')

            // Known common names for Annex species
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
                source: 'npws', // Use npws as source since it's NPWS data
                dataType: 'species_record',
                title: displayName,
                content: `Habitats Directive Annex species. Recorded in ${species.gridCount} grid squares across Ireland. Scientific name: ${species.scientificName}`,
                isSaved: false,
                sourceUrl: `https://www.npws.ie/protected-sites/sac`,
                rawData: { annexCode: species.code, hectads: species.hectads.slice(0, 10) },
                metadata: {
                  scientificName: species.scientificName,
                  commonName: commonName,
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

      setSearchResults(findings)
      // Auto-start NBDC enrichment
      if (findings.length > 0) {
        autoEnrich(findings)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch species occurrence data.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Assign ref so the hook can call performSearch
  performSearchRef.current = performSearch

  // Handle saving a finding
  // Note: Check current saved state directly from savedFindings list
  const handleSaveFinding = async (finding: FindingDisplay) => {
    setSavingIds((prev) => new Set(prev).add(finding.id))
    try {
      // Check current saved state in our savedFindings list
      const isCurrentlySaved = savedFindings.some(
        (f) => f.title === finding.title || f.id === finding.id
      )

      if (isCurrentlySaved) {
        // Currently saved, so user wants to remove it
        const existingFinding = savedFindings.find(
          (f) => f.title === finding.title || f.id === finding.id
        )
        if (existingFinding) {
          await deleteFinding.mutateAsync(existingFinding.id)
        }
      } else {
        // Not saved yet, so save it
        // Determine source - if enriched with NBDC, use 'nbdc' to indicate Irish data
        const source = finding.metadata?.nbdcEnriched ? 'nbdc' : 'gbif'

        await createFinding.mutateAsync({
          project_id: project.id,
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
          created_by: userId,
        })
      }
    } catch (error) {
      console.error('Save finding error:', error)
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(finding.id)
        return next
      })
    }
  }

  // Handle inline AI summary for a single species
  const handleFetchAiSummary = async (finding: FindingDisplay) => {
    // Set loading state
    setSearchResults((prev) =>
      prev.map((f) =>
        f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: true } } : f
      )
    )

    try {
      const response = await fetch('/api/ai/species-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      })

      if (!response.ok) throw new Error('Failed to fetch summary')

      const data = await response.json()

      setSearchResults((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? {
                ...f,
                metadata: {
                  ...f.metadata,
                  aiSummary: data.summary,
                  aiSummaryLoading: false,
                },
              }
            : f
        )
      )

      // Persist AI summary to DB if finding is already saved
      const existingSaved = savedFindings.find(
        (f) => f.title === finding.title || f.id === finding.id
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
                metadata: { ...existingMetadata, aiSummary: data.summary },
              } as unknown as Json,
            },
          })
          .catch((err) => console.error('Failed to persist AI summary:', err))
      }
    } catch (error) {
      console.warn('AI summary error:', error)
      setSearchResults((prev) =>
        prev.map((f) =>
          f.id === finding.id ? { ...f, metadata: { ...f.metadata, aiSummaryLoading: false } } : f
        )
      )
    }
  }

  // Batch summarize all species
  const summarizeCancelRef = React.useRef(false)
  const handleSummarizeAllSpecies = async () => {
    const speciesFindings = searchResults.filter(
      (f) => f.dataType === 'species_record' && !f.metadata?.aiSummary
    )
    if (speciesFindings.length === 0) return

    summarizeCancelRef.current = false
    setIsSummarizing(true)
    for (const finding of speciesFindings) {
      if (summarizeCancelRef.current) break
      await handleFetchAiSummary(finding)
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setIsSummarizing(false)
  }
  const handleStopSummarize = () => {
    summarizeCancelRef.current = true
  }

  // Handle species deep research (enriched with FPO, Article 17, related sites)
  const handleSpeciesDeepResearch = async (finding: FindingDisplay) => {
    const scientificName = finding.metadata?.scientificName || finding.title

    // Gather enrichment data in parallel
    let fpoRecords: FPORecord[] | undefined
    let article17Species: Article17Species[] | undefined
    let relatedSites: import('@/lib/data/npws-site-lookup').SiteWithSpecies[] | undefined

    try {
      const [fpoModule, art17Module, npwsModule] = await Promise.all([
        import('@/lib/data/fpo-species'),
        import('@/lib/data/article17-species'),
        import('@/lib/data/npws-site-lookup'),
      ])

      // FPO: if this finding comes from FPO source, use its rawData records
      if (finding.source === 'fpo' && finding.rawData?.sampleRecords) {
        fpoRecords = finding.rawData.sampleRecords as FPORecord[]
      }

      // Article 17: search by scientific name
      try {
        article17Species = await art17Module.searchSpeciesByName(scientificName)
      } catch {
        // silently skip
      }

      // Related sites: find SAC/SPA where this species is a qualifying interest
      try {
        relatedSites = npwsModule.findSitesWithSpecies(scientificName)
      } catch {
        // silently skip
      }
    } catch {
      // Dynamic import failed, proceed without enrichment
    }

    // Check for existing deep research analysis in rawData or savedFindings
    let cachedAnalysis: string | undefined
    const deepResearchFromRaw = (finding.rawData as Record<string, unknown>)?.deepResearch as
      | Record<string, unknown>
      | undefined
    if (deepResearchFromRaw?.aiAnalysis) {
      cachedAnalysis = deepResearchFromRaw.aiAnalysis as string
    } else {
      const savedMatch = savedFindings.find(
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

    // Update the finding in searchResults with the AI analysis
    setSearchResults((prev) =>
      prev.map((f) => {
        if (f.metadata?.scientificName === scientificName) {
          return {
            ...f,
            metadata: {
              ...f.metadata,
              deepResearchAnalysis: data.aiAnalysis,
              relatedSitesCount: data.relatedSites?.length || 0,
              hasFPORecords: (data.fpoRecords?.length || 0) > 0,
              hasArticle17Data: (data.article17Species?.length || 0) > 0,
            },
            rawData: {
              ...f.rawData,
              deepResearch: deepResearchData,
            },
          }
        }
        return f
      })
    )

    // Also persist to DB if finding is already saved
    const existingSaved = savedFindings.find(
      (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
    )
    if (existingSaved) {
      const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}
      // Merge session AI summary into DB data if present
      const sessionFinding = searchResults.find(
        (r) => r.metadata?.scientificName === scientificName
      )
      const existingMetadata = (existingRawData.metadata as Record<string, unknown>) || {}
      const mergedMetadata = sessionFinding?.metadata?.aiSummary
        ? { ...existingMetadata, aiSummary: sessionFinding.metadata.aiSummary }
        : existingMetadata

      updateFinding
        .mutateAsync({
          findingId: existingSaved.id,
          updates: {
            raw_data: {
              ...existingRawData,
              metadata: mergedMetadata,
              deepResearch: deepResearchData,
            } as unknown as Json,
          },
        })
        .catch((err) => console.error('Failed to persist deep research to finding:', err))
    }
  }

  // No boundary check
  if (!projectBoundary) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No project boundary defined. Please complete Step 1 (GIS Mapping) first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Count protected and invasive species
  const protectedCount = searchResults.filter((f) => f.metadata?.isProtected).length
  const invasiveCount = searchResults.filter((f) => f.metadata?.isInvasive).length
  const enrichedCount = searchResults.filter((f) => f.metadata?.nbdcEnriched).length

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-2 font-semibold">Species Records</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Search GBIF for species occurrences and enrich with NBDC protection status.
          </p>

          {/* Search Row */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedBuffer.toString()}
              onValueChange={(v) => setSelectedBuffer(parseFloat(v))}
            >
              <SelectTrigger className="w-30">
                <SelectValue placeholder="Buffer" />
              </SelectTrigger>
              <SelectContent>
                {(bufferDistances.length > 0 ? bufferDistances : [2, 5]).map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d} km buffer
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={performSearch}
              disabled={isSearching || isEnriching}
              className="flex-1 border-purple-300 text-purple-700 hover:bg-gray-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Species
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-hidden">
          <FindingsList
            findings={filteredResults}
            savedFindings={savedFindings}
            isLoading={isSearching}
            onSave={handleSaveFinding}
            onViewOnMap={(f) => setSelectedFinding(f)}
            onDeepResearch={handleSpeciesDeepResearch}
            onFetchAiSummary={handleFetchAiSummary}
            emptyMessage="Search to find species"
            hiddenIds={hiddenIds}
            onToggleVisibility={handleToggleVisibility}
            savingIds={savingIds}
            selectedFindingId={selectedFinding?.id}
            showSpeciesHeader
            speciesCounts={{
              total: searchResults.length,
              protected: protectedCount,
              invasive: invasiveCount,
              enriched: enrichedCount,
            }}
            enrichmentStatus={
              isEnriching && enrichmentProgress
                ? enrichmentProgress
                  ? {
                      isEnriching: true,
                      current: enrichmentProgress.current,
                      total: enrichmentProgress.total,
                    }
                  : null
                : null
            }
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            onSummarizeAll={handleSummarizeAllSpecies}
            isSummarizing={isSummarizing}
            onStopSummarize={handleStopSummarize}
            onSavedFilterChange={setShowSavedOnMap}
          />
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="relative flex-1" ref={mapContainerRef}>
          {mapReady && (
            <>
              <ProjectMap
                key={`species-map-${project.id}`}
                className="h-full"
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
                zoom={11}
                boundary={projectBoundary}
                bufferDistances={bufferDistances}
                findings={filteredResults
                  .filter((f) => !hiddenIds.has(f.id)) // Filter out hidden findings
                  .filter(
                    (f) =>
                      !showSavedOnMap ||
                      savedFindings.some(
                        (sf) =>
                          (sf.raw_data as Record<string, unknown>)?.scientificName ===
                          f.metadata?.scientificName
                      )
                  )
                  .map((f) => ({
                    id: f.id,
                    source: f.metadata?.nbdcEnriched ? 'nbdc' : ('gbif' as FindingSource),
                    dataType: f.dataType as FindingType,
                    title: f.title,
                    content: f.content,
                    location: f.location,
                    isSaved: savedFindings.some(
                      (sf) =>
                        (sf.raw_data as Record<string, unknown>)?.scientificName ===
                        f.metadata?.scientificName
                    ),
                    // Pass metadata for species status coloring (protected, invasive, threatened)
                    metadata: f.metadata,
                  }))}
                selectedFinding={
                  selectedFinding
                    ? {
                        id: selectedFinding.id,
                        source: selectedFinding.metadata?.nbdcEnriched
                          ? 'nbdc'
                          : (selectedFinding.source as FindingSource),
                        dataType: selectedFinding.dataType as FindingType,
                        title: selectedFinding.title,
                        content: selectedFinding.content,
                        location: selectedFinding.location,
                        isSaved: false,
                        metadata: selectedFinding.metadata,
                      }
                    : undefined
                }
                onFindingClick={(f) => {
                  // Toggle selection - if clicking the same finding, deselect it
                  const found = searchResults.find((r) => r.id === f.id) || null
                  setSelectedFinding((prev) => (prev?.id === f.id ? null : found))
                  // Scroll to the finding card in the panel
                  document
                    .getElementById(`finding-${f.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                onMapClick={() => {
                  // Clear selection when clicking on empty map space
                  setSelectedFinding(null)
                }}
              />

              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-1000"
                onClick={onToggleMap}
                data-map-control="true"
              >
                <EyeOff className="mr-1 h-4 w-4" />
                Hide Map
              </Button>

              {/* Map capture button */}
              <MapCaptureButton
                containerRef={mapContainerRef}
                projectId={project.id}
                stepName="species_records"
                userId={userId}
                className="absolute top-14 right-4 z-1000 shadow-md"
              />
            </>
          )}
        </div>
      )}

      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}

      {/* Species Deep Research Modal */}
      <SpeciesResearchModal
        open={speciesResearchOpen}
        onOpenChange={setSpeciesResearchOpen}
        species={selectedSpeciesResearch}
        existingAnalysis={speciesExistingAnalysis}
        onSaveAnalysis={handleSaveDeepResearchAnalysis}
      />
    </div>
  )
}
