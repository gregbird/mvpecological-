import * as React from 'react'
import { useReportTemplateByType } from './use-template-management-hooks'
import { resolveReportSections } from '@/lib/supabase/queries/templates'
import type { ReportSectionDefinition } from '@/lib/config/template-types'

/**
 * Resolves the active section definitions for a project's report type.
 *
 * If the organization has a custom template (`use_custom = true`) for this
 * report type, its sections are returned (with aiPrompt merged from defaults
 * when ids match). Otherwise the Dulra Standard section list is returned.
 *
 * Step 6/7/8 and the AI generate route should ALL use this so that custom
 * sections — added/removed/renamed/reordered by the org admin — drive the
 * full reporting pipeline, not just the initial template render.
 */
export function useResolvedReportSections(
  organizationId: string | null | undefined,
  reportType: string
): { sections: ReportSectionDefinition[]; isLoading: boolean } {
  const { data: template, isLoading } = useReportTemplateByType(
    organizationId ?? undefined,
    reportType
  )

  const sections = React.useMemo(
    () => resolveReportSections(reportType, template ?? null),
    [reportType, template]
  )

  return { sections, isLoading }
}
