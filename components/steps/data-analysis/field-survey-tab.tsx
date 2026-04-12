'use client'

import * as React from 'react'
import { Calendar, ClipboardList, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSurveys, useSurveyStats } from '@/hooks/queries/use-survey-hooks'
import { useObservationStats } from '@/hooks/queries/use-observation-hooks'
import { SurveyEditDialog } from '@/components/steps/data-analysis/survey-edit-dialog'
import { CreateSummaryButton } from './create-summary-button'
import type { Survey } from '@/types/database'

interface FieldSurveyTabProps {
  projectId: string
  siteId?: string | null
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  completed: 'default',
  in_progress: 'secondary',
}

export function FieldSurveyTab({ projectId, siteId }: FieldSurveyTabProps) {
  const { data: surveys = [] } = useSurveys(projectId, siteId)
  const { data: surveyStats } = useSurveyStats(projectId, siteId)
  const { data: observationStats } = useObservationStats(projectId, siteId)
  const [editingSurvey, setEditingSurvey] = React.useState<Survey | null>(null)

  return (
    <div className="space-y-4 p-4">
      {/* AI Summary */}
      <CreateSummaryButton projectId={projectId} siteId={siteId} tabContext="field-survey" />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-xl font-bold">{surveyStats?.total || 0}</div>
              <div className="text-muted-foreground text-xs">
                Total Surveys ({surveyStats?.completed || 0} completed)
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-xl font-bold">{observationStats?.total || 0}</div>
              <div className="text-muted-foreground text-xs">Species Observations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <span className="text-xs font-bold text-red-600 dark:text-red-400">!</span>
            </div>
            <div>
              <div className="text-xl font-bold">{observationStats?.protected || 0}</div>
              <div className="text-muted-foreground text-xs">Protected Species</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survey List */}
      {surveys.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Survey Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {surveys.map((survey) => {
                const weather = survey.weather as Record<string, unknown> | null
                return (
                  <div
                    key={survey.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{survey.survey_type}</span>
                        <Badge
                          variant={STATUS_VARIANT[survey.status] || 'outline'}
                          className="text-xs"
                        >
                          {survey.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {new Date(survey.survey_date).toLocaleDateString('en-IE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {typeof (weather?.temperature ?? weather?.temperature_c) === 'number' &&
                          ` \u00B7 ${weather?.temperature ?? weather?.temperature_c}\u00B0C`}
                        {typeof (weather?.windSpeed ?? weather?.wind_speed_kmh) === 'number' &&
                          ` \u00B7 Wind ${weather?.windSpeed ?? weather?.wind_speed_kmh} km/h`}
                      </div>
                      {survey.notes && (
                        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs italic">
                          {survey.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-8 w-8 shrink-0"
                      onClick={() => setEditingSurvey(survey)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No surveys recorded yet. Complete Step 4 (Field Research) first.
          </CardContent>
        </Card>
      )}

      <SurveyEditDialog
        survey={editingSurvey}
        onOpenChange={(open) => !open && setEditingSurvey(null)}
      />
    </div>
  )
}
