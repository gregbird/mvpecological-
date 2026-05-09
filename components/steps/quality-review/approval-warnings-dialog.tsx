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

interface ApprovalWarningsDialogProps {
  open: boolean
  warnings: string[]
  onOpenChange: (open: boolean) => void
  onApproveAnyway: () => void
}

/**
 * Confirmation shown before final approval when the data completeness check
 * surfaces any warnings (no habitats, no observations, sparse sections, …).
 * Reviewer can override and approve anyway, or back out.
 */
export function ApprovalWarningsDialog({
  open,
  warnings,
  onOpenChange,
  onApproveAnyway,
}: ApprovalWarningsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approval Warnings</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-2">The following items were noted before approval:</p>
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={onApproveAnyway}>
            Approve Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
