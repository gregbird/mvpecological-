'use client'

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
import type { Report } from '@/types/database'

interface RestoreVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report | null
  nextVersion: number
  isPending: boolean
  onConfirm: () => void
}

export function RestoreVersionDialog({
  open,
  onOpenChange,
  report,
  nextVersion,
  isPending,
  onConfirm,
}: RestoreVersionDialogProps) {
  if (!report) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Version {report.version}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will save the content from Version {report.version} as a new Version {nextVersion}.
            All existing versions will be preserved — nothing will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Restoring...' : 'Restore as New Version'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
