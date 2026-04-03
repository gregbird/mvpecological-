'use client'

import * as React from 'react'
import { Shield, Sparkles, Bug, MapPin } from 'lucide-react'

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
import {
  SpeciesOverviewTab,
  SpeciesAiAnalysisTab,
  SpeciesRelatedSitesTab,
  SpeciesResourcesTab,
} from './species-research/species-research-tabs'

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
  fpoRecords?: FPORecord[]
  article17Species?: Article17Species[]
  relatedSites?: SiteWithSpecies[]
}

interface SpeciesResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  species: SpeciesResearchData | null
  existingAnalysis?: string
  onSaveAnalysis?: (data: {
    aiAnalysis: string
    relatedSites?: SiteWithSpecies[]
    fpoRecords?: FPORecord[]
    article17Species?: Article17Species[]
  }) => void
}

export function SpeciesResearchModal({
  open,
  onOpenChange,
  species,
  existingAnalysis,
  onSaveAnalysis,
}: SpeciesResearchModalProps) {
  const [aiSummary, setAiSummary] = React.useState<string>('')
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [isSaved, setIsSaved] = React.useState(false)

  // Track auto-start to prevent duplicate triggers
  const hasTriggeredRef = React.useRef<string | null>(null)

  // Reset state when species changes — restore from cache if available
  React.useEffect(() => {
    setAiError(null)
    setAiLoading(false)

    if (existingAnalysis) {
      setAiSummary(existingAnalysis)
      setIsSaved(true)
      hasTriggeredRef.current = species?.scientificName || null
    } else {
      setAiSummary('')
      setIsSaved(false)
      hasTriggeredRef.current = null
    }
  }, [species?.scientificName, existingAnalysis])

  // Handle saving analysis to finding
  const handleSaveAnalysis = () => {
    if (!aiSummary || !onSaveAnalysis) return

    onSaveAnalysis({
      aiAnalysis: aiSummary,
      relatedSites: species?.relatedSites,
      fpoRecords: species?.fpoRecords,
      article17Species: species?.article17Species,
    })
    setIsSaved(true)
  }

  const fetchAiAnalysis = React.useCallback(async () => {
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
  }, [species])

  // Auto-start AI analysis when modal opens
  React.useEffect(() => {
    if (
      open &&
      species?.scientificName &&
      !aiSummary &&
      !aiLoading &&
      !existingAnalysis &&
      hasTriggeredRef.current !== species.scientificName
    ) {
      hasTriggeredRef.current = species.scientificName
      fetchAiAnalysis()
    }
  }, [open, species?.scientificName, aiSummary, aiLoading, existingAnalysis, fetchAiAnalysis])

  if (!species) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">
                {species.commonName || species.scientificName}
              </DialogTitle>
              <DialogDescription className="sr-only">{species.scientificName}</DialogDescription>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs italic">
                  {species.scientificName}
                </span>
                {species.taxonGroup && (
                  <Badge variant="outline" className="text-xs">
                    {species.taxonGroup}
                  </Badge>
                )}
                {species.distance != null && (
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="mr-1 h-3 w-3" />
                    {species.distance === 0
                      ? 'Within site'
                      : `${Number(species.distance).toFixed(1)} km`}
                  </Badge>
                )}
                {species.isProtected && (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <Shield className="h-3 w-3" />
                    Protected
                  </Badge>
                )}
                {species.isInvasive && (
                  <Badge className="gap-1 bg-orange-500 text-xs hover:bg-orange-600">
                    <Bug className="h-3 w-3" />
                    Invasive
                  </Badge>
                )}
                {species.isThreatened && (
                  <Badge variant="destructive" className="text-xs">
                    Threatened
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 text-xs">
              <TabsTrigger value="overview" className="px-2 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="ai-analysis" className="px-2 text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                AI
              </TabsTrigger>
              <TabsTrigger value="sites" className="px-2 text-xs">
                Sites ({species.relatedSites?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="resources" className="px-2 text-xs">
                Links
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <SpeciesOverviewTab species={species} />
            </TabsContent>

            <TabsContent value="ai-analysis" className="mt-4 space-y-4">
              <SpeciesAiAnalysisTab
                species={species}
                aiSummary={aiSummary}
                aiLoading={aiLoading}
                aiError={aiError}
                onFetchAnalysis={fetchAiAnalysis}
              />
            </TabsContent>

            <TabsContent value="sites" className="mt-4 space-y-3">
              <SpeciesRelatedSitesTab species={species} />
            </TabsContent>

            <TabsContent value="resources" className="mt-4 space-y-3">
              <SpeciesResourcesTab species={species} />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Data: {species.source?.toUpperCase() || 'GBIF'} + FPO + Article 17
          </p>
          <div className="flex gap-2">
            {onSaveAnalysis && aiSummary && (
              <Button
                variant={isSaved ? 'secondary' : 'default'}
                size="sm"
                onClick={handleSaveAnalysis}
                disabled={isSaved}
              >
                {isSaved ? '✓ Saved' : 'Save Research'}
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
