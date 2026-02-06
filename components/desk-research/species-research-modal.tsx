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
      const response = await fetch('/api/ai/species-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scientificName: species.scientificName,
          commonName: species.commonName,
          recordCount: species.recordCount,
          designations: species.designations,
          taxonGroup: species.taxonGroup,
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

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Species Info */}
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

            <Separator />

            {/* AI Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Ecological Analysis
                </h3>
                {!aiSummary && !aiLoading && (
                  <Button variant="outline" size="sm" onClick={fetchAiAnalysis} className="gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Generate Analysis
                  </Button>
                )}
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-purple-50 p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <span className="text-sm text-purple-700">Generating ecological analysis...</span>
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
                    Click &quot;Generate Analysis&quot; for a detailed ecological report on this
                    species, including protection status, habitat requirements, survey
                    recommendations, and development implications.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer Links */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {species.gbifUrl && (
              <a
                href={species.gbifUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
              >
                GBIF <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {species.nbdcUrl && (
              <a
                href={species.nbdcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                NBDC <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
