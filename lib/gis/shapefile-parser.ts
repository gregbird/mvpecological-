/**
 * Shapefile Parser
 *
 * Faz 1.1: Shapefile Import
 *
 * Supports:
 * - .zip files containing .shp, .shx, .dbf, .prj
 * - Individual .shp files (limited functionality without .dbf)
 */

import shp from 'shpjs'
import {
  validateBoundary,
  detectCRS,
  getBoundingBox,
  EPSG_CODES,
  type ValidationResult,
} from './validation'
import { transformFeatureToWGS84, transformCollectionToWGS84 } from './coordinate-transform'

export interface ShapefileParseResult {
  success: boolean
  feature: GeoJSON.Feature<GeoJSON.Polygon> | null
  /** All polygon features from the shapefile (for multi-site support) */
  features: GeoJSON.Feature<GeoJSON.Polygon>[]
  featureCollection: GeoJSON.FeatureCollection | null
  validation: ValidationResult | null
  error: string | null
  warnings: string[]
  metadata: {
    featureCount: number
    geometryType: string | null
    hasAttributes: boolean
    attributes: string[]
    detectedCRS: number | null
    transformedFromCRS: number | null
  }
}

/**
 * Parse a shapefile from a File object
 * Supports .zip files containing shapefile components
 */
export async function parseShapefile(file: File): Promise<ShapefileParseResult> {
  const warnings: string[] = []

  const emptyResult = (error: string): ShapefileParseResult => ({
    success: false,
    feature: null,
    features: [],
    featureCollection: null,
    validation: null,
    error,
    warnings,
    metadata: {
      featureCount: 0,
      geometryType: null,
      hasAttributes: false,
      attributes: [],
      detectedCRS: null,
      transformedFromCRS: null,
    },
  })

  try {
    const fileName = file.name.toLowerCase()

    if (!fileName.endsWith('.zip') && !fileName.endsWith('.shp')) {
      return emptyResult(
        'Please upload a .zip file containing the shapefile components (.shp, .shx, .dbf, .prj)'
      )
    }

    if (fileName.endsWith('.shp')) {
      warnings.push(
        'Uploading a single .shp file. For best results, upload a .zip file containing all shapefile components (.shp, .shx, .dbf, .prj)'
      )
    }

    const arrayBuffer = await file.arrayBuffer()

    let geojson: GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[]
    try {
      geojson = await shp(arrayBuffer)
    } catch (parseError) {
      console.error('Shapefile parse error:', parseError)
      return emptyResult(
        `Failed to parse shapefile: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      )
    }

    // Handle multiple layers in zip
    let featureCollection: GeoJSON.FeatureCollection

    if (Array.isArray(geojson)) {
      if (geojson.length === 0) return emptyResult('Shapefile contains no layers')
      if (geojson.length > 1) {
        warnings.push(`Shapefile contains ${geojson.length} layers. Using the first layer.`)
      }
      featureCollection = geojson[0]
    } else {
      featureCollection = geojson
    }

    if (!featureCollection.features || featureCollection.features.length === 0) {
      return emptyResult('Shapefile contains no features')
    }

    // Detect CRS from raw coordinates before any transformation
    const firstFeatureWithGeom = featureCollection.features.find((f) => f.geometry)
    if (!firstFeatureWithGeom?.geometry) {
      return emptyResult('No features with geometry found')
    }

    const rawBounds = getBoundingBox(firstFeatureWithGeom.geometry)
    const detectedCRS = rawBounds ? detectCRS(rawBounds) : EPSG_CODES.WGS84
    let transformedFromCRS: number | null = null

    // Transform coordinates if not WGS84
    if (detectedCRS !== EPSG_CODES.WGS84) {
      const crsName = detectedCRS === EPSG_CODES.ITM ? 'ITM (EPSG:2157)' : 'Irish Grid (EPSG:29903)'
      warnings.push(`Coordinates detected as ${crsName}. Automatically transforming to WGS84.`)
      featureCollection = transformCollectionToWGS84(featureCollection, detectedCRS)
      transformedFromCRS = detectedCRS
    }

    // Find polygon features
    const polygonFeatures = featureCollection.features.filter(
      (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
    )

    if (polygonFeatures.length === 0) {
      const geometryTypes = [
        ...new Set(featureCollection.features.map((f) => f.geometry?.type).filter(Boolean)),
      ]
      return {
        ...emptyResult(
          `No polygon features found. Shapefile contains: ${geometryTypes.join(', ') || 'unknown geometry types'}`
        ),
        metadata: {
          featureCount: featureCollection.features.length,
          geometryType: (geometryTypes[0] as string) || null,
          hasAttributes: false,
          attributes: [],
          detectedCRS,
          transformedFromCRS,
        },
      }
    }

    // Convert all features to Polygon (split MultiPolygon into individual Polygons)
    const allPolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = []

    for (const pf of polygonFeatures) {
      const feat = pf as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      if (feat.geometry.type === 'MultiPolygon') {
        for (const coords of feat.geometry.coordinates) {
          allPolygons.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: coords },
            properties: { ...feat.properties },
          })
        }
        if (feat.geometry.coordinates.length > 1) {
          warnings.push(
            `MultiPolygon with ${feat.geometry.coordinates.length} parts split into individual polygons.`
          )
        }
      } else {
        allPolygons.push(feat as GeoJSON.Feature<GeoJSON.Polygon>)
      }
    }

    if (allPolygons.length > 1) {
      warnings.push(
        `Shapefile contains ${allPolygons.length} polygon features. First one used as primary boundary.`
      )
    }

    const primaryFeature = allPolygons[0]

    // Extract attribute names from all features
    const attributeSet = new Set<string>()
    for (const p of allPolygons) {
      if (p.properties) {
        for (const key of Object.keys(p.properties)) {
          attributeSet.add(key)
        }
      }
    }
    const attributes = [...attributeSet]

    // Validate the primary boundary
    const validation = validateBoundary(primaryFeature)
    warnings.push(...validation.warnings)

    return {
      success: validation.valid,
      feature: validation.valid ? primaryFeature : null,
      features: validation.valid ? allPolygons : [],
      featureCollection,
      validation,
      error: validation.valid ? null : validation.errors.join('. '),
      warnings,
      metadata: {
        featureCount: featureCollection.features.length,
        geometryType: 'Polygon',
        hasAttributes: attributes.length > 0,
        attributes,
        detectedCRS,
        transformedFromCRS,
      },
    }
  } catch (error) {
    console.error('Shapefile processing error:', error)
    return {
      ...emptyResult(
        `Error processing shapefile: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    }
  }
}

/**
 * Check if a file is a valid shapefile type
 */
export function isShapefileType(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return fileName.endsWith('.zip') || fileName.endsWith('.shp')
}

/**
 * Get supported file extensions for shapefile upload
 */
export function getSupportedShapefileExtensions(): string[] {
  return ['.zip', '.shp']
}
