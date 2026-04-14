'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjectPhotos, createPhoto, updatePhoto, deletePhoto } from '@/lib/supabase/queries'
import type { PhotoInsert, PhotoUpdate } from '@/types/database'

export function useProjectPhotos(projectId: string, siteId?: string | null) {
  return useQuery({
    queryKey: ['photos', projectId, siteId ?? null],
    queryFn: () => getProjectPhotos(projectId, siteId),
    enabled: !!projectId,
  })
}

export function useCreatePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photo: PhotoInsert) => createPhoto(photo),
    onSuccess: (_data, variables) => {
      if (variables.project_id) {
        queryClient.invalidateQueries({ queryKey: ['photos', variables.project_id] })
      }
    },
  })
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      photoId,
      updates,
    }: {
      photoId: string
      updates: PhotoUpdate
      projectId?: string
    }) => updatePhoto(photoId, updates),
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['photos', variables.projectId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['photos'] })
      }
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId }: { photoId: string; projectId?: string }) => deletePhoto(photoId),
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['photos', variables.projectId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['photos'] })
      }
    },
  })
}
