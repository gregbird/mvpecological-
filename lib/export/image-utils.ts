/**
 * Image fetching utilities for PDF/DOCX export.
 *
 * Worker-compatible: uses `fetch + createImageBitmap + OffscreenCanvas`
 * instead of HTMLImageElement / HTMLCanvasElement so the export pipeline
 * can run inside a Web Worker (where DOM APIs are unavailable).
 */

interface FetchedImage {
  base64: string
  width: number
  height: number
  format: 'JPEG' | 'PNG'
}

const MAX_EXPORT_WIDTH = 1600
const MAX_EXPORT_HEIGHT = 1200
const FETCH_TIMEOUT_MS = 5000
const JPEG_QUALITY = 0.92

/** Fetch URL with timeout and decode to ImageBitmap. Throws on failure. */
async function loadImageBitmap(url: string, timeoutMs: number): Promise<ImageBitmap> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    return await createImageBitmap(blob)
  } finally {
    clearTimeout(timer)
  }
}

/** Check if a Supabase signed URL has an expired JWT token */
function isSignedUrlExpired(url: string): boolean {
  try {
    const parsed = new URL(url)
    const token = parsed.searchParams.get('token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return false
  }
}

/** Convert ArrayBuffer to base64 in chunks to avoid stack overflow on large images. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
  }
  return btoa(binary)
}

/** Compute scaled dimensions that fit within MAX_EXPORT_WIDTH x MAX_EXPORT_HEIGHT. */
function scaleDimensions(origW: number, origH: number) {
  const scale = Math.min(MAX_EXPORT_WIDTH / origW, MAX_EXPORT_HEIGHT / origH, 1)
  return { width: Math.round(origW * scale), height: Math.round(origH * scale) }
}

/** Render bitmap to OffscreenCanvas at scaled dimensions, return canvas + final size. */
function renderToCanvas(bitmap: ImageBitmap): {
  canvas: OffscreenCanvas
  width: number
  height: number
} | null {
  const { width, height } = scaleDimensions(bitmap.width, bitmap.height)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return { canvas, width, height }
}

/**
 * Fetch an image URL and return it as base64 with dimensions.
 * Downscales large images. Returns null on failure so exports don't break.
 */
export async function fetchImageAsBase64(url: string): Promise<FetchedImage | null> {
  try {
    if (isSignedUrlExpired(url)) return null
    const bitmap = await loadImageBitmap(url, FETCH_TIMEOUT_MS)
    const rendered = renderToCanvas(bitmap)
    if (!rendered) return null

    const blob = await rendered.canvas.convertToBlob({
      type: 'image/jpeg',
      quality: JPEG_QUALITY,
    })
    const buffer = await blob.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    return { base64, width: rendered.width, height: rendered.height, format: 'JPEG' }
  } catch {
    return null
  }
}

/**
 * Fetch an image URL and return it as ArrayBuffer with dimensions.
 * Used for DOCX ImageRun which needs raw buffer data.
 * Returns null on failure so exports don't break.
 */
export async function fetchImageAsBuffer(
  url: string
): Promise<{ buffer: ArrayBuffer; width: number; height: number } | null> {
  try {
    if (isSignedUrlExpired(url)) return null
    const bitmap = await loadImageBitmap(url, FETCH_TIMEOUT_MS)
    const rendered = renderToCanvas(bitmap)
    if (!rendered) return null

    const blob = await rendered.canvas.convertToBlob({
      type: 'image/jpeg',
      quality: JPEG_QUALITY,
    })
    const buffer = await blob.arrayBuffer()
    return { buffer, width: rendered.width, height: rendered.height }
  } catch {
    return null
  }
}
