'use client'

import { MapPin } from 'lucide-react'

interface SiteInfoCardProps {
  boundaryInfo: {
    centerLat: string
    centerLng: string
    area: string
    perimeter: string
    gridRef: string
    pointCount: number
  } | null
  locationInfo: {
    county?: string
    townland?: string
    province?: string
  } | null
  isLoadingLocation?: boolean
}

export function SiteInfoCard({ boundaryInfo, locationInfo, isLoadingLocation }: SiteInfoCardProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <MapPin className="h-3.5 w-3.5" />
        Boundary Info
      </div>

      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">County</dt>
          <dd className="font-medium">
            {isLoadingLocation ? (
              <span className="bg-muted inline-block h-4 w-20 animate-pulse rounded" />
            ) : locationInfo?.county ? (
              `Co. ${locationInfo.county}`
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Area</dt>
          <dd className="font-medium">{boundaryInfo?.area ?? '—'} ha</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Perimeter</dt>
          <dd className="font-medium">{boundaryInfo?.perimeter ?? '—'} km</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Grid Ref</dt>
          <dd className="font-mono text-xs">{boundaryInfo?.gridRef ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Vertices</dt>
          <dd className="font-medium">{boundaryInfo?.pointCount ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
