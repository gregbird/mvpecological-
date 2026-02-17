'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { DeskResearchFinding as DbFinding } from '@/types/database'
import type { DeskResearchFinding as MapFinding } from '@/components/desk-research/finding-card'
import type { ComponentProps } from 'react'

/**
 * Convert DB-format findings (snake_case) to ProjectMap-format findings (camelCase).
 * Filters by data type and requires a valid location geometry.
 */
export function toMapFindings(findings: DbFinding[], dataType: string): MapFinding[] {
  return findings
    .filter((f) => f.data_type === dataType && f.location != null)
    .map((f): MapFinding => {
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | null

      return {
        id: f.id,
        source: f.source as MapFinding['source'],
        dataType: f.data_type as MapFinding['dataType'],
        title: f.title,
        content: f.content ?? undefined,
        rawData: raw ?? undefined,
        location: f.location as GeoJSON.Geometry,
        isSaved: true,
        notes: f.notes ?? undefined,
        metadata: {
          siteCode: metadata?.siteCode as string | undefined,
          siteType: metadata?.siteType as string | undefined,
          scientificName: metadata?.scientificName as string | undefined,
          commonName: metadata?.commonName as string | undefined,
          recordCount: metadata?.recordCount as number | undefined,
          isProtected: (metadata?.isProtected as boolean) || f.is_protected || false,
          isInvasive: (metadata?.isInvasive as boolean) || false,
          isThreatened: (metadata?.isThreatened as boolean) || false,
          designation: metadata?.designation as string | undefined,
          designations: metadata?.designations as string | undefined,
          distance: f.distance_from_boundary_km ?? undefined,
          taxonGroup: metadata?.taxonGroup as string | undefined,
        },
      }
    })
}

function MapSkeleton() {
  return (
    <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-lg border">
      <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
    </div>
  )
}

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => ({ default: mod.ProjectMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
)

type ProjectMapProps = ComponentProps<typeof DynamicProjectMap>

/**
 * Lazy-loaded map that only mounts when scrolled into view.
 * Prevents 3 Leaflet instances from loading simultaneously on page open.
 */
export function BaselineMap(props: ProjectMapProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref}>{isVisible ? <DynamicProjectMap {...props} /> : <MapSkeleton />}</div>
}
