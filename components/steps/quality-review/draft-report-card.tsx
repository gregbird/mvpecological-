'use client'

import dynamic from 'next/dynamic'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoteList } from './note-list'
import type { ReviewNotesMap } from './types'
import type { ReportContent } from '@/lib/supabase/queries/reports'

const SectionEditor = dynamic(
  () =>
    import('@/components/steps/ai-draft/section-editor').then((mod) => ({
      default: mod.SectionEditor,
    })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-32 animate-pulse rounded-md" /> }
)

interface DraftReportCardProps {
  reportSectionDefs: { id: string; title: string }[]
  reportContent: ReportContent | undefined
  sectionNotes: ReviewNotesMap
  isComplete: boolean
  addingNoteFor: string | null
  noteText: string
  onNoteTextChange: (value: string) => void
  onStartAdding: (scopeId: string) => void
  onCancelAdding: () => void
  onSaveNote: (scopeId: string) => void
  onDeleteNote: (scopeId: string, noteId: string) => void
}

/**
 * Read-only render of every section in the resolved template, with reviewer
 * notes attached to each. Empty sections show a placeholder; AI-generated
 * sections get a pink tint so the reviewer can spot them at a glance.
 */
export function DraftReportCard({
  reportSectionDefs,
  reportContent,
  sectionNotes,
  isComplete,
  addingNoteFor,
  noteText,
  onNoteTextChange,
  onStartAdding,
  onCancelAdding,
  onSaveNote,
  onDeleteNote,
}: DraftReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Draft Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {reportSectionDefs.map((def) => {
            const section = reportContent?.sections?.find((s) => s.id === def.id)
            return (
              <div key={def.id} className="border-b pb-6 last:border-b-0">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{def.title}</h3>
                  {section?.content && (
                    <Badge
                      variant={
                        section.isEdited ? 'secondary' : section.aiGenerated ? 'default' : 'outline'
                      }
                      className="text-xs"
                    >
                      {section.isEdited
                        ? 'Edited'
                        : section.aiGenerated
                          ? 'AI Generated'
                          : 'Template'}
                    </Badge>
                  )}
                </div>
                {section?.content ? (
                  <div
                    className={
                      section.aiGenerated
                        ? 'rounded-md border border-pink-200 bg-pink-50/60 p-3 dark:border-pink-900 dark:bg-pink-950/20'
                        : ''
                    }
                  >
                    <SectionEditor
                      content={section.content}
                      editable={false}
                      onContentChange={() => {}}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No content generated for this section.
                  </p>
                )}

                <NoteList
                  notes={sectionNotes[def.id] || []}
                  scopeId={def.id}
                  isComplete={isComplete}
                  isAdding={addingNoteFor === def.id}
                  noteText={noteText}
                  onNoteTextChange={onNoteTextChange}
                  onStartAdding={onStartAdding}
                  onCancelAdding={onCancelAdding}
                  onSaveNote={onSaveNote}
                  onDeleteNote={onDeleteNote}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
