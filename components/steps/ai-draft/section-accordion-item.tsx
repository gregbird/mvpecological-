'use client'

import dynamic from 'next/dynamic'
import { Loader2, Sparkles, Edit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { ReportSection } from '@/lib/supabase/queries/reports'

const SectionEditor = dynamic(
  () => import('./section-editor').then((mod) => ({ default: mod.SectionEditor })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-48 animate-pulse rounded-md" /> }
)

interface SectionAccordionItemProps {
  templateId: string
  templateTitle: string
  index: number
  section: ReportSection | undefined
  isGenerating: boolean
  isEditing: boolean
  onGenerate: () => void
  onToggleEdit: () => void
  onContentChange: (content: string) => void
}

export function SectionAccordionItem({
  templateId,
  templateTitle,
  index,
  section,
  isGenerating,
  isEditing,
  onGenerate,
  onToggleEdit,
  onContentChange,
}: SectionAccordionItemProps) {
  return (
    <AccordionItem value={templateId}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-muted-foreground text-sm">{index + 1}.</span>
          <span>{templateTitle}</span>
          {section?.content && (
            <Badge variant={section.isEdited ? 'secondary' : 'outline'} className="ml-2">
              {section.isEdited ? 'Edited' : 'AI Generated'}
            </Badge>
          )}
          {section?.content && (
            <div
              role="button"
              tabIndex={0}
              className="hover:bg-accent mr-2 ml-auto flex h-7 w-7 items-center justify-center rounded-md px-1"
              onClick={(e) => {
                e.stopPropagation()
                if (!isGenerating) onGenerate()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  if (!isGenerating) onGenerate()
                }
              }}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {section?.content ? 'Regenerate' : 'Generate'}
            </Button>
            {section?.content && (
              <Button variant="outline" size="sm" onClick={onToggleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                {isEditing ? 'Done Editing' : 'Edit'}
              </Button>
            )}
          </div>

          {/* Content */}
          {isGenerating ? (
            <div className="bg-muted/50 flex h-32 items-center justify-center rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground text-sm">Generating content...</span>
              </div>
            </div>
          ) : section?.content ? (
            <SectionEditor
              content={section.content}
              editable={isEditing}
              onContentChange={onContentChange}
            />
          ) : (
            <div className="bg-muted/30 text-muted-foreground rounded-lg p-4 text-center text-sm">
              Click &quot;Generate&quot; to create AI-assisted content for this section.
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
