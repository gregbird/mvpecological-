export interface MapScreenshot {
  id: string
  url: string
  storagePath: string
  stepName: string
  label: string
  createdAt: string
  dimensions: {
    width: number
    height: number
  }
}

export type MapStepName =
  | 'gis_mapping'
  | 'designated_sites'
  | 'species_records'
  | 'aquatic_features'
  | 'habitat_data'
  | 'data_analysis'

export const STEP_LABELS: Record<MapStepName, string> = {
  gis_mapping: 'GIS Mapping',
  designated_sites: 'Designated Sites',
  species_records: 'Species Records',
  aquatic_features: 'Aquatic Features',
  habitat_data: 'Habitat Data',
  data_analysis: 'Data Analysis',
}
