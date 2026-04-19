'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'

interface SurveyStats {
  observations: number
  photos: number
  hasNotes: boolean
  hasFormData: boolean
  // Relevé-specific — null when survey isn't a relevé
  releveRowExists: boolean | null
  releveHasFields: boolean
  releveSpeciesCount: number
  isReleve: boolean
}

interface SurveyConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
  action: 'complete'
  onConfirm: () => void
}

// Numeric/text fields on releve_surveys that count as "real data".
// Excludes housekeeping columns (id, project_id, survey_id, created_at, site_name, etc.)
const RELEVE_DATA_FIELDS = [
  'habitat_type',
  'soil_type',
  'soil_stability',
  'aspect',
  'slope_degrees',
  'releve_area_sqm',
  'total_vegetation_cover_pct',
  'cover_trees_pct',
  'cover_shrubs_pct',
  'cover_graminea_pct',
  'cover_forbs_pct',
  'cover_mosses_liverworts_pct',
  'cover_litter_pct',
  'cover_bare_soil_pct',
  'cover_bare_rock_pct',
  'cover_open_water_pct',
  'max_height_trees_m',
  'max_height_shrubs_cm',
  'max_height_graminea_cm',
  'max_height_forbs_cm',
  'max_height_bryophytes_cm',
  'median_height_graminea_cm',
  'median_height_forbs_cm',
  'fauna_observations',
  'other_species_proximity',
  'releve_comment',
] as const

export function SurveyConfirmDialog({
  open,
  onOpenChange,
  surveyId,
  action,
  onConfirm,
}: SurveyConfirmDialogProps) {
  const [stats, setStats] = React.useState<SurveyStats | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !surveyId) {
      setStats(null)
      return
    }

    const fetchStats = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data: survey } = await supabase
        .from('surveys')
        .select('survey_type, notes, form_data, weather')
        .eq('id', surveyId)
        .maybeSingle()

      const isReleve = survey?.survey_type === 'releve_survey'

      const [obsResult, photoResult, releveResult] = await Promise.all([
        supabase
          .from('species_observations')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', surveyId),
        supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', surveyId),
        isReleve
          ? supabase.from('releve_surveys').select('*').eq('survey_id', surveyId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      const releveRow = releveResult.data as Record<string, unknown> | null
      const releveHasFields = Boolean(
        releveRow &&
        RELEVE_DATA_FIELDS.some((k) => {
          const v = releveRow[k]
          return v !== null && v !== undefined && v !== ''
        })
      )

      let releveSpeciesCount = 0
      if (isReleve && releveRow?.id) {
        const { count } = await supabase
          .from('releve_species')
          .select('*', { count: 'exact', head: true })
          .eq('releve_id', releveRow.id as string)
        releveSpeciesCount = count ?? 0
      }

      // form_data: nested object of template-driven fields per section.
      // Count it as "has data" if any leaf is non-empty.
      const hasFormData = hasAnyLeafValue(survey?.form_data)
      const hasNotes = Boolean(survey?.notes && survey.notes.trim().length > 0)

      setStats({
        observations: obsResult.count ?? 0,
        photos: photoResult.count ?? 0,
        hasNotes,
        hasFormData,
        releveRowExists: isReleve ? Boolean(releveRow) : null,
        releveHasFields,
        releveSpeciesCount,
        isReleve,
      })
      setLoading(false)
    }

    fetchStats()
  }, [open, surveyId])

  const hasData = stats ? computeHasData(stats) : false
  const isComplete = action === 'complete'

  // Data present: skip dialog and confirm directly.
  React.useEffect(() => {
    if (open && isComplete && stats && hasData) {
      onOpenChange(false)
      onConfirm()
    }
  }, [open, isComplete, stats, hasData, onConfirm, onOpenChange])

  if (isComplete && stats && hasData) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {stats && !hasData ? 'Cannot Complete Empty Survey' : 'Complete Survey?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {loading || !stats ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking survey data...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 rounded-md border p-3">
                    {stats.isReleve ? (
                      <>
                        <StatRow
                          label="Relevé fields filled"
                          value={stats.releveHasFields ? 'Yes' : 'No'}
                          positive={stats.releveHasFields}
                        />
                        <StatRow label="Species recorded" count={stats.releveSpeciesCount} />
                        <StatRow label="Photos" count={stats.photos} />
                      </>
                    ) : (
                      <>
                        <StatRow label="Species Observations" count={stats.observations} />
                        <StatRow label="Photos" count={stats.photos} />
                        <StatRow
                          label="Survey notes"
                          value={stats.hasNotes ? 'Yes' : 'No'}
                          positive={stats.hasNotes}
                        />
                        <StatRow
                          label="Template fields filled"
                          value={stats.hasFormData ? 'Yes' : 'No'}
                          positive={stats.hasFormData}
                        />
                      </>
                    )}
                  </div>

                  {!hasData ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {stats.isReleve
                        ? 'This relevé has no filled fields, species, or photos. Fill at least one section before completing.'
                        : 'This survey has no observations, photos, notes, or template data. Add at least one before completing.'}
                    </p>
                  ) : (
                    <p className="text-sm">
                      Mark this survey as complete? You can still edit it afterwards.
                    </p>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading || !stats || !hasData}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function computeHasData(s: SurveyStats): boolean {
  if (s.isReleve) {
    return s.releveHasFields || s.releveSpeciesCount > 0 || s.photos > 0
  }
  return s.observations > 0 || s.photos > 0 || s.hasNotes || s.hasFormData
}

function hasAnyLeafValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return !Number.isNaN(value)
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.some(hasAnyLeafValue)
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasAnyLeafValue)
  }
  return false
}

function StatRow({
  label,
  count,
  value,
  positive,
}: {
  label: string
  count?: number
  value?: string
  positive?: boolean
}) {
  const display = value ?? (count ?? 0).toString()
  const isPositive = value !== undefined ? positive : (count ?? 0) > 0
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={isPositive ? 'font-medium text-green-600' : 'font-medium text-amber-500'}>
        {display}
      </span>
    </div>
  )
}
