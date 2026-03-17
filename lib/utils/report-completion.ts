import type { Report } from '@/types/database'

type ReportStatus = Report['status']

/**
 * Given a list of reports (all versions) and the required report types,
 * returns the latest report for each type.
 */
export function getLatestReportPerType(
  reports: Report[],
  reportTypes: string[]
): Record<string, Report | undefined> {
  const result: Record<string, Report | undefined> = {}

  for (const type of reportTypes) {
    const matching = reports
      .filter((r) => r.report_type === type)
      .sort((a, b) => b.version - a.version)
    result[type] = matching[0]
  }

  return result
}

/**
 * Check whether all required report types have their latest version
 * in one of the specified statuses.
 */
export function areAllReportsInStatus(
  reports: Report[],
  reportTypes: string[],
  requiredStatuses: ReportStatus[]
): boolean {
  if (reportTypes.length === 0) return false

  const latest = getLatestReportPerType(reports, reportTypes)

  return reportTypes.every((type) => {
    const report = latest[type]
    return report && requiredStatuses.includes(report.status)
  })
}

/**
 * Returns a summary of report statuses for display.
 * e.g., { total: 3, completed: 2, types: { pea: 'approved', ecia: 'draft', aa_screening: 'final' } }
 */
export function getReportStatusSummary(
  reports: Report[],
  reportTypes: string[],
  targetStatuses: ReportStatus[]
): { total: number; completed: number; types: Record<string, ReportStatus | 'not_started'> } {
  const latest = getLatestReportPerType(reports, reportTypes)

  const types: Record<string, ReportStatus | 'not_started'> = {}
  let completed = 0

  for (const type of reportTypes) {
    const report = latest[type]
    if (report) {
      types[type] = report.status
      if (targetStatuses.includes(report.status)) completed++
    } else {
      types[type] = 'not_started'
    }
  }

  return { total: reportTypes.length, completed, types }
}
