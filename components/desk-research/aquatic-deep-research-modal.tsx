'use client'

import * as React from 'react'
import {
  Droplets,
  MapPin,
  Sparkles,
  Info,
  AlertTriangle,
  Link2,
  FileText,
  Waves,
  Activity,
  Shield,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useWaterBodyResearch } from '@/hooks/queries/use-deep-research-hooks'
import { saveAquaticResearch } from '@/lib/supabase/queries/aquatic-research'
import { DeepResearchShell, AiAnalysisCard, ResourceLinkCard } from './deep-research-shell'
import type { AquaticResearchResult } from './aquatic-research/aquatic-types'
import { WFD_STATUS_COLORS, WATER_BODY_ICONS } from './aquatic-research/aquatic-types'
import { WfdTab } from './aquatic-research/wfd-tab'
import { SacTab } from './aquatic-research/sac-tab'

export type { AquaticDeepResearchSite } from './aquatic-research/aquatic-types'

interface AquaticDeepResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: {
    waterBodyName: string
    waterBodyType: 'River' | 'Lake' | 'Catchment'
    waterBodyCode?: string
    wfdStatus?: string
    catchmentName?: string
    catchmentId?: string
    distance?: number
    areaHa?: number
    lengthKm?: number
  } | null
  projectId: string
  projectCenter?: { lat: number; lng: number }
  userId: string
  findingId?: string | null
  existingAnalysis?: string
  onSaveAnalysis?: (data: { aiAnalysis: string; waterBodyCode: string }) => void
}

export function AquaticDeepResearchModal({
  open,
  onOpenChange,
  site,
  projectId,
  projectCenter,
  userId,
  findingId,
  existingAnalysis,
  onSaveAnalysis,
}: AquaticDeepResearchModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)
  const [result, setResult] = React.useState<AquaticResearchResult | null>(null)
  const [aiError, setAiError] = React.useState<string | null>(null)

  // Track auto-start to prevent duplicate triggers
  const hasTriggeredRef = React.useRef<string | null>(null)

  // Check for existing research in DB
  const { data: existingDbResearch } = useWaterBodyResearch(
    projectId,
    site?.waterBodyCode || site?.waterBodyName || ''
  )

  // Determine cached analysis: prefer prop, fallback to DB
  const cachedAnalysis = existingAnalysis || existingDbResearch?.ai_analysis || undefined

  // Reset when site changes — restore from cache if available
  React.useEffect(() => {
    setAiError(null)
    setIsLoading(false)

    if (cachedAnalysis) {
      // Build a minimal result from cached analysis so the UI renders
      setResult((prev) =>
        prev
          ? prev
          : {
              summary: cachedAnalysis,
              linkedSACs: [],
              wfdData: null,
              resources: {
                catchmentsUrl: 'https://www.catchments.ie',
                epaWaterMapUrl: 'https://gis.epa.ie/EPAMaps/Water',
                hydroNetUrl: 'https://www.hydronet.ie',
                wfdDataUrl: 'https://wfd.edenireland.ie',
              },
            }
      )
      setIsSaved(true)
      hasTriggeredRef.current = site?.waterBodyName || null
    } else {
      setResult(null)
      setIsSaved(false)
      hasTriggeredRef.current = null
    }
  }, [site?.waterBodyName, cachedAnalysis])

  // Handle save research
  const handleSaveResearch = async () => {
    if (!result || !site) return

    setIsSaving(true)
    try {
      const bestMatch = result.linkedSACs?.[0]

      await saveAquaticResearch({
        project_id: projectId,
        finding_id: findingId || null,
        water_body_code: site.waterBodyCode || site.waterBodyName,
        water_body_name: site.waterBodyName,
        water_body_type: site.waterBodyType,
        current_status: result.wfdData?.currentStatus || null,
        risk_level: result.wfdData?.risk || null,
        status_history: result.wfdData?.statusHistory || [],
        trends: result.wfdData?.trends || [],
        failures: result.wfdData?.failures || [],
        connectivity: result.wfdData?.connectivity || [],
        catchment_name: result.wfdData?.catchmentName || site.catchmentName || null,
        sub_catchment_name: result.wfdData?.subCatchmentName || null,
        river_basin_district: null,
        linked_sac_code: bestMatch?.siteCode || null,
        linked_sac_name: bestMatch?.siteName || null,
        linked_sac_match_score: bestMatch?.matchScore || null,
        linked_sac_habitats: bestMatch?.aquaticHabitats || [],
        linked_sac_species: bestMatch?.aquaticSpecies || [],
        ai_analysis: result.summary || null,
        researched_by: userId,
      })

      setIsSaved(true)

      // Notify parent to update finding card
      if (result.summary && site) {
        onSaveAnalysis?.({
          aiAnalysis: result.summary,
          waterBodyCode: site.waterBodyCode || site.waterBodyName,
        })
      }
    } catch (error) {
      console.error('Error saving aquatic research:', error)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save research data. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const fetchResearch = React.useCallback(async () => {
    if (!site) return

    setIsLoading(true)
    setAiError(null)
    try {
      const response = await fetch('/api/ai/aquatic-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waterBodyName: site.waterBodyName,
          waterBodyType: site.waterBodyType,
          waterBodyCode: site.waterBodyCode,
          wfdStatus: site.wfdStatus,
          catchmentName: site.catchmentName,
          catchmentId: site.catchmentId,
          projectLat: projectCenter?.lat,
          projectLng: projectCenter?.lng,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch research')
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Aquatic research error:', error)
      setAiError('Could not generate aquatic research. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [site, projectCenter])

  // Auto-start research when modal opens
  React.useEffect(() => {
    if (
      open &&
      site?.waterBodyName &&
      !result &&
      !isLoading &&
      !cachedAnalysis &&
      hasTriggeredRef.current !== site.waterBodyName
    ) {
      hasTriggeredRef.current = site.waterBodyName
      fetchResearch()
    }
  }, [open, site?.waterBodyName, result, isLoading, cachedAnalysis, fetchResearch])

  if (!site) {
    return null
  }

  const WaterBodyIcon = WATER_BODY_ICONS[site.waterBodyType] || Droplets
  const bestMatch = result?.linkedSACs?.[0]

  // --- Tab content ---

  const overviewTab = (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-cyan-600">{site.waterBodyType}</div>
            <p className="text-muted-foreground text-xs">Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {result?.wfdData?.currentStatus || site.wfdStatus || '—'}
            </div>
            <p className="text-muted-foreground text-xs">WFD Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">
              {site.lengthKm
                ? `${site.lengthKm.toFixed(1)} km`
                : site.areaHa
                  ? `${site.areaHa.toFixed(0)} ha`
                  : '—'}
            </div>
            <p className="text-muted-foreground text-xs">
              {site.lengthKm ? 'Length' : site.areaHa ? 'Area' : 'Size'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Water Body Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Water Body Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">Name:</span>
              <p className="font-medium">{site.waterBodyName}</p>
            </div>
            {site.catchmentName && (
              <div>
                <span className="text-muted-foreground text-xs">Catchment:</span>
                <p className="font-medium">{site.catchmentName}</p>
              </div>
            )}
            {site.waterBodyCode && (
              <div>
                <span className="text-muted-foreground text-xs">EPA Code:</span>
                <p className="font-medium">{site.waterBodyCode}</p>
              </div>
            )}
            {site.lengthKm && (
              <div>
                <span className="text-muted-foreground text-xs">Length:</span>
                <p className="font-medium">{site.lengthKm.toFixed(1)} km</p>
              </div>
            )}
            {site.areaHa && (
              <div>
                <span className="text-muted-foreground text-xs">Area:</span>
                <p className="font-medium">{site.areaHa.toFixed(1)} ha</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked SAC Preview */}
      {bestMatch && (
        <Card className="border-cyan-200 bg-cyan-50/50">
          <CardContent className="flex items-start gap-2 pt-4">
            <Link2 className="h-4 w-4 shrink-0 text-cyan-600" />
            <div className="text-sm">
              <p className="font-medium text-cyan-700">{bestMatch.siteName}</p>
              <p className="text-muted-foreground text-xs">
                {bestMatch.siteCode} • Match: {bestMatch.matchScore}%
                {bestMatch.aquaticSpecies.length > 0 &&
                  ` • ${bestMatch.aquaticSpecies.length} aquatic species`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!bestMatch && !isLoading && result && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-2 pt-4">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">No Linked SAC Found</p>
              <p className="text-muted-foreground">
                This water body is not directly linked to a known Natura 2000 SAC. It may still
                support protected species or connect downstream.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WFD Note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Water Framework Directive</p>
              <p className="mt-1 text-xs text-amber-700">
                Under the WFD, developments must not cause deterioration of water body status.
                Projects near watercourses should include Construction Environmental Management
                Plans (CEMP) with pollution prevention measures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )

  const aiTab = (
    <>
      <AiAnalysisCard
        summary={result?.summary || ''}
        isLoading={isLoading}
        error={aiError}
        onGenerate={fetchResearch}
        headerBadges={
          <>
            {bestMatch && (
              <Badge variant="outline" className="border-cyan-300 text-[10px] text-cyan-700">
                SAC linked
              </Badge>
            )}
            {result?.wfdData && (
              <Badge variant="outline" className="border-blue-300 text-[10px] text-blue-700">
                WFD enriched
              </Badge>
            )}
          </>
        }
        emptyTitle="AI-Powered Aquatic Analysis"
        emptyDescription="Generates a detailed ecological report including WFD assessment, SAC connections, and development implications."
        loadingText="Generating Ecological Analysis..."
      />

      {/* Data sources info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-3 pb-3">
          <p className="text-muted-foreground text-[10px] font-medium">Data Sources:</p>
          <ul className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
            <li>{result?.wfdData ? '✓ Catchments.ie WFD data' : '○ Catchments.ie WFD data'}</li>
            <li>{bestMatch ? `✓ Linked SAC: ${bestMatch.siteName}` : '○ SAC matching'}</li>
            <li>✓ EPA Water Quality data</li>
          </ul>
        </CardContent>
      </Card>
    </>
  )

  const resourcesTab = (
    <>
      <p className="text-muted-foreground text-sm">External resources for this water body:</p>

      {result?.resources.sacUrl && (
        <ResourceLinkCard
          href={result.resources.sacUrl}
          icon={
            <div className="rounded-lg bg-emerald-100 p-2">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
          }
          title="NPWS Site Synopsis"
          description="Linked SAC site information"
        />
      )}

      {result?.resources.sscoUrl && (
        <ResourceLinkCard
          href={result.resources.sscoUrl}
          icon={
            <div className="rounded-lg bg-purple-100 p-2">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
          }
          title="SSCO Document (PDF)"
          description="Site-Specific Conservation Objectives"
          borderColor="border-purple-200"
        />
      )}

      {result?.resources.waterBodyUrl && (
        <ResourceLinkCard
          href={result.resources.waterBodyUrl}
          icon={
            <div className="rounded-lg bg-blue-100 p-2">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          }
          title="Catchments.ie"
          description="Full WFD data for this water body"
        />
      )}

      <ResourceLinkCard
        href="https://gis.epa.ie/EPAMaps/Water"
        icon={
          <div className="rounded-lg bg-cyan-100 p-2">
            <Waves className="h-4 w-4 text-cyan-600" />
          </div>
        }
        title="EPA Water Maps"
        description="Interactive water quality maps"
      />

      <ResourceLinkCard
        href="https://www.catchments.ie"
        icon={
          <div className="rounded-lg bg-blue-100 p-2">
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
        }
        title="Catchments.ie Portal"
        description="WFD data dashboards and catchment info"
      />

      <ResourceLinkCard
        href="https://www.hydronet.ie"
        icon={
          <div className="rounded-lg bg-gray-100 p-2">
            <Activity className="h-4 w-4 text-gray-600" />
          </div>
        }
        title="HydroNet"
        description="Water levels & flow data"
      />
    </>
  )

  return (
    <DeepResearchShell
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={
        <div className="rounded-lg bg-cyan-100 p-2">
          <WaterBodyIcon className="h-5 w-5 text-cyan-600" />
        </div>
      }
      title={site.waterBodyName}
      headerBadges={
        <>
          <Badge variant="outline" className="text-xs">
            {site.waterBodyType}
          </Badge>
          {site.waterBodyCode && (
            <span className="text-muted-foreground text-xs">Code: {site.waterBodyCode}</span>
          )}
          {site.wfdStatus && (
            <Badge
              variant="outline"
              className={`text-xs ${WFD_STATUS_COLORS[site.wfdStatus] || ''}`}
            >
              WFD: {site.wfdStatus}
            </Badge>
          )}
          {site.distance !== undefined && (
            <Badge variant="secondary" className="text-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {site.distance === 0 ? 'Within boundary' : `${site.distance.toFixed(1)} km`}
            </Badge>
          )}
        </>
      }
      tabs={[
        { value: 'overview', label: 'Overview', content: overviewTab },
        {
          value: 'wfd',
          label: (
            <>
              <Activity className="mr-1 h-3 w-3" />
              WFD
            </>
          ),
          content: (
            <WfdTab wfdData={result?.wfdData || null} isLoading={isLoading} result={result} />
          ),
        },
        {
          value: 'ai',
          label: (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              AI
            </>
          ),
          content: aiTab,
        },
        {
          value: 'sac',
          label: (
            <>
              <Link2 className="mr-1 h-3 w-3" />
              SAC
            </>
          ),
          content: (
            <SacTab
              bestMatch={bestMatch}
              linkedSACs={result?.linkedSACs || []}
              isLoading={isLoading}
            />
          ),
        },
        { value: 'resources', label: 'Links', content: resourcesTab },
      ]}
      footerInfo="Data: EPA + Catchments.ie + NPWS"
      isSaved={isSaved}
      isSaving={isSaving}
      canSave={!!result}
      onSave={handleSaveResearch}
    />
  )
}
