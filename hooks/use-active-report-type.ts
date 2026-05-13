'use client'

import * as React from 'react'
import { useEffectiveReportTypes } from '@/hooks/queries/use-project-report-types'

/**
 * Manages the active report type for Steps 8-10.
 * Persists in component state (not URL) to avoid interfering with step navigation.
 *
 * Returns `activeType: ''` while `useEffectiveReportTypes` is loading. Callers
 * must gate downstream rendering on a non-empty value — a synchronous fallback
 * (previously `'pea'`) caused Step 6's `useSectionInit` to hydrate with the
 * wrong template's section IDs during the load window, which then persisted to
 * `reports.content.sections` and silently dropped subsequent Generate output
 * for any section whose ID didn't exist in the stale state.
 */
export function useActiveReportType(projectId: string) {
  const { data: reportTypes, isLoading } = useEffectiveReportTypes(projectId)
  const [activeType, setActiveType] = React.useState<string | null>(null)

  // Set initial active type when report types load
  React.useEffect(() => {
    if (reportTypes && reportTypes.length > 0 && !activeType) {
      setActiveType(reportTypes[0])
    }
  }, [reportTypes, activeType])

  // If current active type was removed, reset to first available
  React.useEffect(() => {
    if (reportTypes && activeType && !reportTypes.includes(activeType)) {
      setActiveType(reportTypes[0] || null)
    }
  }, [reportTypes, activeType])

  return {
    activeType: activeType ?? reportTypes?.[0] ?? '',
    setActiveType,
    reportTypes: reportTypes ?? [],
    isLoading,
  }
}
