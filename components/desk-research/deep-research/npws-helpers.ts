'use client'

import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'
import { createElement } from 'react'
import { getTrendDisplay } from '@/lib/data/article17-habitats'

/**
 * Generate NPWS URLs for a site
 */
export function getNPWSUrls(siteCode: string, siteType: string) {
  const typePathMap: Record<string, string> = {
    SAC: 'sac',
    SPA: 'spa',
    NHA: 'nha',
  }
  const typePath = typePathMap[siteType]

  // pNHA sites: use synopsis PDF URL directly
  const numericCode = siteCode.replace(/^IE/, '').padStart(6, '0')
  const synopsisPdfUrl = `https://www.npws.ie/sites/default/files/protected-sites/synopsis/SY${numericCode}.pdf`

  const baseUrl = typePath
    ? `https://www.npws.ie/protected-sites/${typePath}/${siteCode}`
    : siteType === 'pNHA'
      ? synopsisPdfUrl
      : `https://www.npws.ie/protected-sites/sac/${siteCode}`

  return {
    synopsis: baseUrl,
    synopsisPdf: synopsisPdfUrl,
    conservationObjectives:
      siteType === 'pNHA'
        ? 'https://www.npws.ie/protected-sites'
        : `${baseUrl}/conservation-objectives`,
    article17: 'https://www.npws.ie/publications/article-17-reports',
    siteMap: `https://www.npws.ie/maps-and-data`,
  }
}

/**
 * Get protection level description
 */
export function getProtectionDescription(siteType: string): string {
  const descriptions: Record<string, string> = {
    SAC: 'Special Area of Conservation - Protected under EU Habitats Directive (92/43/EEC). Legally binding conservation objectives apply.',
    SPA: 'Special Protection Area - Protected under EU Birds Directive (2009/147/EC). Protects rare and vulnerable bird species.',
    NHA: 'Natural Heritage Area - Protected under Wildlife (Amendment) Act 2000. National level protection for habitats and species.',
    pNHA: 'Proposed Natural Heritage Area - Identified for protection but not yet legally designated. Still requires consideration in planning.',
  }
  return descriptions[siteType] || 'Protected site requiring ecological assessment.'
}

/**
 * Trend icon component
 */
export function TrendIcon({ trend }: { trend: string }) {
  const trendDisplay = getTrendDisplay(trend as 'improving' | 'stable' | 'declining' | 'unknown')
  const icons = {
    improving: TrendingUp,
    stable: Minus,
    declining: TrendingDown,
    unknown: HelpCircle,
  }
  const Icon = icons[trend as keyof typeof icons] || HelpCircle
  return createElement(Icon, { className: `h-4 w-4 ${trendDisplay.color}` })
}
