export interface ExifMetadata {
  latitude: number | null
  longitude: number | null
  altitude: number | null
  takenAt: string | null
}

/**
 * Read EXIF GPS and date metadata from an image file.
 * Uses dynamic import for exifr to keep bundle size small.
 * Returns null values gracefully when EXIF data is unavailable (PNG, WebP, etc.).
 */
export async function readExifMetadata(file: File): Promise<ExifMetadata> {
  const empty: ExifMetadata = {
    latitude: null,
    longitude: null,
    altitude: null,
    takenAt: null,
  }

  try {
    const exifr = await import('exifr')
    const parsed = await exifr.parse(file, {
      gps: true,
      pick: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'DateTimeOriginal', 'CreateDate'],
    })

    if (!parsed) return empty

    const latitude = typeof parsed.latitude === 'number' ? parsed.latitude : null
    const longitude = typeof parsed.longitude === 'number' ? parsed.longitude : null
    const altitude = typeof parsed.GPSAltitude === 'number' ? parsed.GPSAltitude : null

    let takenAt: string | null = null
    const dateVal = parsed.DateTimeOriginal ?? parsed.CreateDate
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      takenAt = dateVal.toISOString()
    }

    return { latitude, longitude, altitude, takenAt }
  } catch {
    // Silently return empty — not all image formats support EXIF
    return empty
  }
}
