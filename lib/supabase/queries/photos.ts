import { createClient } from '@/lib/supabase/client'
import type { Photo, PhotoInsert, PhotoUpdate } from '@/types/database'

export async function getProjectPhotos(projectId: string): Promise<Photo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Photo[]
}

export async function createPhoto(photo: PhotoInsert): Promise<Photo> {
  const supabase = createClient()
  const { data, error } = await supabase.from('photos').insert(photo).select().single()

  if (error) throw error
  return data as Photo
}

export async function updatePhoto(photoId: string, updates: PhotoUpdate): Promise<Photo> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .maybeSingle()

  if (error) throw error
  return data as Photo
}

export async function deletePhoto(photoId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('photos').delete().eq('id', photoId)

  if (error) throw error
}

export function getPhotoPublicUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('project-photos').getPublicUrl(storagePath)
  return data.publicUrl
}
