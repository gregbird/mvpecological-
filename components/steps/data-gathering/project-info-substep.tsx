'use client'

import * as React from 'react'
import { MapPin, Circle, CheckCircle2, Maximize2, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { calculatePerimeter } from '@/lib/gis'
import { getBufferColor } from '@/lib/config/map-constants'
import type { Project } from '@/types/database'

interface ProjectInfoSubStepProps {
  project: Project
  bufferDistances: number[]
  savedFindingsCount: number
  onNext?: () => void
}

export function ProjectInfoSubStep({
  project,
  bufferDistances,
  savedFindingsCount,
  onNext,
}: ProjectInfoSubStepProps) {
  const hasBoundary = !!project.boundary
  const boundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined

  // Calculate area and perimeter from boundary (same as GIS mapping step)
  const boundaryStats = React.useMemo(() => {
    if (!boundary?.geometry) return null
    try {
      const areaHa = calculateAreaHectares(boundary.geometry as GeoJSON.Polygon)
      const perimeterKm = calculatePerimeter(boundary)
      return {
        area: areaHa.toFixed(2),
        perimeter: perimeterKm.toFixed(2),
      }
    } catch {
      return null
    }
  }, [boundary])

  // Build location string - don't duplicate grid_reference if no other location info
  const locationParts: string[] = []
  if (project.townland) locationParts.push(project.townland)
  if (project.county) locationParts.push(`Co. ${project.county}`)
  const hasLocationInfo = locationParts.length > 0
  const locationString = hasLocationInfo ? locationParts.join(', ') : 'Location set'

  if (!hasBoundary) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            No project boundary defined. Please complete GIS Mapping first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-8">
        {/* Compact Summary */}
        <div className="divide-y rounded-lg border bg-white shadow-sm">
          {/* Location Row */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-sm">Project Location</div>
              <div className="font-medium">{locationString}</div>
              {hasLocationInfo && project.grid_reference && (
                <code className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {project.grid_reference}
                </code>
              )}
            </div>
            {!hasLocationInfo && project.grid_reference && (
              <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                {project.grid_reference}
              </code>
            )}
          </div>

          {/* Site Area Row */}
          {boundaryStats && (
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Maximize2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-muted-foreground text-sm">Site Boundary</div>
                <div className="mt-1 flex flex-wrap gap-3">
                  <span className="text-sm font-medium">{boundaryStats.area} ha</span>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm">
                    {boundaryStats.perimeter} km perimeter
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buffer Zones Row */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Circle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-sm">Search Buffer</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {(bufferDistances.length > 0 ? bufferDistances : [2, 5])
                  .sort((a, b) => a - b)
                  .map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getBufferColor(d).fill }}
                      />
                      {d} km
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Progress indicator if has findings */}
          {savedFindingsCount > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {savedFindingsCount} finding{savedFindingsCount !== 1 ? 's' : ''} saved
            </div>
          )}
        </div>

        {onNext && (
          <Button onClick={onNext} className="mt-4 w-full" size="lg">
            Begin Data Gathering
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
