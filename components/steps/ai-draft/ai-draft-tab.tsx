'use client'

import * as React from 'react'
import { PEA_REPORT_SECTIONS, type ReportSection } from '@/lib/supabase/queries/reports'
import { TableOfContents } from './table-of-contents'
import { DocumentShell } from './document-shell'
import { DocumentTopBar } from './document-top-bar'
import { AssetPanel } from './asset-panel'
import { VersionHistoryPanel } from './version-history-panel'
import type { Project, Report } from '@/types/database'

interface AIDraftTabProps {
  project: Project
  sections: ReportSection[]
  generatingSection: string | null
  hasContent: boolean
  canComplete: boolean
  isComplete: boolean
  isSaving: boolean
  isCreatingVersion: boolean
  isCompleting: boolean
  existingReport: Report | null
  allReports: Report[]
  onGenerate: (sectionId: string) => void
  onGenerateAll: (onlyEmpty: boolean) => void
  onContentChange: (sectionId: string, content: string) => void
  onOpinionChange: (sectionId: string, opinion: string) => void
  onSave: () => void
  onSaveAsVersion: () => void
  onComplete: () => void
  onViewVersion: (report: Report) => void
  onCompareVersion: (report: Report) => void
  onRestoreVersion: (report: Report) => void
}

export function AIDraftTab({
  project,
  sections,
  generatingSection,
  hasContent,
  canComplete,
  isComplete,
  isSaving,
  isCreatingVersion,
  isCompleting,
  existingReport,
  allReports,
  onGenerate,
  onGenerateAll,
  onContentChange,
  onOpinionChange,
  onSave,
  onSaveAsVersion,
  onComplete,
  onViewVersion,
  onCompareVersion,
  onRestoreVersion,
}: AIDraftTabProps) {
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(
    PEA_REPORT_SECTIONS[0]?.id ?? null
  )

  const handleSectionClick = (id: string) => {
    setActiveSectionId(id)
    const el = document.getElementById(`section-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Version History */}
      {allReports.length > 0 && (
        <div className="px-4 pt-3">
          <VersionHistoryPanel
            projectId={project.id}
            currentReportId={existingReport?.id ?? null}
            onViewVersion={onViewVersion}
            onCompareVersion={onCompareVersion}
            onRestoreVersion={onRestoreVersion}
          />
        </div>
      )}

      {/* Top bar */}
      <DocumentTopBar
        sections={sections}
        hasContent={hasContent}
        canComplete={canComplete}
        isComplete={isComplete}
        generatingSection={generatingSection}
        isSaving={isSaving}
        isCreatingVersion={isCreatingVersion}
        isCompleting={isCompleting}
        onSave={onSave}
        onSaveAsVersion={onSaveAsVersion}
        onGenerateAll={onGenerateAll}
        onComplete={onComplete}
      />

      {/* Three-column layout */}
      <div className="flex min-h-0 flex-1 p-4">
        <TableOfContents
          sectionDefs={PEA_REPORT_SECTIONS}
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
        />
        <DocumentShell
          sections={sections}
          generatingSection={generatingSection}
          onGenerate={onGenerate}
          onContentChange={onContentChange}
          onOpinionChange={onOpinionChange}
          projectId={project.id}
        />
        <AssetPanel project={project} />
      </div>
    </div>
  )
}
