'use client'

import * as React from 'react'
import { MapPin, Circle, Layers, Pencil } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DATASET_GROUPS } from '@/lib/config/dataset-layers'
import { getBufferColor } from '@/lib/config/map-constants'
import type { IrishLocationInfo } from '@/hooks/gis/use-boundary-management'

interface PreviewPanelProps {
  boundaryInfo: {
    centerLat: string
    centerLng: string
    area: string
    perimeter: string
    gridRef: string
    pointCount: number
  } | null
  locationInfo: IrishLocationInfo | null
  enabledBuffers: number[]
  visibleLayers: string[]
  workflowStatus?: string
  onEditClick: () => void
}

export function PreviewPanel({
  boundaryInfo,
  locationInfo,
  enabledBuffers,
  visibleLayers,
  workflowStatus,
  onEditClick,
}: PreviewPanelProps) {
  return (
    <div className="border-border w-96 overflow-y-auto border-l bg-white">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">GIS Mapping</h2>
            <p className="text-muted-foreground text-sm">Project boundary configuration</p>
          </div>
          <Badge
            variant="default"
            className={workflowStatus === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}
          >
            {workflowStatus === 'approved' ? 'Completed' : 'Needs Review'}
          </Badge>
        </div>
      </div>

      {/* Summary Content */}
      <div className="space-y-6 p-6">
        {/* Boundary Info */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Boundary
          </h4>
          {boundaryInfo && (
            <dl className="space-y-2 text-sm">
              {locationInfo?.county && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">
                    {locationInfo.townland && `${locationInfo.townland}, `}Co. {locationInfo.county}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Area</dt>
                <dd className="font-medium">{boundaryInfo.area} ha</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Perimeter</dt>
                <dd>{boundaryInfo.perimeter} km</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Grid Reference</dt>
                <dd className="font-mono text-xs">{boundaryInfo.gridRef}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Vertices</dt>
                <dd>{boundaryInfo.pointCount} points</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Buffer Zones */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Circle className="h-4 w-4 text-blue-500" />
            Buffer Zones
          </h4>
          <div className="flex flex-wrap gap-2">
            {enabledBuffers.length > 0 ? (
              enabledBuffers
                .sort((a, b) => a - b)
                .map((d) => {
                  const color = getBufferColor(d)
                  return (
                    <Badge
                      key={d}
                      variant="secondary"
                      className="gap-1"
                      style={{ borderColor: color.stroke, borderWidth: 1 }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color.fill }}
                      />
                      {d} km
                    </Badge>
                  )
                })
            ) : (
              <span className="text-muted-foreground text-sm">No buffers configured</span>
            )}
          </div>
        </div>

        {/* Data Layers */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Layers className="h-4 w-4 text-purple-500" />
            Data Layers
          </h4>
          <div className="space-y-2">
            {DATASET_GROUPS.map((group) => {
              const activeLayers = group.layers.filter((l) => visibleLayers.includes(l.id))
              if (activeLayers.length === 0) return null
              return (
                <div key={group.id}>
                  <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeLayers.map((layer) => (
                      <Badge key={layer.id} variant="outline" className="gap-1 text-xs">
                        {layer.color && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: layer.color }}
                          />
                        )}
                        {layer.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
            {visibleLayers.length === 0 && (
              <span className="text-muted-foreground text-sm">No layers enabled</span>
            )}
          </div>
        </div>

        {/* Edit Button */}
        <Button onClick={onEditClick} variant="outline" className="w-full">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Configuration
        </Button>
      </div>
    </div>
  )
}
