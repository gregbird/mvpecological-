'use client'

import * as React from 'react'
import { Sprout, Leaf, Layers } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useReleveSurveys } from '@/hooks/queries/use-releve-hooks'
import { useReleveSpeciesByProject } from '@/hooks/queries/use-releve-hooks'
import {
  usePlacementPreferences,
  PLACEMENT_OPTIONS,
  type PlacementOption,
} from '@/hooks/steps/use-placement-preferences'
import type { WorkflowStep } from '@/types/database'

interface ReleveSurveysTabProps {
  projectId: string
  siteId?: string | null
  workflowStep: WorkflowStep
}

const PLACEMENT_BADGE_VARIANT: Record<
  PlacementOption,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  both: 'default',
  main: 'secondary',
  appendix: 'secondary',
  exclude: 'outline',
}

export function ReleveSurveysTab({ projectId, siteId, workflowStep }: ReleveSurveysTabProps) {
  const { data: releveSurveys = [], isLoading } = useReleveSurveys(projectId)
  const { data: allSpecies = [] } = useReleveSpeciesByProject(projectId)
  const { getPlacement, setRelevePlacement } = usePlacementPreferences({ workflowStep })

  // Filter by site via the linked survey_id if siteId is set.
  // Note: releve_surveys has a survey_id FK — site filtering is applied at
  // the Step 6 API level, so here we show all project relevés for clarity.
  // Mirror the current Field Survey tab behavior, which also shows full list.
  const visibleReleves = React.useMemo(() => {
    if (!siteId) return releveSurveys
    // For now, don't filter by site in the UI — rely on survey_id join at the API layer.
    return releveSurveys
  }, [releveSurveys, siteId])

  // Count species per releve (in-memory grouping)
  const speciesCountByReleve = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sp of allSpecies) {
      counts[sp.releve_id] = (counts[sp.releve_id] ?? 0) + 1
    }
    return counts
  }, [allSpecies])

  // Aggregate placement stats (for summary card)
  const placementStats = React.useMemo(() => {
    const stats: Record<PlacementOption, number> = {
      both: 0,
      main: 0,
      appendix: 0,
      exclude: 0,
    }
    for (const r of visibleReleves) {
      stats[getPlacement(r.id)]++
    }
    return stats
  }, [visibleReleves, getPlacement])

  if (isLoading) {
    return <div className="text-muted-foreground p-6 text-sm">Loading relevé surveys…</div>
  }

  if (visibleReleves.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Alert>
          <Sprout className="h-4 w-4" />
          <AlertTitle>No relevé surveys recorded</AlertTitle>
          <AlertDescription>
            Complete Step 4 (Field Research → Relevé Survey) to record vegetation plots. Each relevé
            will then appear here with a placement control for the AI draft report.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Explanation card */}
      <Alert>
        <Layers className="h-4 w-4" />
        <AlertTitle>Report Placement Designation</AlertTitle>
        <AlertDescription>
          Decide where each relevé should appear in the AI-generated draft report. The default —{' '}
          <strong>Main body + Appendix</strong> — matches the standard Relevé report format:
          aggregate statistics summarised in the Survey Results section, with full per-relevé data
          cards in Appendix I.
        </AlertDescription>
      </Alert>

      {/* Site filtering disclaimer */}
      {siteId && (
        <p className="text-muted-foreground text-xs">
          Showing relev&eacute;s from all sites — site filtering applies at report generation.
        </p>
      )}

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Sprout className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <div className="text-xl font-bold">{visibleReleves.length}</div>
              <div className="text-muted-foreground text-xs">Total Relevés</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">B</span>
            </div>
            <div>
              <div className="text-xl font-bold">{placementStats.both}</div>
              <div className="text-muted-foreground text-xs">Body + Appendix</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">A</span>
            </div>
            <div>
              <div className="text-xl font-bold">
                {placementStats.appendix + placementStats.main}
              </div>
              <div className="text-muted-foreground text-xs">Single location</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">—</span>
            </div>
            <div>
              <div className="text-xl font-bold">{placementStats.exclude}</div>
              <div className="text-muted-foreground text-xs">Excluded</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relevé list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Relevé Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleReleves.map((releve) => {
            const placement = getPlacement(releve.id)
            const speciesCount = speciesCountByReleve[releve.id] ?? 0
            const placementOption = PLACEMENT_OPTIONS.find((o) => o.value === placement)

            return (
              <div
                key={releve.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                {/* Left: metadata */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{releve.releve_code}</span>
                    {releve.habitat_type && (
                      <Badge variant="outline" className="text-xs">
                        {releve.habitat_type}
                      </Badge>
                    )}
                    <Badge variant={PLACEMENT_BADGE_VARIANT[placement]} className="text-xs">
                      {placementOption?.label ?? placement}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    <span>
                      {new Date(releve.survey_date).toLocaleDateString('en-IE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>Recorder: {releve.recorder}</span>
                    {releve.releve_area_sqm != null && <span>{releve.releve_area_sqm} sqm</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                    <span className="flex items-center gap-1">
                      <Leaf className="h-3 w-3 text-emerald-600" />
                      {speciesCount} species
                    </span>
                    {releve.total_vegetation_cover_pct != null && (
                      <span>Cover: {releve.total_vegetation_cover_pct}%</span>
                    )}
                    {releve.cover_graminea_pct != null && (
                      <span>Graminea: {releve.cover_graminea_pct}%</span>
                    )}
                    {releve.cover_forbs_pct != null && (
                      <span>Forbs: {releve.cover_forbs_pct}%</span>
                    )}
                  </div>
                  {releve.releve_comment && (
                    <p className="text-muted-foreground line-clamp-2 pt-1 text-xs italic">
                      {releve.releve_comment}
                    </p>
                  )}
                </div>

                {/* Right: placement selector */}
                <div className="flex w-full min-w-0 shrink-0 flex-col gap-1.5 sm:w-56">
                  <Label
                    htmlFor={`placement-${releve.id}`}
                    className="text-muted-foreground text-xs"
                  >
                    Report placement
                  </Label>
                  <Select
                    value={placement}
                    onValueChange={(value) =>
                      setRelevePlacement(releve.id, value as PlacementOption)
                    }
                  >
                    <SelectTrigger id={`placement-${releve.id}`} className="h-9 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {placementOption && (
                    <p className="text-muted-foreground text-[11px] leading-snug">
                      {placementOption.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
