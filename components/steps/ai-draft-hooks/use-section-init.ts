'use client'

import * as React from 'react'
import { renderReportTemplate } from '@/lib/templates/template-renderer'
import { getReportTemplateByType, jsonToSections } from '@/lib/supabase/queries/templates'
import type { TemplateData } from '@/lib/templates/template-renderer'
import type { Report } from '@/types/database'
import type { ReportContent, ReportSection } from '@/lib/supabase/queries/reports'
import type { ReportSectionDefinition } from '@/lib/config/template-types'
import { isLegacyPeaContent, migrateLegacyPeaContent } from './migrate-legacy-pea'

interface UseSectionInitArgs {
  existingReport: Report | null | undefined
  templateData: TemplateData | null | undefined
  reportType: string
  reportSectionDefs: ReportSectionDefinition[]
  organizationId: string | null | undefined
  setSections: (sections: ReportSection[]) => void
}

/**
 * Initialise the section state when the report or template inputs change:
 *   - existing report content (with legacy migration when needed)
 *   - else org template (when `use_custom = true`) → renderReportTemplate
 *   - else Dulra Standard rendered with placeholder substitution
 *   - else empty sections from the type's section list
 */
export function useSectionInit({
  existingReport,
  templateData,
  reportType,
  reportSectionDefs,
  organizationId,
  setSections,
}: UseSectionInitArgs): void {
  React.useEffect(() => {
    const existingMatchesType =
      existingReport?.report_type === reportType ||
      // Also accept if the existing report has no report_type (legacy)
      !existingReport?.report_type

    if (existingReport?.content && existingMatchesType) {
      const content = existingReport.content as unknown as ReportContent
      if (content.sections) {
        if (isLegacyPeaContent(content)) {
          setSections(migrateLegacyPeaContent(content))
        } else {
          setSections(content.sections)
        }
      }
      return
    }

    if (templateData) {
      // Render template with placeholder substitution. Custom org sections (when
      // `use_custom`) take precedence; otherwise renderReportTemplate uses the
      // type-specific Dulra Standard template or default sections.
      const initSections = async () => {
        let customSections: { id: string; title: string; template: string }[] | undefined
        if (organizationId) {
          try {
            const orgTemplate = await getReportTemplateByType(organizationId, reportType)
            if (orgTemplate?.use_custom && orgTemplate.sections) {
              const parsed = jsonToSections(orgTemplate.sections)
              if (parsed.length > 0) customSections = parsed
            }
          } catch {
            // Fall through to defaults
          }
        }
        const rendered = renderReportTemplate(reportType, templateData, customSections)
        if (rendered.length > 0) {
          setSections(rendered)
        } else {
          setSections(
            reportSectionDefs.map((s) => ({
              id: s.id,
              title: s.title,
              content: '',
              isEdited: false,
              aiGenerated: false,
            }))
          )
        }
      }
      initSections()
      return
    }

    // No template data yet — show empty sections
    setSections(
      reportSectionDefs.map((s) => ({
        id: s.id,
        title: s.title,
        content: '',
        isEdited: false,
        aiGenerated: false,
      }))
    )
  }, [existingReport, templateData, reportType, reportSectionDefs, organizationId, setSections])
}
