import { createClient } from '@/lib/supabase/client'
import type { Photo, PhotoInsert, PhotoUpdate } from '@/types/database'

/**
 * Fetch project photos. When `siteId` is provided, photos are matched via
 * either the direct `site_id` column (project/site-level photos) or via FK
 * relations to surveys, target_notes, and habitat_polygons (entity-attached
 * photos that inherit the entity's site).
 */
export async function getProjectPhotos(
  projectId: string,
  siteId?: string | null
): Promise<Photo[]> {
  const supabase = createClient()

  if (siteId) {
    const [surveysResult, notesResult, habitatsResult] = await Promise.all([
      supabase.from('surveys').select('id').eq('project_id', projectId).eq('site_id', siteId),
      supabase.from('target_notes').select('id').eq('project_id', projectId).eq('site_id', siteId),
      supabase
        .from('habitat_polygons')
        .select('id')
        .eq('project_id', projectId)
        .eq('site_id', siteId),
    ])

    const surveyIds = (surveysResult.data ?? []).map((s) => s.id)
    const noteIds = (notesResult.data ?? []).map((n) => n.id)
    const habitatIds = (habitatsResult.data ?? []).map((h) => h.id)

    const orParts: string[] = [`site_id.eq.${siteId}`]
    if (surveyIds.length > 0) orParts.push(`survey_id.in.(${surveyIds.join(',')})`)
    if (noteIds.length > 0) orParts.push(`target_note_id.in.(${noteIds.join(',')})`)
    if (habitatIds.length > 0) orParts.push(`habitat_polygon_id.in.(${habitatIds.join(',')})`)

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('project_id', projectId)
      .or(orParts.join(','))
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Photo[]
  }

  // Project-wide view (All Sites)
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

/**
 * Resolves the URL a viewer should see — watermarked version when present
 * (e.g. mobile-uploaded photos which bake date/GPS/tag into the image),
 * falling back to the raw storage_path for legacy/web uploads.
 */
export function getPhotoDisplayUrl(
  photo: Pick<Photo, 'storage_path' | 'watermarked_path'>
): string {
  return getPhotoPublicUrl(photo.watermarked_path ?? photo.storage_path)
}
