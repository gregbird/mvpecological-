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
} from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

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

interface AquaticResearchResult {
  summary: string
  linkedSACs: LinkedSAC[]
  resources: {
    catchmentsUrl: string
    epaWaterMapUrl: string
    hydroNetUrl: string
    wfdDataUrl: string
    sacUrl?: string
    sscoUrl?: string
    siUrl?: string
  }
}

interface AquaticDeepResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: AquaticDeepResearchSite | null
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
}: AquaticDeepResearchModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
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
  }, [site?.waterBodyName])

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger value="sac" disabled={!bestMatch}>
                <Link2 className="mr-1 h-3 w-3" />
                Linked SAC
              </TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
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

                    {/* Water Resources */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Water Data</h4>
                      <div className="space-y-1">
                        <a
                          href={result.resources.catchmentsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Catchments.ie - Water Data Portal
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
      </DialogContent>
    </Dialog>
  )
}
