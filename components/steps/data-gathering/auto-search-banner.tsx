'use client'

import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AutoSearchStatus = 'idle' | 'searching' | 'done' | 'skipped' | 'error'

interface AutoSearchBannerProps {
  autoSearchStatus: {
    sites: AutoSearchStatus
    species: AutoSearchStatus
    aquatic: AutoSearchStatus
    habitats: AutoSearchStatus
  }
  visible: boolean
}

const STATUS_INDICATORS = [
  { key: 'sites' as const, label: 'NPWS' },
  { key: 'species' as const, label: 'GBIF' },
  { key: 'aquatic' as const, label: 'EPA' },
  { key: 'habitats' as const, label: 'NLC' },
]

function getStatusDotClass(status: AutoSearchStatus): string {
  switch (status) {
    case 'searching':
      return 'animate-pulse bg-blue-500'
    case 'done':
      return 'bg-emerald-500'
    case 'skipped':
      return 'bg-gray-400'
    case 'error':
      return 'bg-red-500'
    case 'idle':
    default:
      return 'bg-gray-300'
  }
}

export function AutoSearchBanner({ autoSearchStatus, visible }: AutoSearchBannerProps) {
  if (!visible) return null

  const statuses = [
    autoSearchStatus.sites,
    autoSearchStatus.species,
    autoSearchStatus.aquatic,
    autoSearchStatus.habitats,
  ]
  const total = statuses.length
  const completed = statuses.filter((s) => ['done', 'skipped', 'error'].includes(s)).length
  const heading =
    completed >= total
      ? 'Auto-search complete'
      : `Auto-searching ecological databases... (${completed}/${total})`

  return (
    <div className="border-border shrink-0 border-b bg-blue-50/80 px-4 py-2">
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">{heading}</span>
        <div className="ml-auto flex items-center gap-2">
          {STATUS_INDICATORS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className={cn('h-2 w-2 rounded-full', getStatusDotClass(autoSearchStatus[key]))}
              />
              <span className="text-xs text-blue-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
