'use client'

import * as React from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * AI-generated cross-source synthesis card. Lives above the evidence table so
 * users get the prose read-out first, then drop into the table for detail.
 *
 * Narrative is optional — the matrix is useful on its own. The regenerate
 * button is always shown so the user can refresh when findings change, and
 * labelled "Generate" on first render when there is no narrative yet.
 */

interface EvidenceNarrativeProps {
  narrative: string | null
  isGenerating: boolean
  error?: Error | null
  onGenerate: () => void
}

export function EvidenceNarrative({
  narrative,
  isGenerating,
  error,
  onGenerate,
}: EvidenceNarrativeProps) {
  const hasNarrative = Boolean(narrative && narrative.trim().length > 0)

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">
              Cross-Source Synthesis
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {hasNarrative ? 'Regenerate' : 'Generate'}
          </Button>
        </div>

        {isGenerating ? (
          <div className="flex items-center gap-2 py-4 text-sm text-purple-700 dark:text-purple-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Synthesising evidence across your findings and indexed reports…
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Synthesis failed</p>
            <p className="mt-1 text-xs opacity-80">{error.message}</p>
            <p className="mt-1 text-xs opacity-70">
              Click Regenerate to retry — this can happen if the model takes longer than the request
              timeout.
            </p>
          </div>
        ) : hasNarrative ? (
          <div className="prose prose-sm dark:prose-invert text-foreground max-w-none whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{narrative!}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Generate an AI synthesis that compares saved findings with mentions in your indexed
            company reports — highlights overlaps, gaps, and report-only references in prose.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
