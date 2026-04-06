'use client'

import * as React from 'react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import {
  DeepResearchModal,
  type DeepResearchSite,
} from '@/components/desk-research/deep-research-modal'
import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import {
  findIntersectingSSCO,
  getHabitatsBySiteCode,
  type SSCOResult,
} from '@/lib/data/ssco-lookup'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import { useCreateFinding, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

interface DesignatedSitesSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  siteId?: string | null
  otherBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  /** All site boundaries regardless of selection — passed through to the
   *  shell so manual search stays project-wide even when one site is
   *  selected in the view filter. */
  allSiteBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
  autoSearchTrigger?: boolean
  onAutoSearchComplete?: (status: 'done' | 'error' | 'skipped') => void
}

export function DesignatedSitesSubStep(props: DesignatedSitesSubStepProps) {
  const {
    projectBoundary,
    searchBoundary,
    allBoundaries,
    allSiteBoundaries,
    savedFindings,
    project,
    userId,
    siteId,
  } = props
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()

  // Deep Research modal state
  const [deepResearchSite, setDeepResearchSite] = React.useState<DeepResearchSite | null>(null)
  const [deepResearchFinding, setDeepResearchFinding] = React.useState<FindingDisplay | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)

  // Ref to trigger short AI summary from the shell
  const aiSummaryTriggerRef = React.useRef<((finding: FindingDisplay) => void) | null>(null)

  // Handle Deep Research save -> auto-save card if needed + trigger short AI summary
  const handleDeepResearchSave = React.useCallback(
    async (data: {
      aiAnalysis: string
      siteCode: string
      nbdcSpecies?: Array<Record<string, unknown>>
      scrapedInfo?: { qualifyingInterests: string[]; statutoryInstrumentUrl: string | null }
      article17Habitats?: Array<Record<string, unknown>>
      conservationSummary?: Record<string, number>
    }) => {
      const deepResearchPayload = {
        aiAnalysis: data.aiAnalysis,
        ...(data.nbdcSpecies && { nbdcSpecies: data.nbdcSpecies }),
        ...(data.scrapedInfo && { scrapedInfo: data.scrapedInfo }),
        ...(data.article17Habitats && { article17Habitats: data.article17Habitats }),
        ...(data.conservationSummary && { conservationSummary: data.conservationSummary }),
      }

      const existingSaved = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === data.siteCode && f.source === 'npws'
      )

      if (existingSaved) {
        try {
          const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}

          await updateFinding.mutateAsync({
            findingId: existingSaved.id,
            updates: {
              raw_data: {
                ...existingRawData,
                deepResearch: deepResearchPayload,
              } as unknown as Json,
            },
          })
        } catch (error) {
          console.error('Failed to update finding with deep research:', error)
        }
      } else if (deepResearchFinding) {
        try {
          const payload = {
            project_id: project.id,
            site_id: siteId ?? null,
            source: 'npws' as const,
            data_type: 'designated_site' as const,
            title: deepResearchFinding.title,
            content: deepResearchFinding.content || null,
            raw_data: {
              ...deepResearchFinding.rawData,
              siteCode: deepResearchFinding.metadata?.siteCode,
              metadata: deepResearchFinding.metadata,
              deepResearch: deepResearchPayload,
            } as unknown as Json,
            location: deepResearchFinding.location as unknown as Json,
            is_saved: true,
            distance_from_boundary_km: deepResearchFinding.metadata?.distance || null,
            is_protected: true,
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
    },
    [savedFindings, deepResearchFinding, updateFinding, createFinding, project.id, userId]
  )

  const config: SubstepShellConfig = React.useMemo(
    () => ({
      title: 'Designated Sites (NPWS)',
      description: 'Search for SAC, SPA, NHA, and pNHA sites within the selected buffer zone.',
      searchButtonLabel: 'Search NPWS',
      searchButtonColor:
        'border-emerald-300 text-emerald-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      emptyMessage: 'Search to find sites',
      cacheKeyPrefix: 'npws',
      stepName: 'designated_sites',
      source: 'npws',

      // Search
      performSearch: async ({ bbox, buffer, boundary }) => {
        const results = await queryDesignatedSites({
          bbox: { minX: bbox.minLng, minY: bbox.minLat, maxX: bbox.maxLng, maxY: bbox.maxLat },
        })

        // Deduplicate
        const uniqueResults = results.filter(
          (site, index, self) =>
            index ===
            self.findIndex((s) => s.SITECODE === site.SITECODE && s.SITE_TYPE === site.SITE_TYPE)
        )

        const findings: FindingDisplay[] = uniqueResults.map((site, idx) => {
          const siteTypeUrlMap: Record<string, string> = {
            SAC: 'protected-sites/sac',
            SPA: 'protected-sites/spa',
            NHA: 'protected-sites/nha',
          }
          const urlPath = siteTypeUrlMap[site.SITE_TYPE || '']
          const distance = calculateDistanceFromBoundary(site.geometry, projectBoundary)

          const sourceUrl =
            site.SITE_TYPE === 'pNHA'
              ? 'https://www.npws.ie/sites/default/files/general/pNHA_Site_Synopsis_Portfolio.pdf'
              : `https://www.npws.ie/${urlPath || 'protected-sites'}/${site.SITECODE}`

          return {
            id: `npws-${site.SITECODE}-${site.SITE_TYPE || 'unknown'}-${site.OBJECTID || idx}`,
            source: 'npws',
            dataType: 'designated_site',
            title: site.SITENAME,
            content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
            location: site.geometry,
            isSaved: false,
            sourceUrl,
            rawData: site as unknown as Record<string, unknown>,
            metadata: {
              siteCode: site.SITECODE,
              siteType: site.SITE_TYPE,
              distance,
              designation: site.SITE_TYPE,
            },
          }
        })

        // SSCO enrichment
        if (boundary) {
          try {
            const sscoResults = await findIntersectingSSCO(boundary, buffer)

            for (const ssco of sscoResults) {
              const matchingFinding = findings.find(
                (f) => f.metadata?.siteCode === ssco.siteCode && f.metadata?.siteType === 'SAC'
              )

              if (matchingFinding) {
                matchingFinding.rawData = {
                  ...matchingFinding.rawData,
                  ssco,
                  habitats: ssco.habitats,
                }
                matchingFinding.metadata = {
                  ...matchingFinding.metadata,
                  habitatCount: ssco.habitats.length,
                }
                const habitatList = ssco.habitats
                  .slice(0, 3)
                  .map((h) => h.habitatName)
                  .join(', ')
                const moreCount =
                  ssco.habitats.length > 3 ? ` +${ssco.habitats.length - 3} more` : ''
                matchingFinding.content = `${matchingFinding.content} Habitats: ${habitatList}${moreCount}`
              } else {
                const habitatList = ssco.habitats
                  .map((h) => `[${h.habitatCode}] ${h.habitatName}`)
                  .join(', ')

                findings.push({
                  id: `ssco-${ssco.siteCode}`,
                  source: 'npws',
                  dataType: 'designated_site',
                  title: `${ssco.siteName}`,
                  content: `Special Area of Conservation. Protected habitats: ${habitatList}${ssco.intersectionArea ? `. Overlap: ~${ssco.intersectionArea.toFixed(1)} ha` : ''}`,
                  location: ssco.geometry,
                  isSaved: false,
                  sourceUrl: `https://www.npws.ie/protected-sites/sac/${ssco.siteCode}`,
                  rawData: { ssco, habitats: ssco.habitats },
                  metadata: {
                    siteCode: ssco.siteCode,
                    siteType: 'SAC',
                    designation: 'Special Area of Conservation',
                    habitatCount: ssco.habitats.length,
                    isProtected: true,
                    distance: 0,
                  },
                })
              }
            }
          } catch (error) {
            console.warn('SSCO search error:', error)
          }
        }

        // Sort by distance
        findings.sort((a, b) => {
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          return distA - distB
        })

        return findings
      },

      // Matching
      matchPredicate: (sf, result) =>
        (sf.raw_data as Record<string, unknown>)?.siteCode === result.metadata?.siteCode,
      minimalMetadataKeys: ['siteCode', 'siteType'],

      // Save payload
      buildCreatePayload: (finding, { projectId, userId: uid, siteId }) => ({
        project_id: projectId,
        site_id: siteId ?? null,
        source: 'npws',
        data_type: 'designated_site',
        title: finding.title,
        content: finding.content || null,
        raw_data: {
          ...finding.rawData,
          siteCode: finding.metadata?.siteCode,
          metadata: finding.metadata,
        } as unknown as Json,
        location: finding.location as unknown as Json,
        is_saved: true,
        distance_from_boundary_km: finding.metadata?.distance || null,
        is_protected: true,
        created_by: uid,
      }),

      // AI summary
      aiSummaryEndpoint: '/api/ai/site-summary',
      canFetchAiSummary: (finding) => !!(finding.sourceUrl && finding.metadata?.siteCode),
      buildAiSummaryBody: (finding) => ({
        siteUrl: finding.sourceUrl,
        siteName: finding.title,
        siteCode: finding.metadata?.siteCode,
        siteType: finding.metadata?.siteType || finding.metadata?.designation,
      }),
      summarizeFilter: (f) =>
        f.dataType === 'designated_site' &&
        !f.metadata?.aiSummary &&
        !f.metadata?.aiSummaryLoading &&
        !!f.sourceUrl,

      // Filtering
      filterConfig: {
        showSiteTypeFilter: true,
        siteTypeFilterOrder: ['SAC', 'SPA', 'NHA', 'pNHA'],
        siteTypeFilterConfig: {
          SAC: {
            active: 'bg-emerald-600 text-white',
            inactive: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
          },
          SPA: {
            active: 'bg-sky-600 text-white',
            inactive: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
          },
          NHA: {
            active: 'bg-amber-600 text-white',
            inactive: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
          },
          pNHA: {
            active: 'bg-orange-600 text-white',
            inactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
          },
        },
      },

      // Map findings customization
      mapFindingsSavedFilter: (f, sf) =>
        sf.some(
          (saved) => (saved.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode
        ),
      mapFindingsMapper: (f, sf) => ({
        id: f.id,
        source: f.source as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: sf.some(
          (saved) => (saved.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode
        ),
      }),

      // Deep Research
      onDeepResearch: async (finding) => {
        const siteCode = finding.metadata?.siteCode || ''

        const sscoData = finding.rawData?.ssco as SSCOResult | undefined
        let habitats =
          sscoData?.habitats ||
          (finding.rawData?.habitats as
            | Array<{ habitatCode: string; habitatName: string }>
            | undefined)

        if ((!habitats || habitats.length === 0) && siteCode) {
          try {
            const sscoHabitats = await getHabitatsBySiteCode(siteCode)
            if (sscoHabitats.length > 0) {
              habitats = sscoHabitats.map((h) => ({
                habitatCode: h.habitatCode,
                habitatName: h.habitatName,
              }))
            }
          } catch (error) {
            console.warn('Failed to lookup SSCO habitats:', error)
          }
        }

        const site: DeepResearchSite = {
          siteCode,
          siteName: finding.title.replace(' - Conservation Objectives', ''),
          siteType: (finding.metadata?.siteType as 'SAC' | 'SPA' | 'NHA' | 'pNHA') || 'SAC',
          habitats,
          distance: finding.metadata?.distance,
          areaHa: finding.rawData?.AREA_HA as number | undefined,
        }

        setDeepResearchSite(site)
        setDeepResearchFinding(finding)
        setIsDeepResearchOpen(true)
      },
    }),
    [projectBoundary]
  )

  return (
    <>
      <DataGatheringSubstepShell
        {...props}
        config={config}
        searchBoundary={searchBoundary}
        allBoundaries={allBoundaries}
        allSiteBoundaries={allSiteBoundaries}
        aiSummaryTriggerRef={aiSummaryTriggerRef}
      />
      <DeepResearchModal
        open={isDeepResearchOpen}
        onOpenChange={setIsDeepResearchOpen}
        site={deepResearchSite}
        projectId={project.id}
        userId={userId}
        onSaveAnalysis={handleDeepResearchSave}
      />
    </>
  )
}
