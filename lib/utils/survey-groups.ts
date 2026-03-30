import type { SurveyWithSurveyor } from '@/lib/supabase/queries/surveys'

export interface SurveyGroup {
  visitGroupId: string
  surveyType: string
  visits: SurveyWithSurveyor[]
  totalVisits: number
  completedVisits: number
  canComplete: boolean
}

/**
 * Group surveys by visit_group_id. Surveys without a group are returned as standalone.
 * Groups are ordered by earliest survey_date; visits within a group are ordered by visit_number.
 */
export function groupSurveysByVisit(surveys: SurveyWithSurveyor[]): {
  groups: SurveyGroup[]
  standalone: SurveyWithSurveyor[]
} {
  const groupMap = new Map<string, SurveyWithSurveyor[]>()
  const standalone: SurveyWithSurveyor[] = []

  for (const survey of surveys) {
    if (survey.visit_group_id) {
      const existing = groupMap.get(survey.visit_group_id) || []
      existing.push(survey)
      groupMap.set(survey.visit_group_id, existing)
    } else {
      standalone.push(survey)
    }
  }

  const groups: SurveyGroup[] = []
  for (const [visitGroupId, visits] of groupMap) {
    // Sort by visit_number
    visits.sort((a, b) => (a.visit_number ?? 0) - (b.visit_number ?? 0))

    const completedVisits = visits.filter((v) => v.status === 'completed').length

    groups.push({
      visitGroupId,
      surveyType: visits[0].survey_type,
      visits,
      totalVisits: visits.length,
      completedVisits,
      canComplete: visits.every((v) => v.status === 'completed'),
    })
  }

  // Sort groups by earliest survey date
  groups.sort((a, b) => {
    const dateA = a.visits[0]?.survey_date ?? ''
    const dateB = b.visits[0]?.survey_date ?? ''
    return dateB.localeCompare(dateA)
  })

  return { groups, standalone }
}

/**
 * Check if all visits in a group are completed (allowing group approval).
 */
export function canCompleteSurveyGroup(group: SurveyGroup): boolean {
  return group.visits.every((v) => v.status === 'completed')
}

/**
 * Get previous visits in the same group, ordered by visit_number.
 */
export function getPreviousVisits(
  surveys: SurveyWithSurveyor[],
  currentSurveyId: string
): SurveyWithSurveyor[] {
  const current = surveys.find((s) => s.id === currentSurveyId)
  if (!current?.visit_group_id) return []

  return surveys
    .filter(
      (s) =>
        s.visit_group_id === current.visit_group_id &&
        s.id !== currentSurveyId &&
        (s.visit_number ?? 0) < (current.visit_number ?? 0)
    )
    .sort((a, b) => (a.visit_number ?? 0) - (b.visit_number ?? 0))
}

/**
 * Get the next visit_number for a group.
 */
export function getNextVisitNumber(surveys: SurveyWithSurveyor[], visitGroupId: string): number {
  const groupVisits = surveys.filter((s) => s.visit_group_id === visitGroupId)
  if (groupVisits.length === 0) return 1
  const maxVisit = Math.max(...groupVisits.map((s) => s.visit_number ?? 0))
  return maxVisit + 1
}
