'use client'

import * as React from 'react'
import { Layers, MapPin, Waves } from 'lucide-react'

import { cn } from '@/lib/utils'

export type FindingGroupKey = 'designated_site' | 'aquatic' | 'habitats'

const GROUPS = [
  {
    key: 'designated_site' as const,
    label: 'Sites',
    icon: MapPin,
    activeClass:
      'bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600',
  },
  {
    key: 'aquatic' as const,
    label: 'Aquatic',
    icon: Waves,
    activeClass: 'bg-cyan-500 text-white border-cyan-500 dark:bg-cyan-600 dark:border-cyan-600',
  },
  {
    key: 'habitats' as const,
    label: 'Habitats',
    icon: Layers,
    activeClass: 'bg-green-500 text-white border-green-500 dark:bg-green-600 dark:border-green-600',
  },
]

interface MapFindingGroupToggleProps {
  visibleGroups: Set<string>
  onToggle: (group: FindingGroupKey) => void
  className?: string
}

export function MapFindingGroupToggle({
  visibleGroups,
  onToggle,
  className,
}: MapFindingGroupToggleProps) {
  return (
    <div
      data-map-control="true"
      className={cn(
        'bg-background/90 pointer-events-auto absolute top-4 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1 shadow-md backdrop-blur-sm',
        className
      )}
    >
      {GROUPS.map(({ key, label, icon: Icon, activeClass }) => {
        const active = visibleGroups.has(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              active
                ? activeClass
                : 'border-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
            title={`${active ? 'Hide' : 'Show'} ${label}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
