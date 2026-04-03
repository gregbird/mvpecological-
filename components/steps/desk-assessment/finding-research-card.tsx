'use client'

import * as React from 'react'
import { MapPin, Shield, Leaf, Bug, ChevronDown, Layers } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AiAnalysisBlock } from '@/components/steps/desk-assessment/research-shared'
import type { DeskResearchFinding as DbFinding } from '@/types/database'

export function FindingResearchCard({
  finding,
  type,
}: {
  finding: DbFinding
  type: 'species' | 'habitat'
}) {
  const [expanded, setExpanded] = React.useState(false)
  const raw = finding.raw_data as Record<string, unknown>
  const metadata = raw.metadata as Record<string, unknown> | undefined
  const deepResearch = raw.deepResearch as Record<string, unknown>
  const aiAnalysis = deepResearch.aiAnalysis as string

  const Icon = type === 'species' ? Bug : Layers
  const iconColor = type === 'species' ? 'text-amber-600' : 'text-green-600'
  const bgColor = type === 'species' ? 'bg-amber-100' : 'bg-green-100'

  const scientificName = type === 'species' ? (raw.scientificName as string) : null
  const designations = type === 'species' ? (metadata?.designations as string) : null
  const isProtected = type === 'species' && !!(finding.is_protected || metadata?.isProtected)
  const isInvasive = type === 'species' && !!metadata?.isInvasive
  const relatedSites = deepResearch.relatedSites as
    | Array<{ name: string; code: string }>
    | undefined
  const article17 = deepResearch.article17Species as
    | Array<{ scientificName: string; status?: string; trend?: string }>
    | undefined

  const fossittCode = type === 'habitat' ? (raw.fossittCode as string) : null
  const areaHa = type === 'habitat' ? (raw.areaHectares as number) : null

  const summaryParts: string[] = []
  if (scientificName && scientificName !== finding.title) summaryParts.push(scientificName)
  if (isProtected) summaryParts.push('Protected')
  if (isInvasive) summaryParts.push('Invasive')
  if (relatedSites && relatedSites.length > 0)
    summaryParts.push(`${relatedSites.length} related sites`)
  if (article17 && article17.length > 0) summaryParts.push('Article 17')

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            bgColor
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-semibold">{finding.title}</p>
            {isProtected && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                Protected
              </Badge>
            )}
            {isInvasive && (
              <Badge
                variant="outline"
                className="border-red-200 bg-red-50 text-[10px] text-red-700"
              >
                Invasive
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {scientificName && scientificName !== finding.title && (
              <span className="mr-1.5 italic">{scientificName}</span>
            )}
            {fossittCode && <span className="mr-1.5 font-mono font-medium">{fossittCode}</span>}
            {areaHa != null && `${areaHa} ha`}
            {!expanded && summaryParts.length === 0 && aiAnalysis && (
              <span className="text-muted-foreground">
                {' · '}
                {aiAnalysis.slice(0, 80)}
                {aiAnalysis.length > 80 ? '...' : ''}
              </span>
            )}
            {!expanded && summaryParts.length > 0 && (
              <span className="text-muted-foreground"> · {summaryParts.join(' · ')}</span>
            )}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          <FindingDesignations designations={designations} />
          <FindingArticle17 article17={article17} />
          <FindingRelatedSites relatedSites={relatedSites} />
          <AiAnalysisBlock analysis={aiAnalysis} />
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-sections                                                       */
/* ------------------------------------------------------------------ */

function FindingDesignations({ designations }: { designations: string | null }) {
  if (!designations) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Shield className="h-3.5 w-3.5 text-emerald-600" />
        Designations
      </h4>
      <div className="flex flex-wrap gap-1">
        {designations.split('||').map((d, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">
            {d.trim()}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function FindingArticle17({
  article17,
}: {
  article17: Array<{ scientificName: string; status?: string; trend?: string }> | undefined
}) {
  if (!article17 || article17.length === 0) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Leaf className="h-3.5 w-3.5 text-green-600" />
        Article 17 Assessment
      </h4>
      <div className="space-y-1">
        {article17.map((sp, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800"
          >
            <span className="text-gray-800 italic dark:text-gray-200">{sp.scientificName}</span>
            <div className="flex items-center gap-1.5">
              {sp.status && (
                <span
                  className={cn('text-[10px] font-medium', {
                    'text-green-600': sp.status === 'Favourable',
                    'text-amber-600': sp.status === 'Inadequate' || sp.status === 'Unfavourable',
                    'text-red-600': sp.status === 'Bad',
                  })}
                >
                  {sp.status}
                </span>
              )}
              {sp.trend && <span className="text-[10px] text-gray-500">{sp.trend}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FindingRelatedSites({
  relatedSites,
}: {
  relatedSites: Array<{ name: string; code: string }> | undefined
}) {
  if (!relatedSites || relatedSites.length === 0) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        Related Designated Sites ({relatedSites.length})
      </h4>
      <div className="flex flex-wrap gap-1">
        {relatedSites.slice(0, 10).map((s, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">
            {s.name}
          </Badge>
        ))}
        {relatedSites.length > 10 && (
          <Badge variant="outline" className="text-[10px] text-gray-500">
            +{relatedSites.length - 10} more
          </Badge>
        )}
      </div>
    </div>
  )
}
