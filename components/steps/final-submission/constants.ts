// Static export options used by Step 8 cards. Lifted out of the step file so
// the card sub-components don't all import the parent.

export const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF Document', description: 'Best for printing and sharing' },
  { id: 'docx', name: 'Word Document', description: 'Editable format for further modifications' },
  { id: 'html', name: 'HTML Report', description: 'Web-viewable format' },
] as const

export const APPENDIX_OPTIONS = [
  { id: 'habitat_map', label: 'Habitat Map' },
  { id: 'habitat_data', label: 'Habitat Data' },
  { id: 'designated_sites', label: 'Designated Sites' },
  { id: 'species_list', label: 'Species List' },
  { id: 'aquatic_data', label: 'Aquatic Features' },
  { id: 'photographs', label: 'Site Photographs' },
  { id: 'survey_datasheets', label: 'Survey Datasheets' },
  { id: 'legislation', label: 'Legislation References' },
] as const
