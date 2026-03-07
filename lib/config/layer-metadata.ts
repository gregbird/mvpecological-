/**
 * Layer Metadata Configuration
 *
 * Detailed metadata for each dataset layer including source information,
 * methodology, licensing, and external documentation links.
 */

export interface LayerMetadata {
  id: string
  name: string
  nameIrish?: string
  source: string
  sourceUrl: string
  description: string
  methodology: string
  lastUpdated: string
  coverage: string
  license: string
  licenseUrl?: string
  attribution: string
  relevance: string
  dataFormat: string
  updateFrequency: string
  contactInfo?: string
}

/**
 * NPWS (National Parks & Wildlife Service) Layer Metadata
 */
export const NPWS_METADATA: Record<string, LayerMetadata> = {
  sac: {
    id: 'sac',
    name: 'Special Areas of Conservation',
    nameIrish: 'Limistéir Speisialta Caomhantais',
    source: 'National Parks & Wildlife Service (NPWS)',
    sourceUrl: 'https://www.npws.ie/protected-sites/sac',
    description:
      'Special Areas of Conservation (SACs) are prime wildlife conservation areas in Ireland, designated under the EU Habitats Directive (92/43/EEC). They protect habitats and species of European importance.',
    methodology:
      'Sites are selected based on the presence of Annex I habitats and/or Annex II species as listed in the EU Habitats Directive. Site boundaries are determined through detailed ecological surveys and habitat mapping.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      '© National Parks & Wildlife Service, Department of Housing, Local Government and Heritage',
    relevance:
      'Projects within or adjacent to SACs may require Appropriate Assessment (AA) screening under Article 6(3) of the Habitats Directive.',
    dataFormat: 'ArcGIS Feature Service',
    updateFrequency: 'Updated as new sites are designated or boundaries revised',
    contactInfo: 'nature.conservation@npws.gov.ie',
  },
  spa: {
    id: 'spa',
    name: 'Special Protection Areas',
    nameIrish: 'Limistéir faoi Chosaint Speisialta',
    source: 'National Parks & Wildlife Service (NPWS)',
    sourceUrl: 'https://www.npws.ie/protected-sites/spa',
    description:
      'Special Protection Areas (SPAs) are designated under the EU Birds Directive (2009/147/EC) to protect wild birds and their habitats, particularly species listed in Annex I and regularly occurring migratory species.',
    methodology:
      'Sites are classified based on ornithological criteria including the presence of Annex I bird species, regularly occurring migratory species, and internationally important congregations of birds.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      '© National Parks & Wildlife Service, Department of Housing, Local Government and Heritage',
    relevance:
      'Projects within or adjacent to SPAs may require Appropriate Assessment (AA) screening. Disturbance to protected bird species is an offense under the Wildlife Acts.',
    dataFormat: 'ArcGIS Feature Service',
    updateFrequency: 'Updated as new sites are classified or boundaries revised',
    contactInfo: 'nature.conservation@npws.gov.ie',
  },
  nha: {
    id: 'nha',
    name: 'Natural Heritage Areas',
    nameIrish: 'Limistéir Oidhreachta Nádúrtha',
    source: 'National Parks & Wildlife Service (NPWS)',
    sourceUrl: 'https://www.npws.ie/protected-sites/nha',
    description:
      'Natural Heritage Areas (NHAs) are legally protected areas designated under the Wildlife (Amendment) Act 2000. They cover nationally important ecosystems including bogs, fens, sand dunes, and other habitats.',
    methodology:
      'Sites are designated based on national conservation importance. Currently, only peatland NHAs have been formally designated, though many other sites are proposed (pNHAs).',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      '© National Parks & Wildlife Service, Department of Housing, Local Government and Heritage',
    relevance:
      'Works within NHAs require Ministerial consent under Section 18 of the Wildlife (Amendment) Act 2000. Development plans must have regard to NHAs.',
    dataFormat: 'ArcGIS Feature Service',
    updateFrequency: 'Updated as new sites are designated',
    contactInfo: 'nature.conservation@npws.gov.ie',
  },
  pnha: {
    id: 'pnha',
    name: 'Proposed Natural Heritage Areas',
    nameIrish: 'Limistéir Oidhreachta Nádúrtha Beartaithe',
    source: 'National Parks & Wildlife Service (NPWS)',
    sourceUrl: 'https://www.npws.ie/protected-sites/nha',
    description:
      'Proposed Natural Heritage Areas (pNHAs) are sites of significant ecological interest that have been identified but not yet formally designated as NHAs. They are afforded protection through the planning system.',
    methodology:
      'Sites were identified during the 1990s wildlife habitat survey based on ecological criteria. While not legally designated, they represent areas of conservation value.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      '© National Parks & Wildlife Service, Department of Housing, Local Government and Heritage',
    relevance:
      'pNHAs are protected through the planning system. Local authorities must have regard to pNHAs when making planning decisions under the Planning and Development Act.',
    dataFormat: 'ArcGIS Feature Service',
    updateFrequency: 'Updated as sites are reviewed or formally designated',
    contactInfo: 'nature.conservation@npws.gov.ie',
  },
}

/**
 * EPA (Environmental Protection Agency) Layer Metadata
 */
export const EPA_METADATA: Record<string, LayerMetadata> = {
  rivers: {
    id: 'rivers',
    name: 'WFD River Water Bodies',
    source: 'Environmental Protection Agency (EPA)',
    sourceUrl: 'https://www.epa.ie/our-services/monitoring--assessment/freshwater--marine/rivers/',
    description:
      'River water bodies as defined under the EU Water Framework Directive (2000/60/EC). Includes river segments with WFD ecological status classification.',
    methodology:
      'River water bodies are delineated based on catchment boundaries and ecological characteristics. Status is determined through biological, chemical, and hydromorphological monitoring.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Environmental Protection Agency Ireland',
    relevance:
      'Projects near rivers must consider potential impacts on water quality and WFD objectives. Discharge licenses may be required under the Water Pollution Acts.',
    dataFormat: 'WFS (Web Feature Service)',
    updateFrequency: 'Updated with each WFD reporting cycle (every 6 years)',
    contactInfo: 'info@epa.ie',
  },
  lakes: {
    id: 'lakes',
    name: 'WFD Lake Water Bodies',
    source: 'Environmental Protection Agency (EPA)',
    sourceUrl: 'https://www.epa.ie/our-services/monitoring--assessment/freshwater--marine/lakes/',
    description:
      'Lake water bodies as defined under the EU Water Framework Directive. Includes lakes over 50 hectares and smaller lakes of high ecological value.',
    methodology:
      'Lakes are classified based on surface area, depth, and ecological characteristics. Status is assessed through biological, chemical, and hydromorphological quality elements.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Environmental Protection Agency Ireland',
    relevance:
      'Development near lakes must consider potential impacts on water quality, particularly nutrient inputs and hydrological changes.',
    dataFormat: 'WFS (Web Feature Service)',
    updateFrequency: 'Updated with each WFD reporting cycle (every 6 years)',
    contactInfo: 'info@epa.ie',
  },
  catchments: {
    id: 'catchments',
    name: 'WFD Catchment Boundaries',
    source: 'Environmental Protection Agency (EPA)',
    sourceUrl:
      'https://www.epa.ie/our-services/monitoring--assessment/freshwater--marine/catchments/',
    description:
      'Hydrological catchment boundaries as defined for Water Framework Directive reporting. Catchments represent the area of land draining to a particular water body.',
    methodology:
      'Catchment boundaries are derived from digital elevation models and hydrological network analysis. They represent topographically-defined drainage areas.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Environmental Protection Agency Ireland',
    relevance:
      'Understanding catchment context is essential for assessing potential downstream impacts of development on water quality and hydrology.',
    dataFormat: 'WFS (Web Feature Service)',
    updateFrequency: 'Stable boundaries, updated as needed',
    contactInfo: 'info@epa.ie',
  },
  wfd_river_status: {
    id: 'wfd_river_status',
    name: 'River WFD Ecological Status',
    source: 'Environmental Protection Agency (EPA)',
    sourceUrl: 'https://www.epa.ie/our-services/monitoring--assessment/freshwater--marine/rivers/',
    description:
      'Rivers classified by their Water Framework Directive ecological status: High, Good, Moderate, Poor, or Bad. Ireland aims to achieve at least Good status for all water bodies.',
    methodology:
      'Ecological status is determined by biological quality elements (macroinvertebrates, fish, macrophytes), supported by physico-chemical and hydromorphological elements.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Environmental Protection Agency Ireland',
    relevance:
      'Projects must not cause deterioration in WFD status. Water bodies at less than Good status are priorities for restoration measures.',
    dataFormat: 'WFS (Web Feature Service)',
    updateFrequency: 'Updated with each WFD reporting cycle (every 6 years)',
    contactInfo: 'info@epa.ie',
  },
}

/**
 * Administrative Boundaries Layer Metadata
 */
export const BOUNDARIES_METADATA: Record<string, LayerMetadata> = {
  counties: {
    id: 'counties',
    name: 'County Boundaries',
    nameIrish: 'Teorainneacha Contae',
    source: 'Ordnance Survey Ireland / data.gov.ie',
    sourceUrl: 'https://data.gov.ie/dataset/county-boundaries-osi-national-statutory-boundaries',
    description:
      'Administrative county boundaries of Ireland, comprising 26 traditional counties plus administrative areas (Dublin city/county divisions, etc.).',
    methodology:
      'Boundaries are derived from the official OSi National Statutory Boundaries dataset, transformed from Irish Transverse Mercator (ITM/EPSG:2157) to WGS84.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Ordnance Survey Ireland / Government of Ireland',
    relevance:
      'County boundaries define local authority jurisdictions for planning applications, development levies, and environmental regulations.',
    dataFormat: 'GeoJSON',
    updateFrequency: 'Stable boundaries, updated as administrative changes occur',
  },
  townlands: {
    id: 'townlands',
    name: 'Townland Boundaries',
    nameIrish: 'Teorainneacha Baile Fearainn',
    source: 'Tailte Éireann (formerly OSi)',
    sourceUrl:
      'https://www.tailte.ie/surveying/products/professional-mapping/national-townland-boundaries/',
    description:
      'Traditional Irish townland boundaries (~51,000 townlands). Townlands are the smallest administrative unit in Ireland, dating back centuries and still used for land registration.',
    methodology:
      'Townland boundaries are sourced from Tailte Éireann ArcGIS services. Data is loaded on-demand for performance, visible at zoom level 12 and above.',
    lastUpdated: '2024',
    coverage: 'Republic of Ireland',
    license: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: '© Tailte Éireann',
    relevance:
      'Townland names are used in official land registration (Folios), postal addresses, and historical research. Essential for precise site location in rural areas.',
    dataFormat: 'GeoJSON (via API)',
    updateFrequency: 'Stable historical boundaries',
  },
}

/**
 * BirdWatch Ireland I-WEBS Layer Metadata
 */
export const IWEBS_METADATA: Record<string, LayerMetadata> = {
  iwebs_boundaries: {
    id: 'iwebs_boundaries',
    name: 'I-WEBS Site Boundaries',
    source: 'BirdWatch Ireland',
    sourceUrl:
      'https://birdwatchireland.ie/our-work/surveys-research/research-surveys/irish-wetland-bird-survey/',
    description:
      'Boundary polygons for Irish Wetland Bird Survey (I-WEBS) sites. I-WEBS is the principal scheme for monitoring wintering waterbird populations in the Republic of Ireland, coordinated by BirdWatch Ireland.',
    methodology:
      'Site boundaries are delineated based on wetland extent and waterbird usage patterns. Sites are surveyed monthly from September to March by volunteer counters using standardised count methodology.',
    lastUpdated: '2017',
    coverage: 'Republic of Ireland — wetland sites of importance for waterbirds',
    license: 'ArcGIS FeatureServer (public access)',
    attribution: 'BirdWatch Ireland / I-WEBS',
    relevance:
      'Projects near I-WEBS sites may impact wintering waterbird populations. Proximity to I-WEBS sites is relevant for AA Screening and EcIA, particularly near SPAs designated for waterbirds.',
    dataFormat: 'ArcGIS Feature Service (polygon)',
    updateFrequency: 'Boundaries updated periodically as survey coverage changes',
    contactInfo: 'iwebs@birdwatchireland.ie',
  },
  iwebs_sites: {
    id: 'iwebs_sites',
    name: 'I-WEBS Site Locations',
    source: 'BirdWatch Ireland',
    sourceUrl:
      'https://birdwatchireland.ie/our-work/surveys-research/research-surveys/irish-wetland-bird-survey/',
    description:
      'Point locations of I-WEBS survey sites with data coverage information including the most recent survey year.',
    methodology:
      'Site locations represent the central point of each I-WEBS wetland survey site. Coverage data indicates which sites are actively monitored.',
    lastUpdated: '2022',
    coverage: 'Republic of Ireland — 561 wetland survey sites',
    license: 'ArcGIS FeatureServer (public access)',
    attribution: 'BirdWatch Ireland / I-WEBS',
    relevance:
      'Active I-WEBS sites near a project indicate that waterbird monitoring data exists for the area, which can be referenced in ecological assessments.',
    dataFormat: 'ArcGIS Feature Service (point)',
    updateFrequency: 'Updated as survey coverage changes',
    contactInfo: 'iwebs@birdwatchireland.ie',
  },
  iwebs_subsites: {
    id: 'iwebs_subsites',
    name: 'I-WEBS Sub-site Locations',
    source: 'BirdWatch Ireland',
    sourceUrl:
      'https://birdwatchireland.ie/our-work/surveys-research/research-surveys/irish-wetland-bird-survey/',
    description:
      'Point locations of I-WEBS sub-sites. Larger I-WEBS sites are subdivided into sub-sites to allow more detailed spatial analysis of waterbird distribution within a wetland complex.',
    methodology:
      'Sub-sites are defined within larger I-WEBS sites to enable finer-scale waterbird count data. Each sub-site is counted independently during monthly surveys.',
    lastUpdated: '2022',
    coverage: 'Republic of Ireland — 1,483 sub-sites across major wetlands',
    license: 'ArcGIS FeatureServer (public access)',
    attribution: 'BirdWatch Ireland / I-WEBS',
    relevance:
      'Sub-site data provides finer spatial resolution for assessing potential impacts on specific parts of a wetland complex used by waterbirds.',
    dataFormat: 'ArcGIS Feature Service (point)',
    updateFrequency: 'Updated seasonally',
    contactInfo: 'iwebs@birdwatchireland.ie',
  },
}

/**
 * Combined metadata lookup
 */
export const ALL_LAYER_METADATA: Record<string, LayerMetadata> = {
  ...NPWS_METADATA,
  ...EPA_METADATA,
  ...IWEBS_METADATA,
  ...BOUNDARIES_METADATA,
}

/**
 * Get metadata for a specific layer
 */
export function getLayerMetadata(layerId: string): LayerMetadata | undefined {
  return ALL_LAYER_METADATA[layerId]
}

/**
 * Get metadata for multiple layers
 */
export function getLayersMetadata(layerIds: string[]): LayerMetadata[] {
  return layerIds
    .map((id) => ALL_LAYER_METADATA[id])
    .filter((m): m is LayerMetadata => m !== undefined)
}

/**
 * WFD Status color mapping for reference
 */
export const WFD_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  High: { color: '#0066cc', label: 'High (Blue)' },
  Good: { color: '#00cc00', label: 'Good (Green)' },
  Moderate: { color: '#ffcc00', label: 'Moderate (Yellow)' },
  Poor: { color: '#ff6600', label: 'Poor (Orange)' },
  Bad: { color: '#cc0000', label: 'Bad (Red)' },
}
