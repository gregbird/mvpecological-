'use client'

import * as React from 'react'
import {
  ExternalLink,
  FileText,
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  Info,
  AlertTriangle,
  BookOpen,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  AlertOctagon,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getHabitatDescription } from '@/lib/data/ssco-lookup'
import {
  getArticle17Data,
  getStatusDisplay,
  getTrendDisplay,
  getHabitatsSummary,
  type Article17Habitat,
} from '@/lib/data/article17-habitats'
import { useSaveDeepResearch, useSiteDeepResearch } from '@/hooks/use-project-data'
import { useToast } from '@/hooks/use-toast'

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
}

/**
 * Generate NPWS URLs for a site
 */
function getNPWSUrls(siteCode: string, siteType: string) {
  const typePathMap: Record<string, string> = {
    SAC: 'sac',
    SPA: 'spa',
    NHA: 'nha',
    pNHA: 'pnha',
  }
  const typePath = typePathMap[siteType] || 'sac'
  const baseUrl = `https://www.npws.ie/protected-sites/${typePath}/${siteCode}`

  return {
    synopsis: baseUrl,
    conservationObjectives: `${baseUrl}/conservation-objectives`,
    article17: 'https://www.npws.ie/publications/article-17-reports',
    siteMap: `https://www.npws.ie/maps-and-data`,
  }
}

/**
 * Get protection level description
 */
function getProtectionDescription(siteType: string): string {
  const descriptions: Record<string, string> = {
    SAC: 'Special Area of Conservation - Protected under EU Habitats Directive (92/43/EEC). Legally binding conservation objectives apply.',
    SPA: 'Special Protection Area - Protected under EU Birds Directive (2009/147/EC). Protects rare and vulnerable bird species.',
    NHA: 'Natural Heritage Area - Protected under Wildlife (Amendment) Act 2000. National level protection for habitats and species.',
    pNHA: 'Proposed Natural Heritage Area - Identified for protection but not yet legally designated. Still requires consideration in planning.',
  }
  return descriptions[siteType] || 'Protected site requiring ecological assessment.'
}

/**
 * Trend icon component
 */
function TrendIcon({ trend }: { trend: string }) {
  const trendDisplay = getTrendDisplay(trend as 'improving' | 'stable' | 'declining' | 'unknown')
  const icons = {
    improving: TrendingUp,
    stable: Minus,
    declining: TrendingDown,
    unknown: HelpCircle,
  }
  const Icon = icons[trend as keyof typeof icons] || HelpCircle
  return <Icon className={`h-4 w-4 ${trendDisplay.color}`} />
}

export function DeepResearchModal({
  open,
  onOpenChange,
  site,
  projectId,
  userId,
  findingId,
}: DeepResearchModalProps) {
  const { toast } = useToast()
  const saveResearch = useSaveDeepResearch()

  // Check if already saved
  const { data: existingResearch } = useSiteDeepResearch(
    projectId || '',
    site?.siteCode || ''
  )
  const isSaved = !!existingResearch

  if (!site) return null

  const urls = getNPWSUrls(site.siteCode, site.siteType)
  const protectionDesc = getProtectionDescription(site.siteType)

  // Get Article 17 data for each habitat
  const habitatsWithArticle17 = site.habitats?.map(h => ({
    ...h,
    article17: getArticle17Data(h.habitatCode),
  })) || []

  // Calculate summary
  const habitatCodes = site.habitats?.map(h => h.habitatCode) || []
  const summary = getHabitatsSummary(habitatCodes)

  // Collect all unique threats and pressures
  const allPressures = new Set<string>()
  const allThreats = new Set<string>()
  habitatsWithArticle17.forEach(h => {
    h.article17?.pressures.forEach(p => allPressures.add(p))
    h.article17?.threats.forEach(t => allThreats.add(t))
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
        habitats: habitatsWithArticle17.map(h => ({
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
        researched_by: userId || null,
      })

      toast({
        title: 'Research saved',
        description: 'Deep research results have been saved to the project.',
      })
    } catch (error) {
      console.error('Failed to save research:', error)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save research results.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{site.siteName}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {site.siteType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Site Code: {site.siteCode}</span>
                  {site.distance !== undefined && site.distance !== null && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {site.distance === 0 ? 'Within site' : `${Number(site.distance).toFixed(1)} km`}
                    </Badge>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="habitats">
                Habitats {site.habitats && `(${site.habitats.length})`}
              </TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Protection Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Protection Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{protectionDesc}</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-emerald-600">
                      {site.habitats?.length || '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Qualifying Habitats</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {site.areaHa ? `${site.areaHa.toFixed(0)} ha` : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Site Area</p>
                  </CardContent>
                </Card>
              </div>

              {/* AA Screening Note */}
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Appropriate Assessment Consideration
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        {site.siteType === 'SAC' || site.siteType === 'SPA'
                          ? 'This is a Natura 2000 site. Any plan or project likely to have significant effects must undergo Appropriate Assessment screening under Article 6(3) of the Habitats Directive.'
                          : 'While not a Natura 2000 site, ecological connectivity to European sites should be considered in planning applications.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conservation Status Tab (NEW) */}
            <TabsContent value="status" className="space-y-4 mt-4">
              {/* Status Summary */}
              {summary.total > 0 ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                        Article 17 (2025) Conservation Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        Based on NPWS Article 17 Report 2025 - national conservation status of qualifying habitats.
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-lg font-bold text-green-700">{summary.favourable}</div>
                          <div className="text-[10px] text-green-600">Favourable</div>
                        </div>
                        <div className="text-center p-2 bg-amber-50 rounded">
                          <div className="text-lg font-bold text-amber-700">{summary.unfavourableInadequate}</div>
                          <div className="text-[10px] text-amber-600">Inadequate</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-lg font-bold text-red-700">{summary.unfavourableBad}</div>
                          <div className="text-[10px] text-red-600">Bad</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-bold text-gray-700">{summary.unknown}</div>
                          <div className="text-[10px] text-gray-600">Unknown</div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          {summary.improving} improving
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          {summary.declining} declining
                        </span>
                        {summary.priorityCount > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertOctagon className="h-3 w-3 text-red-500" />
                            {summary.priorityCount} priority
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Threats & Pressures */}
                  {(allPressures.size > 0 || allThreats.size > 0) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          Threats & Pressures
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {allPressures.size > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Current Pressures:</p>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(allPressures).map((pressure, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-orange-50">
                                  {pressure}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {allThreats.size > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Future Threats:</p>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(allThreats).map((threat, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-red-50">
                                  {threat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Per-habitat status */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Status by Habitat:</p>
                    {habitatsWithArticle17.map((habitat, idx) => {
                      const a17 = habitat.article17
                      if (!a17) return null
                      const statusDisplay = getStatusDisplay(a17.status)
                      const trendDisplay = getTrendDisplay(a17.trend)
                      return (
                        <Card key={idx} className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {habitat.habitatCode}
                                </Badge>
                                <Badge className={`text-xs ${statusDisplay.bgColor} ${statusDisplay.color} border-0`}>
                                  {statusDisplay.label}
                                </Badge>
                                <span className={`flex items-center gap-1 text-xs ${trendDisplay.color}`}>
                                  <TrendIcon trend={a17.trend} />
                                  {trendDisplay.label}
                                </span>
                                {a17.priorityHabitat && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Priority*
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {a17.assessment}
                              </p>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Conservation status data not available.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check NPWS Article 17 Reports for detailed assessments.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Habitats Tab */}
            <TabsContent value="habitats" className="space-y-3 mt-4">
              {site.habitats && site.habitats.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Annex I habitats listed as Qualifying Interests for this site:
                  </p>
                  {habitatsWithArticle17.map((habitat, idx) => {
                    const a17 = habitat.article17
                    const description = getHabitatDescription(habitat.habitatCode)
                    const statusDisplay = a17 ? getStatusDisplay(a17.status) : null
                    return (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant={a17?.priorityHabitat ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {habitat.habitatCode}
                                </Badge>
                                {a17?.priorityHabitat && (
                                  <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                                    Priority*
                                  </Badge>
                                )}
                                {statusDisplay && (
                                  <Badge className={`text-xs ${statusDisplay.bgColor} ${statusDisplay.color} border-0`}>
                                    {statusDisplay.label}
                                  </Badge>
                                )}
                                {a17 && (
                                  <span className={`flex items-center gap-1 text-xs ${getTrendDisplay(a17.trend).color}`}>
                                    <TrendIcon trend={a17.trend} />
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium mt-1">{habitat.habitatName}</p>
                              <p className="text-xs text-muted-foreground mt-1">{description}</p>
                            </div>
                            <Leaf className="h-4 w-4 text-emerald-500 shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Habitat information not available in local database.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check NPWS Site Synopsis for full Qualifying Interests list.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Official NPWS documents and resources for this site:
              </p>

              {/* Site Synopsis */}
              <a
                href={urls.synopsis}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Site Synopsis</p>
                          <p className="text-xs text-muted-foreground">
                            Overview, location, and ecological description
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </a>

              {/* Conservation Objectives */}
              {(site.siteType === 'SAC' || site.siteType === 'SPA') && (
                <a
                  href={urls.conservationObjectives}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-emerald-100 p-2">
                            <Target className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Conservation Objectives</p>
                            <p className="text-xs text-muted-foreground">
                              Site-specific targets and attributes
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              )}

              {/* Article 17 Reports */}
              {site.siteType === 'SAC' && (
                <a
                  href={urls.article17}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-purple-100 p-2">
                            <BookOpen className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Article 17 Reports (2025)</p>
                            <p className="text-xs text-muted-foreground">
                              National conservation status assessments
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              )}

              {/* NPWS Maps */}
              <a
                href={urls.siteMap}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-orange-100 p-2">
                          <MapPin className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">NPWS Map Viewer</p>
                          <p className="text-xs text-muted-foreground">
                            Interactive maps and spatial data
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Data: NPWS Article 17 Report 2025
          </p>
          <div className="flex gap-2">
            {projectId && (
              <Button
                variant={isSaved ? 'secondary' : 'default'}
                size="sm"
                onClick={handleSaveResearch}
                disabled={saveResearch.isPending || isSaved}
              >
                {saveResearch.isPending ? 'Saving...' : isSaved ? '✓ Saved' : 'Save Research'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
