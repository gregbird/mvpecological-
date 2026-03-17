'use client'

import * as React from 'react'
import { useEffectiveReportTypes } from '@/hooks/queries/use-project-report-types'

/**
 * Manages the active report type for Steps 8-10.
 * Persists in component state (not URL) to avoid interfering with step navigation.
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
    activeType: activeType || reportTypes?.[0] || 'pea',
    setActiveType,
    reportTypes: reportTypes ?? [],
    isLoading,
  }
}
