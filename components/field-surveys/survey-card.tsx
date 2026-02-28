'use client'

import * as React from 'react'
import { Calendar, Clock, MapPin, Eye, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type SurveyStatus = 'planned' | 'in_progress' | 'completed' | 'approved'
export type SurveyType =
  | 'walkover'
  | 'habitat_mapping'
  | 'releve_survey'
  | 'bat_survey'
  | 'bird_survey'
  | 'mammal_survey'
  | 'aquatic_survey'
  | 'botanical_survey'
  | 'invertebrate_survey'
  | 'biodiversity_net_gain'
  | 'other'

export interface WeatherData {
  temperature?: number
  windSpeed?: number
  windDirection?: string
  cloudCover?: number
  precipitation?: string
  visibility?: string
  expectedSurveyCount?: number
  templateFields?: Record<string, string | number | boolean | string[] | null>
}

export interface Survey {
  id: string
  surveyType: SurveyType
  surveyDate: string
  startTime?: string
  endTime?: string
  status: SurveyStatus
  weather?: WeatherData
  expectedSurveyCount?: number
  notes?: string
  surveyor: {
    id: string
    name: string
    avatarUrl?: string
  }
  observationCount?: number
  habitatCount?: number
}

interface SurveyCardProps {
  survey: Survey
  onView?: (survey: Survey) => void
  onEdit?: (survey: Survey) => void
  onDelete?: (survey: Survey) => void
  onApprove?: (survey: Survey) => void
  isHighlighted?: boolean
}

const STATUS_STYLES: Record<
  SurveyStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
}

const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  walkover: 'Walkover Survey',
  habitat_mapping: 'Habitat Mapping',
  releve_survey: 'Relevé Survey',
  bat_survey: 'Bat Survey',
  bird_survey: 'Bird Survey',
  mammal_survey: 'Mammal Survey',
  aquatic_survey: 'Aquatic Survey',
  botanical_survey: 'Botanical Survey',
  invertebrate_survey: 'Invertebrate Survey',
  biodiversity_net_gain: 'Biodiversity Net Gain',
  other: 'Other Survey',
}

export function SurveyCard({
  survey,
  onView,
  onEdit,
  onDelete,
  onApprove: _onApprove,
  isHighlighted,
}: SurveyCardProps) {
  const statusStyle = STATUS_STYLES[survey.status]
  const surveyTypeLabel = SURVEY_TYPE_LABELS[survey.surveyType]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Card
      className={cn(
        survey.status === 'approved' && 'border-green-500/50',
        isHighlighted && 'ring-primary animate-pulse ring-2'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
              <span className="text-sm font-medium">{surveyTypeLabel}</span>
            </div>
            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(survey.surveyDate)}</span>
              </div>
              {!!survey.expectedSurveyCount && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{survey.expectedSurveyCount} survey(s) expected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Surveyor */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={survey.surveyor.avatarUrl} />
              <AvatarFallback>
                {survey.surveyor.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{survey.surveyor.name}</span>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-4 text-sm">
            {survey.observationCount !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                <span>
                  {survey.observationCount} observation
                  {survey.observationCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {survey.habitatCount !== undefined && (
              <div className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded bg-green-500/50" />
                <span>
                  {survey.habitatCount} habitat
                  {survey.habitatCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Notes preview */}
          {survey.notes && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{survey.notes}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full items-center gap-2">
          {onView && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(survey)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          )}
          {onEdit && survey.status !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={() => onEdit(survey)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {onDelete && survey.status !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => onDelete(survey)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
