/**
 * Article 17 (2025) Conservation Status Data for Annex I Habitats in Ireland
 * Source: NPWS Article 17 Report 2025 - The Status of EU Protected Habitats and Species in Ireland
 * https://www.npws.ie/publications/article-17-reports
 *
 * Conservation Status:
 * - FV: Favourable
 * - U1: Unfavourable-Inadequate
 * - U2: Unfavourable-Bad
 * - XX: Unknown
 *
 * Trend:
 * - improving: ↑
 * - stable: →
 * - declining: ↓
 * - unknown: ?
 */

import data from './json/article17-habitats.json'

export type ConservationStatus = 'FV' | 'U1' | 'U2' | 'XX'
export type ConservationTrend = 'improving' | 'stable' | 'declining' | 'unknown'

export interface Article17Habitat {
  code: string
  name: string
  nameIrish?: string
  status: ConservationStatus
  trend: ConservationTrend
  pressures: string[]
  threats: string[]
  priorityHabitat: boolean
  // Brief assessment summary
  assessment: string
}

/**
 * Article 17 2025 Conservation Status for Irish Annex I Habitats
 * Data extracted from NPWS Article 17 Report 2025
 */
export const ARTICLE_17_HABITATS: Record<string, Article17Habitat> = data as Record<
  string,
  Article17Habitat
>

/**
 * Get conservation status display info
 */
export function getStatusDisplay(status: ConservationStatus): {
  label: string
  color: string
  bgColor: string
  description: string
} {
  const statusMap: Record<
    ConservationStatus,
    { label: string; color: string; bgColor: string; description: string }
  > = {
    FV: {
      label: 'Favourable',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      description: 'The habitat is in good condition and not under threat.',
    },
    U1: {
      label: 'Unfavourable-Inadequate',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      description: 'The habitat is not in favourable condition but not severely degraded.',
    },
    U2: {
      label: 'Unfavourable-Bad',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      description: 'The habitat is in serious decline or very degraded condition.',
    },
    XX: {
      label: 'Unknown',
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      description: 'Insufficient data to assess conservation status.',
    },
  }
  return statusMap[status]
}

/**
 * Get trend display info
 */
export function getTrendDisplay(trend: ConservationTrend): {
  label: string
  icon: string
  color: string
} {
  const trendMap: Record<ConservationTrend, { label: string; icon: string; color: string }> = {
    improving: { label: 'Improving', icon: '↑', color: 'text-green-600' },
    stable: { label: 'Stable', icon: '→', color: 'text-blue-600' },
    declining: { label: 'Declining', icon: '↓', color: 'text-red-600' },
    unknown: { label: 'Unknown', icon: '?', color: 'text-gray-500' },
  }
  return trendMap[trend]
}

/**
 * Get Article 17 data for a habitat code
 */
export function getArticle17Data(habitatCode: string): Article17Habitat | null {
  return ARTICLE_17_HABITATS[habitatCode] || null
}

/**
 * Get conservation status summary for multiple habitats
 */
export function getHabitatsSummary(habitatCodes: string[]): {
  total: number
  favourable: number
  unfavourableInadequate: number
  unfavourableBad: number
  unknown: number
  improving: number
  declining: number
  priorityCount: number
} {
  const habitats = habitatCodes.map((code) => ARTICLE_17_HABITATS[code]).filter(Boolean)

  return {
    total: habitats.length,
    favourable: habitats.filter((h) => h.status === 'FV').length,
    unfavourableInadequate: habitats.filter((h) => h.status === 'U1').length,
    unfavourableBad: habitats.filter((h) => h.status === 'U2').length,
    unknown: habitats.filter((h) => h.status === 'XX').length,
    improving: habitats.filter((h) => h.trend === 'improving').length,
    declining: habitats.filter((h) => h.trend === 'declining').length,
    priorityCount: habitats.filter((h) => h.priorityHabitat).length,
  }
}
