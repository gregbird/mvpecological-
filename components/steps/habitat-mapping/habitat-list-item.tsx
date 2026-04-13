'use client'

import { Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import { getHeritageColor } from '@/lib/config/map-constants'
import type { HabitatPolygon } from '@/types/database'

export const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'bg-green-600' },
  good: { label: 'Good', color: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'bg-amber-500' },
  poor: { label: 'Poor', color: 'bg-orange-500' },
  bad: { label: 'Bad', color: 'bg-red-500' },
}

interface HabitatListItemProps {
  habitat: HabitatPolygon
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}

export function HabitatListItem({
  habitat,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled,
}: HabitatListItemProps) {
  const conditionInfo = CONDITION_LABELS[habitat.condition || 'moderate']
  const fossittInfo = getHabitatByCode(habitat.fossitt_code)

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isSelected ? 'border-primary bg-muted/50' : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="font-mono"
          style={{
            borderColor: getHeritageColor(habitat.fossitt_code),
            color: getHeritageColor(habitat.fossitt_code),
          }}
        >
          {habitat.fossitt_code}
        </Badge>
        <div
          className={`h-2.5 w-2.5 rounded-full ${conditionInfo?.color || 'bg-gray-400'}`}
          title={conditionInfo?.label}
        />
        <span className="text-muted-foreground text-xs">{conditionInfo?.label}</span>
      </div>
      <h4 className="mt-1 truncate text-sm font-medium">{habitat.fossitt_name}</h4>
      <p className="text-muted-foreground text-xs">{habitat.area_hectares?.toFixed(2)} ha</p>
      {!disabled && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 border-blue-200 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
