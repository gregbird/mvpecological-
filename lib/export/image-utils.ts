/**
 * Utility functions for fetching and converting images for PDF/DOCX export.
 * Uses HTML Image + Canvas for broad browser compatibility.
 */

interface FetchedImage {
  base64: string
  width: number
  height: number
  format: 'JPEG' | 'PNG'
}

/** Max dimensions for exported images — 1600x1200 keeps good print quality (~200 DPI on A4 half-width) */
const MAX_EXPORT_WIDTH = 1600
const MAX_EXPORT_HEIGHT = 1200
const FETCH_TIMEOUT_MS = 5000
const JPEG_QUALITY = 0.92

/**
 * Load an image URL via HTMLImageElement and draw to canvas.
 * This avoids CORS issues that fetch+createImageBitmap can cause
 * because img.crossOrigin = 'anonymous' handles it properly.
 */
function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    const timer = setTimeout(() => {
      img.src = ''
      reject(new Error('Image load timeout'))
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Image load failed'))
    }

    img.src = url
  })
}

/** Check if a Supabase signed URL has an expired JWT token */
function isSignedUrlExpired(url: string): boolean {
  try {
    const parsed = new URL(url)
    const token = parsed.searchParams.get('token')
    if (!token) return false
    // JWT has 3 parts; payload is the second, base64url-encoded
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return false
  }
}

/**
 * Fetch an image URL and return it as base64 with dimensions.
 * Downscales large images. Returns null on failure so exports don't break.
 */
export async function fetchImageAsBase64(url: string): Promise<FetchedImage | null> {
  try {
    if (isSignedUrlExpired(url)) return null
    const img = await loadImage(url, FETCH_TIMEOUT_MS)

    const origW = img.naturalWidth
    const origH = img.naturalHeight

    // Calculate scaled dimensions
    const scale = Math.min(MAX_EXPORT_WIDTH / origW, MAX_EXPORT_HEIGHT / origH, 1)
    const width = Math.round(origW * scale)
    const height = Math.round(origH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(img, 0, 0, width, height)

    // toDataURL is synchronous but fast for small canvas sizes
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.split(',')[1]

    return { base64, width, height, format: 'JPEG' }
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
    const img = await loadImage(url, FETCH_TIMEOUT_MS)

    const origW = img.naturalWidth
    const origH = img.naturalHeight

    const scale = Math.min(MAX_EXPORT_WIDTH / origW, MAX_EXPORT_HEIGHT / origH, 1)
    const width = Math.round(origW * scale)
    const height = Math.round(origH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) return null

    const buffer = await blob.arrayBuffer()
    return { buffer, width, height }
  } catch {
    return null
  }
}
