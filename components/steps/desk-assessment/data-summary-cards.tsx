'use client'

import * as React from 'react'
import { MapPin, Bug, Droplets, Layers, ChevronDown, AlertTriangle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { FindingDetailDialog } from './finding-detail-dialog'
import type { DeskResearchFinding } from '@/types/database'

interface FindingsByType {
  designated_site: DeskResearchFinding[]
  species_record: DeskResearchFinding[]
  aquatic: DeskResearchFinding[]
  habitat: DeskResearchFinding[]
  other: DeskResearchFinding[]
}

interface DataSummaryCardsProps {
  findingsByType: FindingsByType
  protectedSpeciesCount: number
}

interface CardConfig {
  key: string
  findingsKey: keyof FindingsByType
  label: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
  linkColor: string
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'designated_site',
    findingsKey: 'designated_site',
    label: 'Designated Sites',
    icon: MapPin,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    linkColor: 'text-emerald-700',
  },
  {
    key: 'species_record',
    findingsKey: 'species_record',
    label: 'Species Records',
    icon: Bug,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
    linkColor: 'text-purple-700',
  },
  {
    key: 'water_quality',
    findingsKey: 'aquatic',
    label: 'Aquatic Features',
    icon: Droplets,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    linkColor: 'text-blue-700',
  },
  {
    key: 'habitat',
    findingsKey: 'habitat',
    label: 'Habitat Types',
    icon: Layers,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100',
    linkColor: 'text-green-700',
  },
]

export function DataSummaryCards({ findingsByType, protectedSpeciesCount }: DataSummaryCardsProps) {
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = React.useState<DeskResearchFinding | null>(null)

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <BarChart3 className="h-5 w-5" />
        Data Summary
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARD_CONFIGS.map((config) => {
          const findings = findingsByType[config.findingsKey] || []
          const Icon = config.icon
          return (
            <Card key={config.key}>
              <CardContent className="p-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-3"
                  onClick={() => setExpandedCard(expandedCard === config.key ? null : config.key)}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      config.bgColor
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.iconColor)} />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold">{findings.length}</div>
                    <div className="text-muted-foreground text-xs">{config.label}</div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0 transition-transform',
                      expandedCard === config.key && 'rotate-180'
                    )}
                  />
                </button>
                {expandedCard === config.key && findings.length > 0 && (
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t pt-2">
                    {findings.map((f) => (
                      <li key={f.id} className="flex items-start gap-1.5 text-xs">
                        <span className="text-muted-foreground mt-0.5">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFinding(f)}
                          className={cn('text-left hover:underline', config.linkColor)}
                        >
                          <span className="line-clamp-1">{f.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Protected Species Warning */}
      {protectedSpeciesCount > 0 && (
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-800">
                  {protectedSpeciesCount} Protected Species
                </div>
                <div className="text-xs text-amber-700">Requires attention</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  )
}
