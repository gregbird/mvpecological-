'use client'

import dynamic from 'next/dynamic'
import { format } from 'date-fns'

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
  { ssr: false, loading: () => <div className="bg-muted/30 h-32 animate-pulse rounded-md" /> }
)

interface SectionDef {
  id: string
  title: string
}

interface VersionViewDialogProps {
  sectionDefs: SectionDef[]
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report | null
}

export function VersionViewDialog({
  sectionDefs,
  open,
  onOpenChange,
  report,
}: VersionViewDialogProps) {
  if (!report) return null

  const content = report.content as unknown as ReportContent | null
  const sections = content?.sections ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Version {report.version}
            <Badge variant="outline" className="text-xs">
              {report.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Created {format(new Date(report.created_at), 'dd MMMM yyyy, HH:mm')}
            {content?.metadata?.sourceVersion !== undefined && (
              <> &middot; Restored from v{content.metadata.sourceVersion}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-4">
          <Accordion type="multiple" defaultValue={sectionDefs.map((s) => s.id)} className="w-full">
            {sectionDefs.map((tmpl) => {
              const section = sections.find((s) => s.id === tmpl.id)
              const hasContent = !!section?.content?.trim()

              return (
                <AccordionItem key={tmpl.id} value={tmpl.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{tmpl.title}</span>
                      {!hasContent && (
                        <Badge variant="outline" className="text-xs">
                          Empty
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {hasContent ? (
                      <SectionEditor
                        content={section!.content}
                        editable={false}
                        onContentChange={() => {}}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm italic">
                        No content in this section.
                      </p>
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
