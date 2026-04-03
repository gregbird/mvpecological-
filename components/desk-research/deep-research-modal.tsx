'use client'

import * as React from 'react'
import { MapPin, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { getArticle17Data, getHabitatsSummary } from '@/lib/data/article17-habitats'
import { getNPWSSiteData, type NPWSSiteData } from '@/lib/data/npws-site-lookup'
import { useSaveDeepResearch, useSiteDeepResearch } from '@/hooks/queries/use-deep-research-hooks'
import { useToast } from '@/hooks/use-toast'
import { DeepResearchShell } from './deep-research-shell'
import { buildDeepResearchTabs } from './deep-research/deep-research-body'

export interface DeepResearchSite {
  siteCode: string
  siteName: string
  siteType: 'SAC' | 'SPA' | 'NHA' | 'pNHA'
  habitats?: Array<{
    habitatCode: string
    habitatName: string
  }>
  distance?: number
  areaHa?: number
}

interface DeepResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: DeepResearchSite | null
  projectId?: string
  userId?: string
  findingId?: string
  onSaveAnalysis?: (data: {
    aiAnalysis: string
    siteCode: string
    nbdcSpecies?: Array<{
      scientificName: string
      commonName?: string
      isProtected?: boolean
      isInvasive?: boolean
      designations?: string
    }>
    scrapedInfo?: {
      qualifyingInterests: string[]
      statutoryInstrumentUrl: string | null
    }
    article17Habitats?: Array<{
      habitatCode: string
      habitatName: string
      status?: string
      trend?: string
      priorityHabitat?: boolean
    }>
    conservationSummary?: {
      total: number
      favourable: number
      unfavourableInadequate: number
      unfavourableBad: number
    }
  }) => void
}

export function DeepResearchModal({
  open,
  onOpenChange,
  site,
  projectId,
  userId,
  findingId,
  onSaveAnalysis,
}: DeepResearchModalProps) {
  const { toast } = useToast()
  const saveResearch = useSaveDeepResearch()

  // AI analysis state
  const [aiSummary, setAiSummary] = React.useState<string>('')
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string>('')

  // AI response metadata
  const [aiMeta, setAiMeta] = React.useState<{
    hadPdfContent?: boolean
    hadWebContent?: boolean
    hadNbdcData?: boolean
    nbdcSpecies?: Array<{
      scientificName: string
      commonName?: string
      isProtected?: boolean
      isInvasive?: boolean
      designations?: string
    }>
  }>({})

  // Scraped NPWS page data (for NHA/pNHA without Excel data)
  const [scrapedInfo, setScrapedInfo] = React.useState<{
    qualifyingInterests: string[]
    statutoryInstrumentUrl: string | null
    county: string | null
  } | null>(null)

  // Check if already saved
  const { data: existingResearch } = useSiteDeepResearch(projectId || '', site?.siteCode || '')
  const isSaved = !!existingResearch

  // Reset state when site changes — restore from DB cache if available
  const hasTriggeredRef = React.useRef<string | null>(null)
  const hasFetchedScrapeRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    setAiLoading(false)
    setAiError('')
    setScrapedInfo(null)
    hasFetchedScrapeRef.current = null

    if (existingResearch?.ai_analysis) {
      setAiSummary(existingResearch.ai_analysis)
      hasTriggeredRef.current = site?.siteCode || null
    } else {
      setAiSummary('')
      hasTriggeredRef.current = null
    }
  }, [site?.siteCode, existingResearch?.ai_analysis])

  // Immediately scrape NPWS page for NHA/pNHA sites without Excel data
  React.useEffect(() => {
    if (
      open &&
      site?.siteCode &&
      (site.siteType === 'NHA' || site.siteType === 'pNHA') &&
      !getNPWSSiteData(site.siteCode) &&
      hasFetchedScrapeRef.current !== site.siteCode
    ) {
      hasFetchedScrapeRef.current = site.siteCode
      fetch('/api/npws/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteCode: site.siteCode, siteType: site.siteType }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setScrapedInfo(data)
        })
        .catch(() => {})
    }
  }, [open, site?.siteCode, site?.siteType])

  // AI Analysis handler
  const handleAiAnalysis = React.useCallback(async () => {
    if (!site?.siteCode) return
    setAiLoading(true)
    setAiError('')
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
      const data = await response.json()
      if (!response.ok) {
        setAiError(data.error || 'Failed to generate analysis')
      } else {
        setAiSummary(data.summary || '')
        setAiMeta({
          hadPdfContent: data.hadPdfContent,
          hadWebContent: data.hadWebContent,
          hadNbdcData: data.hadNbdcData,
          nbdcSpecies: data.nbdcSpecies,
        })
        if (data.scrapedSiteInfo) {
          setScrapedInfo((prev) => prev || data.scrapedSiteInfo)
        }
      }
    } catch {
      setAiError('Failed to connect to AI service')
    } finally {
      setAiLoading(false)
    }
  }, [site?.siteCode, site?.siteName, site?.siteType])

  // Auto-start AI analysis when modal opens
  React.useEffect(() => {
    if (
      open &&
      site?.siteCode &&
      !aiSummary &&
      !aiLoading &&
      !existingResearch?.ai_analysis &&
      hasTriggeredRef.current !== site.siteCode
    ) {
      hasTriggeredRef.current = site.siteCode
      handleAiAnalysis()
    }
  }, [open, site?.siteCode, aiSummary, aiLoading, existingResearch?.ai_analysis, handleAiAnalysis])

  if (!site) {
    return null
  }

  // Get Excel-derived site data
  const excelData: NPWSSiteData | null = getNPWSSiteData(site.siteCode)

  // Merge habitats: prefer Excel data, fallback to site.habitats
  const mergedHabitats =
    excelData?.habitats?.map((h) => ({ habitatCode: h.code, habitatName: h.name })) ||
    site.habitats ||
    []

  const siteSpecies = excelData?.species || []
  const birdSpecies = excelData?.birdSpecies || []

  // Get Article 17 data for each habitat
  const habitatsWithArticle17 = mergedHabitats.map((h) => ({
    ...h,
    article17: getArticle17Data(h.habitatCode),
  }))

  const habitatCodes = mergedHabitats.map((h) => h.habitatCode)
  const summary = getHabitatsSummary(habitatCodes)

  const allPressures = new Set<string>()
  const allThreats = new Set<string>()
  habitatsWithArticle17.forEach((h) => {
    h.article17?.pressures.forEach((p) => allPressures.add(p))
    h.article17?.threats.forEach((t) => allThreats.add(t))
  })

  // Save handler
  const handleSaveResearch = async () => {
    if (!projectId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Project ID is required to save research.',
      })
      return
    }

    try {
      await saveResearch.mutateAsync({
        project_id: projectId,
        finding_id: findingId || null,
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
        ai_analysis: aiSummary || null,
        researched_by: userId || null,
      })

      if (aiSummary) {
        onSaveAnalysis?.({
          aiAnalysis: aiSummary,
          siteCode: site.siteCode,
          nbdcSpecies: aiMeta.nbdcSpecies,
          scrapedInfo: scrapedInfo
            ? {
                qualifyingInterests: scrapedInfo.qualifyingInterests,
                statutoryInstrumentUrl: scrapedInfo.statutoryInstrumentUrl,
              }
            : undefined,
          article17Habitats: habitatsWithArticle17.map((h) => ({
            habitatCode: h.habitatCode,
            habitatName: h.habitatName,
            status: h.article17?.status,
            trend: h.article17?.trend,
            priorityHabitat: h.article17?.priorityHabitat,
          })),
          conservationSummary: {
            total: summary.total,
            favourable: summary.favourable,
            unfavourableInadequate: summary.unfavourableInadequate,
            unfavourableBad: summary.unfavourableBad,
          },
        })
      }
    } catch (error) {
      console.error('Failed to save research:', error)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save research results.',
      })
    }
  }

  const tabs = buildDeepResearchTabs({
    site,
    aiSummary,
    aiLoading,
    aiError,
    aiMeta,
    excelData,
    mergedHabitats,
    siteSpecies,
    birdSpecies,
    habitatsWithArticle17,
    summary,
    allPressures,
    allThreats,
    scrapedInfo,
    onGenerateAi: handleAiAnalysis,
  })

  return (
    <DeepResearchShell
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={
        <div className="rounded-lg bg-emerald-100 p-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
      }
      title={site.siteName}
      headerBadges={
        <>
          <Badge variant="outline" className="text-xs">
            {site.siteType}
          </Badge>
          <span className="text-muted-foreground text-xs">Site Code: {site.siteCode}</span>
          {site.distance !== undefined && site.distance !== null && (
            <Badge variant="secondary" className="text-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {site.distance === 0 ? 'Within site' : `${Number(site.distance).toFixed(1)} km`}
            </Badge>
          )}
        </>
      }
      tabs={tabs}
      footerInfo="Data: NPWS + NBDC + Article 17 (2025)"
      isSaved={isSaved}
      isSaving={saveResearch.isPending}
      canSave={!!projectId && !!aiSummary}
      onSave={handleSaveResearch}
    />
  )
}
