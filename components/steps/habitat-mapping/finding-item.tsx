'use client'

import { MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { DeskResearchFinding } from '@/types/database'

interface FindingItemProps {
  finding: DeskResearchFinding
  onClick?: () => void
}

export function FindingItem({ finding, onClick }: FindingItemProps) {
  const rawData = finding.raw_data as Record<string, unknown> | null

  // Prefer a meaningful dataset label (NPWS site type, EPA risk class, etc).
  // `finding.source === 'manual'` is just the save-origin flag — hiding it here
  // stops the useless "MANUAL" badge from showing up on NLC-imported habitats.
  const rawSiteType = rawData?.siteType || rawData?.SITETYPE || rawData?.type
  const sourceLabel =
    finding.source && finding.source !== 'manual' ? finding.source.toUpperCase() : null
  const habitatSource =
    finding.data_type === 'habitat' && rawData?.habitatFinding === true ? 'NLC 2018' : null
  const displayLabel = rawSiteType ? String(rawSiteType) : (habitatSource ?? sourceLabel)

  // Distance is null/undefined for findings whose geometry sits inside the
  // project boundary (there is no meaningful distance). Render "Inside"
  // instead of leaving the slot blank so users can tell missing vs inside.
  const distance = finding.distance_from_boundary_km
  const hasDistance = distance !== null && distance !== undefined
  const hasLocation = !!(finding.location as { coordinates?: unknown } | null)?.coordinates

  return (
    <div
      className={`bg-card rounded-md border p-2 text-sm transition-colors ${
        hasLocation ? 'hover:bg-muted/50 cursor-pointer' : ''
      }`}
      onClick={hasLocation ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {displayLabel && (
              <Badge variant="outline" className="text-[10px]">
                {displayLabel}
              </Badge>
            )}
            {finding.is_protected && (
              <Badge variant="destructive" className="text-[10px]">
                Protected
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate font-medium">{finding.title}</p>
          {finding.content && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{finding.content}</p>
          )}
        </div>
        {hasLocation && (
          <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {hasDistance && distance > 0 ? `${distance.toFixed(1)} km` : 'Inside'}
          </div>
        )}
      </div>
    </div>
  )
}
