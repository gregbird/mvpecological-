'use client'

import * as React from 'react'
import { ChevronDown, MapPin, Map, Layers } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { DeskAssessmentFindingsSection } from './desk-assessment-findings-section'
import { DeskAssessmentAnalysisSection } from './desk-assessment-analysis-section'
import { CreateSummaryButton } from './create-summary-button'
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
  const [projectInfoOpen, setProjectInfoOpen] = React.useState(false)
  const { projectBoundary } = useProjectBoundary(project)

  const hasBoundary = !!projectBoundary
  const hasCenter = !!project.center_point
  const location = [project.townland, project.county, project.province].filter(Boolean).join(', ')
  const bufferDistances = project.buffer_distances

  return (
    <div className="space-y-6 p-4">
      {/* Project Context (collapsible) */}
      <Collapsible open={projectInfoOpen} onOpenChange={setProjectInfoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Project Context
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 transition-transform',
                    projectInfoOpen && 'rotate-180'
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Location Info */}
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground text-xs font-medium uppercase">
                    Project Name
                  </dt>
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

              {/* Boundary & Buffer */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4">
                  <Map className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Boundary</span>
                    <Badge variant={hasBoundary ? 'default' : 'secondary'} className="text-xs">
                      {hasBoundary ? 'Uploaded' : 'Not set'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Center</span>
                    <Badge variant={hasCenter ? 'default' : 'secondary'} className="text-xs">
                      {hasCenter ? 'Set' : 'Not set'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="text-muted-foreground text-sm">Buffers:</span>
                  {bufferDistances && bufferDistances.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {bufferDistances.map((d) => (
                        <Badge key={d} variant="outline" className="text-xs">
                          {d >= 1 ? `${d} km` : `${d * 1000} m`}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </div>
              </div>

              {/* Visible Layers */}
              {project.visible_layers && project.visible_layers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-muted-foreground text-xs font-medium uppercase">
                    Active Layers:
                  </span>
                  {project.visible_layers.map((layer) => (
                    <Badge key={layer} variant="secondary" className="text-xs">
                      {layer}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* AI Summary */}
      <CreateSummaryButton projectId={projectId} siteId={siteId} tabContext="desk-assessment" />

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

      {/* Baseline Analysis Section */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">Baseline Analysis</h3>
        <DeskAssessmentAnalysisSection projectId={projectId} siteId={siteId} project={project} />
      </section>
    </div>
  )
}
