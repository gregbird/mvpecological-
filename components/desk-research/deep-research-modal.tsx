'use client'

import * as React from 'react'
import {
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Target,
  Bird,
  Bug,
  FileText,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getArticle17Data,
  getStatusDisplay,
  getHabitatsSummary,
} from '@/lib/data/article17-habitats'
import { getNPWSSiteData, type NPWSSiteData } from '@/lib/data/npws-site-lookup'
import { useSaveDeepResearch, useSiteDeepResearch } from '@/hooks/queries/use-deep-research-hooks'
import { useToast } from '@/hooks/use-toast'
import { DeepResearchShell, AiAnalysisCard, ResourceLinkCard } from './deep-research-shell'
import { getNPWSUrls, getProtectionDescription } from './deep-research/npws-helpers'
import { StatusTab } from './deep-research/status-tab'
import { HabitatsTab } from './deep-research/habitats-tab'

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

    // If we have existing research in DB, restore AI analysis from it
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

  // AI Analysis handler - fetches SSCO/Synopsis PDF and generates detailed summary
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
        // Also update scraped info from AI response if not already fetched
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

  // Auto-start AI analysis when modal opens (skip if existing research is cached)
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

  // Get Excel-derived site data (habitats, species, SSCO URL)
  const excelData: NPWSSiteData | null = getNPWSSiteData(site.siteCode)

  // Merge habitats: prefer Excel data, fallback to site.habitats
  const mergedHabitats =
    excelData?.habitats?.map((h) => ({
      habitatCode: h.code,
      habitatName: h.name,
    })) ||
    site.habitats ||
    []

  // Get species from Excel
  const siteSpecies = excelData?.species || []
  const birdSpecies = excelData?.birdSpecies || []

  const urls = getNPWSUrls(site.siteCode, site.siteType)
  const protectionDesc = getProtectionDescription(site.siteType)

  // Get Article 17 data for each habitat
  const habitatsWithArticle17 = mergedHabitats.map((h) => ({
    ...h,
    article17: getArticle17Data(h.habitatCode),
  }))

  // Calculate summary
  const habitatCodes = mergedHabitats.map((h) => h.habitatCode)
  const summary = getHabitatsSummary(habitatCodes)

  // Collect all unique threats and pressures
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

      // Notify parent to update finding's raw_data with deep research
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

  // --- Tab content ---

  const overviewTab = (
    <>
      {/* Protection Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-emerald-600" />
            Protection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{protectionDesc}</p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">
              {mergedHabitats.length || '—'}
            </div>
            <p className="text-muted-foreground text-xs">
              {excelData?.siteType === 'SAC' ? 'Annex I Habitats' : 'Qualifying Habitats'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {siteSpecies.length + birdSpecies.length || '—'}
            </div>
            <p className="text-muted-foreground text-xs">
              {birdSpecies.length > 0 ? 'Bird SCIs' : 'Annex II Species'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {excelData?.siteArea
                ? `${excelData.siteArea.toFixed(0)} ha`
                : site.areaHa
                  ? `${site.areaHa.toFixed(0)} ha`
                  : '—'}
            </div>
            <p className="text-muted-foreground text-xs">Site Area</p>
          </CardContent>
        </Card>
      </div>

      {/* Habitat & Species Lists */}
      {(mergedHabitats.length > 0 || siteSpecies.length > 0 || birdSpecies.length > 0) && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {mergedHabitats.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500" />
                  Annex I Habitats
                </p>
                <div className="space-y-1.5">
                  {mergedHabitats.map((h, idx) => {
                    const a17 = getArticle17Data(h.habitatCode)
                    const statusDisplay = a17 ? getStatusDisplay(a17.status) : null
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {h.habitatCode}
                          </Badge>
                          {statusDisplay && (
                            <Badge
                              className={`shrink-0 text-[10px] ${statusDisplay.bgColor} ${statusDisplay.color} border-0`}
                            >
                              {statusDisplay.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                          {h.habitatName}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {siteSpecies.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <Bug className="h-3.5 w-3.5 text-amber-600" />
                  Annex II Species
                </p>
                <div className="flex flex-wrap gap-1">
                  {siteSpecies.map((s, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px]">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {birdSpecies.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <Bird className="h-3.5 w-3.5 text-blue-600" />
                  Bird SCIs
                </p>
                <div className="flex flex-wrap gap-1">
                  {birdSpecies.map((b, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px]">
                      {b.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Qualifying Interests from NPWS (NHA/pNHA scraped data) */}
      {scrapedInfo?.qualifyingInterests &&
        scrapedInfo.qualifyingInterests.length > 0 &&
        mergedHabitats.length === 0 && (
          <Card>
            <CardContent className="space-y-2 pt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                <Leaf className="h-3.5 w-3.5 text-emerald-500" />
                Qualifying Interests
                <Badge variant="outline" className="text-[10px]">
                  NPWS
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {scrapedInfo.qualifyingInterests.map((qi, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px]">
                    {qi}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* AA Screening Note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Appropriate Assessment Consideration
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {site.siteType === 'SAC' || site.siteType === 'SPA'
                  ? 'This is a Natura 2000 site. Any plan or project likely to have significant effects must undergo Appropriate Assessment screening under Article 6(3) of the Habitats Directive.'
                  : 'While not a Natura 2000 site, ecological connectivity to European sites should be considered in planning applications.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )

  const aiAnalysisTab = (
    <>
      <AiAnalysisCard
        summary={aiSummary}
        isLoading={aiLoading}
        error={aiError}
        onGenerate={handleAiAnalysis}
        headerBadges={
          <>
            {aiMeta.hadPdfContent && (
              <Badge variant="outline" className="text-[10px]">
                {site.siteType === 'NHA' || site.siteType === 'pNHA'
                  ? 'Synopsis PDF analysed'
                  : 'SSCO PDF analysed'}
              </Badge>
            )}
            {aiMeta.hadNbdcData && (
              <Badge variant="outline" className="border-emerald-300 text-[10px] text-emerald-700">
                NBDC enriched
              </Badge>
            )}
          </>
        }
        emptyTitle="AI-Powered Conservation Analysis"
        emptyDescription="Analyses the SSCO PDF document and Excel data to provide a detailed conservation summary including habitats, species, threats, and development implications."
        emptyExtra={
          excelData?.sscoUrl ? (
            <p className="mt-1 text-[10px] text-purple-500">SSCO PDF available for this site</p>
          ) : undefined
        }
        loadingText={`Analysing${excelData?.sscoUrl ? ' PDF...' : '...'}`}
      />

      {/* Data sources info */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-3 pb-3">
          <p className="text-muted-foreground text-[10px] font-medium">Data Sources:</p>
          <ul className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
            <li>
              {excelData
                ? '✓ NPWS Official Datasheet (May 2024)'
                : site.siteType === 'NHA' || site.siteType === 'pNHA'
                  ? '○ No Excel datasheet (NHA/pNHA)'
                  : '✗ Site not found in NPWS datasheet'}
            </li>
            <li>
              {excelData?.sscoUrl
                ? '✓ SSCO PDF available for AI analysis'
                : site.siteType === 'NHA' || site.siteType === 'pNHA'
                  ? (aiMeta.hadPdfContent ? '✓' : '○') + ' Synopsis PDF (NPWS)'
                  : '✗ No SSCO PDF available'}
            </li>
            <li>
              {aiMeta.hadNbdcData
                ? '✓ NBDC species records & protection status'
                : '○ NBDC species enrichment'}
            </li>
            {(site.siteType === 'SAC' || site.siteType === 'SPA') && (
              <li>✓ Article 17 (2025) Conservation Status</li>
            )}
            {aiMeta.hadWebContent && <li>✓ NPWS web page scraped</li>}
          </ul>
        </CardContent>
      </Card>
    </>
  )

  const resourcesTab = (
    <>
      <p className="text-muted-foreground text-sm">
        Official NPWS documents and resources for this site:
      </p>

      <ResourceLinkCard
        href={urls.synopsis}
        icon={
          <div className="rounded-lg bg-blue-100 p-2">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
        }
        title="Site Synopsis"
        description="Overview, location, and ecological description"
      />

      {(site.siteType === 'SAC' || site.siteType === 'SPA') && (
        <ResourceLinkCard
          href={urls.conservationObjectives}
          icon={
            <div className="rounded-lg bg-emerald-100 p-2">
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
          }
          title="Conservation Objectives"
          description="Site-specific targets and attributes"
        />
      )}

      {(site.siteType === 'NHA' || site.siteType === 'pNHA') && (
        <ResourceLinkCard
          href={urls.synopsisPdf}
          icon={
            <div className="rounded-lg bg-emerald-100 p-2">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
          }
          title="Site Synopsis (PDF)"
          description="NPWS site synopsis document"
          borderColor="border-emerald-200"
        />
      )}

      {excelData?.sscoUrl && (
        <ResourceLinkCard
          href={excelData.sscoUrl}
          icon={
            <div className="rounded-lg bg-purple-100 p-2">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
          }
          title={`SSCO Document (PDF)${excelData.sscoVersion ? ` v${excelData.sscoVersion}` : ''}`}
          description="Site-Specific Conservation Objectives - official PDF"
          borderColor="border-purple-200"
        />
      )}

      {(excelData?.siUrl || scrapedInfo?.statutoryInstrumentUrl) && (
        <ResourceLinkCard
          href={excelData?.siUrl || scrapedInfo?.statutoryInstrumentUrl || '#'}
          icon={
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
              <Shield className="h-4 w-4 text-gray-600" />
            </div>
          }
          title={`Statutory Instrument${excelData?.siNumber ? ` S.I. ${excelData.siNumber}` : ''}`}
          description="Legal designation instrument - Irish Statute Book"
        />
      )}

      {site.siteType === 'SAC' && (
        <ResourceLinkCard
          href={urls.article17}
          icon={
            <div className="rounded-lg bg-purple-100 p-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
            </div>
          }
          title="Article 17 Reports (2025)"
          description="National conservation status assessments"
        />
      )}

      <ResourceLinkCard
        href={urls.siteMap}
        icon={
          <div className="rounded-lg bg-orange-100 p-2">
            <MapPin className="h-4 w-4 text-orange-600" />
          </div>
        }
        title="NPWS Map Viewer"
        description="Interactive maps and spatial data"
      />
    </>
  )

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
      tabs={[
        { value: 'overview', label: 'Overview', content: overviewTab },
        {
          value: 'ai-analysis',
          label: (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              AI
            </>
          ),
          content: aiAnalysisTab,
        },
        {
          value: 'status',
          label: 'Status',
          content: (
            <StatusTab
              summary={summary}
              habitatsWithArticle17={habitatsWithArticle17}
              allPressures={allPressures}
              allThreats={allThreats}
            />
          ),
        },
        {
          value: 'habitats',
          label: `QIs (${mergedHabitats.length + siteSpecies.length + birdSpecies.length})`,
          content: (
            <HabitatsTab
              mergedHabitats={mergedHabitats}
              habitatsWithArticle17={habitatsWithArticle17}
              siteSpecies={siteSpecies}
              birdSpecies={birdSpecies}
              excelData={excelData}
            />
          ),
        },
        { value: 'resources', label: 'Links', content: resourcesTab },
      ]}
      footerInfo="Data: NPWS + NBDC + Article 17 (2025)"
      isSaved={isSaved}
      isSaving={saveResearch.isPending}
      canSave={!!projectId && !!aiSummary}
      onSave={handleSaveResearch}
    />
  )
}
