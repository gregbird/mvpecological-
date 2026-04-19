'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { DeskResearchFinding } from '@/types/database'

interface FindingsFilterConfig {
  activeSiteTypeFilter: string | null
  showSavedOnly: boolean
  sourceFilter?: 'all' | 'protected' | 'invasive' | 'threatened'
  distanceFilter?: 'all' | '0-1' | '1-5' | '5-10' | '10+'
  taxonGroupFilter?: string | null
  sortBy: 'distance' | 'title' | 'type' | 'last_recorded' | 'records'
  sortOrder: 'asc' | 'desc'
}

/**
 * Parse NBDC date strings (DD/MM/YYYY or ISO) to epoch ms.
 * Undated records return 0 so they fall to the bottom on desc sort.
 */
function parseRecordDate(d?: string): number {
  if (!d) return 0
  const dmy = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) {
    const t = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`).getTime()
    return isNaN(t) ? 0 : t
  }
  const t = new Date(d).getTime()
  return isNaN(t) ? 0 : t
}

/** Check if a finding is already saved by matching ID or title */
export function isFindingSaved(
  finding: FindingDisplay,
  savedFindings: DeskResearchFinding[]
): boolean {
  return savedFindings.some((f) => f.id === finding.id || f.title === finding.title)
}

/** Get the database UUID for a display finding (display IDs are not UUIDs) */
export function getSavedFindingDbId(
  finding: FindingDisplay,
  savedFindings: DeskResearchFinding[]
): string | null {
  const saved = savedFindings.find((f) => f.id === finding.id || f.title === finding.title)
  return saved?.id ?? null
}

/**
 * Hook that takes raw findings and filter config, returns sorted + filtered findings.
 * Filter chain order: sort -> site type -> saved-only -> source -> distance
 */
export function useFindingsFilters(
  findings: FindingDisplay[],
  savedFindings: DeskResearchFinding[],
  config: FindingsFilterConfig
) {
  const {
    activeSiteTypeFilter,
    showSavedOnly,
    sourceFilter,
    distanceFilter,
    taxonGroupFilter,
    sortBy,
    sortOrder,
  } = config

  // Sort findings - protected species always first
  const sortedFindings = React.useMemo(() => {
    const sorted = [...findings]
    sorted.sort((a, b) => {
      // Protected species always come first
      const aProtected = a.metadata?.isProtected ? 1 : 0
      const bProtected = b.metadata?.isProtected ? 1 : 0
      if (aProtected !== bProtected) return bProtected - aProtected

      let comparison = 0
      switch (sortBy) {
        case 'distance': {
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          comparison = distA - distB
          break
        }
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'type':
          comparison = a.dataType.localeCompare(b.dataType)
          break
        case 'last_recorded': {
          comparison =
            parseRecordDate(a.metadata?.newestRecordDate) -
            parseRecordDate(b.metadata?.newestRecordDate)
          break
        }
        case 'records': {
          const rA = a.metadata?.recordCount ?? 0
          const rB = b.metadata?.recordCount ?? 0
          comparison = rA - rB
          break
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [findings, sortBy, sortOrder])

  // Available site types with counts (for filter buttons)
  const siteTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of sortedFindings) {
      const st = f.metadata?.siteType
      if (st) counts[st] = (counts[st] || 0) + 1
    }
    return counts
  }, [sortedFindings])

  // Count saved findings
  const savedCount = React.useMemo(() => {
    return sortedFindings.filter((f) => isFindingSaved(f, savedFindings)).length
  }, [sortedFindings, savedFindings])

  // Apply site type filter + saved filter + source filter + distance filter
  const filteredFindings = React.useMemo(() => {
    let result = sortedFindings
    if (activeSiteTypeFilter) {
      result = result.filter((f) => f.metadata?.siteType === activeSiteTypeFilter)
    }
    if (showSavedOnly) {
      result = result.filter((f) => isFindingSaved(f, savedFindings))
    }
    // Species filter: protected, invasive, threatened
    if (sourceFilter && sourceFilter !== 'all') {
      if (sourceFilter === 'protected') {
        result = result.filter((f) => f.metadata?.isProtected || f.metadata?.designations)
      } else if (sourceFilter === 'invasive') {
        result = result.filter((f) => f.metadata?.isInvasive)
      } else if (sourceFilter === 'threatened') {
        result = result.filter((f) => f.metadata?.isThreatened)
      }
    }
    if (distanceFilter && distanceFilter !== 'all') {
      result = result.filter((f) => {
        const d = f.metadata?.distance
        if (d == null) return false
        switch (distanceFilter) {
          case '0-1':
            return d <= 1
          case '1-5':
            return d > 1 && d <= 5
          case '5-10':
            return d > 5 && d <= 10
          case '10+':
            return d > 10
          default:
            return true
        }
      })
    }
    if (taxonGroupFilter) {
      result = result.filter((f) => f.metadata?.taxonGroup === taxonGroupFilter)
    }
    return result
  }, [
    sortedFindings,
    activeSiteTypeFilter,
    showSavedOnly,
    savedFindings,
    sourceFilter,
    distanceFilter,
    taxonGroupFilter,
  ])

  return { sortedFindings, filteredFindings, siteTypeCounts, savedCount }
}

/** Count unsaved findings by comparing scientific names with saved DB records */
export function getUnsavedFindings(
  filtered: FindingDisplay[],
  saved: DeskResearchFinding[]
): FindingDisplay[] {
  return filtered.filter(
    (f) =>
      !saved.some((sf) => {
        // Prefer the typed column; fall back to raw_data for pre-migration rows.
        const savedName =
          sf.scientific_name ?? (sf.raw_data as Record<string, unknown> | null)?.scientificName
        return savedName === f.metadata?.scientificName
      })
  )
}
