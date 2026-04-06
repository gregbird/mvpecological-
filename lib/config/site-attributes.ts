/**
 * Site Attribute Field Definitions
 *
 * Predefined attribute fields for project site boundaries.
 * These map to standard GIS attribute fields used in Irish ecological assessments.
 */

export interface SiteAttributeField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  auto?: boolean
  description?: string
}

export const SITE_ATTRIBUTE_FIELDS: SiteAttributeField[] = [
  {
    key: 'OBJECT_ID',
    label: 'Object ID',
    type: 'number',
    auto: true,
    description: 'Unique numeric identifier for each feature',
  },
  {
    key: 'FOSS_CODE',
    label: 'FOSSITT Code',
    type: 'text',
    description: 'Habitat code per A Guide to Habitats in Ireland (Fossitt, 2000)',
  },
  {
    key: 'ANNEX_CODE',
    label: 'Annex I Code',
    type: 'text',
    description: 'Habitat code per Annex I of the Habitats Directive (EC, 2007)',
  },
  {
    key: 'FOSS_NAME',
    label: 'FOSSITT Name',
    type: 'text',
    description: 'Full habitat name',
  },
  {
    key: 'COMMENT',
    label: 'Comment',
    type: 'text',
    description: 'Free text comment',
  },
  {
    key: 'SITE_NAME',
    label: 'Site Name',
    type: 'text',
    description: 'Free text site name',
  },
  {
    key: 'LABEL',
    label: 'Label',
    type: 'text',
    description: 'Free text label',
  },
  {
    key: 'NOTE_NUMBER',
    label: 'Note Number',
    type: 'text',
    description: 'Target note reference number',
  },
  {
    key: 'CATEGORY',
    label: 'Category',
    type: 'select',
    options: ['Damage', 'Fauna', 'Flora', 'Invasive Species', 'Management', 'Access'],
    description: 'Classification category',
  },
  {
    key: 'DATA_QUAL',
    label: 'Data Quality',
    type: 'text',
    description: 'Indication of field data quality',
  },
  {
    key: 'DATE',
    label: 'Survey Date',
    type: 'date',
    description: 'Date of the field survey',
  },
  {
    key: 'PHOTO_ID',
    label: 'Photo ID',
    type: 'text',
    description: 'Photo ID number(s)',
  },
]

/**
 * Common property names used in shapefiles for site/feature names.
 * Checked in priority order when extracting SITE_NAME from upload.
 */
const SITE_NAME_PROPERTY_CANDIDATES = [
  'SITE_NAME',
  'site_name',
  'SiteName',
  'SITENAME',
  'NAME',
  'Name',
  'name',
  'MIW_Name',
  'FEATURE_NAME',
  'TITLE',
  'title',
] as const

/**
 * Extract a site name from a shapefile feature's properties.
 * Returns the first non-empty value from known name-like fields.
 */
export function extractSiteNameFromProperties(
  properties?: Record<string, unknown> | null
): string | null {
  if (!properties) return null
  for (const key of SITE_NAME_PROPERTY_CANDIDATES) {
    const val = properties[key]
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim()
    }
  }
  return null
}

/**
 * Build initial attributes for a new site with auto-fillable fields populated.
 * - OBJECT_ID: sequential index
 * - SITE_NAME: from explicit siteName or shapefile properties (if present)
 * - DATE: today's date (YYYY-MM-DD)
 *
 * Existing shapefile properties are preserved as custom attributes.
 */
export function buildInitialAttributes(
  objectId: number,
  options?: {
    siteName?: string | null
    shapefileProperties?: Record<string, unknown> | null
  }
): Record<string, unknown> {
  // Preserve any custom shapefile properties
  const attrs: Record<string, unknown> = { ...(options?.shapefileProperties ?? {}) }

  // Auto-populated predefined fields
  attrs.OBJECT_ID = objectId

  const resolvedName =
    options?.siteName?.trim() || extractSiteNameFromProperties(options?.shapefileProperties)
  if (resolvedName) {
    attrs.SITE_NAME = resolvedName
  }

  // Survey date defaults to today
  attrs.DATE = new Date().toISOString().split('T')[0]

  return attrs
}
