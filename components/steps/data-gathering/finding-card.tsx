'use client'

import * as React from 'react'
import {
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  FlaskConical,
  Check,
  Save,
  MessageSquare,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import { FindingBadges } from './finding-badges'
import { EPA_SITE_TYPE_CONFIG } from '@/lib/config/finding-colors'

// Re-export color maps for consumers that imported them from this file
export { SOURCE_COLORS, SITE_TYPE_COLORS } from '@/lib/config/finding-colors'

interface FindingCardProps {
  finding: FindingDisplay
  isSaved: boolean
  isSaving: boolean
  isHidden: boolean
  isSelected: boolean
  onSave: (finding: FindingDisplay) => void
  onViewOnMap?: (finding: FindingDisplay) => void
  onDeepResearch?: (finding: FindingDisplay) => void
  onToggleVisibility?: (findingId: string) => void
  onFetchAiSummary?: (finding: FindingDisplay) => void
  onUpdateNote?: (findingId: string, notes: string) => void
  getSavedFindingDbId: (finding: FindingDisplay) => string | null
}

function FindingCardComponent({
  finding,
  isSaved,
  isSaving,
  isHidden,
  isSelected,
  onSave,
  onViewOnMap,
  onDeepResearch,
  onToggleVisibility,
  onFetchAiSummary,
  onUpdateNote,
  getSavedFindingDbId,
}: FindingCardProps) {
  const [isNoteOpen, setIsNoteOpen] = React.useState(false)
  const [noteDraft, setNoteDraft] = React.useState('')
  const [isSavingNote, setIsSavingNote] = React.useState(false)

  const isEpaFinding = finding.source === 'epa'
  const epaConfig = finding.metadata?.siteType
    ? EPA_SITE_TYPE_CONFIG[finding.metadata.siteType]
    : null

  return (
    <div
      id={`finding-${finding.id}`}
      className={`rounded-lg p-2.5 transition-colors ${
        isSelected
          ? 'border border-blue-400 bg-blue-50 ring-2 ring-blue-400 dark:border-blue-500 dark:bg-blue-950'
          : isHidden
            ? 'border border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800'
            : isSaved
              ? 'border-t border-r border-b border-l-4 border-gray-200 border-l-emerald-500 bg-emerald-50/60 dark:border-gray-700 dark:border-l-emerald-500 dark:bg-emerald-950/40'
              : 'border hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* Title + actions row */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isEpaFinding && epaConfig && (
              <epaConfig.icon className="h-4 w-4 shrink-0 opacity-70" />
            )}
            <h4
              className={`line-clamp-2 text-sm leading-tight font-medium ${isHidden ? 'text-gray-400' : ''}`}
              title={finding.title}
            >
              {finding.title}
            </h4>
          </div>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${isHidden ? 'text-gray-400' : 'hover:text-foreground text-gray-600'}`}
              onClick={() => onToggleVisibility(finding.id)}
              title={isHidden ? 'Show on map' : 'Hide from map'}
            >
              {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          )}
          <button
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isSaved
                ? 'text-emerald-600 hover:text-emerald-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
            }`}
            disabled={isSaving}
            onClick={(e) => {
              e.stopPropagation()
              onSave({ ...finding, isSaved: !isSaved })
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
      </div>

      {/* AI Summary */}
      {(finding.dataType === 'designated_site' ||
        finding.dataType === 'water_quality' ||
        finding.dataType === 'catchment' ||
        finding.dataType === 'species_record') && (
        <div className="mt-1.5">
          {finding.metadata?.aiSummary ? (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {finding.metadata.aiSummary}
            </p>
          ) : finding.metadata?.aiSummaryLoading ? (
            <div className="flex items-center gap-1.5 text-[11px] text-purple-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating summary...
            </div>
          ) : onFetchAiSummary ? (
            <button
              className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline"
              onClick={() => onFetchAiSummary(finding)}
            >
              <Sparkles className="h-3 w-3" />
              AI Summary
            </button>
          ) : null}
        </div>
      )}

      {/* Content summary for EPA aquatic features */}
      {(finding.dataType === 'water_quality' || finding.dataType === 'catchment') &&
        finding.content && (
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            {finding.content}
          </p>
        )}

      {/* Species detail fields */}
      {finding.dataType === 'species_record' && finding.metadata && (
        <div className="mt-1.5 space-y-1 text-[11px]">
          {finding.metadata.scientificName && (
            <div className="text-muted-foreground italic">{finding.metadata.scientificName}</div>
          )}
          {finding.metadata.designations && (
            <div className="text-[10px] leading-tight font-medium text-red-600">
              {finding.metadata.designations
                .split('||')
                .map((d: string) => d.trim())
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {finding.metadata.taxonGroup && (
              <span className="text-muted-foreground">{finding.metadata.taxonGroup}</span>
            )}
            {finding.metadata.recordCount && finding.metadata.recordCount > 0 && (
              <span className="text-muted-foreground">{finding.metadata.recordCount} records</span>
            )}
            {finding.metadata.newestRecordDate && (
              <span className="text-muted-foreground">
                Last: {finding.metadata.newestRecordDate}
              </span>
            )}
            {finding.metadata.datasetName && (
              <span className="text-muted-foreground max-w-[200px] truncate">
                {finding.metadata.datasetName}
              </span>
            )}
          </div>
          {/* Grid squares info */}
          {(() => {
            const squares =
              (finding.metadata as Record<string, unknown> | undefined)?.gridSquares ??
              (finding.rawData as Record<string, unknown> | undefined)?.gridSquares
            if (!Array.isArray(squares) || squares.length === 0) return null
            return (
              <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border border-purple-300 bg-purple-50" />
                <span>
                  Found in {squares.length} grid square
                  {squares.length > 1 ? 's' : ''}
                  {squares.length <= 4 && `: ${(squares as string[]).join(', ')}`}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* Compact badges row */}
      <FindingBadges finding={finding} />

      {/* Compact action links */}
      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
        {finding.location && onViewOnMap && (
          <button className="text-blue-600 hover:underline" onClick={() => onViewOnMap(finding)}>
            View on map
          </button>
        )}
        {(finding.dataType === 'designated_site' ||
          finding.dataType === 'species_record' ||
          finding.dataType === 'water_quality' ||
          finding.dataType === 'catchment') &&
          onDeepResearch && (
            <button
              className="flex items-center gap-1 font-medium text-purple-600 hover:underline"
              onClick={() => onDeepResearch(finding)}
            >
              <FlaskConical className="h-3 w-3" />
              Deep Research
            </button>
          )}
        {finding.metadata?.nbdcEnriched ? (
          <>
            {(finding.metadata?.gbifUrl || finding.sourceUrl) && (
              <a
                href={finding.metadata?.gbifUrl || finding.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                GBIF ↗
              </a>
            )}
            {finding.metadata?.nbdcUrl && (
              <a
                href={finding.metadata.nbdcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                NBDC ↗
              </a>
            )}
          </>
        ) : (
          finding.sourceUrl && (
            <a
              href={finding.sourceUrl}
              target="_blank"
              title={finding.sourceUrl}
              rel="noopener noreferrer"
              className="text-gray-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Source ↗
            </a>
          )
        )}
        {isSaved && onUpdateNote && (
          <button
            className={`flex items-center gap-1 ${finding.notes ? 'text-amber-600 hover:text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={() => {
              if (isNoteOpen) {
                setIsNoteOpen(false)
              } else {
                setNoteDraft(finding.notes ?? '')
                setIsNoteOpen(true)
              }
            }}
            title={finding.notes ? 'Edit note' : 'Add note'}
          >
            <MessageSquare className="h-3 w-3" />
            {finding.notes ? 'Note' : 'Add note'}
          </button>
        )}
      </div>

      {/* Inline note display (when not editing) */}
      {finding.notes && !isNoteOpen && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-amber-800">{finding.notes}</p>
        </div>
      )}

      {/* Inline note editor (when open) */}
      {isNoteOpen && onUpdateNote && (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            autoFocus
            className="w-full rounded border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 focus:outline-none"
            rows={3}
            placeholder="Add a note about this finding..."
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              disabled={isSavingNote}
              className="flex h-6 items-center gap-1 rounded bg-amber-500 px-2 text-[11px] font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              onClick={async () => {
                const dbId = getSavedFindingDbId(finding)
                if (!dbId) return
                setIsSavingNote(true)
                await onUpdateNote(dbId, noteDraft)
                setIsSavingNote(false)
                setIsNoteOpen(false)
              }}
            >
              {isSavingNote ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              className="flex h-6 items-center gap-1 rounded px-2 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setIsNoteOpen(false)}
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const FindingCard = React.memo(FindingCardComponent)
