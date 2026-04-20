'use client'

import { Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getHeritageColor } from '@/lib/config/map-constants'
import type { HabitatPolygon } from '@/types/database'

export const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'bg-green-600' },
  good: { label: 'Good', color: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'bg-amber-500' },
  poor: { label: 'Poor', color: 'bg-orange-500' },
  bad: { label: 'Bad', color: 'bg-red-500' },
}

// Auto-imported NLC habitats save condition=null because NLC is remote-sensed,
// not field-verified. Render "Unassessed" rather than defaulting to Moderate
// (which would fabricate a field finding). See R3 fix in the risk review.
const UNASSESSED_CONDITION = { label: 'Unassessed', color: 'bg-gray-400' }

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
  const conditionInfo = habitat.condition
    ? (CONDITION_LABELS[habitat.condition] ?? UNASSESSED_CONDITION)
    : UNASSESSED_CONDITION

  return (
    <div
      className={`group relative rounded-lg border p-2.5 transition-colors ${
        isSelected ? 'border-primary bg-muted/50' : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="font-mono text-[10px]"
              style={{
                borderColor: getHeritageColor(habitat.fossitt_code),
                color: getHeritageColor(habitat.fossitt_code),
              }}
            >
              {habitat.fossitt_code}
            </Badge>
            <div
              className={`h-2 w-2 rounded-full ${conditionInfo.color}`}
              title={conditionInfo.label}
            />
            <span className="text-muted-foreground truncate text-[11px]">
              {conditionInfo.label}
            </span>
            <span className="text-muted-foreground ml-auto shrink-0 text-[11px] tabular-nums">
              {habitat.area_hectares?.toFixed(2)} ha
            </span>
          </div>
          <h4 className="mt-0.5 truncate text-sm font-medium">{habitat.fossitt_name}</h4>
        </div>
        {!disabled && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              aria-label="Edit habitat"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="Delete habitat"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
