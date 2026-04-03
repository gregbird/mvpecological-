'use client'

import * as React from 'react'
import { Loader2, Search, Layers, Sparkles, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarkdownContent } from '@/components/desk-research/deep-research-shell'
import { HabitatResultCard } from '@/components/steps/data-gathering/habitat-result-card'
import type { HabitatResult } from '@/components/steps/data-gathering/habitat-data-substep'
import type { DeskResearchFinding } from '@/types/database'

interface HabitatResultsPanelProps {
  filteredResults: HabitatResult[]
  filteredTotalArea: number
  isSearching: boolean
  selectedBuffer: number
  bufferDistances: number[]
  selectedHabitat: HabitatResult | null
  overallAi: string
  isOverallLoading: boolean
  isSavingAll: boolean
  allSaved: boolean
  aiSummaries: Record<string, string>
  loadingSummaries: Set<string>
  notes: Record<string, string>
  editingNoteId: string | null
  noteDraft: string
  savingIds: Set<string>
  onBufferChange: (buffer: number) => void
  onSearch: () => void
  onRowClick: (r: HabitatResult) => void
  onSave: (r: HabitatResult) => void
  onSaveAll: () => void
  onGenerateOverall: () => void
  onFetchAiSummary: (r: HabitatResult) => void
  onOpenDeepResearch: (r: HabitatResult) => void
  onStartEditNote: (nlcId: string) => void
  onCloseEditNote: () => void
  onNoteDraftChange: (value: string) => void
  onSaveNote: (nlcId: string) => void
  getSavedFinding: (nlcId: string) => DeskResearchFinding | undefined
}

export function HabitatResultsPanel({
  filteredResults,
  filteredTotalArea,
  isSearching,
  selectedBuffer,
  bufferDistances,
  selectedHabitat,
  overallAi,
  isOverallLoading,
  isSavingAll,
  allSaved,
  aiSummaries,
  loadingSummaries,
  notes,
  editingNoteId,
  noteDraft,
  savingIds,
  onBufferChange,
  onSearch,
  onRowClick,
  onSave,
  onSaveAll,
  onGenerateOverall,
  onFetchAiSummary,
  onOpenDeepResearch,
  onStartEditNote,
  onCloseEditNote,
  onNoteDraftChange,
  onSaveNote,
  getSavedFinding,
}: HabitatResultsPanelProps) {
  return (
    <div className="flex w-[40%] shrink-0 flex-col border-r">
      {/* Search Controls */}
      <div className="border-b p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Layers className="h-4 w-4 text-green-600" />
          Habitat Data (NLC 2018)
        </h3>
        <div className="flex items-center gap-2">
          <Select
            value={selectedBuffer.toString()}
            onValueChange={(v) => onBufferChange(parseFloat(v))}
          >
            <SelectTrigger className="w-30">
              <SelectValue placeholder="Buffer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Boundary only</SelectItem>
              <SelectItem value="0.1">100m</SelectItem>
              {(bufferDistances.length > 0 ? bufferDistances : [2, 5])
                .filter((d) => d !== 0 && d !== 0.1)
                .map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d} km
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={onSearch}
            disabled={isSearching}
            className="flex-1 border-green-300 text-green-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Habitats
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-hidden">
        {filteredResults.length === 0 && !isSearching ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Layers className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground">Search to find habitat data</p>
          </div>
        ) : isSearching ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-medium">{filteredResults.length} habitat types</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {filteredTotalArea.toLocaleString()} ha
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSaveAll}
                  disabled={isSavingAll || allSaved}
                  className="h-7 gap-1 text-xs text-emerald-600"
                >
                  {isSavingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : allSaved ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <CheckCheck className="h-3 w-3" />
                  )}
                  {isSavingAll ? 'Saving...' : allSaved ? 'All Saved' : 'Save All'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGenerateOverall}
                  disabled={isOverallLoading}
                  className="h-7 gap-1 text-xs text-purple-600"
                >
                  {isOverallLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {overallAi ? 'Regenerate' : 'AI Analysis'}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-2">
                {filteredResults.map((r) => {
                  const pct =
                    filteredTotalArea > 0
                      ? ((r.areaHectares / filteredTotalArea) * 100).toFixed(1)
                      : '0'
                  return (
                    <HabitatResultCard
                      key={r.nlcId}
                      result={r}
                      percentCover={pct}
                      isSelected={selectedHabitat?.nlcId === r.nlcId}
                      isSaved={!!getSavedFinding(r.nlcId)}
                      isSaving={savingIds.has(r.nlcId)}
                      summary={aiSummaries[r.nlcId]}
                      isSummaryLoading={loadingSummaries.has(r.nlcId)}
                      note={notes[r.nlcId]}
                      isEditingNote={editingNoteId === r.nlcId}
                      noteDraft={noteDraft}
                      onRowClick={() => onRowClick(r)}
                      onSave={() => onSave(r)}
                      onFetchAiSummary={() => onFetchAiSummary(r)}
                      onOpenDeepResearch={() => onOpenDeepResearch(r)}
                      onStartEditNote={() => onStartEditNote(r.nlcId)}
                      onCloseEditNote={onCloseEditNote}
                      onNoteDraftChange={onNoteDraftChange}
                      onSaveNote={() => onSaveNote(r.nlcId)}
                    />
                  )
                })}
              </div>

              {/* Overall AI Analysis */}
              {overallAi && (
                <div className="border-t p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700">
                      Overall Habitat Analysis
                    </span>
                  </div>
                  <MarkdownContent text={overallAi} />
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
