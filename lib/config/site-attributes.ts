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
 * Get default attributes for a new site (auto fields populated)
 */
export function getDefaultAttributes(objectId: number): Record<string, unknown> {
  const attrs: Record<string, unknown> = {}
  for (const field of SITE_ATTRIBUTE_FIELDS) {
    if (field.auto && field.key === 'OBJECT_ID') {
      attrs[field.key] = objectId
    } else {
      attrs[field.key] = ''
    }
  }
  return attrs
}
