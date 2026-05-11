'use client'

import * as React from 'react'
import { MapPin, Map, Layers, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getLayerById } from '@/lib/config/dataset-layers'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { DeskAssessmentFindingsSection } from './desk-assessment-findings-section'
import { DeskAssessmentAnalysisSection } from './desk-assessment-analysis-section'
import type { Project, WorkflowStep } from '@/types/database'

interface DeskAssessmentCombinedTabProps {
  projectId: string
  siteId?: string | null
  userId: string
  project: Project
  workflowStep: WorkflowStep
}

export function DeskAssessmentCombinedTab({
  projectId,
  siteId,
  userId,
  project,
  workflowStep,
}: DeskAssessmentCombinedTabProps) {
  const { projectBoundary } = useProjectBoundary(project)
  const [baselineOpen, setBaselineOpen] = React.useState(false)

  const hasBoundary = !!projectBoundary
  const hasCenter = !!project.center_point
  const location = [project.townland, project.county, project.province].filter(Boolean).join(', ')
  const bufferDistances = project.buffer_distances

  return (
    <div className="space-y-6 p-4">
      {/* Project Context — compact inline bar (no collapse, no wasted space) */}
      <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-sm">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold">{project.name}</span>
        </div>
        {project.site_code && (
          <span className="text-muted-foreground font-mono text-xs">{project.site_code}</span>
        )}
        {location && <span className="text-muted-foreground text-xs">{location}</span>}
        {project.grid_reference && (
          <span className="text-muted-foreground font-mono text-xs">{project.grid_reference}</span>
        )}
        <div className="bg-border h-4 w-px" />
        <Badge
          variant={hasBoundary ? 'default' : 'secondary'}
          className="gap-1 px-2 py-0 font-normal"
        >
          <Map className="h-3 w-3" />
          {hasBoundary ? 'Boundary' : 'No boundary'}
        </Badge>
        <Badge variant={hasCenter ? 'default' : 'secondary'} className="px-2 py-0 font-normal">
          {hasCenter ? 'Center set' : 'No center'}
        </Badge>
        {bufferDistances && bufferDistances.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Buffers</span>
            {bufferDistances.map((d) => (
              <Badge key={d} variant="outline" className="px-1.5 py-0 font-normal">
                {d >= 1 ? `${d} km` : `${d * 1000} m`}
              </Badge>
            ))}
          </div>
        )}
        {project.visible_layers && project.visible_layers.length > 0 && (
          <div className="flex items-center gap-1">
            <Layers className="text-muted-foreground h-3 w-3" />
            {project.visible_layers.map((layerId) => {
              const meta = getLayerById(layerId)
              return (
                <Badge
                  key={layerId}
                  variant="secondary"
                  className="px-1.5 py-0 font-normal"
                  title={meta?.description}
                >
                  {meta?.label ?? layerId}
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {/* Findings Section */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">Desk Research Findings</h3>
        <DeskAssessmentFindingsSection
          projectId={projectId}
          siteId={siteId}
          userId={userId}
          workflowStep={workflowStep}
        />
      </section>

      {/* Baseline Analysis Section (collapsible, default closed) */}
      <Collapsible open={baselineOpen} onOpenChange={setBaselineOpen} asChild>
        <section>
          <CollapsibleTrigger className="hover:text-foreground/80 mb-4 flex w-full items-center justify-between text-left">
            <h3 className="text-lg font-semibold">Baseline Analysis</h3>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-4 w-4 transition-transform',
                baselineOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <DeskAssessmentAnalysisSection
              projectId={projectId}
              siteId={siteId}
              project={project}
            />
          </CollapsibleContent>
        </section>
      </Collapsible>
    </div>
  )
}
