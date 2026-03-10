'use client'

import { Shield, SquarePen, Trash2, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SpeciesObservation } from '@/types/database'

export const TAXON_LABELS: Record<string, string> = {
  mammal: 'Mammals',
  bird: 'Birds',
  reptile: 'Reptiles',
  amphibian: 'Amphibians',
  fish: 'Fish',
  invertebrate: 'Invertebrates',
  plant: 'Plants',
  fungi: 'Fungi',
  other: 'Other',
}

export const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
}

interface ObservationListItemProps {
  observation: SpeciesObservation
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ObservationListItem({
  observation,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: ObservationListItemProps) {
  const confidenceColor = CONFIDENCE_COLORS[observation.confidence_level] || 'bg-gray-400'

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
        isSelected ? 'border-primary bg-muted/50' : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {TAXON_LABELS[observation.taxon_group || 'other'] || observation.taxon_group}
            </Badge>
            {observation.is_protected && (
              <Badge variant="destructive" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Protected
              </Badge>
            )}
            {observation.behavior_notes?.includes('Imported from data gathering') && (
              <Badge variant="secondary" className="text-xs text-blue-600">
                <Download className="mr-1 h-3 w-3" />
                Data Gathering
              </Badge>
            )}
            <div
              className={`h-2.5 w-2.5 rounded-full ${confidenceColor}`}
              title={`Confidence: ${observation.confidence_level}`}
            />
          </div>
          <h4 className="mt-1 truncate text-sm font-medium italic">
            {observation.species_name_scientific}
          </h4>
          {observation.species_name_common && (
            <p className="text-muted-foreground truncate text-xs">
              {observation.species_name_common}
            </p>
          )}
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            {observation.count && <span>Count: {observation.count}</span>}
            {observation.evidence_type && <span>• {observation.evidence_type}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
