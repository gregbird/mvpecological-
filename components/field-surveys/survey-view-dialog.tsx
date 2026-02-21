'use client'

import { Calendar, Clock, User, FileText, Hash, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ReleveSurveyForm } from './releve-survey-form'
import { useReleveSurveyBySurveyId } from '@/hooks/queries/use-releve-hooks'
import type { Survey, SurveyStatus } from './survey-card'

interface SurveyViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  survey: Survey
  projectId?: string
  projectName?: string
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

export function SurveyViewDialog({
  open,
  onOpenChange,
  survey,
  projectId,
  projectName,
}: SurveyViewDialogProps) {
  const statusStyle = STATUS_STYLES[survey.status]
  const isReleve = survey.surveyType === 'releve_survey'

  // Load existing relevé data if this is a relevé survey
  const { data: releveData, isLoading: releveLoading } = useReleveSurveyBySurveyId(
    isReleve && open ? survey.id : null
  )

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, d MMMM yyyy')
    } catch {
      return dateString
    }
  }

  // Relevé Survey: show full template form
  if (isReleve && projectId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg">Relevé Survey Template</DialogTitle>
              <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 py-4">
            {releveLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Loading template...</span>
              </div>
            ) : (
              <ReleveSurveyForm
                projectId={projectId}
                projectName={projectName ?? ''}
                surveyId={survey.id}
                existingData={releveData}
                onSaved={() => onOpenChange(false)}
                onClose={() => onOpenChange(false)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  // Default: generic survey view
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
