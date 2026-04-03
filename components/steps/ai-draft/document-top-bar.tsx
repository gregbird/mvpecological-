'use client'

import { Loader2, Save, Copy, Sparkles, RefreshCw, Check, CloudOff, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ReportSection } from '@/lib/supabase/queries/reports'

type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface DocumentTopBarProps {
  totalSections: number
  sections: ReportSection[]
  hasContent: boolean
  canComplete: boolean
  isComplete: boolean
  generatingSection: string | null
  isSaving: boolean
  isCreatingVersion: boolean
  isCompleting: boolean
  autosaveStatus: AutosaveStatus
  lastSavedAt: Date | null
  onSave: () => void
  onSaveAsVersion: () => void
  onGenerateAll: (onlyEmpty: boolean) => void
  onComplete: () => void
}

function formatSavedTime(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

export function DocumentTopBar({
  totalSections,
  sections,
  hasContent,
  canComplete,
  isComplete,
  generatingSection,
  isSaving,
  isCreatingVersion,
  isCompleting,
  autosaveStatus,
  lastSavedAt,
  onSave,
  onSaveAsVersion,
  onGenerateAll,
  onComplete,
}: DocumentTopBarProps) {
  const filled = sections.filter((s) => s.content).length
  const total = totalSections
  const progress = (filled / total) * 100

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-2 w-24" />
        <span className="text-muted-foreground text-xs">
          {filled}/{total}
        </span>
      </div>

      {/* Autosave status */}
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {autosaveStatus === 'saving' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {autosaveStatus === 'saved' && (
          <>
            <Cloud className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span>Saved{lastSavedAt ? ` at ${formatSavedTime(lastSavedAt)}` : ''}</span>
          </>
        )}
        {autosaveStatus === 'unsaved' && (
          <>
            <CloudOff className="h-3 w-3 text-amber-500" />
            <span>Unsaved changes</span>
          </>
        )}
        {autosaveStatus === 'error' && (
          <>
            <CloudOff className="h-3 w-3 text-red-500" />
            <span className="text-red-500">Save failed</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <Button variant="outline" size="sm" onClick={onSave} disabled={!hasContent || isSaving}>
        {isSaving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-3.5 w-3.5" />
        )}
        Save
      </Button>

      {hasContent && (
        <Button variant="outline" size="sm" onClick={onSaveAsVersion} disabled={isCreatingVersion}>
          {isCreatingVersion ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          New Version
        </Button>
      )}

      {hasContent && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerateAll(false)}
          disabled={!!generatingSection}
        >
          {generatingSection ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Regen All
        </Button>
      )}

      <Button size="sm" onClick={() => onGenerateAll(true)} disabled={!!generatingSection}>
        {generatingSection ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        )}
        Generate All
      </Button>

      <Button size="sm" onClick={onComplete} disabled={!canComplete || isCompleting}>
        {isCompleting ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        )}
        {isComplete ? 'Completed' : 'Complete Step'}
      </Button>
    </div>
  )
}
