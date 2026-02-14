'use client'

import * as React from 'react'
import {
  Droplets,
  Fish,
  Leaf,
  MapPin,
  Sparkles,
  Info,
  AlertTriangle,
  Loader2,
  Link2,
  FileText,
  Waves,
  Mountain,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertCircle,
  ArrowRight,
  Clock,
  Shield,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useWaterBodyResearch } from '@/hooks/queries/use-deep-research-hooks'
import { saveAquaticResearch } from '@/lib/supabase/queries/aquatic-research'
import { DeepResearchShell, AiAnalysisCard, ResourceLinkCard } from './deep-research-shell'

export interface AquaticDeepResearchSite {
  waterBodyName: string
  waterBodyType: 'River' | 'Lake' | 'Catchment'
  waterBodyCode?: string
  wfdStatus?: string
  catchmentName?: string
  catchmentId?: string
  distance?: number
  areaHa?: number
  lengthKm?: number
}

interface LinkedSAC {
  siteCode: string
  siteName: string
  matchScore: number
  matchReason: string
  siteArea?: number
  sscoUrl?: string
  aquaticHabitats: Array<{ code: string; name: string; description: string }>
  aquaticSpecies: Array<{ code: string; name: string; commonName: string }>
  allHabitats: Array<{ code: string; name: string }>
  allSpecies: Array<{ code: string; name: string }>
}

interface WFDStatusHistory {
  period: string
  status: string
  details: string[]
}

interface WFDTrend {
  ParameterName: string
  TrendDesc: string
}

interface WFDFailure {
  Name: string
}

interface WFDConnectivity {
  Code: string
  Name: string
  Type: string
  Direction: 'Input' | 'Output'
}

interface WFDData {
  currentStatus?: string
  risk?: string
  statusHistory: WFDStatusHistory[]
  trends: WFDTrend[]
  failures: WFDFailure[]
  connectivity: WFDConnectivity[]
  catchmentName?: string
  subCatchmentName?: string
}

interface AquaticResearchResult {
  summary: string
  linkedSACs: LinkedSAC[]
  wfdData: WFDData | null
  resources: {
    catchmentsUrl: string
    epaWaterMapUrl: string
    hydroNetUrl: string
    wfdDataUrl: string
    waterBodyUrl?: string
    sacUrl?: string
    sscoUrl?: string
    siUrl?: string
  }
}

interface AquaticDeepResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: AquaticDeepResearchSite | null
  projectId: string
  userId: string
  findingId?: string | null
  existingAnalysis?: string
}

// WFD Status colors
const WFD_STATUS_COLORS: Record<string, string> = {
  High: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Good: 'bg-green-100 text-green-700 border-green-300',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  Poor: 'bg-orange-100 text-orange-700 border-orange-300',
  Bad: 'bg-red-100 text-red-700 border-red-300',
}

// Water body type icons
const WATER_BODY_ICONS: Record<string, React.ElementType> = {
  River: Waves,
  Lake: Droplets,
  Catchment: Mountain,
}

export function AquaticDeepResearchModal({
  open,
  onOpenChange,
  site,
  projectId,
  userId,
  findingId,
  existingAnalysis,
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
  }, [site])

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

  if (!site) return null

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
            <div className="text-2xl font-bold text-blue-600">{site.wfdStatus || '—'}</div>
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

  const wfdTab = (
    <>
      {result?.wfdData ? (
        <>
          {/* Current Status & Risk */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-blue-500" />
                WFD Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground text-xs">Current Status</span>
                  <div className="flex items-center gap-2">
                    <Badge className={WFD_STATUS_COLORS[result.wfdData.currentStatus || ''] || ''}>
                      {result.wfdData.currentStatus || 'Not Assessed'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Risk Level</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        result.wfdData.risk === 'At risk'
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : result.wfdData.risk === 'Not at risk'
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : ''
                      }
                    >
                      {result.wfdData.risk === 'At risk' && (
                        <AlertCircle className="mr-1 h-3 w-3" />
                      )}
                      {result.wfdData.risk || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              {result.wfdData.catchmentName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Catchment: </span>
                  <span className="font-medium">{result.wfdData.catchmentName}</span>
                  {result.wfdData.subCatchmentName && (
                    <span className="text-muted-foreground">
                      {' '}
                      / {result.wfdData.subCatchmentName}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          {result.wfdData.statusHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.wfdData.statusHistory.slice(0, 5).map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{h.period}</span>
                        {h.details.length > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {h.details.join(' • ')}
                          </p>
                        )}
                      </div>
                      <Badge className={WFD_STATUS_COLORS[h.status] || ''}>{h.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trends */}
          {result.wfdData.trends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Water Quality Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.wfdData.trends.map((t, idx) => {
                    const isUpward = t.TrendDesc.toLowerCase().includes('upward')
                    const isDownward = t.TrendDesc.toLowerCase().includes('downward')
                    const WfdTrendIcon = isUpward ? TrendingUp : isDownward ? TrendingDown : Minus

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{t.ParameterName}</span>
                        <div className="flex items-center gap-1">
                          <WfdTrendIcon
                            className={`h-4 w-4 ${
                              isUpward
                                ? 'text-red-500'
                                : isDownward
                                  ? 'text-green-500'
                                  : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={
                              isUpward
                                ? 'text-red-600'
                                : isDownward
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }
                          >
                            {t.TrendDesc}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Note: Upward trends for pollutants indicate degrading conditions.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Failures */}
          {result.wfdData.failures.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Environmental Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {result.wfdData.failures.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {f.Name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connectivity */}
          {result.wfdData.connectivity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-cyan-500" />
                  Hydrological Connectivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-600">Upstream (Input)</h4>
                    <div className="space-y-1">
                      {result.wfdData.connectivity
                        .filter((c) => c.Direction === 'Input')
                        .map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700"
                          >
                            {c.Name}
                          </div>
                        ))}
                      {result.wfdData.connectivity.filter((c) => c.Direction === 'Input').length ===
                        0 && <p className="text-muted-foreground text-sm">None recorded</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-600">Downstream (Output)</h4>
                    <div className="space-y-1">
                      {result.wfdData.connectivity
                        .filter((c) => c.Direction === 'Output')
                        .map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded bg-green-50 px-2 py-1 text-sm text-green-700"
                          >
                            {c.Name}
                          </div>
                        ))}
                      {result.wfdData.connectivity.filter((c) => c.Direction === 'Output')
                        .length === 0 && (
                        <p className="text-muted-foreground text-sm">None recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-400" />
            <p className="text-sm font-medium">Fetching WFD data from Catchments.ie...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-2 pt-4">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">No WFD Data Available</p>
              <p className="text-muted-foreground">
                {result
                  ? 'Detailed WFD data was not available from Catchments.ie for this water body.'
                  : 'WFD data will be fetched when research completes.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )

  const aiTab = (
    <>
      <AiAnalysisCard
        summary={result?.summary || ''}
        isLoading={isLoading}
        error={aiError}
        onGenerate={fetchResearch}
        onRegenerate={() => {
          setResult(null)
          setIsSaved(false)
          fetchResearch()
        }}
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

  const sacTab = (
    <>
      {bestMatch ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{bestMatch.siteName}</CardTitle>
              <p className="text-muted-foreground text-xs">
                Site Code: {bestMatch.siteCode}
                {bestMatch.siteArea && ` • Area: ${bestMatch.siteArea.toFixed(0)} ha`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aquatic Species */}
              {bestMatch.aquaticSpecies.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-xs font-medium">
                    <Fish className="h-4 w-4 text-cyan-600" />
                    Annex II Aquatic Species (Qualifying Interests)
                  </h4>
                  <div className="space-y-1">
                    {bestMatch.aquaticSpecies.map((s) => (
                      <div
                        key={s.code}
                        className="flex items-center justify-between rounded bg-cyan-50 px-2 py-1 text-sm"
                      >
                        <span className="font-medium">{s.commonName}</span>
                        <span className="text-muted-foreground text-xs italic">
                          {s.name} [{s.code}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aquatic Habitats */}
              {bestMatch.aquaticHabitats.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-xs font-medium">
                    <Leaf className="h-4 w-4 text-green-600" />
                    Annex I Aquatic Habitats
                  </h4>
                  <div className="space-y-1">
                    {bestMatch.aquaticHabitats.map((h) => (
                      <div key={h.code} className="rounded bg-green-50 px-2 py-1 text-sm">
                        <span className="font-medium">[{h.code}]</span> <span>{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Species */}
              {bestMatch.allSpecies.length > bestMatch.aquaticSpecies.length && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-gray-700">
                    Other Qualifying Species
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {bestMatch.allSpecies
                      .filter((s) => !bestMatch.aquaticSpecies.some((as) => as.code === s.code))
                      .map((s) => (
                        <Badge key={s.code} variant="outline" className="text-xs">
                          {s.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other potential matches */}
          {result && result.linkedSACs.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-600">Other Potential SAC Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.linkedSACs.slice(1).map((sac) => (
                    <div key={sac.siteCode} className="flex items-center justify-between text-sm">
                      <span>{sac.siteName}</span>
                      <Badge variant="outline" className="text-xs">
                        {sac.matchScore}% match
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Searching for linked SAC sites...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 text-center">
            <Info className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No linked Natura 2000 SAC sites found.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              This water body may still support protected species downstream.
            </p>
          </CardContent>
        </Card>
      )}
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
          content: wfdTab,
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
          content: sacTab,
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
