'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectTargetNotes,
  getTargetNote,
  createTargetNote,
  updateTargetNote,
  deleteTargetNote,
  verifyTargetNote,
  getTargetNotesStats,
} from '@/lib/supabase/queries'
import type { InsertTables, UpdateTables } from '@/types/database'

const FIVE_MINUTES = 5 * 60 * 1000

export function useTargetNotes(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['target-notes', projectId, siteId ?? null],
    queryFn: () => getProjectTargetNotes(projectId, siteId),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useTargetNote(noteId: string) {
  return useQuery({
    queryKey: ['target-note', noteId],
    queryFn: () => getTargetNote(noteId),
    enabled: !!noteId,
    staleTime: FIVE_MINUTES,
  })
}

export function useTargetNotesStats(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['target-notes-stats', projectId, siteId ?? null],
    queryFn: () => getTargetNotesStats(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useCreateTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (note: InsertTables<'target_notes'>) => createTargetNote(note),
    onSuccess: (_data, variables) => {
      // Scoped to the project being edited.
      queryClient.invalidateQueries({ queryKey: ['target-notes', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['target-notes-stats', variables.project_id] })
    },
  })
}

export function useUpdateTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: UpdateTables<'target_notes'> }) =>
      updateTargetNote(noteId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['target-note', variables.noteId] })
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
      queryClient.invalidateQueries({ queryKey: ['target-notes-stats'] })
    },
  })
}

export function useDeleteTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (noteId: string) => deleteTargetNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
      queryClient.invalidateQueries({ queryKey: ['target-notes-stats'] })
    },
  })
}

export function useVerifyTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, verifierId }: { noteId: string; verifierId: string }) =>
      verifyTargetNote(noteId, verifierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
      queryClient.invalidateQueries({ queryKey: ['target-notes-stats'] })
    },
  })
}
