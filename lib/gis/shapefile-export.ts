/**
 * Shapefile Export
 *
 * Exports project boundaries, habitat polygons, and target notes
 * as a complete shapefile package (.shp, .shx, .dbf, .prj).
 * Multiple layers are combined into a single zip with separate folders.
 */

import { zip } from 'shp-write'
import JSZip from 'jszip'

interface BoundaryExportData {
  boundary: GeoJSON.Feature<GeoJSON.Polygon>
  siteName?: string
  siteCode?: string
  county?: string
  gridReference?: string
  areaHa?: number
  attributes?: Record<string, unknown>
}

interface TargetNoteExportData {
  coordinates: [number, number]
  noteNumber: string
  category: string
  label?: string
  description?: string
  date?: string
  photoId?: string
  siteCode?: string
}

interface HabitatExportData {
  geometry: GeoJSON.Polygon
  fossittCode?: string
  fossittName?: string
  annexCode?: string
  areaHa?: number
  condition?: string
  siteCode?: string
}

export interface ShapefileExportOptions {
  boundaries: BoundaryExportData[]
  targetNotes?: TargetNoteExportData[]
  habitats?: HabitatExportData[]
  projectName: string
}

function buildBoundaryCollection(boundaries: BoundaryExportData[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: boundaries.map((b, i) => ({
      type: 'Feature' as const,
      geometry: b.boundary.geometry,
      properties: {
        OBJECT_ID: i + 1,
        SITE_CODE: b.siteCode || '',
        SITE_NAME: b.siteName || '',
        COUNTY: b.county || '',
        GRID_REF: b.gridReference || '',
        AREA_HA: b.areaHa ?? 0,
        ...(b.attributes || {}),
        ...(b.boundary.properties || {}),
      },
    })),
  }
}

function buildTargetNotesCollection(notes: TargetNoteExportData[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: notes.map((n) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: n.coordinates,
      },
      properties: {
        NOTE_NUM: n.noteNumber,
        LABEL: n.label || n.noteNumber,
        CATEGORY: n.category,
        COMMENT: n.description || '',
        DATE: n.date || '',
        PHOTO_ID: n.photoId || '',
        SITE_CODE: n.siteCode || '',
      },
    })),
  }
}

function buildHabitatCollection(habitats: HabitatExportData[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: habitats.map((h, i) => ({
      type: 'Feature' as const,
      geometry: h.geometry,
      properties: {
        OBJECT_ID: i + 1,
        FOSS_CODE: h.fossittCode || '',
        FOSS_NAME: h.fossittName || '',
        ANNEX_CODE: h.annexCode || '',
        AREA_HA: h.areaHa ?? 0,
        CONDITION: h.condition || '',
        DATA_QUAL: '',
        SITE_CODE: h.siteCode || '',
      },
    })),
  }
}

async function generateLayerBlob(
  collection: GeoJSON.FeatureCollection,
  folder: string,
  filename: string
): Promise<Blob> {
  // shp-write 0.3.2 returns a base64 string, not a Blob
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (zip as any)(collection, {
    folder,
    filename,
    types: {
      point: 'points',
      polygon: 'polygons',
      polyline: 'polylines',
    },
  })

  // Convert base64 string to Blob
  if (typeof result === 'string') {
    const binary = atob(result)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: 'application/zip' })
  }

  return result as unknown as Blob
}

/**
 * Merge contents of multiple shp-write zip blobs into a single combined zip.
 * Each layer gets its own folder inside the output.
 */
async function mergeZipBlobs(layers: { name: string; blob: Blob }[]): Promise<Blob> {
  const combined = new JSZip()

  for (const layer of layers) {
    const layerZip = await JSZip.loadAsync(layer.blob)
    const folder = combined.folder(layer.name)
    if (!folder) continue

    const entries = Object.entries(layerZip.files)
    for (const [path, file] of entries) {
      if (file.dir) continue
      // Extract just the filename (strip any nested folder from shp-write)
      const basename = path.split('/').pop() || path
      const content = await file.async('arraybuffer')
      folder.file(basename, content)
    }
  }

  return combined.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

/**
 * Export project data as shapefile(s) and trigger download.
 * Generates separate shapefiles for boundaries, target notes, and habitats,
 * combined into a single zip with separate folders per layer.
 */
export async function exportProjectShapefile(options: ShapefileExportOptions): Promise<Blob> {
  const { boundaries, targetNotes, habitats, projectName } = options
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)

  const layers: { name: string; blob: Blob }[] = []

  // Always include boundaries
  const boundaryCollection = buildBoundaryCollection(boundaries)
  const boundaryBlob = await generateLayerBlob(boundaryCollection, safeName, 'boundaries')
  layers.push({ name: 'boundaries', blob: boundaryBlob })

  // Include target notes if available
  if (targetNotes && targetNotes.length > 0) {
    const notesCollection = buildTargetNotesCollection(targetNotes)
    const notesBlob = await generateLayerBlob(notesCollection, safeName, 'target_notes')
    layers.push({ name: 'target_notes', blob: notesBlob })
  }

  // Include habitats if available
  if (habitats && habitats.length > 0) {
    const habitatCollection = buildHabitatCollection(habitats)
    const habitatBlob = await generateLayerBlob(habitatCollection, safeName, 'habitats')
    layers.push({ name: 'habitats', blob: habitatBlob })
  }

  // Single layer — return directly, multi-layer — merge into combined zip
  if (layers.length === 1) {
    return layers[0].blob
  }

  return mergeZipBlobs(layers)
}

/**
 * Export and trigger browser download of a shapefile.
 */
export async function downloadShapefile(options: ShapefileExportOptions): Promise<void> {
  const blob = await exportProjectShapefile(options)
  const safeName = options.projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}_shapefile.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Re-export builder functions for direct use (e.g., multi-layer custom export)
export { buildBoundaryCollection, buildTargetNotesCollection, buildHabitatCollection }
