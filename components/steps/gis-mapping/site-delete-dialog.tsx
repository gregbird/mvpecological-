'use client'

import * as React from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

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
import { useSiteImpactCounts } from '@/hooks/queries/use-site-hooks'
import type { SiteImpactCounts } from '@/lib/supabase/queries/project-sites'

interface SiteDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string | undefined
  siteCode: string
  isUnsaved: boolean
  isDeleting: boolean
  onConfirm: () => void
}

const IMPACT_LABELS: Array<{ key: keyof SiteImpactCounts; label: string }> = [
  { key: 'findings', label: 'Findings' },
  { key: 'surveys', label: 'Surveys' },
  { key: 'species_observations', label: 'Species observations' },
  { key: 'habitats', label: 'Habitat polygons' },
  { key: 'target_notes', label: 'Target notes' },
  { key: 'releve_surveys', label: 'Relevé surveys' },
  { key: 'photos', label: 'Photos' },
]

export function SiteDeleteDialog({
  open,
  onOpenChange,
  siteId,
  siteCode,
  isUnsaved,
  isDeleting,
  onConfirm,
}: SiteDeleteDialogProps) {
  // Only query impact counts when dialog is open and site is persisted.
  const enabled = open && !isUnsaved && !!siteId
  const { data: counts, isLoading } = useSiteImpactCounts(enabled ? siteId : undefined)

  const nonZeroCounts = React.useMemo(() => {
    if (!counts) return []
    return IMPACT_LABELS.filter(({ key }) => counts[key] > 0).map(({ key, label }) => ({
      key,
      label,
      value: counts[key],
    }))
  }, [counts])

  const totalAffected = nonZeroCounts.reduce((sum, r) => sum + r.value, 0)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete site {siteCode}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isUnsaved ? (
                <p>
                  This site has not been saved yet. Removing it discards the boundary you just drew.
                </p>
              ) : isLoading ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking what this site will take with it…
                </p>
              ) : totalAffected === 0 ? (
                <p>
                  This site has no linked findings, surveys, or notes. It will be removed
                  permanently.
                </p>
              ) : (
                <>
                  <p>
                    This site has linked data. Deleting it will{' '}
                    <strong className="text-red-600 dark:text-red-400">
                      permanently remove the following
                    </strong>{' '}
                    and cannot be undone:
                  </p>
                  <ul className="bg-muted space-y-1 rounded-md p-3 text-sm">
                    {nonZeroCounts.map((row) => (
                      <li key={row.key} className="flex justify-between">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-mono font-medium">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground text-xs">
                    Downstream workflow steps that depend on this site will be flagged for review.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting || (!isUnsaved && isLoading)}
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete permanently'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
