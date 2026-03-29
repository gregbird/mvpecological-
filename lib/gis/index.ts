/**
 * GIS Utilities
 *
 * Central export for all GIS-related utilities
 */

// Validation
export {
  validateBoundary,
  isWithinIreland,
  detectCRS,
  getBoundingBox,
  formatCoordinate,
  getCRSName,
  IRELAND_BOUNDS,
  EPSG_CODES,
  type ValidationResult,
  type CoordinateBounds,
} from './validation'

// Shapefile parsing
export {
  parseShapefile,
  isShapefileType,
  getSupportedShapefileExtensions,
  type ShapefileParseResult,
} from './shapefile-parser'

// Buffer zones
export {
  createBuffer,
  createMultipleBuffers,
  calculatePerimeter,
  calculateAreaHa,
  formatDistance,
  STANDARD_BUFFER_DISTANCES,
  type BufferOptions,
  type BufferResult,
} from './buffer'

// Shapefile export
export {
  exportProjectShapefile,
  downloadShapefile,
  buildBoundaryCollection,
  buildTargetNotesCollection,
  buildHabitatCollection,
  type ShapefileExportOptions,
} from './shapefile-export'

// Coordinate transformation
export {
  transformPoint,
  transformFeatureToWGS84,
  transformCollectionToWGS84,
} from './coordinate-transform'

// Polygon operations
export { clipPolygon, polygonsOverlap, getOverlapArea } from './polygon-operations'

// Trace along feature
export { findNearestEdgePoint, traceEdge, findNearestPolygonEdge } from './trace-along-feature'

// Reverse geocoding
export {
  reverseGeocode,
  getLocationFromBoundary,
  formatLocation,
  formatLocationShort,
  type IrishLocationInfo,
  type ReverseGeocodeResult,
} from './reverse-geocode'
