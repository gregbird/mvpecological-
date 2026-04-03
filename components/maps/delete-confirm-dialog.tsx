'use client'

interface DeleteConfirmDialogProps {
  /** Whether the dialog is visible */
  open: boolean
  /** Called when user confirms deletion */
  onConfirm: () => void
  /** Called when user cancels deletion */
  onCancel: () => void
}

/**
 * Modal dialog shown when a user clicks the delete tool on a polygon.
 * The polygon is dimmed on the map while awaiting confirmation.
 */
export function DeleteConfirmDialog({ open, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-background mx-4 max-w-sm rounded-lg border p-6 shadow-xl">
        <h3 className="text-foreground mb-2 text-lg font-semibold">Delete polygon?</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          This will permanently remove the polygon from the map. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
