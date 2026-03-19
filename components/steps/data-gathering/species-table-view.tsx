'use client'

import * as React from 'react'
import { Shield, Loader2, Bookmark, BookmarkCheck, Sparkles, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FindingDisplay } from './findings-list'
import type { DeskResearchFinding } from '@/types/database'

interface SpeciesTableViewProps {
  findings: FindingDisplay[]
  savedFindings?: DeskResearchFinding[]
  onRowClick?: (finding: FindingDisplay) => void
  selectedFindingId?: string | null
  onSave?: (finding: FindingDisplay) => void
  onFetchAiSummary?: (finding: FindingDisplay) => void
  onDeepResearch?: (finding: FindingDisplay) => void
  savingIds?: Set<string>
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const dmy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`)
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
  }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

function shortDesignation(raw?: string): string | null {
  if (!raw) return null
  const parts = raw
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length <= 2) return parts.join(' · ')
  return `${parts.slice(0, 2).join(' · ')} +${parts.length - 2} more`
}

export function SpeciesTableView({
  findings,
  savedFindings = [],
  onRowClick,
  selectedFindingId,
  onSave,
  onFetchAiSummary,
  onDeepResearch,
  savingIds,
}: SpeciesTableViewProps) {
  if (findings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-muted-foreground text-sm">No results match the current filter</p>
      </div>
    )
  }

  const isSaved = (finding: FindingDisplay) =>
    savedFindings.some(
      (sf) =>
        (sf.raw_data as Record<string, unknown>)?.scientificName ===
        finding.metadata?.scientificName
    )

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[70px] bg-white px-1.5 text-[11px]">Species Group</TableHead>
            <TableHead className="min-w-[180px] bg-white px-1.5 text-[11px]">
              Species Name
            </TableHead>
            <TableHead className="w-[40px] bg-white px-1 text-right text-[11px]">Records</TableHead>
            <TableHead className="w-[72px] bg-white px-1.5 text-[11px]">Last Record</TableHead>
            <TableHead className="w-[110px] bg-white px-1.5 text-[11px]">Dataset</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding, idx) => {
            const isSelected = selectedFindingId === finding.id
            const designation = shortDesignation(finding.metadata?.designations)
            const saved = isSaved(finding)
            const isSaving = savingIds?.has(finding.id) ?? false

            return (
              <TableRow
                key={`${finding.id}-${idx}`}
                className={`cursor-pointer text-xs ${
                  isSelected ? 'bg-blue-50' : finding.metadata?.isProtected ? 'bg-red-50/40' : ''
                }`}
                onClick={() => onRowClick?.(finding)}
              >
                <TableCell className="px-1.5 py-1.5 align-top">
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    {finding.metadata?.taxonGroup || '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-[280px] px-1.5 py-1.5 align-top">
                  <div className="flex items-start gap-1">
                    {finding.metadata?.isProtected && (
                      <Shield className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                    )}
                    <div className="min-w-0">
                      <span className="text-[13px] leading-snug font-medium">{finding.title}</span>
                      {finding.metadata?.scientificName &&
                        finding.metadata.scientificName !== finding.title && (
                          <span className="text-muted-foreground ml-1 text-[11px] italic">
                            ({finding.metadata.scientificName.split(' ').slice(0, 2).join(' ')})
                          </span>
                        )}
                      {designation && (
                        <div className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-red-600">
                          {designation}
                        </div>
                      )}
                      {finding.metadata?.aiSummary ? (
                        <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[10px] leading-snug">
                          {finding.metadata.aiSummary}
                        </div>
                      ) : finding.metadata?.aiSummaryLoading ? (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-purple-600">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Generating...
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-1 py-1.5 text-right align-top font-medium tabular-nums">
                  {finding.metadata?.recordCount ?? '—'}
                </TableCell>
                <TableCell className="px-1.5 py-1.5 align-top">
                  <span className="text-muted-foreground text-[11px]">
                    {formatDate(finding.metadata?.newestRecordDate)}
                  </span>
                </TableCell>
                <TableCell className="max-w-[120px] px-1.5 py-1.5 align-top">
                  <span className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
                    {finding.metadata?.datasetName || '—'}
                  </span>
                </TableCell>
                <TableCell className="px-1 py-1.5 align-top">
                  <div
                    className="flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Save/unsave */}
                    {onSave && (
                      <button
                        onClick={() => onSave(finding)}
                        disabled={isSaving}
                        className={`rounded p-0.5 transition-colors ${
                          saved
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={saved ? 'Saved' : 'Save finding'}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : saved ? (
                          <BookmarkCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {/* AI Summary */}
                    {onFetchAiSummary &&
                      !finding.metadata?.aiSummary &&
                      !finding.metadata?.aiSummaryLoading && (
                        <button
                          onClick={() => onFetchAiSummary(finding)}
                          className="rounded p-0.5 text-purple-400 transition-colors hover:text-purple-600"
                          title="Generate AI summary"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      )}
                    {/* Deep Research */}
                    {onDeepResearch && (
                      <button
                        onClick={() => onDeepResearch(finding)}
                        className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                        title="Deep Research"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
