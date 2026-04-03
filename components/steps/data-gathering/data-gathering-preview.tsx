'use client'

import * as React from 'react'
import { MapPin, Bug, Droplets, Pencil, ChevronDown, Layers, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import type { Project, WorkflowStep, DeskResearchFinding, TargetNote } from '@/types/database'

// Dynamic import for map — keep in preview since it renders the map directly
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface FindingsStatsResult {
  total: number
  saved: number
  bySource: { source: string; count: number }[]
  byType: { type: string; count: number }[]
}

export interface DataGatheringPreviewProps {
  project: Project
  workflowStep: WorkflowStep
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  bufferDistances: number[]
  savedFindings: DeskResearchFinding[]
  findingsStats: FindingsStatsResult | undefined
  targetNotes: TargetNote[]
  onEdit: () => void
}

/** Row configuration for the "Findings by Type" section */
const FINDING_TYPE_ROWS = [
  {
    key: 'habitats',
    label: 'Habitats',
    icon: Layers,
    iconColor: 'text-emerald-600',
    filter: (f: DeskResearchFinding) => f.data_type === 'habitat',
    badgeField: 'fossittCode' as const,
  },
  {
    key: 'designated_site',
    label: 'Designated Sites',
    icon: MapPin,
    iconColor: 'text-blue-600',
    filter: (f: DeskResearchFinding) => f.data_type === 'designated_site',
    badgeField: 'source' as const,
  },
  {
    key: 'species_record',
    label: 'Species Records',
    icon: Bug,
    iconColor: 'text-amber-600',
    filter: (f: DeskResearchFinding) => f.data_type === 'species_record',
    badgeField: 'source' as const,
  },
  {
    key: 'aquatic',
    label: 'Aquatic',
    icon: Droplets,
    iconColor: 'text-cyan-600',
    filter: (f: DeskResearchFinding) =>
      f.data_type === 'water_quality' || f.data_type === 'catchment',
    badgeField: 'source' as const,
  },
] as const

export function DataGatheringPreview({
  workflowStep,
  projectBoundary,
  bufferDistances,
  savedFindings,
  findingsStats,
  targetNotes,
  onEdit,
}: DataGatheringPreviewProps) {
  const [expandedType, setExpandedType] = React.useState<string | null>(null)

  return (
    <div className="flex h-full">
      {/* Map with findings */}
      <div className="flex-1">
        <ProjectMap
          className="h-full"
          center={IRELAND_CENTER}
          zoom={7}
          skipFitBounds
          boundary={projectBoundary}
          bufferDistances={bufferDistances}
          findings={savedFindings
            .filter((f) => {
              const raw = f.raw_data as Record<string, unknown> | null
              return f.location != null || raw?.geometry != null
            })
            .map((f) => {
              const raw = f.raw_data as Record<string, unknown> | null
              const geometry =
                (raw?.geometry as GeoJSON.Geometry) || (f.location as GeoJSON.Geometry | undefined)
              return {
                id: f.id,
                source: f.source,
                dataType: f.data_type,
                title: f.title,
                content: f.content || undefined,
                location: geometry,
                isSaved: true,
              }
            })}
        />
      </div>

      {/* Summary Panel */}
      <div className="border-border bg-background w-96 overflow-y-auto border-l">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Data Gathering</h2>
              <p className="text-muted-foreground text-sm">Ecological data collection</p>
            </div>
            <Badge
              variant="default"
              className={workflowStep.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}
            >
              {workflowStep.status === 'approved' ? 'Completed' : 'Needs Review'}
            </Badge>
          </div>
        </div>

        {/* Summary Content */}
        <div className="space-y-6 p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">
                {findingsStats?.total || savedFindings.length}
              </div>
              <div className="text-muted-foreground text-xs">Total Findings</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">{targetNotes.length}</div>
              <div className="text-muted-foreground text-xs">Target Notes</div>
            </div>
          </div>

          {/* By Type */}
          <div className="rounded-lg border">
            <h4 className="border-b px-4 py-3 font-medium">Findings by Type</h4>
            <div className="divide-y">
              {FINDING_TYPE_ROWS.map((row) => {
                const items = savedFindings.filter(row.filter)
                if (row.key === 'habitats' && items.length === 0) return null
                const isOpen = expandedType === row.key
                const Icon = row.icon
                return (
                  <div key={row.key}>
                    <button
                      className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
                      onClick={() => setExpandedType(isOpen ? null : row.key)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-3.5 w-3.5', row.iconColor)} />
                        <span className="text-muted-foreground">{row.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{items.length}</Badge>
                        <ChevronDown
                          className={cn(
                            'text-muted-foreground h-3.5 w-3.5 transition-transform',
                            isOpen && 'rotate-180'
                          )}
                        />
                      </div>
                    </button>
                    {isOpen && items.length > 0 && (
                      <div className="bg-muted/30 space-y-1 border-t px-4 py-2">
                        {items.map((f) => {
                          const raw = f.raw_data as Record<string, unknown> | null
                          const badgeText =
                            row.badgeField === 'fossittCode'
                              ? (raw?.fossittCode as string) || ''
                              : f.source?.toUpperCase() || ''
                          return (
                            <div
                              key={f.id}
                              className="flex items-center justify-between py-0.5 text-xs"
                            >
                              <span className="text-muted-foreground truncate">{f.title}</span>
                              {badgeText && (
                                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                  {badgeText}
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Source */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium">Findings by Source</h4>
            <div className="flex flex-wrap gap-2">
              {findingsStats?.bySource.map((item) => (
                <Badge key={item.source} variant="outline" className="gap-1">
                  {item.source.toUpperCase()}
                  <span className="text-muted-foreground">({item.count})</span>
                </Badge>
              )) || (
                <>
                  {Array.from(new Set(savedFindings.map((f) => f.source))).map((source) => (
                    <Badge key={source} variant="outline" className="gap-1">
                      {source.toUpperCase()}
                      <span className="text-muted-foreground">
                        ({savedFindings.filter((f) => f.source === source).length})
                      </span>
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <Button onClick={onEdit} variant="outline" className="w-full">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Data Gathering
          </Button>
        </div>
      </div>
    </div>
  )
}
