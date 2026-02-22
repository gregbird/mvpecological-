'use client'

import dynamic from 'next/dynamic'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EcologistOpinionInline } from './ecologist-opinion-inline'
import type { ReportSection } from '@/lib/supabase/queries/reports'

const SectionEditor = dynamic(
  () => import('./section-editor').then((mod) => ({ default: mod.SectionEditor })),
  { ssr: false, loading: () => <div className="bg-muted/30 h-32 animate-pulse rounded-md" /> }
)

interface DocumentSectionProps {
  id: string
  sectionId: string
  title: string
  section: ReportSection | undefined
  isGenerating: boolean
  onGenerate: () => void
  onContentChange: (content: string) => void
  ecologistOpinion: string
  onEcologistOpinionChange: (value: string) => void
  projectId: string
}

export function DocumentSection({
  id,
  title,
  section,
  isGenerating,
  onGenerate,
  onContentChange,
  ecologistOpinion,
  onEcologistOpinionChange,
  projectId,
}: DocumentSectionProps) {
  const statusBadge = section?.content ? (
    <Badge
      variant={section.isEdited ? 'secondary' : section.aiGenerated ? 'default' : 'outline'}
      className="text-xs"
    >
      {section.isEdited ? 'Edited' : section.aiGenerated ? 'AI Generated' : 'Template'}
    </Badge>
  ) : null

  return (
    <div id={id} className="border-b pb-6 last:border-b-0">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {statusBadge}
        </div>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : section?.content ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {section?.content ? 'Regenerate' : 'Generate with AI'}
        </Button>
      </div>

      {/* Ecologist opinion */}
      <div className="mb-3">
        <EcologistOpinionInline value={ecologistOpinion} onChange={onEcologistOpinionChange} />
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
          editable={true}
          onContentChange={onContentChange}
          projectId={projectId}
        />
      ) : (
        <div className="bg-muted/30 text-muted-foreground rounded-lg p-6 text-center text-sm">
          Click &quot;Generate with AI&quot; to create content for this section, or start typing
          manually.
        </div>
      )}
    </div>
  )
}
