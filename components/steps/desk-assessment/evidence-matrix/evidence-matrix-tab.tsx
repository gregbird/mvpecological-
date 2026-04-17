'use client'

import * as React from 'react'
import { Loader2, AlertCircle, FolderOpen, Inbox } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useEvidenceMatrix, useGenerateEvidenceNarrative } from '@/hooks/steps/use-evidence-matrix'
import { EvidenceNarrative } from './evidence-narrative'
import { EvidenceTable } from './evidence-table'

/**
 * Step 3 tab that stitches the narrative card + matrix table over the same
 * `/api/projects/[id]/evidence-matrix` response.
 *
 * The matrix query runs automatically on mount (deterministic, cheap).
 * The narrative is user-triggered (gpt-5, default reasoning, slower) so the
 * table is interactive immediately while the synthesis generates on demand.
 */

interface EvidenceMatrixTabProps {
  projectId: string
  siteId: string | null
}

export function EvidenceMatrixTab({ projectId, siteId }: EvidenceMatrixTabProps) {
  const { data, isLoading, error } = useEvidenceMatrix(projectId, siteId)
  const generateNarrative = useGenerateEvidenceNarrative(projectId, siteId)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <div>
          <h3 className="text-foreground text-sm font-semibold">Failed to load evidence matrix</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { entities, narrative, metadata } = data
  const hasFindings = metadata.totalFindings > 0
  const hasMentions = metadata.totalMentions > 0

  // Empty state 1: no findings at all → nothing to cross-reference against
  if (!hasFindings && !hasMentions) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Inbox className="text-muted-foreground/40 h-10 w-10" />
        <div>
          <h3 className="text-foreground text-sm font-semibold">No evidence to compare yet</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Save findings in Step 2 (Data Gathering) and index company reports in Dropbox
            Connection. The evidence matrix cross-references them automatically.
          </p>
        </div>
      </div>
    )
  }

  // Empty state 2: findings exist but no company-report mentions → prompt to
  // re-process so the matrix has something to overlay on top of official data.
  if (hasFindings && !hasMentions) {
    return (
      <div className="space-y-4">
        <div className="border-border bg-muted/40 dark:bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <FolderOpen className="text-muted-foreground/60 mx-auto mb-2 h-8 w-8" />
          <h3 className="text-foreground text-sm font-semibold">
            No entity mentions extracted yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-lg text-sm">
            You have {metadata.totalFindings} findings but no entities have been extracted from your
            indexed reports. Open the Dropbox Connection page and hit{' '}
            <span className="font-medium">Re-process</span> next to each document to run them
            through the updated pipeline.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/search">Go to Dropbox Connection</Link>
          </Button>
        </div>
        {/* Table still renders so users see their findings grouped by source. */}
        <EvidenceTable entities={entities} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <EvidenceNarrative
        narrative={narrative}
        isGenerating={generateNarrative.isPending}
        onGenerate={() => generateNarrative.mutate()}
      />
      <EvidenceTable entities={entities} />
    </div>
  )
}
