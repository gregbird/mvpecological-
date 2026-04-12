'use client'

import dynamic from 'next/dynamic'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { Report } from '@/types/database'

const SectionEditor = dynamic(
  () => import('./section-editor').then((mod) => ({ default: mod.SectionEditor })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-24 animate-pulse rounded-md" /> }
)

interface SectionDef {
  id: string
  title: string
}

interface VersionCompareDialogProps {
  sectionDefs: SectionDef[]
  open: boolean
  onOpenChange: (open: boolean) => void
  currentReport: Report | null
  compareReport: Report | null
}

type SectionDiffStatus = 'unchanged' | 'changed' | 'added' | 'removed'

interface SectionDiff {
  sectionId: string
  sectionTitle: string
  status: SectionDiffStatus
  oldContent: string
  newContent: string
}

const STATUS_BADGE: Record<
  SectionDiffStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  unchanged: { label: 'Unchanged', variant: 'outline' },
  changed: { label: 'Changed', variant: 'secondary' },
  added: { label: 'Added', variant: 'default' },
  removed: { label: 'Removed', variant: 'destructive' },
}

function computeDiffs(
  oldReport: Report | null,
  newReport: Report | null,
  sectionDefs: SectionDef[]
): SectionDiff[] {
  const oldContent = oldReport?.content as unknown as ReportContent | null
  const newContent = newReport?.content as unknown as ReportContent | null
  const oldSections = oldContent?.sections ?? []
  const newSections = newContent?.sections ?? []

  return sectionDefs.map((tmpl) => {
    const oldSection = oldSections.find((s) => s.id === tmpl.id)
    const newSection = newSections.find((s) => s.id === tmpl.id)
    const oldText = oldSection?.content?.trim() ?? ''
    const newText = newSection?.content?.trim() ?? ''

    let status: SectionDiffStatus = 'unchanged'
    if (!oldText && newText) status = 'added'
    else if (oldText && !newText) status = 'removed'
    else if (oldText !== newText) status = 'changed'

    return {
      sectionId: tmpl.id,
      sectionTitle: tmpl.title,
      status,
      oldContent: oldText,
      newContent: newText,
    }
  })
}

export function VersionCompareDialog({
  sectionDefs,
  open,
  onOpenChange,
  currentReport,
  compareReport,
}: VersionCompareDialogProps) {
  if (!currentReport || !compareReport) return null

  // compareReport is the historical version (old), currentReport is the latest (new)
  const diffs = computeDiffs(compareReport, currentReport, sectionDefs)
  const changedCount = diffs.filter((d) => d.status !== 'unchanged').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>
            Version {compareReport.version} → Version {currentReport.version}
          </DialogTitle>
          <DialogDescription>
            {changedCount === 0
              ? 'No differences found between these versions.'
              : `${changedCount} section${changedCount > 1 ? 's' : ''} changed`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-4">
          <Accordion
            type="multiple"
            defaultValue={diffs.filter((d) => d.status !== 'unchanged').map((d) => d.sectionId)}
            className="w-full"
          >
            {diffs.map((diff) => {
              const badge = STATUS_BADGE[diff.status]
              return (
                <AccordionItem key={diff.sectionId} value={diff.sectionId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{diff.sectionTitle}</span>
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {diff.status === 'unchanged' ? (
                      <p className="text-muted-foreground text-sm italic">
                        Content is identical in both versions.
                      </p>
                    ) : diff.status === 'added' ? (
                      <div className="rounded-md border bg-green-50 p-4 dark:bg-green-950/20">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          Version {currentReport.version} (new)
                        </p>
                        <SectionEditor
                          content={diff.newContent}
                          editable={false}
                          onContentChange={() => {}}
                        />
                      </div>
                    ) : diff.status === 'removed' ? (
                      <div className="rounded-md border bg-red-50 p-4 dark:bg-red-950/20">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          Version {compareReport.version} (removed)
                        </p>
                        <SectionEditor
                          content={diff.oldContent}
                          editable={false}
                          onContentChange={() => {}}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-md border bg-red-50/50 p-4 dark:bg-red-950/10">
                          <p className="text-muted-foreground mb-2 text-xs font-medium">
                            Version {compareReport.version}
                          </p>
                          <div className="max-h-80 overflow-y-auto">
                            <SectionEditor
                              content={diff.oldContent}
                              editable={false}
                              onContentChange={() => {}}
                            />
                          </div>
                        </div>
                        <div className="rounded-md border bg-green-50/50 p-4 dark:bg-green-950/10">
                          <p className="text-muted-foreground mb-2 text-xs font-medium">
                            Version {currentReport.version}
                          </p>
                          <div className="max-h-80 overflow-y-auto">
                            <SectionEditor
                              content={diff.newContent}
                              editable={false}
                              onContentChange={() => {}}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
