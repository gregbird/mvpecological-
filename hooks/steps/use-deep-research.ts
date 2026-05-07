'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  useProjectDeepResearch,
  useSaveDeepResearch,
  useProjectAquaticResearch,
} from '@/hooks/queries/use-deep-research-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import { getNPWSSiteData } from '@/lib/data/npws-site-lookup'
import { getArticle17Data, getHabitatsSummary } from '@/lib/data/article17-habitats'
import {
  saveAquaticResearch,
  type AquaticResearchStatusHistory,
  type AquaticResearchTrend,
  type AquaticResearchFailure,
  type AquaticResearchConnectivity,
  type AquaticResearchHabitat,
  type AquaticResearchSpecies,
} from '@/lib/supabase/queries/aquatic-research'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import type { Project, DeskResearchFinding as DbFinding, Json } from '@/types/database'
import type { DeskResearchFinding as MapFinding } from '@/components/desk-research/finding-card'

export interface BatchProgress {
  running: boolean
  current: number
  total: number
  currentSite: string
}

export interface UnresearchedSite {
  findingId: string
  siteCode: string
  siteName: string
  siteType: 'SAC' | 'SPA' | 'NHA' | 'pNHA'
}

export interface UnresearchedSpecies {
  findingId: string
  scientificName: string
  commonName?: string
  taxonGroup?: string
  designations?: string
  recordCount?: number
  isProtected?: boolean
  isInvasive?: boolean
  isThreatened?: boolean
}

export interface UnresearchedAquatic {
  findingId: string
  waterBodyCode: string
  waterBodyName: string
  waterBodyType: 'River' | 'Lake' | 'Catchment'
  catchmentName?: string
  catchmentId?: string
  wfdStatus?: string
}

function toMapFindings(dbFindings: DbFinding[]): MapFinding[] {
  return dbFindings
    .map((f) => {
      const raw = (f.raw_data as Record<string, unknown> | null) ?? {}
      // Prefer the dedicated location column; fall back to legacy raw.geometry
      // for older designated-site rows that pre-date location persistence.
      const geometry =
        (f.location as GeoJSON.Geometry | null) ?? (raw.geometry as GeoJSON.Geometry | null) ?? null
      return { f, raw, geometry }
    })
    .filter(({ geometry }) => geometry != null)
    .map(({ f, raw, geometry }) => {
      const metadata = (raw.metadata as Record<string, unknown> | undefined) ?? {}
      return {
        id: f.id,
        source: f.source as MapFinding['source'],
        dataType: f.data_type as MapFinding['dataType'],
        title: f.title,
        content: f.content || undefined,
        rawData: raw,
        location: geometry as GeoJSON.Geometry,
        isSaved: true,
        notes: f.notes || undefined,
        metadata: {
          siteCode:
            (raw.siteCode as string | undefined) ?? (metadata.siteCode as string | undefined),
          siteType:
            (raw.siteType as string | undefined) ?? (metadata.siteType as string | undefined),
          scientificName: metadata.scientificName as string | undefined,
          commonName: metadata.commonName as string | undefined,
          taxonGroup: metadata.taxonGroup as string | undefined,
          distance: f.distance_from_boundary_km || undefined,
        },
      }
    })
}

export function useDeepResearch(
  projectId: string,
  project: Project,
  findings: DbFinding[],
  siteId?: string | null
) {
  const { data: allResearchResults = [], isLoading } = useProjectDeepResearch(projectId)
  const { data: allAquaticResults = [], isLoading: aquaticLoading } =
    useProjectAquaticResearch(projectId)
  const { data: projectSites = [] } = useProjectSites(projectId)
  const saveResearch = useSaveDeepResearch()
  const updateFinding = useUpdateFinding()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user: roleUser } = useRole()

  // Resolve the selected site so the map zooms to its boundary in single-site mode
  const selectedSite = React.useMemo(
    () => (siteId ? (projectSites.find((s) => s.id === siteId) ?? null) : null),
    [siteId, projectSites]
  )

  const {
    projectBoundary: boundary,
    projectCenter,
    bufferDistances,
    otherBoundaries,
    allBoundaries,
  } = useProjectBoundary(project, selectedSite)

  // When site-scoped, filter research tables (which lack site_id) via finding_id JOIN.
  // The `findings` prop is already site-filtered upstream by the parent component.
  const findingIdSet = React.useMemo(() => new Set(findings.map((f) => f.id)), [findings])

  const researchResults = React.useMemo(
    () =>
      siteId
        ? allResearchResults.filter((r) => r.finding_id && findingIdSet.has(r.finding_id))
        : allResearchResults,
    [allResearchResults, siteId, findingIdSet]
  )
  const aquaticResults = React.useMemo(
    () =>
      siteId
        ? allAquaticResults.filter((r) => r.finding_id && findingIdSet.has(r.finding_id))
        : allAquaticResults,
    [allAquaticResults, siteId, findingIdSet]
  )

  const [batchProgress, setBatchProgress] = React.useState<BatchProgress | null>(null)
  // Per-finding loading state for the "research one item" flow exposed in the
  // split-button popover. Kept separate from `batchProgress` so a user can
  // research a single item without it looking like a batch is running.
  const [singleResearchingIds, setSingleResearchingIds] = React.useState<Set<string>>(
    () => new Set()
  )

  // Species findings with deep research
  const speciesWithResearch = React.useMemo(
    () =>
      findings.filter((f) => {
        if (f.data_type !== 'species_record') return false
        const raw = f.raw_data as Record<string, unknown> | null
        return !!(raw?.deepResearch as Record<string, unknown> | undefined)?.aiAnalysis
      }),
    [findings]
  )

  // Habitat findings with deep research
  const habitatsWithResearch = React.useMemo(
    () =>
      findings.filter((f) => {
        if (f.data_type !== 'habitat') return false
        const raw = f.raw_data as Record<string, unknown> | null
        return !!(raw?.deepResearch as Record<string, unknown> | undefined)?.aiAnalysis
      }),
    [findings]
  )

  const totalResearched =
    researchResults.length +
    aquaticResults.length +
    speciesWithResearch.length +
    habitatsWithResearch.length

  // Only show designated sites that have deep research
  const researchedSiteCodes = React.useMemo(
    () => new Set(researchResults.map((r) => r.site_code)),
    [researchResults]
  )

  // Aquatic deep research lives in its own table — join back to the finding
  // row via finding_id so we can plot the same geometry on the map.
  const researchedAquaticFindingIds = React.useMemo(
    () => new Set(aquaticResults.map((r) => r.finding_id).filter((id): id is string => !!id)),
    [aquaticResults]
  )

  // Species + habitat deep research is stored on the finding row itself
  // (raw_data.deepResearch.aiAnalysis), so reuse the lists already computed
  // above (speciesWithResearch / habitatsWithResearch).
  const mapFindings = React.useMemo(() => {
    const researched = findings.filter((f) => {
      if (f.data_type === 'designated_site') {
        const raw = f.raw_data as Record<string, unknown> | null
        const siteCode = raw?.siteCode as string | undefined
        return siteCode ? researchedSiteCodes.has(siteCode) : false
      }
      if (f.data_type === 'water_quality' || f.data_type === 'catchment') {
        return researchedAquaticFindingIds.has(f.id)
      }
      if (f.data_type === 'species_record' || f.data_type === 'habitat') {
        const raw = f.raw_data as Record<string, unknown> | null
        return !!(raw?.deepResearch as Record<string, unknown> | undefined)?.aiAnalysis
      }
      return false
    })
    return toMapFindings(researched)
  }, [findings, researchedSiteCodes, researchedAquaticFindingIds])

  // Find unresearched designated sites
  const unresearchedSites = React.useMemo<UnresearchedSite[]>(() => {
    return findings
      .filter((f) => {
        if (f.data_type !== 'designated_site') return false
        const raw = f.raw_data as Record<string, unknown> | null
        const siteCode = raw?.siteCode as string | undefined
        return siteCode ? !researchedSiteCodes.has(siteCode) : false
      })
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown>
        return {
          findingId: f.id,
          siteCode: (raw.siteCode as string) || '',
          siteName: f.title,
          siteType: ((raw.SITE_TYPE as string) || (raw.siteType as string) || 'SAC') as
            | 'SAC'
            | 'SPA'
            | 'NHA'
            | 'pNHA',
        }
      })
      .filter((s) => s.siteCode)
  }, [findings, researchedSiteCodes])

  // Find unresearched PROTECTED species (batch all species would be too many /
  // expensive — individual research still works for non-protected species via modal)
  const unresearchedSpecies = React.useMemo<UnresearchedSpecies[]>(() => {
    return findings
      .filter((f) => {
        if (f.data_type !== 'species_record') return false
        const raw = f.raw_data as Record<string, unknown> | null
        const metadata = (raw?.metadata as Record<string, unknown> | undefined) || raw || {}
        const isProtected = !!metadata.isProtected
        const isInvasive = !!metadata.isInvasive
        const isThreatened = !!metadata.isThreatened
        const hasDesignations = !!metadata.designations
        // Only research species with conservation interest
        if (!isProtected && !isInvasive && !isThreatened && !hasDesignations) return false
        const deepResearch = raw?.deepResearch as Record<string, unknown> | undefined
        return !deepResearch?.aiAnalysis
      })
      .map((f) => {
        const raw = (f.raw_data as Record<string, unknown>) || {}
        const metadata = (raw.metadata as Record<string, unknown> | undefined) || raw
        return {
          findingId: f.id,
          scientificName: (metadata.scientificName as string) || f.title,
          commonName: metadata.commonName as string | undefined,
          taxonGroup: metadata.taxonGroup as string | undefined,
          designations: metadata.designations as string | undefined,
          recordCount: metadata.recordCount as number | undefined,
          isProtected: metadata.isProtected as boolean | undefined,
          isInvasive: metadata.isInvasive as boolean | undefined,
          isThreatened: metadata.isThreatened as boolean | undefined,
        }
      })
      .filter((s) => s.scientificName)
  }, [findings])

  // Researched aquatic codes (from aquatic_research_results table)
  const researchedAquaticCodes = React.useMemo(
    () => new Set(allAquaticResults.map((r) => r.water_body_code)),
    [allAquaticResults]
  )

  const unresearchedAquatic = React.useMemo<UnresearchedAquatic[]>(() => {
    return findings
      .filter((f) => f.data_type === 'water_quality' || f.data_type === 'catchment')
      .map((f) => {
        const raw = (f.raw_data as Record<string, unknown>) || {}
        const metadata = (raw.metadata as Record<string, unknown> | undefined) || raw
        const code = (metadata.siteCode as string) || f.title
        return {
          findingId: f.id,
          waterBodyCode: code,
          waterBodyName: f.title,
          waterBodyType: ((metadata.siteType as string) === 'Lake'
            ? 'Lake'
            : (metadata.siteType as string) === 'Catchment'
              ? 'Catchment'
              : 'River') as 'River' | 'Lake' | 'Catchment',
          catchmentName: metadata.catchmentName as string | undefined,
          catchmentId: metadata.catchmentId as string | undefined,
          wfdStatus: metadata.designation as string | undefined,
        }
      })
      .filter((a) => a.waterBodyCode && !researchedAquaticCodes.has(a.waterBodyCode))
  }, [findings, researchedAquaticCodes])

  // Group results by site type
  const resultsByType = React.useMemo(() => {
    const byType: Record<string, typeof researchResults> = {}
    for (const r of researchResults) {
      const type = r.site_type || 'Other'
      if (!byType[type]) byType[type] = []
      byType[type].push(r)
    }
    const typeOrder = ['SAC', 'SPA', 'NHA', 'pNHA', 'Other']
    const sortedTypes = typeOrder.filter((t) => byType[t]?.length > 0)
    return { byType, sortedTypes }
  }, [researchResults])

  const handleBatchResearch = React.useCallback(async () => {
    if (unresearchedSites.length === 0) return

    setBatchProgress({
      running: true,
      current: 0,
      total: unresearchedSites.length,
      currentSite: '',
    })

    let completed = 0
    for (const site of unresearchedSites) {
      setBatchProgress({
        running: true,
        current: completed + 1,
        total: unresearchedSites.length,
        currentSite: site.siteName,
      })

      try {
        const response = await fetch('/api/ai/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteCode: site.siteCode,
            siteName: site.siteName,
            siteType: site.siteType,
          }),
        })
        const data = (await response.json()) as { summary?: string }

        const excelData = getNPWSSiteData(site.siteCode)
        const habitatList =
          excelData?.habitats?.map((h) => ({ habitatCode: h.code, habitatName: h.name })) || []
        const habitatsWithArticle17 = habitatList.map((h) => ({
          ...h,
          article17: getArticle17Data(h.habitatCode),
        }))
        const habitatCodes = habitatList.map((h) => h.habitatCode)
        const summary = getHabitatsSummary(habitatCodes)

        const allPressures = new Set<string>()
        const allThreats = new Set<string>()
        habitatsWithArticle17.forEach((h) => {
          h.article17?.pressures.forEach((p: string) => allPressures.add(p))
          h.article17?.threats.forEach((t: string) => allThreats.add(t))
        })

        await saveResearch.mutateAsync({
          project_id: projectId,
          finding_id: site.findingId,
          site_code: site.siteCode,
          site_name: site.siteName,
          site_type: site.siteType,
          habitats: habitatsWithArticle17.map((h) => ({
            habitatCode: h.habitatCode,
            habitatName: h.habitatName,
            status: h.article17?.status,
            trend: h.article17?.trend,
            priorityHabitat: h.article17?.priorityHabitat,
          })),
          conservation_summary: {
            total: summary.total,
            favourable: summary.favourable,
            unfavourableInadequate: summary.unfavourableInadequate,
            unfavourableBad: summary.unfavourableBad,
            improving: summary.improving,
            declining: summary.declining,
            priorityCount: summary.priorityCount,
          },
          threats_pressures: {
            pressures: Array.from(allPressures),
            threats: Array.from(allThreats),
          },
          ai_analysis: response.ok ? data.summary || null : null,
        })

        completed++
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${site.siteName}`,
          description: 'Skipping and continuing with next site.',
        })
        completed++
      }
    }

    setBatchProgress(null)
    toast({
      title: 'Batch research complete',
      description: `${completed} site${completed !== 1 ? 's' : ''} researched.`,
    })
  }, [unresearchedSites, projectId, saveResearch, toast])

  const handleBatchResearchSpecies = React.useCallback(async () => {
    if (unresearchedSpecies.length === 0) return

    setBatchProgress({
      running: true,
      current: 0,
      total: unresearchedSpecies.length,
      currentSite: '',
    })

    let completed = 0
    for (const species of unresearchedSpecies) {
      setBatchProgress({
        running: true,
        current: completed + 1,
        total: unresearchedSpecies.length,
        currentSite: species.scientificName,
      })

      try {
        const response = await fetch('/api/ai/species-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scientificName: species.scientificName,
            commonName: species.commonName,
            recordCount: species.recordCount,
            designations: species.designations,
            taxonGroup: species.taxonGroup,
            isProtected: species.isProtected,
            isInvasive: species.isInvasive,
            isThreatened: species.isThreatened,
          }),
        })
        const data = (await response.json()) as { summary?: string }

        if (response.ok && data.summary) {
          // Fetch current raw_data to preserve existing fields
          const finding = findings.find((f) => f.id === species.findingId)
          const existingRawData = (finding?.raw_data as Record<string, unknown>) || {}

          await updateFinding.mutateAsync({
            findingId: species.findingId,
            projectId,
            // Step 3 deep research output — does NOT change Step 2 core data,
            // so don't cascade Step 3 itself into needs_review.
            skipCascade: true,
            updates: {
              raw_data: {
                ...existingRawData,
                deepResearch: {
                  aiAnalysis: data.summary,
                  generatedAt: new Date().toISOString(),
                },
              } as unknown as Json,
            },
          })
        }

        completed++
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${species.scientificName}`,
          description: 'Skipping and continuing with next species.',
        })
        completed++
      }
    }

    setBatchProgress(null)
    toast({
      title: 'Batch research complete',
      description: `${completed} species researched.`,
    })
  }, [unresearchedSpecies, findings, projectId, updateFinding, toast])

  const handleBatchResearchAquatic = React.useCallback(async () => {
    if (unresearchedAquatic.length === 0) return

    setBatchProgress({
      running: true,
      current: 0,
      total: unresearchedAquatic.length,
      currentSite: '',
    })

    const userId = roleUser?.id || ''

    let completed = 0
    for (const aquatic of unresearchedAquatic) {
      setBatchProgress({
        running: true,
        current: completed + 1,
        total: unresearchedAquatic.length,
        currentSite: aquatic.waterBodyName,
      })

      try {
        const response = await fetch('/api/ai/aquatic-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waterBodyName: aquatic.waterBodyName,
            waterBodyType: aquatic.waterBodyType,
            waterBodyCode: aquatic.waterBodyCode,
            wfdStatus: aquatic.wfdStatus,
            catchmentName: aquatic.catchmentName,
            catchmentId: aquatic.catchmentId,
            projectLat: projectCenter?.lat,
            projectLng: projectCenter?.lng,
          }),
        })
        const data = (await response.json()) as {
          summary?: string
          wfdData?: Record<string, unknown>
          linkedSACs?: Array<Record<string, unknown>>
        }

        if (response.ok) {
          const bestMatch = data.linkedSACs?.[0]
          const wfd = data.wfdData as
            | {
                currentStatus?: string
                risk?: string
                statusHistory?: unknown[]
                trends?: unknown[]
                failures?: unknown[]
                connectivity?: unknown[]
                catchmentName?: string
                subCatchmentName?: string
              }
            | undefined

          await saveAquaticResearch({
            project_id: projectId,
            finding_id: aquatic.findingId,
            water_body_code: aquatic.waterBodyCode,
            water_body_name: aquatic.waterBodyName,
            water_body_type: aquatic.waterBodyType,
            current_status: wfd?.currentStatus || null,
            risk_level: wfd?.risk || null,
            status_history: (wfd?.statusHistory || []) as AquaticResearchStatusHistory[],
            trends: (wfd?.trends || []) as AquaticResearchTrend[],
            failures: (wfd?.failures || []) as AquaticResearchFailure[],
            connectivity: (wfd?.connectivity || []) as AquaticResearchConnectivity[],
            catchment_name: wfd?.catchmentName || aquatic.catchmentName || null,
            sub_catchment_name: wfd?.subCatchmentName || null,
            river_basin_district: null,
            linked_sac_code: (bestMatch?.siteCode as string) || null,
            linked_sac_name: (bestMatch?.siteName as string) || null,
            linked_sac_match_score: (bestMatch?.matchScore as number) || null,
            linked_sac_habitats: (bestMatch?.aquaticHabitats || []) as AquaticResearchHabitat[],
            linked_sac_species: (bestMatch?.aquaticSpecies || []) as AquaticResearchSpecies[],
            ai_analysis: data.summary || null,
            researched_by: userId,
          })
        }

        completed++
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${aquatic.waterBodyName}`,
          description: 'Skipping and continuing with next water body.',
        })
        completed++
      }
    }

    // Invalidate aquatic-research query so the UI updates
    queryClient.invalidateQueries({ queryKey: ['aquatic-research', projectId] })

    setBatchProgress(null)
    toast({
      title: 'Batch research complete',
      description: `${completed} water bodies researched.`,
    })
  }, [unresearchedAquatic, projectId, projectCenter, queryClient, toast, roleUser?.id])

  const markSingleStart = React.useCallback((id: string) => {
    setSingleResearchingIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const markSingleEnd = React.useCallback((id: string) => {
    setSingleResearchingIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleResearchSingleSite = React.useCallback(
    async (site: UnresearchedSite) => {
      markSingleStart(site.findingId)
      try {
        const response = await fetch('/api/ai/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteCode: site.siteCode,
            siteName: site.siteName,
            siteType: site.siteType,
          }),
        })
        const data = (await response.json()) as { summary?: string }

        const excelData = getNPWSSiteData(site.siteCode)
        const habitatList =
          excelData?.habitats?.map((h) => ({ habitatCode: h.code, habitatName: h.name })) || []
        const habitatsWithArticle17 = habitatList.map((h) => ({
          ...h,
          article17: getArticle17Data(h.habitatCode),
        }))
        const habitatCodes = habitatList.map((h) => h.habitatCode)
        const summary = getHabitatsSummary(habitatCodes)

        const allPressures = new Set<string>()
        const allThreats = new Set<string>()
        habitatsWithArticle17.forEach((h) => {
          h.article17?.pressures.forEach((p: string) => allPressures.add(p))
          h.article17?.threats.forEach((t: string) => allThreats.add(t))
        })

        await saveResearch.mutateAsync({
          project_id: projectId,
          finding_id: site.findingId,
          site_code: site.siteCode,
          site_name: site.siteName,
          site_type: site.siteType,
          habitats: habitatsWithArticle17.map((h) => ({
            habitatCode: h.habitatCode,
            habitatName: h.habitatName,
            status: h.article17?.status,
            trend: h.article17?.trend,
            priorityHabitat: h.article17?.priorityHabitat,
          })),
          conservation_summary: {
            total: summary.total,
            favourable: summary.favourable,
            unfavourableInadequate: summary.unfavourableInadequate,
            unfavourableBad: summary.unfavourableBad,
            improving: summary.improving,
            declining: summary.declining,
            priorityCount: summary.priorityCount,
          },
          threats_pressures: {
            pressures: Array.from(allPressures),
            threats: Array.from(allThreats),
          },
          ai_analysis: response.ok ? data.summary || null : null,
        })

        toast({ title: 'Researched', description: site.siteName })
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${site.siteName}`,
          description: 'Try again or use the batch button.',
        })
      } finally {
        markSingleEnd(site.findingId)
      }
    },
    [projectId, saveResearch, toast, markSingleStart, markSingleEnd]
  )

  const handleResearchSingleSpecies = React.useCallback(
    async (species: UnresearchedSpecies) => {
      markSingleStart(species.findingId)
      try {
        const response = await fetch('/api/ai/species-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scientificName: species.scientificName,
            commonName: species.commonName,
            recordCount: species.recordCount,
            designations: species.designations,
            taxonGroup: species.taxonGroup,
            isProtected: species.isProtected,
            isInvasive: species.isInvasive,
            isThreatened: species.isThreatened,
          }),
        })
        const data = (await response.json()) as { summary?: string }

        if (response.ok && data.summary) {
          const finding = findings.find((f) => f.id === species.findingId)
          const existingRawData = (finding?.raw_data as Record<string, unknown>) || {}

          await updateFinding.mutateAsync({
            findingId: species.findingId,
            projectId,
            // Step 3 deep research output — does NOT change Step 2 core data,
            // so don't cascade Step 3 itself into needs_review.
            skipCascade: true,
            updates: {
              raw_data: {
                ...existingRawData,
                deepResearch: {
                  aiAnalysis: data.summary,
                  generatedAt: new Date().toISOString(),
                },
              } as unknown as Json,
            },
          })
          toast({ title: 'Researched', description: species.scientificName })
        } else {
          toast({
            variant: 'destructive',
            title: `Failed: ${species.scientificName}`,
            description: 'Try again or use the batch button.',
          })
        }
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${species.scientificName}`,
          description: 'Try again or use the batch button.',
        })
      } finally {
        markSingleEnd(species.findingId)
      }
    },
    [findings, projectId, updateFinding, toast, markSingleStart, markSingleEnd]
  )

  const handleResearchSingleAquatic = React.useCallback(
    async (aquatic: UnresearchedAquatic) => {
      markSingleStart(aquatic.findingId)
      const userId = roleUser?.id || ''
      try {
        const response = await fetch('/api/ai/aquatic-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waterBodyName: aquatic.waterBodyName,
            waterBodyType: aquatic.waterBodyType,
            waterBodyCode: aquatic.waterBodyCode,
            wfdStatus: aquatic.wfdStatus,
            catchmentName: aquatic.catchmentName,
            catchmentId: aquatic.catchmentId,
            projectLat: projectCenter?.lat,
            projectLng: projectCenter?.lng,
          }),
        })
        const data = (await response.json()) as {
          summary?: string
          wfdData?: Record<string, unknown>
          linkedSACs?: Array<Record<string, unknown>>
        }

        if (response.ok) {
          const bestMatch = data.linkedSACs?.[0]
          const wfd = data.wfdData as
            | {
                currentStatus?: string
                risk?: string
                statusHistory?: unknown[]
                trends?: unknown[]
                failures?: unknown[]
                connectivity?: unknown[]
                catchmentName?: string
                subCatchmentName?: string
              }
            | undefined

          await saveAquaticResearch({
            project_id: projectId,
            finding_id: aquatic.findingId,
            water_body_code: aquatic.waterBodyCode,
            water_body_name: aquatic.waterBodyName,
            water_body_type: aquatic.waterBodyType,
            current_status: wfd?.currentStatus || null,
            risk_level: wfd?.risk || null,
            status_history: (wfd?.statusHistory || []) as AquaticResearchStatusHistory[],
            trends: (wfd?.trends || []) as AquaticResearchTrend[],
            failures: (wfd?.failures || []) as AquaticResearchFailure[],
            connectivity: (wfd?.connectivity || []) as AquaticResearchConnectivity[],
            catchment_name: wfd?.catchmentName || aquatic.catchmentName || null,
            sub_catchment_name: wfd?.subCatchmentName || null,
            river_basin_district: null,
            linked_sac_code: (bestMatch?.siteCode as string) || null,
            linked_sac_name: (bestMatch?.siteName as string) || null,
            linked_sac_match_score: (bestMatch?.matchScore as number) || null,
            linked_sac_habitats: (bestMatch?.aquaticHabitats || []) as AquaticResearchHabitat[],
            linked_sac_species: (bestMatch?.aquaticSpecies || []) as AquaticResearchSpecies[],
            ai_analysis: data.summary || null,
            researched_by: userId,
          })

          queryClient.invalidateQueries({ queryKey: ['aquatic-research', projectId] })
          toast({ title: 'Researched', description: aquatic.waterBodyName })
        } else {
          toast({
            variant: 'destructive',
            title: `Failed: ${aquatic.waterBodyName}`,
            description: 'Try again or use the batch button.',
          })
        }
      } catch {
        toast({
          variant: 'destructive',
          title: `Failed: ${aquatic.waterBodyName}`,
          description: 'Try again or use the batch button.',
        })
      } finally {
        markSingleEnd(aquatic.findingId)
      }
    },
    [projectId, projectCenter, queryClient, toast, roleUser?.id, markSingleStart, markSingleEnd]
  )

  return {
    researchResults,
    aquaticResults,
    speciesWithResearch,
    habitatsWithResearch,
    totalResearched,
    isLoading: isLoading || aquaticLoading,
    batchProgress,
    boundary,
    bufferDistances,
    otherBoundaries,
    allBoundaries,
    mapFindings,
    unresearchedSites,
    unresearchedSpecies,
    unresearchedAquatic,
    resultsByType,
    handleBatchResearch,
    handleBatchResearchSpecies,
    handleBatchResearchAquatic,
    singleResearchingIds,
    handleResearchSingleSite,
    handleResearchSingleSpecies,
    handleResearchSingleAquatic,
  }
}
