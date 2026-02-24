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
      'This section describes the project background, site location, and scope of the ecological appraisal. Include the purpose of the PEA, legislative context (Wildlife Acts 1976–2021, EU Habitats & Birds Directives), and report structure overview.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'desk study sources and field survey methods',
    defaultTemplate:
      'This section details the desk study sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) and the field survey methods employed. Include habitat classification methodology (Fossitt 2000), survey dates, weather conditions, and any limitations.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'designated sites, habitats, flora, fauna, invasive species',
    defaultTemplate:
      'This section presents the findings from both the desk study and field surveys. Sub-sections cover: 3.1 Designated Sites (SACs, SPAs, NHAs, pNHAs), 3.2 Habitats (Fossitt classification), 3.3 Flora & Invasive Species, 3.4 Fauna (by taxon group).',
  },
  {
    id: 'constraints',
    title: '4. Ecological Constraints',
    aiPrompt: 'constraints table and recommendations',
    defaultTemplate:
      'This section identifies ecological constraints with a table of receptors, their importance (Local/County/National/International), potential impacts, and recommended actions following the mitigation hierarchy (avoid, minimise, remediate, compensate).',
  },
  {
    id: 'discussion',
    title: '5. Discussion & Conclusions',
    aiPrompt: 'synthesis and further survey recommendations',
    defaultTemplate:
      'This section synthesizes key findings, discusses potential and cumulative impacts, identifies AA Screening triggers, recommends further surveys with optimal timing, and outlines biodiversity enhancement opportunities.',
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    aiPrompt: 'habitat map, photos, species lists',
    defaultTemplate:
      'Appendices: A) Site Location Map, B) Habitat Map (Fossitt codes), C) Species List with conservation status, D) Site Photographs, E) Survey Datasheets.',
  },
]

// Default EcIA report sections (CIEEM EcIA Guidelines 2018)
export const ECIA_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'project background, EIA context, and terms of reference',
    defaultTemplate:
      'This section describes the proposed development at {{project_name}}, the EIA context requiring this Ecological Impact Assessment, the terms of reference, and the legislative framework including the EIA Directive (2014/52/EU), Wildlife Acts 1976–2021, and EU Habitats & Birds Directives.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'desk study, field survey methods, impact assessment methodology',
    defaultTemplate:
      'This section details the desk study sources consulted, field survey methods and dates, the impact assessment methodology following CIEEM (2018) guidelines, and the geographic frame of reference used for receptor evaluation. Include the Zone of Influence determination and any limitations.',
  },
  {
    id: 'baseline',
    title: '3. Baseline Ecological Environment',
    aiPrompt: 'designated sites, habitats, flora, fauna baseline description',
    defaultTemplate:
      'This section describes the existing ecological baseline: 3.1 Designated Sites within the Zone of Influence (SACs, SPAs, NHAs, pNHAs with qualifying interests and conservation status), 3.2 Habitats (Fossitt classification, condition, Annex I correspondence), 3.3 Flora (including protected and invasive species), 3.4 Fauna (mammals, birds, amphibians, invertebrates with legal protection status).',
  },
  {
    id: 'assessment',
    title: '4. Assessment of Effects',
    aiPrompt: 'impact characterisation, significance determination',
    defaultTemplate:
      'This section characterises potential ecological effects during construction, operation, and decommissioning phases. For each receptor: describe the impact pathway, characterise (magnitude, extent, duration, reversibility, frequency, timing), determine significance using the CIEEM geographic framework, and assess cumulative and in-combination effects.',
  },
  {
    id: 'mitigation',
    title: '5. Mitigation & Enhancement',
    aiPrompt: 'avoidance, reduction, remediation, compensation, enhancement measures',
    defaultTemplate:
      'This section presents mitigation measures following the hierarchy: avoidance (design changes), reduction (best practice during construction), remediation (habitat restoration), and compensation (offsetting). Include biodiversity enhancement measures, a Construction Environmental Management Plan (CEMP) outline, and ecological monitoring requirements.',
  },
  {
    id: 'residual',
    title: '6. Residual Effects',
    aiPrompt: 'residual impacts after mitigation',
    defaultTemplate:
      'This section assesses residual ecological effects after implementation of mitigation measures. Present a summary table of receptors, pre-mitigation significance, mitigation measures, and post-mitigation residual significance. Identify any significant residual effects requiring compensation.',
  },
  {
    id: 'conclusions',
    title: '7. Conclusions',
    aiPrompt: 'overall conclusions and statement of significance',
    defaultTemplate:
      'This section provides overall conclusions on the ecological effects of the proposed development, confirms compliance with relevant legislation, and presents the statement of ecological significance. Include recommendations for further survey requirements and monitoring.',
  },
  {
    id: 'appendices',
    title: '8. Appendices',
    aiPrompt: 'maps, species lists, survey data',
    defaultTemplate:
      'Appendices: A) Site Location Map, B) Habitat Map (Fossitt codes), C) Designated Sites Map, D) Species List with conservation status, E) Site Photographs, F) Survey Datasheets, G) CEMP Outline.',
  },
]

// Default AA Screening sections (Article 6(3) Habitats Directive)
export const AA_SCREENING_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'project description and screening purpose',
    defaultTemplate:
      'This Appropriate Assessment Screening Report has been prepared for {{project_name}} in accordance with Article 6(3) of the EU Habitats Directive (92/43/EEC) and Part XAB of the Planning and Development Act 2000 (as amended). The purpose is to determine whether the proposed development, individually or in combination with other plans or projects, is likely to have a significant effect on any European site.',
  },
  {
    id: 'site_description',
    title: '2. Site & Project Description',
    aiPrompt: 'site location, project details, receiving environment',
    defaultTemplate:
      'This section describes the project site at {{site_location}}, the nature and extent of the proposed development, the receiving environment, and the source-pathway-receptor model for potential effects on European sites. Include site characteristics, land use, and hydrological connectivity.',
  },
  {
    id: 'natura_sites',
    title: '3. Natura 2000 Sites',
    aiPrompt: 'SACs and SPAs within Zone of Influence',
    defaultTemplate:
      'This section identifies all Natura 2000 sites (SACs and SPAs) within the Zone of Influence. For each site: list qualifying interests/special conservation interests, conservation objectives, known threats and pressures, and the distance/connectivity to the project site. Present in tabular format.',
  },
  {
    id: 'significant_effects',
    title: '4. Assessment of Likely Significant Effects',
    aiPrompt: 'potential effects on qualifying interests',
    defaultTemplate:
      'This section assesses the potential for the proposed development to have likely significant effects on each European site, considering: habitat loss/degradation, species disturbance, water quality impacts, air quality effects, and changes to hydrological regime. Apply the precautionary principle and consider the conservation objectives of each site.',
  },
  {
    id: 'in_combination',
    title: '5. In-Combination Assessment',
    aiPrompt: 'cumulative effects with other plans and projects',
    defaultTemplate:
      'This section assesses the potential for in-combination effects with other plans and projects, including: relevant planning applications in the area, County/Local Development Plans, infrastructure projects, and other activities that could contribute to cumulative effects on European sites.',
  },
  {
    id: 'conclusion',
    title: '6. Screening Conclusion',
    aiPrompt: 'screening determination statement',
    defaultTemplate:
      'Based on the assessment above, this section presents the screening determination: whether the proposed development, individually or in combination with other plans or projects, is likely to have a significant effect on any European site, and whether Stage 2 Appropriate Assessment (Natura Impact Statement) is required. The conclusion follows the test established in Kelly v. An Bord Pleanála [2014] and People Over Wind [CJEU C-323/17].',
  },
]

// Default AA Stage 2 / NIS sections
export const NIS_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'NIS purpose, legislative context, AA Stage 2 requirement',
    defaultTemplate:
      'This Natura Impact Statement (NIS) has been prepared for {{project_name}} to inform the Appropriate Assessment under Article 6(3) of the EU Habitats Directive. AA Screening concluded that significant effects on European sites could not be excluded. This NIS provides the scientific evidence for the competent authority to carry out an Appropriate Assessment.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'NIS methodology, data sources, guidance followed',
    defaultTemplate:
      'This section describes the methodology following DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland — Guidance for Planning Authorities, and European Commission guidance on Article 6(3) and 6(4). Detail desk study sources, field survey methods, and the framework for assessing effects on site integrity.',
  },
  {
    id: 'site_description',
    title: '3. Project & Site Description',
    aiPrompt: 'development details, construction methodology, site characteristics',
    defaultTemplate:
      'This section provides a detailed description of the proposed development including construction methodology, operational characteristics, and decommissioning plans. Describe the receiving environment, hydrological characteristics, and the source-pathway-receptor linkages to European sites.',
  },
  {
    id: 'natura_sites',
    title: '4. Natura 2000 Sites',
    aiPrompt: 'European sites, qualifying interests, conservation objectives',
    defaultTemplate:
      'This section describes each European site for which significant effects could not be excluded at screening. For each site: present the qualifying interests/special conservation interests, site-specific conservation objectives, existing threats and pressures, and current conservation status of qualifying habitats and species.',
  },
  {
    id: 'impact_assessment',
    title: '5. Assessment of Effects on Site Integrity',
    aiPrompt: 'detailed impact assessment on qualifying interests',
    defaultTemplate:
      'This section assesses whether the proposed development would adversely affect the integrity of each European site, considering: direct and indirect effects on qualifying interests, effects on conservation objectives, and the structure and function of the site. Apply the precautionary principle. Assess construction, operational, and decommissioning phases.',
  },
  {
    id: 'mitigation',
    title: '6. Mitigation Measures',
    aiPrompt: 'mitigation to avoid adverse effects on site integrity',
    defaultTemplate:
      'This section presents mitigation measures designed to avoid or reduce adverse effects on the integrity of European sites. Measures must be specific, enforceable, and effective. Include timing restrictions, pollution prevention measures, monitoring protocols, and contingency plans.',
  },
  {
    id: 'residual',
    title: '7. Residual Effects & In-Combination',
    aiPrompt: 'residual effects after mitigation, in-combination assessment',
    defaultTemplate:
      'This section assesses residual effects on European sites after implementation of mitigation measures. Also assess in-combination effects with other plans and projects. Present a summary matrix of sites, qualifying interests, effects, mitigation, and residual effects.',
  },
  {
    id: 'conclusion',
    title: '8. Conclusion',
    aiPrompt: 'NIS conclusion on adverse effects on site integrity',
    defaultTemplate:
      'This section concludes whether the proposed development, alone or in combination, would adversely affect the integrity of any European site, beyond reasonable scientific doubt. This conclusion is made with full regard to the mitigation measures proposed and the precautionary principle.',
  },
]

// Default Bat Survey Report sections (BCIreland guidelines)
export const BAT_SURVEY_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'bat survey context and legal protection',
    defaultTemplate:
      'This Bat Survey Report has been prepared for {{project_name}}. All bat species in Ireland are protected under the Wildlife Acts 1976–2021, the EU Habitats Directive (Annex IV), and the European Communities (Birds and Natural Habitats) Regulations 2011. This report presents the findings of bat surveys carried out in accordance with Bat Conservation Ireland guidelines.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt:
      'bat survey methods: desk study, habitat assessment, detector surveys, roost inspection',
    defaultTemplate:
      'This section details: 2.1 Desk Study (NBDC records, BCIreland data, NPWS records), 2.2 Preliminary Roost Assessment (building/tree inspections for roost potential), 2.3 Dusk Emergence / Dawn Re-entry Surveys (dates, times, equipment used), 2.4 Transect Surveys (detector type, transect routes, weather conditions), 2.5 Static Detector Deployment (locations, duration). Survey methods follow Collins (2016) Bat Surveys for Professional Ecologists.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'bat species recorded, activity levels, roost findings',
    defaultTemplate:
      'This section presents: 3.1 Desk Study Results (historical bat records in the area), 3.2 Habitat Assessment (suitability for foraging, commuting, and roosting), 3.3 Building/Structure Assessment (roost potential classification), 3.4 Activity Survey Results (species detected, bat passes per hour, temporal and spatial activity patterns), 3.5 Roost Survey Results (confirmed/probable/possible roosts). Include bat sonogram analysis details.',
  },
  {
    id: 'assessment',
    title: '4. Assessment',
    aiPrompt: 'evaluation of bat populations, roost importance, impact assessment',
    defaultTemplate:
      'This section evaluates: the importance of bat populations using the site (local, county, national significance), roost classification and importance, key foraging areas and commuting corridors, and the potential impacts of the proposed development on bat species and their habitats.',
  },
  {
    id: 'mitigation',
    title: '5. Mitigation & Recommendations',
    aiPrompt: 'bat mitigation measures, licensing, monitoring',
    defaultTemplate:
      'This section provides: 5.1 Impact Avoidance (design changes, lighting strategy, buffer zones), 5.2 Mitigation (timing restrictions, bat box installation, habitat retention/enhancement), 5.3 Derogation Licensing (if roost disturbance/destruction unavoidable, NPWS licence requirements), 5.4 Monitoring Programme (post-construction monitoring). Follow NPWS best practice guidance.',
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    aiPrompt: 'bat survey data, maps, sonograms',
    defaultTemplate:
      'Appendices: A) Site Location & Survey Transect Map, B) Bat Activity Maps (species distribution), C) Sonogram Examples, D) Survey Data Tables (passes per species per survey), E) Site Photographs, F) Building/Tree Assessment Sheets.',
  },
]

// Default Bird Survey Report sections (BirdWatch Ireland / NPWS guidelines)
export const BIRD_SURVEY_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'bird survey context and legal protection',
    defaultTemplate:
      'This Bird Survey Report has been prepared for {{project_name}}. Wild birds in Ireland are protected under the Wildlife Acts 1976–2021 and the EU Birds Directive (2009/147/EC). Species listed on Annex I of the Birds Directive and in the Birds of Conservation Concern in Ireland (BoCCI) lists receive particular attention in this assessment.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'bird survey methods: breeding, wintering, vantage point',
    defaultTemplate:
      'This section details: 2.1 Desk Study (NBDC records, BirdWatch Ireland data, I-WeBS data), 2.2 Breeding Bird Surveys (methodology following Bibby et al. 2000, number of visits, dates), 2.3 Wintering Bird Surveys (I-WeBS methodology, count dates, tidal conditions if applicable), 2.4 Vantage Point Surveys (if applicable — raptor/waterbird flight activity, VP locations, hours of observation). Include weather conditions and any limitations.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'bird species recorded, breeding evidence, wintering counts',
    defaultTemplate:
      'This section presents: 3.1 Desk Study Results (historical bird records, BoCCI species in the area), 3.2 Breeding Bird Survey Results (species list, breeding evidence categories, territory mapping), 3.3 Wintering Bird Survey Results (peak counts, species assemblage, nationally/internationally important numbers), 3.4 Vantage Point Results (flight activity, collision risk species). Include comparative data with national population estimates.',
  },
  {
    id: 'discussion',
    title: '4. Discussion',
    aiPrompt: 'evaluation of bird populations and habitats',
    defaultTemplate:
      'This section evaluates the importance of the bird assemblage at site, county, national, and international levels. Discuss habitat use patterns, seasonal variation, connectivity with designated sites (SPAs), and the potential impacts of the proposed development on bird species, including disturbance, habitat loss, and collision risk.',
  },
  {
    id: 'recommendations',
    title: '5. Recommendations',
    aiPrompt: 'bird mitigation measures, timing restrictions, monitoring',
    defaultTemplate:
      'This section provides: 5.1 Impact Avoidance (seasonal timing restrictions — no vegetation clearance 1 March to 31 August), 5.2 Mitigation Measures (buffer zones, nest box installation, habitat management), 5.3 Monitoring Programme (pre- and post-construction bird monitoring), 5.4 Further Survey Requirements (if seasonal gaps exist).',
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    aiPrompt: 'bird survey data, maps, species lists',
    defaultTemplate:
      'Appendices: A) Site Location & Survey Point Map, B) Breeding Bird Territory Maps, C) Wintering Bird Count Data, D) BoCCI & Legal Status Table, E) Site Photographs, F) Survey Datasheets.',
  },
]

// Default Habitat Survey Report sections
export const HABITAT_SURVEY_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'habitat survey purpose and context',
    defaultTemplate:
      'This Habitat Survey Report has been prepared for {{project_name}}. Habitats have been classified according to Fossitt (2000) A Guide to Habitats in Ireland. The survey assesses habitat types, condition, and ecological value to inform development planning and identify any habitats corresponding to EU Habitats Directive Annex I types.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'habitat survey methods, Fossitt classification',
    defaultTemplate:
      'This section details: 2.1 Desk Study (NPWS habitat data, CORINE land cover, historical mapping), 2.2 Field Survey Methodology (Fossitt 2000 classification, survey dates, mapping technique), 2.3 Vegetation Recording (relevé plots if applicable, DOMIN/DAFOR scale), 2.4 Habitat Condition Assessment (structure, function, typical species). Include survey limitations and seasonal constraints.',
  },
  {
    id: 'habitats',
    title: '3. Habitat Descriptions',
    aiPrompt: 'detailed habitat descriptions with Fossitt codes',
    defaultTemplate:
      'This section provides detailed descriptions of each habitat type recorded within the survey area. For each habitat: Fossitt code and name, area (hectares), dominant/characteristic species, condition assessment, correspondence with EU Habitats Directive Annex I habitats, connectivity to adjacent habitats, and threats/pressures. Present habitat areas in tabular format.',
  },
  {
    id: 'evaluation',
    title: '4. Evaluation',
    aiPrompt: 'ecological value assessment of habitats',
    defaultTemplate:
      'This section evaluates the ecological value of habitats using criteria including: naturalness, rarity (national and county context), size and extent, diversity, connectivity, fragility, and typicalness. Assign geographic importance (Local, County, National, International) for each habitat. Identify Key Ecological Receptors (KERs) and any habitats qualifying for Annex I designation.',
  },
  {
    id: 'recommendations',
    title: '5. Recommendations',
    aiPrompt: 'habitat management, mitigation, enhancement',
    defaultTemplate:
      'This section provides: 5.1 Impact Avoidance (design to retain high-value habitats), 5.2 Mitigation (transplantation, seed harvesting if habitat loss unavoidable), 5.3 Habitat Management Plan (management prescriptions for retained habitats), 5.4 Habitat Creation/Enhancement (native planting, wetland creation), 5.5 Monitoring (post-development habitat condition monitoring).',
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    aiPrompt: 'habitat maps, species lists, photographs',
    defaultTemplate:
      'Appendices: A) Site Location Map, B) Habitat Map (Fossitt codes annotated), C) Habitat Area Summary Table, D) Relevé Data (if applicable), E) Plant Species List with DAFOR abundance, F) Site Photographs, G) Annex I Habitat Correspondence Table.',
  },
]

// Default Protected Species Report sections
export const PROTECTED_SPECIES_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'protected species survey purpose and legislation',
    defaultTemplate:
      'This Protected Species Report has been prepared for {{project_name}}. The report assesses the presence or potential presence of species protected under the Wildlife Acts 1976–2021, EU Habitats Directive (Annex II, IV, V), EU Birds Directive (Annex I), Flora (Protection) Order 2022, and species listed on Irish Red Lists.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'species-specific survey methods',
    defaultTemplate:
      'This section details species-specific survey methods: 2.1 Desk Study (NPWS, NBDC, GBIF records), 2.2 Mammal Surveys (badger sett survey, otter survey — sprainting sites, holts, couches), 2.3 Bat Assessment (preliminary roost assessment, activity surveys if applicable), 2.4 Amphibian Survey (smooth newt, common frog — pond assessment, torch survey), 2.5 Botanical Survey (rare/protected plant search). Include survey dates, conditions, and effort.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'species found, evidence type, population estimates',
    defaultTemplate:
      'This section presents survey findings by species group. For each species/group: evidence recorded (sighting, signs, calls, droppings), location within the site, population estimates where possible, and assessment of habitat suitability. Include both positive findings and confirmed absences.',
  },
  {
    id: 'assessment',
    title: '4. Species Assessments',
    aiPrompt: 'conservation importance and impact assessment per species',
    defaultTemplate:
      'This section assesses each confirmed/potential protected species: legal protection status, conservation status (Red List category), population importance (local to international scale), sensitivity to the proposed development, and potential impact pathways (habitat loss, disturbance, fragmentation, pollution).',
  },
  {
    id: 'mitigation',
    title: '5. Mitigation Measures',
    aiPrompt: 'species-specific mitigation, licensing, exclusion zones',
    defaultTemplate:
      'This section provides species-specific mitigation: 5.1 Badger (exclusion zones around setts, NPWS licence if disturbance unavoidable), 5.2 Otter (30m buffer from holts, 150m buffer during breeding), 5.3 Bats (lighting strategy, timing restrictions, bat boxes), 5.4 Nesting Birds (seasonal clearance restrictions 1 March – 31 August), 5.5 Other Species (as applicable). Include NPWS derogation licence requirements.',
  },
  {
    id: 'recommendations',
    title: '6. Recommendations',
    aiPrompt: 'further surveys and monitoring',
    defaultTemplate:
      'This section provides: 6.1 Further Survey Requirements (species requiring additional survey effort, optimal timing), 6.2 Pre-construction Surveys (update surveys needed before works commence), 6.3 Monitoring Programme (construction and post-construction ecological monitoring), 6.4 Reporting Obligations (protected species reporting to NPWS).',
  },
]

// Default Other/Generic Report sections
export const OTHER_DEFAULT_SECTIONS: ReportSectionDefinition[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    aiPrompt: 'report purpose and context',
    defaultTemplate:
      'This section describes the purpose and context of the ecological report for {{project_name}}, including the legislative framework and the scope of the assessment.',
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    aiPrompt: 'desk study and field survey methods',
    defaultTemplate:
      'This section details the desk study sources consulted and the field survey methods employed, including survey dates, conditions, and any limitations.',
  },
  {
    id: 'results',
    title: '3. Results',
    aiPrompt: 'survey findings and observations',
    defaultTemplate:
      'This section presents the findings from the desk study and field surveys, organised by ecological receptor or theme.',
  },
  {
    id: 'discussion',
    title: '4. Discussion',
    aiPrompt: 'interpretation of results and ecological significance',
    defaultTemplate:
      'This section interprets the results in the context of the proposed development, assesses ecological significance, and discusses potential impacts.',
  },
  {
    id: 'recommendations',
    title: '5. Recommendations',
    aiPrompt: 'mitigation, further surveys, monitoring',
    defaultTemplate:
      'This section provides recommendations for mitigation measures, further survey requirements, and ecological monitoring.',
  },
]

// Map of report type ID to its default sections
export const DEFAULT_SECTIONS_BY_TYPE: Record<string, ReportSectionDefinition[]> = {
  pea: PEA_DEFAULT_SECTIONS,
  ecia: ECIA_DEFAULT_SECTIONS,
  aa_screening: AA_SCREENING_DEFAULT_SECTIONS,
  aa_stage2: NIS_DEFAULT_SECTIONS,
  nia: NIS_DEFAULT_SECTIONS,
  bat_survey: BAT_SURVEY_DEFAULT_SECTIONS,
  bird_survey: BIRD_SURVEY_DEFAULT_SECTIONS,
  habitat_survey: HABITAT_SURVEY_DEFAULT_SECTIONS,
  protected_species: PROTECTED_SPECIES_DEFAULT_SECTIONS,
  other: OTHER_DEFAULT_SECTIONS,
}
