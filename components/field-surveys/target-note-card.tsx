'use client'

import * as React from 'react'
import {
  MapPin,
  Check,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  Eye,
  DoorOpen,
  Search,
  Leaf,
  Bird,
  Flower2,
  Wrench,
  Skull,
  Building,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

// Target note categories with icons and colors
export const TARGET_NOTE_CATEGORIES = {
  access_point: {
    label: 'Access Point',
    icon: DoorOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    badgeVariant: 'secondary' as const,
  },
  check_feature: {
    label: 'Check Feature',
    icon: Search,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    badgeVariant: 'secondary' as const,
  },
  habitat: {
    label: 'Habitat',
    icon: Leaf,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    badgeVariant: 'secondary' as const,
  },
  fauna: {
    label: 'Fauna',
    icon: Bird,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeVariant: 'secondary' as const,
  },
  flora: {
    label: 'Flora',
    icon: Flower2,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 border-pink-200',
    badgeVariant: 'secondary' as const,
  },
  management: {
    label: 'Management',
    icon: Wrench,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200',
    badgeVariant: 'secondary' as const,
  },
  damage: {
    label: 'Damage',
    icon: Skull,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    badgeVariant: 'destructive' as const,
  },
  ownership: {
    label: 'Ownership',
    icon: Building,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    badgeVariant: 'secondary' as const,
  },
} as const

export type TargetNoteCategory = keyof typeof TARGET_NOTE_CATEGORIES

const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'text-red-600',
    badgeVariant: 'destructive' as const,
  },
  normal: {
    label: 'Normal',
    icon: Clock,
    color: 'text-gray-600',
    badgeVariant: 'secondary' as const,
  },
  low: {
    label: 'Low',
    icon: Clock,
    color: 'text-green-600',
    badgeVariant: 'outline' as const,
  },
}

interface TargetNoteCardProps {
  note: TargetNoteWithCreator
  isSelected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onVerify?: () => void
  disabled?: boolean
  compact?: boolean
}

export function TargetNoteCard({
  note,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onVerify,
  disabled,
  compact = false,
}: TargetNoteCardProps) {
  const categoryConfig =
    TARGET_NOTE_CATEGORIES[note.category as TargetNoteCategory] ||
    TARGET_NOTE_CATEGORIES.check_feature
  const priorityConfig =
    PRIORITY_CONFIG[(note.priority as keyof typeof PRIORITY_CONFIG) || 'normal']
  const CategoryIcon = categoryConfig.icon
  const PriorityIcon = priorityConfig.icon

  // Extract coordinates from location if available
  const location = note.location as { coordinates?: [number, number] } | null
  const hasLocation = location?.coordinates && location.coordinates.length === 2

  if (compact) {
    return (
      <div
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors',
          isSelected ? 'border-primary bg-muted/50' : 'hover:bg-muted/30',
          categoryConfig.bgColor
        )}
        onClick={onSelect}
      >
        <CategoryIcon className={cn('h-4 w-4 shrink-0', categoryConfig.color)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{note.title}</p>
        </div>
        {note.is_verified && <Check className="h-4 w-4 shrink-0 text-green-600" />}
        {note.priority === 'high' && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected && 'ring-primary ring-2',
        categoryConfig.bgColor
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={cn('rounded-lg p-2', categoryConfig.bgColor)}>
              <CategoryIcon className={cn('h-5 w-5', categoryConfig.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant={categoryConfig.badgeVariant} className="text-xs">
                  {categoryConfig.label}
                </Badge>
                {note.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">
                    <PriorityIcon className="mr-1 h-3 w-3" />
                    High Priority
                  </Badge>
                )}
                {note.is_verified && (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    <Check className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <h4 className="text-sm font-medium">{note.title}</h4>
              {note.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {note.description}
                </p>
              )}
              <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                {hasLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location.coordinates![1].toFixed(5)}, {location.coordinates![0].toFixed(5)}
                  </span>
                )}
                {note.creator?.full_name && <span>by {note.creator.full_name}</span>}
                {note.finding && (
                  <span className="text-blue-600">Linked: {note.finding.title}</span>
                )}
              </div>
            </div>
          </div>

          {!disabled && (
            <div className="flex shrink-0 gap-1">
              <TooltipProvider>
                {onVerify && !note.is_verified && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          onVerify()
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Verify</TooltipContent>
                  </Tooltip>
                )}
                {onEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit()
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Category icon for map markers
export function getCategoryIcon(category: string) {
  const config = TARGET_NOTE_CATEGORIES[category as TargetNoteCategory]
  return config?.icon || Search
}

// Category color for map markers
export function getCategoryColor(category: string): string {
  const config = TARGET_NOTE_CATEGORIES[category as TargetNoteCategory]
  return config?.color.replace('text-', '') || 'purple-600'
}
