'use client'

import type { ReportSection } from '@/lib/supabase/queries/reports'
import { DocumentSection } from './document-section'

interface SectionDef {
  id: string
  title: string
}

interface DocumentShellProps {
  sectionDefs: SectionDef[]
  sections: ReportSection[]
  generatingSection: string | null
  onGenerate: (sectionId: string) => void
  onContentChange: (sectionId: string, content: string) => void
  onOpinionChange: (sectionId: string, opinion: string) => void
  projectId: string
}

export function DocumentShell({
  sectionDefs,
  sections,
  generatingSection,
  onGenerate,
  onContentChange,
  onOpinionChange,
  projectId,
}: DocumentShellProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mx-auto max-w-[800px] space-y-6">
        {sectionDefs.map((templateSection) => {
          const section = sections.find((s) => s.id === templateSection.id)
          return (
            <DocumentSection
              key={templateSection.id}
              id={`section-${templateSection.id}`}
              sectionId={templateSection.id}
              title={templateSection.title}
              section={section}
              isGenerating={generatingSection === templateSection.id}
              onGenerate={() => onGenerate(templateSection.id)}
              onContentChange={(content) => onContentChange(templateSection.id, content)}
              ecologistOpinion={section?.ecologistOpinion || ''}
              onEcologistOpinionChange={(opinion) => onOpinionChange(templateSection.id, opinion)}
              projectId={projectId}
            />
          )
        })}
      </div>
    </div>
  )
}
