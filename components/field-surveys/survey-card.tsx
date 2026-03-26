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
  MoreHorizontal,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  /** Add a visit — shown in dropdown for standalone surveys */
  onAddVisit?: (survey: Survey) => void
  isHighlighted?: boolean
  /** When true, the approve button is disabled (not all group visits completed) */
  groupApproveDisabled?: boolean
}

const STATUS_STYLES: Record<
  SurveyStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    className?: string
  }
> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: {
    label: 'In Progress',
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-700',
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    className: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  approved: { label: 'Approved', variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
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

        {/* View + overflow menu */}
        <div className="flex w-full items-center gap-1.5">
          {onView && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(survey)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && survey.status !== 'approved' && (
                <DropdownMenuItem onClick={() => onEdit(survey)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              {onAddVisit && survey.status !== 'approved' && (
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
              {onDelete && survey.status !== 'approved' && (
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
        </div>
      </CardFooter>
    </Card>
  )
}
