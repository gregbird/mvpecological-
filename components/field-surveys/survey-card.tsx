'use client'

import * as React from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  Play,
  CheckCircle2,
  ShieldCheck,
  Users,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'

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
  temperature_c?: number
  windSpeed?: number
  wind_speed_kmh?: number
  windDirection?: string
  wind_direction?: string
  cloudCover?: number
  cloud_cover_pct?: number
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
  form_data?: Record<string, Record<string, unknown>> | null
  expectedSurveyCount?: number
  notes?: string
  surveyor: {
    id: string
    name: string
    avatarUrl?: string
  }
  observationCount?: number
  habitatCount?: number
  visitGroupId?: string | null
  visitNumber?: number | null
  totalVisitsInGroup?: number
}

interface SurveyCardProps {
  survey: Survey
  onView?: (survey: Survey) => void
  onEdit?: (survey: Survey) => void
  onDelete?: (survey: Survey) => void
  onStart?: (survey: Survey) => void
  onComplete?: (survey: Survey) => void
  onApprove?: (survey: Survey) => void
  onAssignStaff?: (survey: Survey) => void
  onAddVisit?: (survey: Survey) => void
  isHighlighted?: boolean
  /** When true, the approve button is disabled (not all group visits completed) */
  groupApproveDisabled?: boolean
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

export function SurveyCard({
  survey,
  onView,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  onApprove,
  onAssignStaff,
  onAddVisit,
  isHighlighted,
  groupApproveDisabled,
}: SurveyCardProps) {
  const statusStyle = STATUS_STYLES[survey.status]
  const surveyTypeLabel = FIELD_SURVEY_TYPE_LABELS[survey.surveyType]

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
              {survey.visitNumber != null && survey.totalVisitsInGroup != null && (
                <Badge variant="outline" className="text-xs">
                  Visit {survey.visitNumber}/{survey.totalVisitsInGroup}
                </Badge>
              )}
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

      <CardFooter className="flex-col gap-2 pt-0">
        {/* Status transition button */}
        {survey.status === 'planned' && onStart && (
          <Button size="sm" className="w-full" onClick={() => onStart(survey)}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Start Survey
          </Button>
        )}
        {survey.status === 'in_progress' && onComplete && (
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => onComplete(survey)}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Complete Survey
          </Button>
        )}
        {survey.status === 'completed' && onApprove && (
          <Button
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => onApprove(survey)}
            disabled={groupApproveDisabled}
            title={
              groupApproveDisabled ? 'All visits must be completed before approving' : undefined
            }
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        )}

        {/* Add Visit button for grouped surveys */}
        {onAddVisit && survey.status !== 'approved' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
            onClick={() => onAddVisit(survey)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Visit
          </Button>
        )}

        {/* Action buttons */}
        <div className="flex w-full flex-wrap items-center gap-1.5">
          {onAssignStaff && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onAssignStaff(survey)}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Assign
            </Button>
          )}
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
