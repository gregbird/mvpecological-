'use client'

import * as React from 'react'
import {
  Check,
  Loader2,
  Shield,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Ruler,
  MessageSquare,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import {
  getAISummary,
  getDeepResearch,
  getSiteType,
} from '@/hooks/data-gathering/use-export-findings'
import type { DeskResearchFinding } from '@/types/database'

// Data type badge colors
const DATA_TYPE_COLORS: Record<string, string> = {
  designated_site: 'bg-emerald-100 text-emerald-700',
  species_record: 'bg-purple-100 text-purple-700',
  water_quality: 'bg-cyan-100 text-cyan-700',
  catchment: 'bg-cyan-100 text-cyan-700',
}

// Site type badge colors
const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-blue-100 text-blue-700',
  SPA: 'bg-amber-100 text-amber-700',
  NHA: 'bg-green-100 text-green-700',
  pNHA: 'bg-teal-100 text-teal-700',
}

// Red list status badge colors
const RED_LIST_COLORS: Record<string, string> = {
  CR: 'bg-red-200 text-red-800',
  EN: 'bg-red-100 text-red-700',
  VU: 'bg-orange-100 text-orange-700',
  NT: 'bg-yellow-100 text-yellow-700',
  LC: 'bg-green-100 text-green-700',
}

interface ReviewFindingsTableProps {
  savedFindings: DeskResearchFinding[]
}

export function ReviewFindingsTable({ savedFindings }: ReviewFindingsTableProps) {
  const [expandedFindingId, setExpandedFindingId] = React.useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({})
  const [savingNoteIds, setSavingNoteIds] = React.useState<Set<string>>(new Set())
  const updateFinding = useUpdateFinding()

  if (savedFindings.length === 0) {
    return (
      <div className="py-4 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-muted-foreground text-sm">No findings saved</p>
        <p className="text-muted-foreground text-xs">
          Go to previous tabs to search and save findings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {savedFindings.map((finding) => {
        const aiSummary = getAISummary(finding)
        const deepResearch = getDeepResearch(finding)
        const siteType = getSiteType(finding)
        const isExpanded = expandedFindingId === finding.id
        const rawData = finding.raw_data as Record<string, unknown> | null
        const metadata = rawData?.metadata as Record<string, unknown> | undefined
        const scientificName = metadata?.scientificName as string | undefined
        const taxonGroup = metadata?.taxonGroup as string | undefined
        const designations = metadata?.designations as string | undefined
        const totalRecords = metadata?.totalIrishRecords as number | undefined

        return (
          <div
            key={finding.id}
            className="cursor-pointer rounded-lg border bg-gray-50 text-sm transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
          >
            <div className="flex items-start gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* Title row */}
                <div className="flex items-center gap-1.5">
                  {finding.is_protected && <Shield className="h-4 w-4 shrink-0 text-red-500" />}
                  <span className="min-w-0 flex-1 font-medium">{finding.title}</span>
                </div>
                {/* Scientific name / taxon for species */}
                {scientificName && scientificName !== finding.title && (
                  <p className="text-xs text-gray-500 italic">{scientificName}</p>
                )}
                {/* Content preview */}
                {finding.content && (
                  <p className="text-muted-foreground line-clamp-2 text-xs">{finding.content}</p>
                )}
                {/* Badge row */}
                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    className={`text-[9px] ${DATA_TYPE_COLORS[finding.data_type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {finding.data_type.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {finding.source.toUpperCase()}
                  </Badge>
                  {siteType && (
                    <Badge
                      className={`text-[9px] ${SITE_TYPE_COLORS[siteType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                      {siteType}
                    </Badge>
                  )}
                  {taxonGroup && (
                    <Badge variant="outline" className="text-[9px]">
                      {taxonGroup}
                    </Badge>
                  )}
                  {finding.distance_from_boundary_km != null && (
                    <Badge variant="outline" className="gap-0.5 text-[9px]">
                      <Ruler className="h-2.5 w-2.5" />
                      {finding.distance_from_boundary_km.toFixed(1)} km
                    </Badge>
                  )}
                  {finding.red_list_status && (
                    <Badge
                      className={`text-[9px] ${RED_LIST_COLORS[finding.red_list_status] || 'bg-orange-100 text-orange-700'}`}
                    >
                      {finding.red_list_status}
                    </Badge>
                  )}
                  {totalRecords != null && totalRecords > 0 && (
                    <Badge variant="outline" className="text-[9px]">
                      {totalRecords.toLocaleString()} Irish records
                    </Badge>
                  )}
                  {aiSummary && <Sparkles className="h-3 w-3 shrink-0 text-purple-500" />}
                  {deepResearch && <BookOpen className="h-3 w-3 shrink-0 text-indigo-500" />}
                </div>
                {/* Designations preview for species */}
                {designations && (
                  <p className="text-[10px] leading-tight text-red-600">
                    {designations
                      .split('||')
                      .slice(0, 2)
                      .map((d) => d.trim())
                      .join(' · ')}
                    {designations.split('||').length > 2 && ' ...'}
                  </p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              ) : (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="space-y-0 border-t">
                {/* Full content */}
                {finding.content && (
                  <div className="bg-background border-b p-3">
                    <div className="mb-1 text-[10px] font-medium text-gray-500 uppercase">
                      Description
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
                      {finding.content}
                    </p>
                  </div>
                )}
                {/* Note section */}
                <div
                  className="border-b bg-amber-50 p-3 dark:bg-amber-950"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      <MessageSquare className="h-3 w-3" />
                      Note on: {finding.title}
                    </div>
                    {editingNoteId !== finding.id && (
                      <button
                        className="text-[10px] text-amber-600 hover:underline"
                        onClick={() => {
                          setNoteDrafts((prev) => ({
                            ...prev,
                            [finding.id]: finding.notes || '',
                          }))
                          setEditingNoteId(finding.id)
                        }}
                      >
                        {finding.notes ? 'Edit' : 'Add note'}
                      </button>
                    )}
                  </div>
                  {editingNoteId === finding.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        autoFocus
                        className="bg-background w-full rounded border border-amber-300 p-2 text-[11px] leading-relaxed text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 focus:outline-none dark:border-amber-700 dark:text-amber-200 dark:placeholder:text-amber-600"
                        rows={3}
                        placeholder="Add a note about this finding..."
                        value={noteDrafts[finding.id] ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({
                            ...prev,
                            [finding.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <button
                          disabled={savingNoteIds.has(finding.id)}
                          className="flex h-6 items-center gap-1 rounded bg-amber-500 px-2 text-[11px] font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                          onClick={async () => {
                            const draft = noteDrafts[finding.id] ?? ''
                            setSavingNoteIds((prev) => new Set(prev).add(finding.id))
                            try {
                              await updateFinding.mutateAsync({
                                findingId: finding.id,
                                updates: { notes: draft || null },
                              })
                            } catch {
                              // error handled by react-query
                            } finally {
                              setSavingNoteIds((prev) => {
                                const next = new Set(prev)
                                next.delete(finding.id)
                                return next
                              })
                              setEditingNoteId(null)
                            }
                          }}
                        >
                          {savingNoteIds.has(finding.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save
                        </button>
                        <button
                          className="flex h-6 items-center gap-1 rounded px-2 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={() => setEditingNoteId(null)}
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : finding.notes ? (
                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                      {finding.notes}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-400 italic">
                      No note yet. Click &ldquo;Add note&rdquo; to annotate this finding.
                    </p>
                  )}
                </div>
                {/* AI Summary section */}
                {aiSummary && (
                  <div className="bg-purple-50 p-3 dark:bg-purple-950">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-purple-700 dark:text-purple-400">
                      <Sparkles className="h-3 w-3" />
                      AI Summary
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{aiSummary}</p>
                  </div>
                )}
                {/* Deep Research section */}
                {deepResearch && (
                  <div
                    className={`bg-indigo-50 p-3 dark:bg-indigo-950 ${aiSummary ? 'border-t border-indigo-100 dark:border-indigo-800' : ''}`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-400">
                      <BookOpen className="h-3 w-3" />
                      Deep Research
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {deepResearch.substring(0, 600)}
                      {deepResearch.length > 600 && '...'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
