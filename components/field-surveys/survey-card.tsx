'use client'

import * as React from 'react'
import {
  Calendar,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Users,
  MoreHorizontal,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'

export type SurveyStatus = 'in_progress' | 'completed'
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
  notes?: string
  surveyor: {
    id: string
    name: string
    avatarUrl?: string
  }
  observationCount?: number
  habitatCount?: number
  siteId?: string | null
  siteName?: string | null
  visitGroupId?: string | null
  visitNumber?: number | null
  totalVisitsInGroup?: number
}

interface SurveyCardProps {
  survey: Survey
  onView?: (survey: Survey) => void
  onEdit?: (survey: Survey) => void
  onDelete?: (survey: Survey) => void
  onComplete?: (survey: Survey) => void
  onAssignStaff?: (survey: Survey) => void
  /** Add a visit — shown in dropdown for standalone surveys */
  onAddVisit?: (survey: Survey) => void
  isHighlighted?: boolean
}

const STATUS_STYLES: Record<
  SurveyStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    className?: string
  }
> = {
  in_progress: {
    label: 'In Progress',
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-700',
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-700',
  },
}

export function SurveyCard({
  survey,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onAssignStaff,
  onAddVisit,
  isHighlighted,
}: SurveyCardProps) {
  const statusStyle = STATUS_STYLES[survey.status] ?? STATUS_STYLES.in_progress
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
        survey.status === 'completed' && 'border-green-500/50',
        isHighlighted && 'ring-primary animate-pulse ring-2'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusStyle.variant} className={statusStyle.className}>
                {statusStyle.label}
              </Badge>
              <span className="text-sm font-medium">{surveyTypeLabel}</span>
              {survey.visitNumber != null && survey.totalVisitsInGroup != null && (
                <Badge variant="outline" className="text-xs">
                  Visit {survey.visitNumber}/{survey.totalVisitsInGroup}
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(survey.surveyDate)}</span>
              </div>
              {survey.siteName && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{survey.siteName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Surveyor */}
          <div className="text-sm">{survey.surveyor.name}</div>

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

      <CardFooter className="flex w-full items-center gap-1.5 pt-0">
        {/* Two labeled buttons keep the daily actions visible; View moves
            to the "..." menu so the row fits even with the sidebar open. */}
        {survey.status === 'in_progress' ? (
          <>
            {onEdit && (
              <Button size="sm" className="flex-1" onClick={() => onEdit(survey)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Fill Data
              </Button>
            )}
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onComplete(survey)}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Complete
              </Button>
            )}
          </>
        ) : (
          onView && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(survey)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          )
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {survey.status === 'in_progress' && onView && (
              <DropdownMenuItem onClick={() => onView(survey)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                View
              </DropdownMenuItem>
            )}
            {onAddVisit && survey.status !== 'completed' && (
              <DropdownMenuItem onClick={() => onAddVisit(survey)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Visit
              </DropdownMenuItem>
            )}
            {onAssignStaff && (
              <DropdownMenuItem onClick={() => onAssignStaff(survey)}>
                <Users className="mr-2 h-3.5 w-3.5" />
                Assign Staff
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDelete(survey)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}
