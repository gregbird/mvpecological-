'use client'

import * as React from 'react'
import { Droplets } from 'lucide-react'

import { DataGatheringSubstepShell, type SubstepShellConfig } from './data-gathering-substep-shell'
import { type FindingDisplay } from './findings-list'
import {
  AquaticDeepResearchModal,
  type AquaticDeepResearchSite,
} from '@/components/desk-research/aquatic-deep-research-modal'
import { searchAllAquaticFeatures, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import { calculateDistanceFromBoundary } from '@/lib/gis/distance'
import type { Project, DeskResearchFinding, Json } from '@/types/database'
import { useCreateFinding, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { FindingSource, FindingType } from '@/components/desk-research/finding-card'

interface AquaticFeaturesSubStepProps {
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

export function AquaticFeaturesSubStep(props: AquaticFeaturesSubStepProps) {
  const { projectBoundary, savedFindings, project, userId } = props
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()

  // Deep Research modal state
  const [deepResearchSite, setDeepResearchSite] = React.useState<AquaticDeepResearchSite | null>(
    null
  )
  const [deepResearchFinding, setDeepResearchFinding] = React.useState<FindingDisplay | null>(null)
  const [isDeepResearchOpen, setIsDeepResearchOpen] = React.useState(false)
  const [aquaticExistingAnalysis, setAquaticExistingAnalysis] = React.useState<string | undefined>()

  // Ref to trigger short AI summary from the shell
  const aiSummaryTriggerRef = React.useRef<((finding: FindingDisplay) => void) | null>(null)

  // Handle Deep Research save -> auto-save card if needed + update AI summary
  const handleDeepResearchSave = React.useCallback(
    async (data: {
      aiAnalysis: string
      waterBodyCode: string
      riverDistance?: {
        riverDistanceKm: number | null
        downstreamPath?: Array<Record<string, unknown>>
        sacReached?: { siteCode: string; distanceKm: number }
      }
    }) => {
      const aquaticResearchPayload = {
        aiAnalysis: data.aiAnalysis,
        ...(data.riverDistance && { riverDistance: data.riverDistance }),
      }

      const existingSaved = savedFindings.find(
        (f) =>
          (f.raw_data as Record<string, unknown>)?.siteCode === data.waterBodyCode &&
          f.source === 'epa'
      )

      if (existingSaved) {
        try {
          const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}

          await updateFinding.mutateAsync({
            findingId: existingSaved.id,
            updates: {
              raw_data: {
                ...existingRawData,
                aquaticResearch: aquaticResearchPayload,
              } as unknown as Json,
            },
          })
        } catch (error) {
          console.error('Failed to update finding with aquatic research:', error)
        }
      } else if (deepResearchFinding) {
        try {
          const payload = {
            project_id: project.id,
            source: 'epa' as const,
            data_type: deepResearchFinding.dataType as 'water_quality' | 'catchment',
            title: deepResearchFinding.title,
            content: deepResearchFinding.content || null,
            raw_data: {
              ...deepResearchFinding.rawData,
              siteCode: deepResearchFinding.metadata?.siteCode,
              metadata: deepResearchFinding.metadata,
              aquaticResearch: aquaticResearchPayload,
            } as unknown as Json,
            location: deepResearchFinding.location as unknown as Json,
            is_saved: true,
            distance_from_boundary_km: deepResearchFinding.metadata?.distance || null,
            created_by: userId,
          }
          await createFinding.mutateAsync(payload)
        } catch (error) {
          console.error('Failed to create finding from aquatic research:', error)
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
      title: 'Aquatic Features (EPA)',
      titleIcon: <Droplets className="h-4 w-4 text-cyan-500" />,
      description: 'Search for rivers, lakes, and catchments within the selected buffer zone.',
      searchButtonLabel: 'Search EPA',
      searchButtonColor: 'border-cyan-300 text-cyan-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      emptyMessage: 'Search to find features',
      cacheKeyPrefix: 'epa',
      stepName: 'aquatic_features',
      source: 'epa',

      // Search
      performSearch: async ({ bbox }) => {
        const results = await searchAllAquaticFeatures({
          bbox: {
            minLat: bbox.minLat,
            maxLat: bbox.maxLat,
            minLng: bbox.minLng,
            maxLng: bbox.maxLng,
          },
          limit: 50,
        })

        const findings: FindingDisplay[] = []

        // Rivers
        for (let i = 0; i < results.rivers.length; i++) {
          const river = results.rivers[i]
          const distance = calculateDistanceFromBoundary(river.geometry, projectBoundary)
          findings.push({
            id: `epa-river-${river.RiverCode || river.OBJECTID || i}`,
            source: 'epa',
            dataType: 'water_quality',
            title: river.RiverName,
            content: `River${river.Length_km ? ` (${river.Length_km.toFixed(1)} km)` : ''}. ${river.CatchmentName ? `Catchment: ${river.CatchmentName}.` : ''} ${river.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(river.WFD_Status)}` : ''}`,
            location: river.geometry,
            isSaved: false,
            sourceUrl: river.CatchmentsUrl || `https://gis.epa.ie/EPAMaps/Water`,
            rawData: river as unknown as Record<string, unknown>,
            metadata: {
              siteCode: river.RiverCode,
              siteType: 'River',
              designation: river.WFD_Status,
              distance,
            },
          })
        }

        // Lakes
        for (let i = 0; i < results.lakes.length; i++) {
          const lake = results.lakes[i]
          const distance = calculateDistanceFromBoundary(lake.geometry, projectBoundary)
          findings.push({
            id: `epa-lake-${lake.LakeCode || lake.OBJECTID || i}`,
            source: 'epa',
            dataType: 'water_quality',
            title: lake.LakeName,
            content: `Lake${lake.Area_ha ? ` (${lake.Area_ha.toFixed(1)} ha)` : ''}. ${lake.CatchmentName ? `Catchment: ${lake.CatchmentName}.` : ''} ${lake.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(lake.WFD_Status)}` : ''}`,
            location: lake.geometry,
            isSaved: false,
            sourceUrl: lake.CatchmentsUrl || `https://gis.epa.ie/EPAMaps/Water`,
            rawData: lake as unknown as Record<string, unknown>,
            metadata: {
              siteCode: lake.LakeCode,
              siteType: 'Lake',
              designation: lake.WFD_Status,
              distance,
            },
          })
        }

        // Catchments
        for (let i = 0; i < results.catchments.length; i++) {
          const catchment = results.catchments[i]
          const distance = calculateDistanceFromBoundary(catchment.geometry, projectBoundary)
          findings.push({
            id: `epa-catchment-${catchment.CatchmentId || catchment.OBJECTID || i}`,
            source: 'epa',
            dataType: 'catchment',
            title: catchment.CatchmentName,
            content: `Catchment${catchment.Area_km2 ? ` (${catchment.Area_km2.toFixed(1)} km²)` : ''}. ${catchment.RiverBasinDistrict ? `River Basin District: ${catchment.RiverBasinDistrict}` : ''}`,
            location: catchment.geometry,
            isSaved: false,
            sourceUrl: `https://gis.epa.ie/EPAMaps/Water`,
            rawData: catchment as unknown as Record<string, unknown>,
            metadata: { siteCode: catchment.CatchmentId, siteType: 'Catchment', distance },
          })
        }

        return findings
      },

      // Matching
      matchPredicate: (sf, result) => {
        const rawData = sf.raw_data as Record<string, unknown>
        return rawData?.siteCode === result.metadata?.siteCode && sf.source === 'epa'
      },
      minimalMetadataKeys: ['siteType', 'siteCode'],

      // Save payload
      buildCreatePayload: (finding, { projectId, userId: uid }) => ({
        project_id: projectId,
        source: 'epa',
        data_type: finding.dataType as 'water_quality' | 'catchment',
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
        created_by: uid,
      }),

      // AI summary
      aiSummaryEndpoint: '/api/ai/aquatic-summary',
      buildAiSummaryBody: (finding) => {
        const rawData = finding.rawData as Record<string, unknown> | undefined
        return {
          waterBodyName: finding.title,
          waterBodyType: finding.metadata?.siteType || 'River',
          waterBodyCode: finding.metadata?.siteCode,
          wfdStatus: finding.metadata?.designation,
          catchmentName: rawData?.CatchmentName,
          distance: finding.metadata?.distance,
          areaHa: rawData?.Area_ha,
          lengthKm: rawData?.Length_km,
          riverBasinDistrict: rawData?.RiverBasinDistrict,
        }
      },

      // Filtering
      filterConfig: {
        showSiteTypeFilter: true,
        siteTypeFilterOrder: ['River', 'Lake', 'Catchment'],
        siteTypeFilterConfig: {
          River: {
            active: 'bg-blue-600 text-white',
            inactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
          },
          Lake: {
            active: 'bg-cyan-600 text-white',
            inactive: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
          },
          Catchment: {
            active: 'bg-slate-600 text-white',
            inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          },
        },
      },

      // Map findings customization
      mapFindingsSavedFilter: (f, sf) =>
        sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode &&
            saved.source === 'epa'
        ),
      mapFindingsMapper: (f, sf) => ({
        id: f.id,
        source: 'epa' as FindingSource,
        dataType: f.dataType as FindingType,
        title: f.title,
        content: f.content,
        location: f.location,
        isSaved: sf.some(
          (saved) =>
            (saved.raw_data as Record<string, unknown>)?.siteCode === f.metadata?.siteCode &&
            saved.source === 'epa'
        ),
      }),

      // Deep Research
      onDeepResearch: (finding, sf) => {
        const site: AquaticDeepResearchSite = {
          waterBodyName: finding.title,
          waterBodyType: (finding.metadata?.siteType as 'River' | 'Lake' | 'Catchment') || 'River',
          waterBodyCode: finding.metadata?.siteCode,
          wfdStatus: finding.metadata?.designation,
          catchmentName: finding.rawData?.CatchmentName as string | undefined,
          catchmentId: finding.rawData?.CatchmentId as string | undefined,
          distance: finding.metadata?.distance,
          areaHa: finding.rawData?.Area_ha as number | undefined,
          lengthKm: finding.rawData?.Length_km as number | undefined,
        }

        // Check for existing analysis in savedFindings
        let cachedAnalysis: string | undefined
        const savedMatch = sf.find(
          (f) =>
            (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata?.siteCode &&
            f.source === 'epa'
        )
        if (savedMatch) {
          const rawData = savedMatch.raw_data as Record<string, unknown>
          const aquaticResearch = rawData?.aquaticResearch as Record<string, unknown> | undefined
          if (aquaticResearch?.aiAnalysis) {
            cachedAnalysis = aquaticResearch.aiAnalysis as string
          }
        }

        setDeepResearchSite(site)
        setDeepResearchFinding(finding)
        setAquaticExistingAnalysis(cachedAnalysis)
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
        aiSummaryTriggerRef={aiSummaryTriggerRef}
      />
      <AquaticDeepResearchModal
        open={isDeepResearchOpen}
        onOpenChange={setIsDeepResearchOpen}
        site={deepResearchSite}
        projectId={project.id}
        projectCenter={props.projectCenter}
        userId={userId}
        existingAnalysis={aquaticExistingAnalysis}
        onSaveAnalysis={handleDeepResearchSave}
      />
    </>
  )
}
