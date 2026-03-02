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

interface ChangeReportTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTypeName: string
  newTypeName: string
  newSectionCount: number
  isPending: boolean
  onConfirm: () => void
}

export function ChangeReportTypeDialog({
  open,
  onOpenChange,
  currentTypeName,
  newTypeName,
  newSectionCount,
  isPending,
  onConfirm,
}: ChangeReportTypeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Report Type?</AlertDialogTitle>
          <AlertDialogDescription>
            Changing from <strong>{currentTypeName}</strong> to <strong>{newTypeName}</strong> will
            save your current content as a new version and create a fresh {newSectionCount}-section
            draft. All existing versions will be preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Switching...' : 'Switch Report Type'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
