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
import { validateBoundary, detectCRS, type ValidationResult } from './validation'

export interface ShapefileParseResult {
  success: boolean
  feature: GeoJSON.Feature<GeoJSON.Polygon> | null
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
  }
}

/**
 * Parse a shapefile from a File object
 * Supports .zip files containing shapefile components
 */
export async function parseShapefile(file: File): Promise<ShapefileParseResult> {
  const warnings: string[] = []

  try {
    // Check file extension
    const fileName = file.name.toLowerCase()

    if (!fileName.endsWith('.zip') && !fileName.endsWith('.shp')) {
      return {
        success: false,
        feature: null,
        featureCollection: null,
        validation: null,
        error:
          'Please upload a .zip file containing the shapefile components (.shp, .shx, .dbf, .prj)',
        warnings: [],
        metadata: {
          featureCount: 0,
          geometryType: null,
          hasAttributes: false,
          attributes: [],
          detectedCRS: null,
        },
      }
    }

    if (fileName.endsWith('.shp')) {
      warnings.push(
        'Uploading a single .shp file. For best results, upload a .zip file containing all shapefile components (.shp, .shx, .dbf, .prj)'
      )
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse shapefile
    let geojson: GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[]

    try {
      geojson = await shp(arrayBuffer)
    } catch (parseError) {
      console.error('Shapefile parse error:', parseError)
      return {
        success: false,
        feature: null,
        featureCollection: null,
        validation: null,
        error: `Failed to parse shapefile: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        warnings,
        metadata: {
          featureCount: 0,
          geometryType: null,
          hasAttributes: false,
          attributes: [],
          detectedCRS: null,
        },
      }
    }

    // Handle multiple layers in zip
    let featureCollection: GeoJSON.FeatureCollection

    if (Array.isArray(geojson)) {
      if (geojson.length === 0) {
        return {
          success: false,
          feature: null,
          featureCollection: null,
          validation: null,
          error: 'Shapefile contains no layers',
          warnings,
          metadata: {
            featureCount: 0,
            geometryType: null,
            hasAttributes: false,
            attributes: [],
            detectedCRS: null,
          },
        }
      }

      if (geojson.length > 1) {
        warnings.push(`Shapefile contains ${geojson.length} layers. Using the first layer.`)
      }

      featureCollection = geojson[0]
    } else {
      featureCollection = geojson
    }

    // Check if we have features
    if (!featureCollection.features || featureCollection.features.length === 0) {
      return {
        success: false,
        feature: null,
        featureCollection: null,
        validation: null,
        error: 'Shapefile contains no features',
        warnings,
        metadata: {
          featureCount: 0,
          geometryType: null,
          hasAttributes: false,
          attributes: [],
          detectedCRS: null,
        },
      }
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
        success: false,
        feature: null,
        featureCollection: null,
        validation: null,
        error: `No polygon features found. Shapefile contains: ${geometryTypes.join(', ') || 'unknown geometry types'}`,
        warnings,
        metadata: {
          featureCount: featureCollection.features.length,
          geometryType: geometryTypes[0] || null,
          hasAttributes: false,
          attributes: [],
          detectedCRS: null,
        },
      }
    }

    if (polygonFeatures.length > 1) {
      warnings.push(
        `Shapefile contains ${polygonFeatures.length} polygon features. Using the first one as the project boundary.`
      )
    }

    // Get the first polygon feature
    let feature = polygonFeatures[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>

    // Convert MultiPolygon to Polygon if needed
    if (feature.geometry.type === 'MultiPolygon') {
      warnings.push('Converting MultiPolygon to Polygon (using first polygon)')
      feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: feature.geometry.coordinates[0],
        },
        properties: feature.properties,
      } as GeoJSON.Feature<GeoJSON.Polygon>
    }

    // Extract attribute names
    const attributes = feature.properties ? Object.keys(feature.properties) : []

    // Validate the boundary
    const validation = validateBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)

    // Add validation warnings
    warnings.push(...validation.warnings)

    // Get detected CRS from validation
    const coords = feature.geometry.coordinates[0] as [number, number][]
    const bounds = {
      minLat: Math.min(...coords.map((c) => c[1])),
      maxLat: Math.max(...coords.map((c) => c[1])),
      minLng: Math.min(...coords.map((c) => c[0])),
      maxLng: Math.max(...coords.map((c) => c[0])),
    }
    const detectedCRS = detectCRS(bounds)

    return {
      success: validation.valid,
      feature: validation.valid ? (feature as GeoJSON.Feature<GeoJSON.Polygon>) : null,
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
      },
    }
  } catch (error) {
    console.error('Shapefile processing error:', error)
    return {
      success: false,
      feature: null,
      featureCollection: null,
      validation: null,
      error: `Error processing shapefile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings,
      metadata: {
        featureCount: 0,
        geometryType: null,
        hasAttributes: false,
        attributes: [],
        detectedCRS: null,
      },
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
