import { createClient } from '@/lib/supabase/client'
import type { MapScreenshot } from './types'

const BUCKET = 'map-screenshots'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

/**
 * Convert a base64 data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

/**
 * Save a screenshot to Supabase Storage + DB
 */
export async function saveScreenshot(
  projectId: string,
  dataUrl: string,
  stepName: string,
  label: string,
  dimensions: { width: number; height: number },
  userId?: string
): Promise<MapScreenshot | null> {
  const supabase = createClient()

  const timestamp = Date.now()
  const ext = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
  const storagePath = `${projectId}/${stepName}-${timestamp}.${ext}`

  const blob = dataUrlToBlob(dataUrl)

  // Upload to Storage
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  })

  if (uploadError) {
    console.error('Screenshot upload failed:', uploadError)
    return null
  }

  // Insert DB record
  const { data, error: dbError } = await supabase
    .from('map_screenshots')
    .insert({
      project_id: projectId,
      storage_path: storagePath,
      step_name: stepName,
      label,
      width: dimensions.width,
      height: dimensions.height,
      created_by: userId || null,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Screenshot DB insert failed:', dbError)
    // Clean up uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath])
    return null
  }

  // Get signed URL for immediate display
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

  return {
    id: data.id,
    url: urlData?.signedUrl || '',
    storagePath: data.storage_path,
    stepName: data.step_name,
    label: data.label,
    createdAt: data.created_at || new Date().toISOString(),
    dimensions: {
      width: data.width || 0,
      height: data.height || 0,
    },
  }
}

/**
 * Get all screenshots for a project with signed URLs
 */
export async function getAllScreenshots(projectId: string): Promise<MapScreenshot[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('map_screenshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) {
    return []
  }

  // Batch create signed URLs
  const paths = data.map((row) => row.storage_path)
  const { data: urlsData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY)

  const urlMap = new Map<string, string>()
  if (urlsData) {
    for (const item of urlsData) {
      if (item.signedUrl && item.path) {
        urlMap.set(item.path, item.signedUrl)
      }
    }
  }

  return data.map((row) => ({
    id: row.id,
    url: urlMap.get(row.storage_path) || '',
    storagePath: row.storage_path,
    stepName: row.step_name,
    label: row.label,
    createdAt: row.created_at || new Date().toISOString(),
    dimensions: {
      width: row.width || 0,
      height: row.height || 0,
    },
  }))
}

/**
 * Remove a screenshot from Storage + DB
 */
export async function removeScreenshot(
  screenshotId: string,
  storagePath: string
): Promise<boolean> {
  const supabase = createClient()

  // Delete from storage
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])

  if (storageError) {
    console.error('Screenshot storage delete failed:', storageError)
  }

  // Delete from DB
  const { error: dbError } = await supabase.from('map_screenshots').delete().eq('id', screenshotId)

  if (dbError) {
    console.error('Screenshot DB delete failed:', dbError)
    return false
  }

  return true
}
