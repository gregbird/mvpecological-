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

  // Get site type for designated sites
  const siteType =
    rawData?.siteType || rawData?.SITETYPE || rawData?.type || finding.source?.toUpperCase()

  // Get distance
  const distance = finding.distance_from_boundary_km

  // Check if finding has a location
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
            {siteType && (
              <Badge variant="outline" className="text-[10px]">
                {String(siteType)}
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
        {distance !== null && distance !== undefined && (
          <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {distance.toFixed(1)} km
          </div>
        )}
      </div>
    </div>
  )
}
