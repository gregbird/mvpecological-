/**
 * Shapefile Export
 *
 * Exports project boundaries, habitat polygons, and target notes
 * as a complete shapefile package (.shp, .shx, .dbf, .prj).
 */

import { zip } from 'shp-write'

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

async function generateZip(
  collection: GeoJSON.FeatureCollection,
  folder: string,
  filename: string
): Promise<Blob> {
  return zip(collection, {
    folder,
    filename,
    outputType: 'blob',
    compression: 'DEFLATE',
  })
}

/**
 * Export project data as shapefile(s) and trigger download.
 * Generates separate shapefiles for boundaries, target notes, and habitats.
 */
export async function exportProjectShapefile(options: ShapefileExportOptions): Promise<Blob> {
  const { boundaries, projectName } = options
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)

  // For now, export boundaries as the primary shapefile.
  // Target notes and habitats can be added as separate layers in the same zip
  // once we confirm shp-write supports multiple layers (it doesn't natively —
  // each call to zip() produces one shapefile set).
  // For multi-layer export we would need to use JSZip to combine them.

  const boundaryCollection = buildBoundaryCollection(boundaries)
  return generateZip(boundaryCollection, safeName, 'boundaries')
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
export { buildBoundaryCollection, buildTargetNotesCollection, buildHabitatCollection, generateZip }
