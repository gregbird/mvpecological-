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
}

interface SurveyConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
  action: 'complete'
  onConfirm: () => void
}

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
    if (!open || !surveyId) return

    const fetchStats = async () => {
      setLoading(true)
      const supabase = createClient()

      const [obsResult, photoResult] = await Promise.all([
        supabase
          .from('species_observations')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', surveyId),
        supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', surveyId),
      ])

      setStats({
        observations: obsResult.count ?? 0,
        photos: photoResult.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [open, surveyId])

  const hasData = stats && (stats.observations > 0 || stats.photos > 0)
  const isComplete = action === 'complete'

  // If data exists for complete action, skip dialog and confirm directly
  React.useEffect(() => {
    if (open && isComplete && stats && hasData) {
      onOpenChange(false)
      onConfirm()
    }
  }, [open, isComplete, stats, hasData, onConfirm, onOpenChange])

  // Don't render if complete action with data (auto-confirmed above)
  if (isComplete && stats && hasData) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Complete Survey?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking survey data...</span>
                </div>
              ) : stats ? (
                <>
                  {/* Stats summary */}
                  <div className="space-y-1.5 rounded-md border p-3">
                    <StatRow label="Species Observations" count={stats.observations} />
                    <StatRow label="Photos" count={stats.photos} />
                  </div>

                  {/* Warning or info message */}
                  {!hasData ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      This survey has no observations or photos recorded. Are you sure you want to
                      mark it as complete?
                    </p>
                  ) : (
                    <p className="text-sm">
                      Mark this survey as complete? You can still edit it afterwards.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
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

function StatRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={count > 0 ? 'font-medium text-green-600' : 'font-medium text-amber-500'}>
        {count}
      </span>
    </div>
  )
}
