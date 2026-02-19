'use client'

import { MapPin, Map, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import type { Project } from '@/types/database'

interface GisSummaryTabProps {
  project: Project
}

export function GisSummaryTab({ project }: GisSummaryTabProps) {
  const hasBoundary = !!project.boundary
  const hasCenter = !!project.center_point
  const location = [project.townland, project.county, project.province].filter(Boolean).join(', ')
  const bufferDistances = project.buffer_distances

  return (
    <div className="space-y-4 p-4">
      {/* Project Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Project Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">Project Name</dt>
              <dd className="text-sm font-medium">{project.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">Site Code</dt>
              <dd className="text-sm font-medium">{project.site_code || 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">Location</dt>
              <dd className="text-sm font-medium">{location || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">
                Grid Reference
              </dt>
              <dd className="font-mono text-sm font-medium">
                {project.grid_reference || 'Not set'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Boundary & Buffer Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="h-4 w-4" />
              Site Boundary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Boundary</span>
                <Badge variant={hasBoundary ? 'default' : 'secondary'}>
                  {hasBoundary ? 'Uploaded' : 'Not set'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Center Point</span>
                <Badge variant={hasCenter ? 'default' : 'secondary'}>
                  {hasCenter ? 'Set' : 'Not set'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Buffer Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bufferDistances && bufferDistances.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bufferDistances.map((d) => (
                  <Badge key={d} variant="outline">
                    {d >= 1 ? `${d} km` : `${d * 1000} m`}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No buffer zones configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visible Layers */}
      {project.visible_layers && project.visible_layers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Layers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.visible_layers.map((layer) => (
                <Badge key={layer} variant="secondary" className="text-xs">
                  {layer}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
