'use client'

import * as React from 'react'

import {
  useProjectDeepResearch,
  useSaveDeepResearch,
  useProjectAquaticResearch,
} from '@/hooks/queries/use-deep-research-hooks'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { getNPWSSiteData } from '@/lib/data/npws-site-lookup'
import { getArticle17Data, getHabitatsSummary } from '@/lib/data/article17-habitats'
import { useToast } from '@/hooks/use-toast'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import type { Project, DeskResearchFinding as DbFinding } from '@/types/database'
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

function toMapFindings(dbFindings: DbFinding[]): MapFinding[] {
  return dbFindings
    .filter((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      return raw?.geometry != null
    })
    .map((f) => {
      const raw = f.raw_data as Record<string, unknown>
      const geometry = raw.geometry as GeoJSON.Geometry
      return {
        id: f.id,
        source: f.source as MapFinding['source'],
        dataType: f.data_type as MapFinding['dataType'],
        title: f.title,
        content: f.content || undefined,
        rawData: raw,
        location: geometry,
        isSaved: true,
        notes: f.notes || undefined,
        metadata: {
          siteCode: raw.siteCode as string | undefined,
          siteType: raw.siteType as string | undefined,
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
  const { toast } = useToast()

  // Resolve the selected site so the map zooms to its boundary in single-site mode
  const selectedSite = React.useMemo(
    () => (siteId ? (projectSites.find((s) => s.id === siteId) ?? null) : null),
    [siteId, projectSites]
  )

  const { projectBoundary: boundary, bufferDistances } = useProjectBoundary(project, selectedSite)

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

  const mapFindings = React.useMemo(
    () =>
      toMapFindings(
        findings.filter((f) => {
          if (f.data_type !== 'designated_site') return false
          const raw = f.raw_data as Record<string, unknown> | null
          const siteCode = raw?.siteCode as string | undefined
          return siteCode ? researchedSiteCodes.has(siteCode) : false
        })
      ),
    [findings, researchedSiteCodes]
  )

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
    mapFindings,
    unresearchedSites,
    resultsByType,
    handleBatchResearch,
  }
}
