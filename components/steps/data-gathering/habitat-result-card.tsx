'use client'

import { Loader2, Sparkles, FlaskConical, MessageSquare, Save, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getHeritageColor } from '@/lib/config/map-constants'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'

interface HabitatResultCardProps {
  result: HabitatResult
  percentCover: string
  isSelected: boolean
  isSaved: boolean
  isSaving: boolean
  summary?: string
  isSummaryLoading: boolean
  note?: string
  isEditingNote: boolean
  noteDraft: string
  onRowClick: () => void
  onSave: () => void
  onFetchAiSummary: () => void
  onOpenDeepResearch: () => void
  onStartEditNote: () => void
  onCloseEditNote: () => void
  onNoteDraftChange: (value: string) => void
  onSaveNote: () => void
}

export function HabitatResultCard({
  result: r,
  percentCover: pct,
  isSelected,
  isSaved,
  isSaving,
  summary,
  isSummaryLoading,
  note,
  isEditingNote,
  noteDraft,
  onRowClick,
  onSave,
  onFetchAiSummary,
  onOpenDeepResearch,
  onStartEditNote,
  onCloseEditNote,
  onNoteDraftChange,
  onSaveNote,
}: HabitatResultCardProps) {
  const color = getHeritageColor(r.fossittCode)

  return (
    <div
      className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
        isSelected
          ? 'border border-blue-400 bg-blue-50 ring-2 ring-blue-400 dark:border-blue-500 dark:bg-blue-950'
          : isSaved
            ? 'border-t border-r border-b border-l-4 border-gray-200 border-l-emerald-500 bg-emerald-50/60 dark:border-gray-700 dark:border-l-emerald-500 dark:bg-emerald-950/40'
            : 'border hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onRowClick}
    >
      {/* Title + save button row */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <h4 className="line-clamp-2 text-sm leading-tight font-medium">{r.fossittName}</h4>
          </div>
        </div>
        <button
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
            isSaved
              ? 'text-emerald-600 hover:text-emerald-700'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
          }`}
          disabled={isSaving}
          onClick={(e) => {
            e.stopPropagation()
            onSave()
          }}
          title={isSaved ? 'Remove from saved' : 'Save finding'}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSaved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* AI Summary */}
      <div className="mt-1.5">
        {summary ? (
          <p className="text-muted-foreground text-[11px] leading-relaxed">{summary}</p>
        ) : isSummaryLoading ? (
          <div className="flex items-center gap-1.5 text-[11px] text-purple-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating summary...
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onFetchAiSummary()
            }}
          >
            <Sparkles className="h-3 w-3" />
            AI Summary
          </button>
        )}
      </div>

      {/* Note display */}
      {note && !isEditingNote && (
        <div className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
          <p className="text-[11px] leading-relaxed text-amber-900">
            <MessageSquare className="mr-1 inline h-3 w-3 text-amber-500" />
            {note}
          </p>
        </div>
      )}

      {/* Badges row */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
          {r.fossittCode}
        </Badge>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {r.nlcLabel}
        </Badge>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {r.areaHectares.toLocaleString()} ha ({pct}%)
        </Badge>
      </div>

      {/* Action links row */}
      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
        <button
          className="flex items-center gap-1 font-medium text-purple-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            onOpenDeepResearch()
          }}
        >
          <FlaskConical className="h-3 w-3" />
          Deep Research
        </button>
        <button
          className={`flex items-center gap-1 hover:underline ${note ? 'text-amber-600' : 'text-gray-500'}`}
          onClick={(e) => {
            e.stopPropagation()
            if (isEditingNote) {
              onCloseEditNote()
            } else {
              onStartEditNote()
            }
          }}
        >
          <MessageSquare className="h-3 w-3" />
          {isEditingNote ? 'Close Note' : note ? 'Edit Note' : 'Add Note'}
        </button>
      </div>

      {/* Note edit area */}
      {isEditingNote && (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            autoFocus
            rows={3}
            value={noteDraft}
            onChange={(e) => onNoteDraftChange(e.target.value)}
            placeholder="Add a note about this finding..."
            className="w-full rounded border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-2">
            <button
              className="flex h-6 items-center gap-1 rounded bg-amber-500 px-2 text-[11px] font-medium text-white hover:bg-amber-600"
              onClick={(e) => {
                e.stopPropagation()
                onSaveNote()
              }}
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              className="flex h-6 items-center gap-1 rounded px-2 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation()
                onCloseEditNote()
              }}
            >
              <span className="text-[11px]">&times;</span>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
