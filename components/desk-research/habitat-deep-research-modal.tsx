'use client'

import * as React from 'react'
import { Layers, BookOpen, TreePine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DeepResearchShell,
  AiAnalysisCard,
  ResourceLinkCard,
} from '@/components/desk-research/deep-research-shell'

interface HabitatDeepResearchSite {
  fossittCode: string
  fossittName: string
  nlcLabel: string
  nlcLevel1: string
  areaHectares: number
  polygonCount: number
  percentCover: string
}

interface HabitatDeepResearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: HabitatDeepResearchSite | null
  projectName?: string
  bufferKm?: number
  onSaveAnalysis?: (data: { aiAnalysis: string; fossittCode: string }) => void
}

export function HabitatDeepResearchModal({
  open,
  onOpenChange,
  site,
  projectName,
  bufferKm = 5,
  onSaveAnalysis,
}: HabitatDeepResearchModalProps) {
  const [aiAnalysis, setAiAnalysis] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaved, setIsSaved] = React.useState(false)

  // Auto-trigger analysis when modal opens
  React.useEffect(() => {
    if (open && site && !aiAnalysis && !isLoading) {
      generateAnalysis()
    }
    if (!open) {
      setIsSaved(false)
    }
  }, [open, site?.fossittCode, aiAnalysis, isLoading])

  const generateAnalysis = async () => {
    if (!site) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/habitat-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitats: [
            {
              fossittCode: site.fossittCode,
              fossittName: site.fossittName,
              nlcLabel: site.nlcLabel,
              areaHectares: site.areaHectares,
            },
          ],
          projectName,
          bufferKm,
          singleHabitat: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate analysis')
      }

      const data = await response.json()
      setAiAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    if (!site || !aiAnalysis) return
    onSaveAnalysis?.({ aiAnalysis, fossittCode: site.fossittCode })
    setIsSaved(true)
  }

  if (!site) return null

  const tabs = [
    {
      value: 'overview',
      label: (
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" /> Overview
        </span>
      ),
      content: (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Fossitt Code</p>
                  <p className="font-mono font-semibold">{site.fossittCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NLC Category</p>
                  <p className="font-medium">{site.nlcLabel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Area</p>
                  <p className="font-medium">{site.areaHectares.toLocaleString()} ha</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Coverage</p>
                  <p className="font-medium">{site.percentCover}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NLC Level 1</p>
                  <p className="font-medium">{site.nlcLevel1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Polygons</p>
                  <p className="font-medium">{site.polygonCount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'analysis',
      label: (
        <span className="flex items-center gap-1">
          <TreePine className="h-3 w-3" /> AI Analysis
        </span>
      ),
      content: (
        <AiAnalysisCard
          summary={aiAnalysis}
          isLoading={isLoading}
          error={error}
          onGenerate={generateAnalysis}
          emptyTitle="Habitat Analysis"
          emptyDescription={`Generate a detailed ecological analysis of ${site.fossittCode} — ${site.fossittName}.`}
          loadingText="Analysing habitat..."
        />
      ),
    },
    {
      value: 'resources',
      label: (
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> Resources
        </span>
      ),
      content: (
        <div className="space-y-3">
          <ResourceLinkCard
            href="https://www.npws.ie/sites/default/files/publications/pdf/IWM_65.pdf"
            icon={<BookOpen className="h-5 w-5 text-green-600" />}
            title="Fossitt Guide to Habitats in Ireland"
            description="Heritage Council habitat classification guide (PDF)"
            borderColor="border-l-4 border-l-green-400"
          />
          <ResourceLinkCard
            href="https://www.npws.ie/protected-sites"
            icon={<Layers className="h-5 w-5 text-blue-600" />}
            title="NPWS Protected Sites"
            description="Check if this habitat falls within a protected area"
            borderColor="border-l-4 border-l-blue-400"
          />
          <ResourceLinkCard
            href="https://data-osi.opendata.arcgis.com/datasets/osi::high-value-dataset-national-land-cover-2018"
            icon={<Layers className="h-5 w-5 text-orange-600" />}
            title="National Land Cover 2018 Dataset"
            description="OSI open data source for this habitat classification"
            borderColor="border-l-4 border-l-orange-400"
          />
        </div>
      ),
    },
  ]

  return (
    <DeepResearchShell
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={<Layers className="mt-1 h-6 w-6 text-green-600" />}
      title={`${site.fossittCode} — ${site.fossittName}`}
      headerBadges={
        <>
          <Badge variant="outline" className="font-mono text-xs">
            {site.fossittCode}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {site.areaHectares.toLocaleString()} ha
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {site.percentCover}% cover
          </Badge>
        </>
      }
      tabs={tabs}
      defaultTab="analysis"
      footerInfo="Data: National Land Cover 2018 (OSI) → Fossitt Classification"
      isSaved={isSaved}
      isSaving={false}
      canSave={!!aiAnalysis}
      onSave={handleSave}
    />
  )
}
