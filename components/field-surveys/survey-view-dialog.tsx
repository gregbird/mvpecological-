'use client'

import * as React from 'react'
import { Calendar, Clock, User, FileText, Hash, Loader2, Pencil, Mail } from 'lucide-react'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ReleveSurveyForm } from './releve-survey-form'
import { useReleveSurveyBySurveyId } from '@/hooks/queries/use-releve-hooks'
import { TemplateSectionsRenderer } from './survey-template-fields/template-sections-renderer'
import { getDefaultFieldsForType } from '@/lib/config/survey-field-definitions'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { createClient } from '@/lib/supabase/client'
import type { Survey, SurveyStatus } from './survey-card'

type FieldValue = string | number | boolean | string[] | null

interface SurveyViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  survey: Survey
  projectId?: string
  projectName?: string
  onEdit?: (survey: Survey) => void
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
  biodiversity_net_gain: 'Biodiversity Net Gain',
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
  onEdit,
}: SurveyViewDialogProps) {
  const statusStyle = STATUS_STYLES[survey.status]
  const isReleve = survey.surveyType === 'releve_survey'
  const [releveEditing, setReleveEditing] = React.useState(false)
  const [surveyPhotos, setSurveyPhotos] = React.useState<string[]>([])

  // Reset edit mode and load photos when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setReleveEditing(false)
      setSurveyPhotos([])
      return
    }
    // Load existing photos for this survey
    const supabase = createClient()
    supabase
      .from('photos')
      .select('storage_path')
      .eq('survey_id', survey.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const urls = data.map((p) => {
            const { data: urlData } = supabase.storage
              .from('project-photos')
              .getPublicUrl(p.storage_path)
            return urlData.publicUrl
          })
          setSurveyPhotos(urls)
        }
      })
  }, [open, survey.id])

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

  // Parse template field values from weather JSONB
  const templateFieldValues: Record<string, FieldValue> = (() => {
    if (!survey.weather || typeof survey.weather !== 'object') return {}
    const weather = survey.weather as Record<string, unknown>
    return (weather.templateFields as Record<string, FieldValue>) ?? {}
  })()

  const hasTemplateData = Object.keys(templateFieldValues).length > 0

  // Get template definition for read-only display
  const templateDef = !isReleve ? (getDefaultFieldsForType(survey.surveyType) ?? null) : null

  const handleEmail = () => {
    const typeLabel = SURVEY_TYPE_LABELS[survey.surveyType] || survey.surveyType
    const subject = encodeURIComponent(
      `${typeLabel} — ${projectName || 'Survey'} — ${formatDate(survey.surveyDate)}`
    )
    const bodyParts = [
      `Survey Type: ${typeLabel}`,
      `Date: ${formatDate(survey.surveyDate)}`,
      `Surveyor: ${survey.surveyor.name}`,
      survey.startTime ? `Start: ${survey.startTime}` : null,
      survey.endTime ? `End: ${survey.endTime}` : null,
      survey.notes ? `\nNotes:\n${survey.notes}` : null,
    ].filter(Boolean)
    const body = encodeURIComponent(bodyParts.join('\n'))
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  // Relevé Survey: show read-only by default, edit mode on request
  if (isReleve && projectId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl p-0">
          <DialogHeader className="border-b px-6 py-4 pr-12">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg">
                {releveEditing ? 'Edit Relevé Survey' : 'Relevé Survey Details'}
              </DialogTitle>
              <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
              {!releveEditing && survey.status !== 'approved' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => setReleveEditing(true)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 py-4">
            {releveLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Loading survey data...</span>
              </div>
            ) : (
              <>
                <ReleveSurveyForm
                  projectId={projectId}
                  projectName={projectName ?? ''}
                  surveyId={survey.id}
                  existingData={releveData}
                  readOnly={!releveEditing}
                  onSaved={() => {
                    setReleveEditing(false)
                    onOpenChange(false)
                  }}
                  onClose={() => {
                    if (releveEditing) {
                      setReleveEditing(false)
                    } else {
                      onOpenChange(false)
                    }
                  }}
                />
                <div className="mt-6 space-y-2 border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Survey Photos
                  </p>
                  <PhotoUpload
                    projectId={projectId}
                    entityType="survey"
                    entityId={survey.id}
                    photos={surveyPhotos}
                    onPhotosChange={setSurveyPhotos}
                    maxPhotos={10}
                    disabled={survey.status === 'approved'}
                  />
                </div>
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  // Default: generic survey view (with template data if available)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          hasTemplateData || projectId ? 'max-h-[90vh] max-w-2xl overflow-y-auto' : 'max-w-lg'
        }
      >
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

        {/* Template-driven field data (read-only) */}
        {hasTemplateData && templateDef && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Survey-Specific Data</p>
              <TemplateSectionsRenderer
                templateFields={templateDef}
                values={templateFieldValues}
                onChange={() => {}}
                readOnly
              />
            </div>
          </>
        )}

        {/* Survey Photos */}
        {projectId && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Photos
              </p>
              <PhotoUpload
                projectId={projectId}
                entityType="survey"
                entityId={survey.id}
                photos={surveyPhotos}
                onPhotosChange={setSurveyPhotos}
                maxPhotos={10}
                disabled={survey.status === 'approved'}
              />
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleEmail}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email
          </Button>
          {onEdit && survey.status !== 'approved' && (
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={() => {
                onOpenChange(false)
                onEdit(survey)
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
