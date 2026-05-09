'use client'

import * as React from 'react'
import { MessageSquare, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ReviewNote } from './types'

interface NoteListProps {
  notes: ReviewNote[]
  scopeId: string
  isComplete: boolean
  isAdding: boolean
  noteText: string
  /** When true, the "Add" button label reads "Add General Note" instead of "Add Note". */
  asGeneral?: boolean
  /** Textarea row count — sections use 2, general uses 3. */
  rows?: number
  onNoteTextChange: (value: string) => void
  onStartAdding: (scopeId: string) => void
  onCancelAdding: () => void
  onSaveNote: (scopeId: string) => void
  onDeleteNote: (scopeId: string, noteId: string) => void
}

/**
 * Reusable amber-styled review note list. Used both per-section (in the
 * Draft Report card) and as the "_general" pseudo-section in General Notes.
 */
export function NoteList({
  notes,
  scopeId,
  isComplete,
  isAdding,
  noteText,
  asGeneral,
  rows = 2,
  onNoteTextChange,
  onStartAdding,
  onCancelAdding,
  onSaveNote,
  onDeleteNote,
}: NoteListProps) {
  return (
    <div className={asGeneral ? 'space-y-4' : 'mt-3 space-y-2'}>
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
        >
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm">{note.text}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {new Date(note.createdAt).toLocaleString()}
            </p>
          </div>
          {!isComplete && (
            <button
              type="button"
              onClick={() => onDeleteNote(scopeId, note.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {!isComplete &&
        (isAdding ? (
          <div className="space-y-2">
            <Textarea
              placeholder={
                asGeneral ? 'Add a general review note...' : 'Add a review note for this section...'
              }
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              rows={rows}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSaveNote(scopeId)} disabled={!noteText.trim()}>
                Save Note
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelAdding}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant={asGeneral ? 'outline' : 'ghost'}
            size="sm"
            className={asGeneral ? '' : 'text-muted-foreground'}
            onClick={() => onStartAdding(scopeId)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {asGeneral ? 'Add General Note' : 'Add Note'}
          </Button>
        ))}
    </div>
  )
}
