'use client'

import * as React from 'react'
import {
  ExternalLink,
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
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { saveAquaticResearch } from '@/lib/supabase/queries/aquatic-research'

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
}: AquaticDeepResearchModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)
  const [result, setResult] = React.useState<AquaticResearchResult | null>(null)
  const [activeTab, setActiveTab] = React.useState('overview')

  // Fetch research when modal opens
  React.useEffect(() => {
    if (open && site && !result) {
      fetchResearch()
    }
  }, [open, site])

  // Reset when site changes
  React.useEffect(() => {
    setResult(null)
    setActiveTab('overview')
    setIsSaved(false)
  }, [site?.waterBodyName])

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

  const fetchResearch = async () => {
    if (!site) return

    setIsLoading(true)
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
      toast({
        variant: 'destructive',
        title: 'Research failed',
        description: 'Could not generate aquatic research. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!site) return null

  const WaterBodyIcon = WATER_BODY_ICONS[site.waterBodyType] || Droplets
  const bestMatch = result?.linkedSACs?.[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WaterBodyIcon className="h-5 w-5 text-cyan-500" />
            {site.waterBodyName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{site.waterBodyType}</Badge>
            {site.wfdStatus && (
              <Badge variant="outline" className={WFD_STATUS_COLORS[site.wfdStatus] || ''}>
                WFD: {site.wfdStatus}
              </Badge>
            )}
            {site.distance !== undefined && (
              <Badge variant="secondary">
                <MapPin className="mr-1 h-3 w-3" />
                {site.distance === 0 ? 'Within boundary' : `${site.distance.toFixed(1)} km`}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
              <p className="mt-2 text-sm text-gray-500">Researching aquatic features...</p>
            </div>
          </div>
        ) : result ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wfd" disabled={!result.wfdData}>
                <Activity className="mr-1 h-3 w-3" />
                WFD Data
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="mr-1 h-3 w-3" />
                AI
              </TabsTrigger>
              <TabsTrigger value="sac" disabled={!bestMatch}>
                <Link2 className="mr-1 h-3 w-3" />
                SAC
              </TabsTrigger>
              <TabsTrigger value="resources">Links</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[50vh] pr-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Water Body Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{site.waterBodyName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium">{site.waterBodyType}</p>
                      </div>
                      {site.waterBodyCode && (
                        <div>
                          <span className="text-muted-foreground">EPA Code:</span>
                          <p className="font-medium">{site.waterBodyCode}</p>
                        </div>
                      )}
                      {site.wfdStatus && (
                        <div>
                          <span className="text-muted-foreground">WFD Status:</span>
                          <p className="font-medium">{site.wfdStatus}</p>
                        </div>
                      )}
                      {site.catchmentName && (
                        <div>
                          <span className="text-muted-foreground">Catchment:</span>
                          <p className="font-medium">{site.catchmentName}</p>
                        </div>
                      )}
                      {site.lengthKm && (
                        <div>
                          <span className="text-muted-foreground">Length:</span>
                          <p className="font-medium">{site.lengthKm.toFixed(1)} km</p>
                        </div>
                      )}
                      {site.areaHa && (
                        <div>
                          <span className="text-muted-foreground">Area:</span>
                          <p className="font-medium">{site.areaHa.toFixed(1)} ha</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {bestMatch && (
                  <Card className="border-cyan-200 bg-cyan-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Link2 className="h-4 w-4 text-cyan-600" />
                        Linked Natura 2000 Site
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-cyan-700">{bestMatch.siteName}</p>
                        <p className="text-muted-foreground text-xs">
                          {bestMatch.siteCode} • Match: {bestMatch.matchScore}% (
                          {bestMatch.matchReason})
                        </p>
                      </div>

                      {bestMatch.aquaticSpecies.length > 0 && (
                        <div>
                          <p className="mb-1 font-medium text-cyan-700">
                            <Fish className="mr-1 inline h-3 w-3" />
                            Protected Aquatic Species:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {bestMatch.aquaticSpecies.map((s) => (
                              <Badge
                                key={s.code}
                                variant="secondary"
                                className="bg-cyan-100 text-cyan-700"
                              >
                                {s.commonName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {bestMatch.aquaticHabitats.length > 0 && (
                        <div>
                          <p className="mb-1 font-medium text-cyan-700">
                            <Leaf className="mr-1 inline h-3 w-3" />
                            Annex I Aquatic Habitats:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {bestMatch.aquaticHabitats.map((h) => (
                              <Badge key={h.code} variant="outline" className="text-xs">
                                [{h.code}] {h.name.substring(0, 40)}...
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!bestMatch && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="flex items-start gap-2 pt-4">
                      <Info className="h-4 w-4 shrink-0 text-amber-600" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-700">No Linked SAC Found</p>
                        <p className="text-muted-foreground">
                          This water body is not directly linked to a known Natura 2000 SAC.
                          However, it may still support protected species or connect to designated
                          sites downstream.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* WFD Data Tab */}
              <TabsContent value="wfd" className="mt-4 space-y-4">
                {result.wfdData ? (
                  <>
                    {/* Current Status & Risk */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Activity className="h-4 w-4 text-blue-500" />
                          WFD Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Current Status</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  WFD_STATUS_COLORS[result.wfdData.currentStatus || ''] || ''
                                }
                              >
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
                          <CardTitle className="flex items-center gap-2 text-base">
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
                                <Badge className={WFD_STATUS_COLORS[h.status] || ''}>
                                  {h.status}
                                </Badge>
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
                          <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4 text-amber-500" />
                            Water Quality Trends
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {result.wfdData.trends.map((t, idx) => {
                              const isUpward = t.TrendDesc.toLowerCase().includes('upward')
                              const isDownward = t.TrendDesc.toLowerCase().includes('downward')
                              const TrendIcon = isUpward
                                ? TrendingUp
                                : isDownward
                                  ? TrendingDown
                                  : Minus

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                                >
                                  <span className="font-medium">{t.ParameterName}</span>
                                  <div className="flex items-center gap-1">
                                    <TrendIcon
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
                          <CardTitle className="flex items-center gap-2 text-base text-red-700">
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
                          <CardTitle className="flex items-center gap-2 text-base">
                            <ArrowRight className="h-4 w-4 text-cyan-500" />
                            Hydrological Connectivity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-gray-600">
                                Upstream (Input)
                              </h4>
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
                                {result.wfdData.connectivity.filter((c) => c.Direction === 'Input')
                                  .length === 0 && (
                                  <p className="text-muted-foreground text-sm">None recorded</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="mb-2 text-sm font-medium text-gray-600">
                                Downstream (Output)
                              </h4>
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
                ) : (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="flex items-start gap-2 pt-4">
                      <Info className="h-4 w-4 shrink-0 text-amber-600" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-700">No WFD Data Available</p>
                        <p className="text-muted-foreground">
                          Detailed WFD data was not available from Catchments.ie for this water
                          body. This may be because the water body code was not recognized or the
                          API is temporarily unavailable.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI Analysis Tab */}
              <TabsContent value="ai" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI Ecological Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {result.summary.split('\n').map((paragraph, idx) => {
                        // Handle headers
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return (
                            <h4 key={idx} className="mt-4 mb-2 font-semibold text-gray-900">
                              {paragraph.replace(/\*\*/g, '')}
                            </h4>
                          )
                        }
                        if (paragraph.startsWith('**')) {
                          const [header, ...rest] = paragraph.split(':**')
                          return (
                            <div key={idx}>
                              <h4 className="mt-3 mb-1 font-semibold text-gray-900">
                                {header.replace(/\*\*/g, '')}
                              </h4>
                              {rest.length > 0 && (
                                <p className="text-muted-foreground">{rest.join(':**')}</p>
                              )}
                            </div>
                          )
                        }
                        if (paragraph.trim()) {
                          return (
                            <p key={idx} className="text-muted-foreground mb-2">
                              {paragraph}
                            </p>
                          )
                        }
                        return null
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Linked SAC Tab */}
              <TabsContent value="sac" className="mt-4 space-y-4">
                {bestMatch && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{bestMatch.siteName}</CardTitle>
                        <p className="text-muted-foreground text-xs">
                          Site Code: {bestMatch.siteCode}
                          {bestMatch.siteArea && ` • Area: ${bestMatch.siteArea.toFixed(0)} ha`}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Aquatic Species */}
                        {bestMatch.aquaticSpecies.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-1 font-medium">
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
                            <h4 className="mb-2 flex items-center gap-1 font-medium">
                              <Leaf className="h-4 w-4 text-green-600" />
                              Annex I Aquatic Habitats
                            </h4>
                            <div className="space-y-1">
                              {bestMatch.aquaticHabitats.map((h) => (
                                <div key={h.code} className="rounded bg-green-50 px-2 py-1 text-sm">
                                  <span className="font-medium">[{h.code}]</span>{' '}
                                  <span>{h.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Species */}
                        {bestMatch.allSpecies.length > bestMatch.aquaticSpecies.length && (
                          <div>
                            <h4 className="mb-2 font-medium text-gray-700">
                              Other Qualifying Species
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {bestMatch.allSpecies
                                .filter(
                                  (s) => !bestMatch.aquaticSpecies.some((as) => as.code === s.code)
                                )
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
                    {result.linkedSACs.length > 1 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-600">
                            Other Potential SAC Matches
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {result.linkedSACs.slice(1).map((sac) => (
                              <div
                                key={sac.siteCode}
                                className="flex items-center justify-between text-sm"
                              >
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
                )}
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">External Resources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* SAC Resources */}
                    {result.resources.sacUrl && (
                      <>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Natura 2000 Site</h4>
                          <div className="space-y-1">
                            <a
                              href={result.resources.sacUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              NPWS Site Synopsis
                            </a>
                            {result.resources.sscoUrl && (
                              <a
                                href={result.resources.sscoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                Site-Specific Conservation Objectives (PDF)
                              </a>
                            )}
                            {result.resources.siUrl && (
                              <a
                                href={result.resources.siUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                Statutory Instrument
                              </a>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Water Body Specific */}
                    {result.resources.waterBodyUrl && (
                      <>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">This Water Body</h4>
                          <div className="space-y-1">
                            <a
                              href={result.resources.waterBodyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <Activity className="h-3 w-3" />
                              View on Catchments.ie (Full WFD Data)
                            </a>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Water Resources */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Water Data Portals</h4>
                      <div className="space-y-1">
                        <a
                          href={result.resources.catchmentsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Catchments.ie - Main Portal
                        </a>
                        <a
                          href={result.resources.wfdDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          WFD Data Dashboards
                        </a>
                        <a
                          href={result.resources.epaWaterMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          EPA Water Maps
                        </a>
                        <a
                          href={result.resources.hydroNetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          HydroNet - Water Levels & Flow Data
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <Button onClick={fetchResearch}>
              <Sparkles className="mr-2 h-4 w-4" />
              Start Research
            </Button>
          </div>
        )}

        {/* Footer with Save button */}
        {result && (
          <DialogFooter className="mt-4 border-t pt-4">
            <div className="flex w-full items-center justify-between">
              <p className="text-muted-foreground text-xs">
                {isSaved ? (
                  <span className="text-green-600">✓ Research saved to project</span>
                ) : (
                  'Save this research to include in your project report'
                )}
              </p>
              <Button
                onClick={handleSaveResearch}
                disabled={isSaving || isSaved}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isSaved ? (
                  <>✓ Saved</>
                ) : (
                  <>Save Research</>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
