import { createClient } from '@/lib/supabase/client'
import type { Photo, PhotoInsert, PhotoUpdate } from '@/types/database'

/**
 * Fetch project photos. When `siteId` is provided, the photos table is
 * filtered indirectly via its FK relations to surveys, target_notes, and
 * habitat_polygons (the only entities that carry a `site_id`). Photos that
 * are not linked to any of those entities are excluded from a site-scoped
 * view — they only appear in the project-wide ("All Sites") view.
 */
export async function getProjectPhotos(
  projectId: string,
  siteId?: string | null
): Promise<Photo[]> {
  const supabase = createClient()

  if (siteId) {
    // Pre-fetch the IDs of every site-scoped entity that a photo can be
    // attached to. We only filter on the join FKs that actually exist on
    // the photos table (survey_id, target_note_id, habitat_polygon_id).
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

    // No related entities → no photos for this site
    if (surveyIds.length === 0 && noteIds.length === 0 && habitatIds.length === 0) {
      return []
    }

    const orParts: string[] = []
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
