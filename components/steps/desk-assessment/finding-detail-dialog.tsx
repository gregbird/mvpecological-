'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink, Sparkles, Microscope } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getFindingSourceUrl } from '@/lib/utils/finding-source-url'
import { getAISummary, getDeepResearch } from '@/lib/utils/finding-display'
import type { DeskResearchFinding } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  designated_site: 'Designated Site',
  species_record: 'Species Record',
  water_quality: 'Aquatic Feature',
  catchment: 'Catchment',
  habitat: 'Habitat',
  company_report: 'Company Report',
  other: 'Other',
}

interface FindingDetailDialogProps {
  finding: DeskResearchFinding | null
  onClose: () => void
}

export function FindingDetailDialog({ finding, onClose }: FindingDetailDialogProps) {
  const aiSummary = finding ? getAISummary(finding) : null
  const rawDeepResearch = finding ? getDeepResearch(finding) : null
  // If aiSummary already falls back to deep research (designated sites case),
  // don't render the same content twice in a separate "Deep Research" section.
  const deepResearch = rawDeepResearch && rawDeepResearch !== aiSummary ? rawDeepResearch : null
  const sourceUrl = finding ? getFindingSourceUrl(finding) : null

  return (
    <Dialog open={finding != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-xl">{finding?.title}</DialogTitle>
          {finding && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[finding.data_type] || finding.data_type}
              </Badge>
              <Badge variant="outline" className="text-xs uppercase">
                {finding.source}
              </Badge>
              {finding.is_protected && (
                <Badge className="border-emerald-200 bg-emerald-100 text-xs text-emerald-800">
                  Protected
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {aiSummary ? (
            <section>
              <div className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Summary
              </div>
              <div className="prose prose-sm dark:prose-invert text-foreground max-w-none rounded-md border bg-purple-50 p-4 dark:bg-purple-950/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
              </div>
            </section>
          ) : (
            <section>
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm italic">
                No AI summary saved for this finding yet.
              </div>
            </section>
          )}

          {deepResearch && (
            <section>
              <div className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <Microscope className="h-4 w-4 text-blue-500" />
                Deep Research
              </div>
              <div className="prose prose-sm dark:prose-invert text-foreground max-w-none rounded-md border bg-blue-50 p-4 dark:bg-blue-950/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepResearch}</ReactMarkdown>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {sourceUrl && (
            <Button asChild variant="outline">
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in source
              </a>
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
