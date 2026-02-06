'use client'

import * as React from 'react'
import {
  ExternalLink,
  Loader2,
  Shield,
  Sparkles,
  FlaskConical,
  Leaf,
  Bug,
  MapPin,
  Info,
  Globe,
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
import type { FPORecord } from '@/lib/data/fpo-species'
import type { Article17Species } from '@/lib/data/article17-species'
import type { SiteWithSpecies } from '@/lib/data/npws-site-lookup'

export interface SpeciesResearchData {
  scientificName: string
  commonName?: string
  taxonGroup?: string
  recordCount?: number
  designations?: string
  distance?: number
  isProtected?: boolean
  isInvasive?: boolean
  isThreatened?: boolean
  totalIrishRecords?: number
  gridSquares10km?: number
  gbifUrl?: string
  nbdcUrl?: string
  source?: string
  // Enrichment data
  fpoRecords?: FPORecord[]
  article17Species?: Article17Species[]
  relatedSites?: SiteWithSpecies[]
}

interface SpeciesResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  species: SpeciesResearchData | null
}

export function SpeciesResearchModal({ open, onOpenChange, species }: SpeciesResearchModalProps) {
  const [aiSummary, setAiSummary] = React.useState<string>('')
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)

  // Reset state when species changes
  React.useEffect(() => {
    setAiSummary('')
    setAiError(null)
    setAiLoading(false)
  }, [species?.scientificName])

  const fetchAiAnalysis = async () => {
    if (!species) return

    setAiLoading(true)
    setAiError(null)

    try {
      // Format FPO data for prompt
      let fpoData: string | undefined
      if (species.fpoRecords && species.fpoRecords.length > 0) {
        const { formatFPOForPrompt } = await import('@/lib/data/fpo-species')
        fpoData = formatFPOForPrompt(species.fpoRecords)
      }

      // Format Article 17 data for prompt
      let article17Data: string | undefined
      if (species.article17Species && species.article17Species.length > 0) {
        const { formatArticle17ForPrompt } = await import('@/lib/data/article17-species')
        article17Data = formatArticle17ForPrompt(species.article17Species)
      }

      const response = await fetch('/api/ai/species-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scientificName: species.scientificName,
          commonName: species.commonName,
          recordCount: species.recordCount,
          designations: species.designations,
          taxonGroup: species.taxonGroup,
          totalIrishRecords: species.totalIrishRecords,
          gridSquares10km: species.gridSquares10km,
          isProtected: species.isProtected,
          isInvasive: species.isInvasive,
          isThreatened: species.isThreatened,
          fpoData,
          article17Data,
          relatedSites: species.relatedSites?.slice(0, 20),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch AI analysis')
      }

      const data = await response.json()
      setAiSummary(data.summary)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAiLoading(false)
    }
  }

  if (!species) return null

  const hasRelatedSites = species.relatedSites && species.relatedSites.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            {species.commonName || species.scientificName}
          </DialogTitle>
          <DialogDescription className="italic">{species.scientificName}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            <TabsTrigger value="sites">
              Related Sites
              {hasRelatedSites && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {species.relatedSites!.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 pt-4">
                {/* Species Info Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {species.taxonGroup && (
                    <Badge variant="secondary" className="gap-1">
                      <Leaf className="h-3 w-3" />
                      {species.taxonGroup}
                    </Badge>
                  )}
                  {species.isProtected && (
                    <Badge variant="destructive" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Protected
                    </Badge>
                  )}
                  {species.isInvasive && (
                    <Badge className="gap-1 bg-orange-500 hover:bg-orange-600">
                      <Bug className="h-3 w-3" />
                      Invasive
                    </Badge>
                  )}
                  {species.isThreatened && (
                    <Badge variant="destructive" className="gap-1">
                      Threatened
                    </Badge>
                  )}
                  {species.source && (
                    <Badge variant="outline" className="text-xs">
                      {species.source.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {species.recordCount != null && species.recordCount > 0 && (
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-lg font-bold">{species.recordCount}</div>
                      <div className="text-muted-foreground text-xs">Records in area</div>
                    </div>
                  )}
                  {species.totalIrishRecords != null && species.totalIrishRecords > 0 && (
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-lg font-bold">
                        {species.totalIrishRecords.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-xs">Irish records</div>
                    </div>
                  )}
                  {species.gridSquares10km != null && species.gridSquares10km > 0 && (
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-lg font-bold">{species.gridSquares10km}</div>
                      <div className="text-muted-foreground text-xs">10km grid squares</div>
                    </div>
                  )}
                  {species.distance != null && (
                    <div className="rounded-lg border p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-bold">
                        <MapPin className="h-4 w-4" />
                        {species.distance === 0 ? 'Within' : `${species.distance.toFixed(1)}km`}
                      </div>
                      <div className="text-muted-foreground text-xs">From boundary</div>
                    </div>
                  )}
                </div>

                {/* Designations */}
                {species.designations && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-sm font-medium text-red-700">
                      <Shield className="h-4 w-4" />
                      Designations
                    </div>
                    <div className="text-sm text-red-600">{species.designations}</div>
                  </div>
                )}

                {/* FPO Records summary */}
                {species.fpoRecords && species.fpoRecords.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-sm font-medium text-rose-700">
                      <Leaf className="h-4 w-4" />
                      Flora Protection Order 2022
                    </div>
                    <div className="text-sm text-rose-600">
                      {species.fpoRecords.length} FPO record
                      {species.fpoRecords.length > 1 ? 's' : ''} in project area
                    </div>
                  </div>
                )}

                {/* Article 17 summary */}
                {species.article17Species && species.article17Species.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-sm font-medium text-amber-700">
                      <Shield className="h-4 w-4" />
                      Habitats Directive (Article 17)
                    </div>
                    <div className="text-sm text-amber-600">
                      {species.article17Species.map((sp) => (
                        <div key={sp.code}>
                          {sp.scientificName} — {sp.gridCount} grid squares across Ireland
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Ecological Analysis
                  </h3>
                  {!aiSummary && !aiLoading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAiAnalysis}
                      className="gap-1.5"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      Generate Analysis
                    </Button>
                  )}
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-2 rounded-lg border bg-purple-50 p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-700">
                      Generating ecological analysis...
                    </span>
                  </div>
                )}

                {aiError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    {aiError}
                    <Button variant="ghost" size="sm" className="ml-2" onClick={fetchAiAnalysis}>
                      Retry
                    </Button>
                  </div>
                )}

                {aiSummary && (
                  <div className="space-y-2 rounded-lg border bg-white p-4">
                    {aiSummary.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h4 key={i} className="mt-3 text-sm font-semibold first:mt-0">
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        )
                      }
                      if (line.trim() === '') return <div key={i} className="h-1" />
                      return (
                        <p key={i} className="text-muted-foreground text-sm leading-relaxed">
                          {line}
                        </p>
                      )
                    })}
                  </div>
                )}

                {!aiSummary && !aiLoading && !aiError && (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
                    <Info className="h-8 w-8 text-gray-300" />
                    <p className="text-muted-foreground text-sm">
                      Click &quot;Generate Analysis&quot; for a detailed ecological report including
                      protection status, habitat requirements, survey recommendations, and
                      development implications.
                      {(species.fpoRecords?.length ||
                        species.article17Species?.length ||
                        hasRelatedSites) && (
                        <span className="mt-1 block text-purple-600">
                          Enriched with FPO, Article 17, and designated site data.
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Related Sites Tab */}
          <TabsContent value="sites" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3 pt-4">
                <p className="text-muted-foreground text-sm">
                  SAC/SPA sites where this species is listed as a Qualifying Interest.
                </p>

                {hasRelatedSites ? (
                  <div className="space-y-2">
                    {species.relatedSites!.map((site, i) => (
                      <div
                        key={`${site.siteCode}-${i}`}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`h-5 shrink-0 px-1.5 text-[10px] ${
                                site.siteType === 'SAC'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {site.siteType}
                            </Badge>
                            <span className="truncate text-sm font-medium">{site.siteName}</span>
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {site.siteCode}
                          </div>
                        </div>
                        <a
                          href={`https://www.npws.ie/protected-sites/${site.siteType.toLowerCase()}/${site.siteCode.replace('IE', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 shrink-0 text-xs text-blue-600 hover:underline"
                        >
                          NPWS <ExternalLink className="inline h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
                    <Globe className="h-8 w-8 text-gray-300" />
                    <p className="text-muted-foreground text-sm">
                      No designated sites found with this species as a Qualifying Interest.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-0 min-h-0 flex-1">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3 pt-4">
                <p className="text-muted-foreground text-sm">External resources and references.</p>

                <div className="space-y-2">
                  {species.gbifUrl && (
                    <a
                      href={species.gbifUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                        <Globe className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">GBIF Species Page</div>
                        <div className="text-muted-foreground truncate text-xs">
                          Global Biodiversity Information Facility
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                    </a>
                  )}

                  {species.nbdcUrl && (
                    <a
                      href={species.nbdcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Globe className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">NBDC Species Page</div>
                        <div className="text-muted-foreground truncate text-xs">
                          National Biodiversity Data Centre
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                    </a>
                  )}

                  {species.source === 'fpo' && (
                    <a
                      href="https://www.npws.ie/legislation/irish-law/flora-protection-order"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
                        <Leaf className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">Flora Protection Order 2022</div>
                        <div className="text-muted-foreground truncate text-xs">
                          NPWS Protected Flora Legislation
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                    </a>
                  )}

                  {/* NPWS species search */}
                  <a
                    href={`https://www.npws.ie/search?query=${encodeURIComponent(species.scientificName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Shield className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">NPWS Search</div>
                      <div className="text-muted-foreground truncate text-xs">
                        National Parks & Wildlife Service
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                  </a>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
