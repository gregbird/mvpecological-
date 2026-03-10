// Field survey type labels (walkover, habitat_mapping, etc.)
export const FIELD_SURVEY_TYPE_LABELS: Record<string, string> = {
  walkover: 'Walkover Survey',
  habitat_mapping: 'Habitat Mapping',
  releve_survey: 'Relevé Survey',
  bat_survey: 'Bat Survey',
  bird_survey: 'Bird Survey',
  mammal_survey: 'Mammal Survey',
  aquatic_survey: 'Aquatic Survey',
  botanical_survey: 'Botanical Survey',
  invertebrate_survey: 'Invertebrate Survey',
  biodiversity_net_gain: 'Biodiversity Net Gain',
  other: 'Other Survey',
}

// Project/report type labels (short — for UI display)
export const PROJECT_TYPE_LABELS: Record<string, string> = {
  pea: 'PEA',
  ecia: 'EcIA',
  aa: 'AA',
  screening: 'AA Screening',
  nis: 'NIS',
  bat_survey: 'Bat Survey',
  bird_survey: 'Bird Survey',
  habitat_survey: 'Habitat Survey',
  other: 'Other',
}

// Project/report type labels (long — for AI prompts and full descriptions)
export const PROJECT_TYPE_LABELS_LONG: Record<string, string> = {
  pea: 'Preliminary Ecological Appraisal (PEA)',
  ecia: 'Ecological Impact Assessment (EcIA)',
  aa: 'Appropriate Assessment (AA)',
  screening: 'Appropriate Assessment Screening',
  nis: 'Natura Impact Statement (NIS)',
  bat_survey: 'Bat Survey',
  bird_survey: 'Bird Survey',
  habitat_survey: 'Habitat Survey',
  other: 'Ecological Survey',
}
