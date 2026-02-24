// Centralized survey and report type definitions
// Used across the platform: project creation, field surveys, template management

export interface SurveyTypeDefinition {
  id: string
  label: string
  description: string
}

export interface ReportTypeDefinition {
  id: string
  name: string
  description: string
}

export interface ReportSectionDefinition {
  id: string
  title: string
  aiPrompt: string
  defaultTemplate: string
}

// Survey types available in the platform
export const SURVEY_TYPES: SurveyTypeDefinition[] = [
  {
    id: 'pea',
    label: 'Preliminary Ecological Appraisal (PEA)',
    description: 'Initial ecological assessment of a site',
  },
  {
    id: 'ecia',
    label: 'Ecological Impact Assessment (EcIA)',
    description: 'Full ecological impact assessment',
  },
  {
    id: 'aa',
    label: 'Appropriate Assessment (AA)',
    description: 'Assessment under Habitats Directive Article 6',
  },
  {
    id: 'nis',
    label: 'Natura Impact Statement (NIS)',
    description: 'Statement for Natura 2000 sites',
  },
  { id: 'screening', label: 'AA Screening', description: 'Screening for Appropriate Assessment' },
  { id: 'bat_survey', label: 'Bat Survey', description: 'Bat activity and roost surveys' },
  { id: 'bird_survey', label: 'Bird Survey', description: 'Breeding and wintering bird surveys' },
  {
    id: 'habitat_survey',
    label: 'Habitat Survey',
    description: 'Habitat classification and mapping',
  },
  {
    id: 'biodiversity_net_gain',
    label: 'Biodiversity Net Gain',
    description: 'Biodiversity net gain assessment',
  },
  { id: 'other', label: 'Other', description: 'Other survey type' },
]

// Report types available in the platform
export const REPORT_TYPES: ReportTypeDefinition[] = [
  {
    id: 'pea',
    name: 'Preliminary Ecological Appraisal (PEA)',
    description: 'CIEEM standard PEA report',
  },
  { id: 'ecia', name: 'Ecological Impact Assessment (EcIA)', description: 'Full EcIA report' },
  {
    id: 'aa_screening',
    name: 'Appropriate Assessment Screening',
    description: 'AA Screening report',
  },
  {
    id: 'aa_stage2',
    name: 'Appropriate Assessment (Stage 2)',
    description: 'Full Appropriate Assessment',
  },
  { id: 'nia', name: 'Natura Impact Assessment (NIA)', description: 'NIA report' },
  { id: 'bat_survey', name: 'Bat Survey Report', description: 'Bat survey findings report' },
  { id: 'bird_survey', name: 'Bird Survey Report', description: 'Bird survey findings report' },
  { id: 'habitat_survey', name: 'Habitat Survey Report', description: 'Habitat survey report' },
  {
    id: 'protected_species',
    name: 'Protected Species Report',
    description: 'Protected species assessment',
  },
  { id: 'other', name: 'Other Technical Report', description: 'Other technical report' },
]

// Default PEA report sections (CIEEM standard)
export const PEA_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'project background and site location',
    defaultTemplate:
      'This section describes the project background, site location, and scope of the ecological appraisal.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'desk study sources and field survey methods',
    defaultTemplate:
      'This section details the desk study sources consulted and the field survey methods employed.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'designated sites, habitats, flora, fauna, invasive species',
    defaultTemplate:
      'This section presents the findings from both the desk study and field surveys.',
  },
  {
    id: 'constraints',
    title: '4. Ecological Constraints',
    aiPrompt: 'constraints table and recommendations',
    defaultTemplate: 'This section identifies ecological constraints and provides recommendations.',
  },
  {
    id: 'discussion',
    title: '5. Discussion & Conclusions',
    aiPrompt: 'synthesis and further survey recommendations',
    defaultTemplate:
      'This section synthesizes findings and recommends further surveys where necessary.',
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    aiPrompt: 'habitat map, photos, species lists',
    defaultTemplate: 'Appendices including habitat maps, photographs, and species lists.',
  },
]
