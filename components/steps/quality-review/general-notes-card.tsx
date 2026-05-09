'use client'

import { MessageSquare, Info, CheckCircle2, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoteList } from './note-list'
import type { ReviewNote, ReviewSignature } from './types'

interface GeneralNotesCardProps {
  notes: ReviewNote[]
  isComplete: boolean
  addingNoteFor: string | null
  noteText: string
  reviewDecision: 'approved' | 'rejected' | null
  reviewSignature?: ReviewSignature
  canApproveReport: boolean
  onNoteTextChange: (value: string) => void
  onStartAdding: (scopeId: string) => void
  onCancelAdding: () => void
  onSaveNote: (scopeId: string) => void
  onDeleteNote: (scopeId: string, noteId: string) => void
  onApprove: () => void
  onReject: () => void
}

/**
 * General-scope review notes + the approve/reject action row + a signature
 * card (rendered after a decision is recorded). The pseudo-section id
 * "_general" keeps notes inside the same `reviewNotes` map alongside per-
 * section notes.
 */
export function GeneralNotesCard({
  notes,
  isComplete,
  addingNoteFor,
  noteText,
  reviewDecision,
  reviewSignature,
  canApproveReport,
  onNoteTextChange,
  onStartAdding,
  onCancelAdding,
  onSaveNote,
  onDeleteNote,
  onApprove,
  onReject,
}: GeneralNotesCardProps) {
  const effectiveDecision = reviewSignature?.decision ?? reviewDecision

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          General Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <NoteList
          notes={notes}
          scopeId="_general"
          isComplete={isComplete}
          isAdding={addingNoteFor === '_general'}
          noteText={noteText}
          asGeneral
          rows={3}
          onNoteTextChange={onNoteTextChange}
          onStartAdding={onStartAdding}
          onCancelAdding={onCancelAdding}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
        />

        {canApproveReport ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={onReject}
              disabled={isComplete || reviewDecision === 'approved'}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Request Revisions
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onApprove}
              disabled={isComplete || reviewDecision === 'rejected'}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Report
            </Button>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Approval Required</AlertTitle>
            <AlertDescription>
              Only administrators can approve or reject reports. Please wait for an admin to review.
            </AlertDescription>
          </Alert>
        )}

        {effectiveDecision && (
          <div
            className={`rounded-lg border-2 p-4 ${
              effectiveDecision === 'approved'
                ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {effectiveDecision === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-semibold">
                {effectiveDecision === 'approved' ? 'Report Approved' : 'Revisions Requested'}
              </span>
            </div>
            {reviewSignature && (
              <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Reviewed by:</span> {reviewSignature.reviewerName}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(reviewSignature.signedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
