'use client'

import { Calendar, Clock, User, FileText, Hash } from 'lucide-react'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { Survey, SurveyStatus } from './survey-card'

interface SurveyViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  survey: Survey
}

const SURVEY_TYPE_LABELS: Record<string, string> = {
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

const STATUS_STYLES: Record<
  SurveyStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | undefined | null
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}

export function SurveyViewDialog({ open, onOpenChange, survey }: SurveyViewDialogProps) {
  const statusStyle = STATUS_STYLES[survey.status]

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, d MMMM yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">Survey Details</DialogTitle>
            <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-1">
          <InfoRow
            icon={FileText}
            label="Survey Type"
            value={SURVEY_TYPE_LABELS[survey.surveyType] || survey.surveyType}
          />

          <InfoRow icon={Calendar} label="Survey Date" value={formatDate(survey.surveyDate)} />

          <InfoRow icon={User} label="Surveyor" value={survey.surveyor.name} />

          <InfoRow
            icon={Hash}
            label="Expected Surveys"
            value={survey.expectedSurveyCount ? String(survey.expectedSurveyCount) : undefined}
          />

          {survey.startTime && <InfoRow icon={Clock} label="Start Time" value={survey.startTime} />}

          {survey.endTime && <InfoRow icon={Clock} label="End Time" value={survey.endTime} />}
        </div>

        {survey.notes && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">{survey.notes}</p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
