'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjectPhotos, createPhoto, updatePhoto, deletePhoto } from '@/lib/supabase/queries'
import type { PhotoInsert, PhotoUpdate } from '@/types/database'

export function useProjectPhotos(projectId: string) {
  return useQuery({
    queryKey: ['photos', projectId],
    queryFn: () => getProjectPhotos(projectId),
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
    mutationFn: ({ photoId, updates }: { photoId: string; updates: PhotoUpdate }) =>
      updatePhoto(photoId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}
