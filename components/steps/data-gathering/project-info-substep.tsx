'use client'

import * as React from 'react'
import { MapPin, Circle, Grid, Compass, Database, Check, AlertCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Project } from '@/types/database'

interface ProjectInfoSubStepProps {
  project: Project
  bufferDistances: number[]
  savedFindingsCount: number
}

// Buffer zone colors - matching GIS mapping step
const BUFFER_COLORS: Record<number, { fill: string; stroke: string; name: string }> = {
  0.5: { fill: '#ef4444', stroke: '#dc2626', name: 'Red' },
  1: { fill: '#f97316', stroke: '#ea580c', name: 'Orange' },
  2: { fill: '#eab308', stroke: '#ca8a04', name: 'Yellow' },
  5: { fill: '#22c55e', stroke: '#16a34a', name: 'Green' },
  10: { fill: '#3b82f6', stroke: '#2563eb', name: 'Blue' },
  15: { fill: '#8b5cf6', stroke: '#7c3aed', name: 'Purple' },
}

function getBufferColor(distance: number): { fill: string; stroke: string; name: string } {
  if (BUFFER_COLORS[distance]) return BUFFER_COLORS[distance]
  const hue = (distance * 37) % 360
  return {
    fill: `hsl(${hue}, 70%, 50%)`,
    stroke: `hsl(${hue}, 70%, 40%)`,
    name: `Custom ${distance}km`,
  }
}

export function ProjectInfoSubStep({
  project,
  bufferDistances,
  savedFindingsCount,
}: ProjectInfoSubStepProps) {
  const hasBoundary = !!project.boundary

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-semibold">Project Information</h3>
          <p className="text-muted-foreground mt-1">
            Review GIS data and buffer zones from the previous step
          </p>
        </div>

        {/* Boundary check */}
        {!hasBoundary && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No project boundary defined. Please complete Step 1 (GIS Mapping) first to define a
              project boundary before searching for ecological data.
            </AlertDescription>
          </Alert>
        )}

        {hasBoundary && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Location Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.townland && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Townland</span>
                    <span className="font-medium">{project.townland}</span>
                  </div>
                )}
                {project.county && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">County</span>
                    <span className="font-medium">Co. {project.county}</span>
                  </div>
                )}
                {project.province && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Province</span>
                    <span className="font-medium">{project.province}</span>
                  </div>
                )}
                {project.grid_reference && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Grid Reference</span>
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                      {project.grid_reference}
                    </code>
                  </div>
                )}
                {!project.townland && !project.county && !project.grid_reference && (
                  <p className="text-muted-foreground text-sm">Location data not available</p>
                )}
              </CardContent>
            </Card>

            {/* Buffer Zones Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Circle className="h-4 w-4 text-green-500" />
                  Buffer Zones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bufferDistances.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      The following buffer zones will be used for searching:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {bufferDistances
                        .sort((a, b) => a - b)
                        .map((d) => {
                          const color = getBufferColor(d)
                          return (
                            <Badge
                              key={d}
                              variant="secondary"
                              className="gap-1.5"
                              style={{ borderColor: color.stroke, borderWidth: 1 }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: color.fill }}
                              />
                              {d} km
                            </Badge>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      No buffer zones configured. Default 2km and 5km buffers will be used.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: '#eab308' }}
                        />
                        2 km
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: '#22c55e' }}
                        />
                        5 km
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Sources Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-purple-500" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    The following sources will be searched:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium">NPWS</span>
                        <span className="text-muted-foreground text-sm"> - Designated Sites</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium">GBIF</span>
                        <span className="text-muted-foreground text-sm"> - Species Records</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium">NBDC</span>
                        <span className="text-muted-foreground text-sm"> - Irish Biodiversity</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium">EPA</span>
                        <span className="text-muted-foreground text-sm"> - Aquatic Features</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Progress Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Compass className="h-4 w-4 text-orange-500" />
                  Current Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Saved Findings</span>
                    <Badge variant={savedFindingsCount > 0 ? 'default' : 'secondary'}>
                      {savedFindingsCount}
                    </Badge>
                  </div>
                  {savedFindingsCount === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No findings saved yet. Use the next steps to search and save ecological data.
                    </p>
                  )}
                  {savedFindingsCount > 0 && (
                    <p className="text-sm text-emerald-600">
                      You have saved findings. Continue to add more or proceed to review.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {hasBoundary && (
          <Alert>
            <AlertDescription>
              Click <strong>Next</strong> to start searching for designated sites, species records,
              and aquatic features within your buffer zones. You can skip any step and return to it
              later.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
