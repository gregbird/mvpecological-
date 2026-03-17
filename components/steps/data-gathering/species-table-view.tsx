'use client'

import * as React from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FindingDisplay } from './findings-list'

interface SpeciesTableViewProps {
  findings: FindingDisplay[]
  onRowClick?: (finding: FindingDisplay) => void
  selectedFindingId?: string | null
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

export function SpeciesTableView({
  findings,
  onRowClick,
  selectedFindingId,
}: SpeciesTableViewProps) {
  if (findings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-muted-foreground text-sm">No results match the current filter</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[52px] px-1.5 text-[11px]">Species Group</TableHead>
            <TableHead className="px-1.5 text-[11px]">Species Name</TableHead>
            <TableHead className="w-[32px] px-1 text-right text-[11px]">Record Count</TableHead>
            <TableHead className="w-[72px] px-1.5 text-[11px]">Date of Last Record</TableHead>
            <TableHead className="w-[90px] px-1.5 text-[11px]">Title of Dataset</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding, idx) => {
            const isSelected = selectedFindingId === finding.id
            return (
              <TableRow
                key={`${finding.id}-${idx}`}
                className={`cursor-pointer text-xs ${
                  isSelected ? 'bg-blue-50' : finding.metadata?.isProtected ? 'bg-red-50/40' : ''
                }`}
                onClick={() => onRowClick?.(finding)}
              >
                <TableCell className="px-1.5 py-1 align-top">
                  <span className="text-muted-foreground text-xs">
                    {finding.metadata?.taxonGroup || '—'}
                  </span>
                </TableCell>
                <TableCell className="px-1.5 py-1 align-top">
                  <div className="flex items-start gap-1">
                    {finding.metadata?.isProtected && (
                      <Shield className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                    )}
                    <div>
                      <span className="text-sm leading-snug font-medium">{finding.title}</span>
                      {finding.metadata?.scientificName &&
                        finding.metadata.scientificName !== finding.title && (
                          <span className="text-muted-foreground ml-1 text-xs italic">
                            ({finding.metadata.scientificName.split(' ').slice(0, 2).join(' ')})
                          </span>
                        )}
                      {finding.metadata?.designations && (
                        <div className="mt-0.5 text-[11px] leading-tight text-red-600">
                          {finding.metadata.designations}
                        </div>
                      )}
                      {finding.metadata?.aiSummary ? (
                        <div className="text-muted-foreground mt-1 text-[11px] leading-snug">
                          {finding.metadata.aiSummary}
                        </div>
                      ) : finding.metadata?.aiSummaryLoading ? (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-600">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Generating summary...
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-1 py-1 text-right align-top font-medium">
                  {finding.metadata?.recordCount ?? '—'}
                </TableCell>
                <TableCell className="px-1.5 py-1 align-top">
                  <span className="text-muted-foreground text-[11px]">
                    {formatDate(finding.metadata?.newestRecordDate)}
                  </span>
                </TableCell>
                <TableCell className="px-1.5 py-1 align-top">
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    {finding.metadata?.datasetName || '—'}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
