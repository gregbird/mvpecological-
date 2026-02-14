'use client'

import * as React from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  CloudSun,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  | 'other'

export interface WeatherData {
  temperature?: number
  windSpeed?: number
  windDirection?: string
  cloudCover?: number
  precipitation?: string
  visibility?: string
}

export interface Survey {
  id: string
  surveyType: SurveyType
  surveyDate: string
  startTime?: string
  endTime?: string
  status: SurveyStatus
  weather?: WeatherData
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
  other: 'Other Survey',
}

export function SurveyCard({
  survey,
  onView,
  onEdit,
  onDelete,
  onApprove,
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
              {survey.startTime && survey.endTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {survey.startTime} - {survey.endTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(survey)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && survey.status !== 'approved' && (
                <DropdownMenuItem onClick={() => onEdit(survey)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onApprove && survey.status === 'completed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onApprove(survey)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && survey.status !== 'approved' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(survey)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

          {/* Weather */}
          {survey.weather && (
            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CloudSun className="h-3.5 w-3.5" />
                {survey.weather.temperature !== undefined && (
                  <span>{survey.weather.temperature}°C</span>
                )}
                {survey.weather.windSpeed !== undefined && (
                  <span className="ml-2">Wind: {survey.weather.windSpeed} km/h</span>
                )}
                {survey.weather.cloudCover !== undefined && (
                  <span className="ml-2">Cloud: {survey.weather.cloudCover}%</span>
                )}
              </div>
            </div>
          )}

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
    </Card>
  )
}
