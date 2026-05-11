'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ReportSection } from '@/lib/supabase/queries/reports'

interface TableOfContentsProps {
  sectionDefs: Array<{ id: string; title: string }>
  sections: ReportSection[]
  activeSectionId: string | null
  onSectionClick: (id: string) => void
}

export function TableOfContents({
  sectionDefs,
  sections,
  activeSectionId,
  onSectionClick,
}: TableOfContentsProps) {
  return (
    <nav className="sticky top-2 max-h-[calc(100vh-1rem)] w-48 shrink-0 space-y-1 self-start overflow-y-auto border-r pr-3">
      <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
        Contents
      </h4>
      {sectionDefs.map((def) => {
        const section = sections.find((s) => s.id === def.id)
        const status = getSectionStatus(section)

        return (
          <button
            key={def.id}
            type="button"
            onClick={() => onSectionClick(def.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              activeSectionId === def.id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'hover:bg-accent/50'
            )}
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', {
                'bg-muted-foreground/30': status === 'empty',
                'bg-blue-500 dark:bg-blue-400': status === 'template',
                'bg-purple-500 dark:bg-purple-400': status === 'ai',
                'bg-green-500 dark:bg-green-400': status === 'edited',
              })}
            />
            <span className="truncate">{def.title}</span>
          </button>
        )
      })}
      <div className="text-muted-foreground mt-4 space-y-1 border-t pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-muted-foreground/30 h-2 w-2 rounded-full" /> Empty
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" /> Template
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400" /> AI Generated
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" /> Edited
        </div>
      </div>
    </nav>
  )
}

function getSectionStatus(
  section: ReportSection | undefined
): 'empty' | 'template' | 'ai' | 'edited' {
  if (!section?.content) return 'empty'
  if (section.isEdited) return 'edited'
  if (section.aiGenerated) return 'ai'
  return 'template'
}
