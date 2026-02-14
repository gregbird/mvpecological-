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

export function useTargetNotes(projectId: string) {
  return useQuery({
    queryKey: ['target-notes', projectId],
    queryFn: () => getProjectTargetNotes(projectId),
    enabled: !!projectId,
  })
}

export function useTargetNote(noteId: string) {
  return useQuery({
    queryKey: ['target-note', noteId],
    queryFn: () => getTargetNote(noteId),
    enabled: !!noteId,
  })
}

export function useTargetNotesStats(projectId: string) {
  return useQuery({
    queryKey: ['target-notes-stats', projectId],
    queryFn: () => getTargetNotesStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (note: InsertTables<'target_notes'>) => createTargetNote(note),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['target-notes'] })
        queryClient.invalidateQueries({ queryKey: ['target-notes-stats'] })
      }
    },
  })
}

export function useUpdateTargetNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: UpdateTables<'target_notes'> }) =>
      updateTargetNote(noteId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['target-note', variables.noteId] })
        queryClient.invalidateQueries({ queryKey: ['target-notes'] })
        queryClient.invalidateQueries({ queryKey: ['target-notes-stats'] })
      }
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
