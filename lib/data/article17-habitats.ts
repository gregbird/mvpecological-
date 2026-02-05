/**
 * Article 17 (2025) Conservation Status Data for Annex I Habitats in Ireland
 * Source: NPWS Article 17 Report 2025 - The Status of EU Protected Habitats and Species in Ireland
 * https://www.npws.ie/publications/article-17-reports
 *
 * Conservation Status:
 * - FV: Favourable
 * - U1: Unfavourable-Inadequate
 * - U2: Unfavourable-Bad
 * - XX: Unknown
 *
 * Trend:
 * - improving: ↑
 * - stable: →
 * - declining: ↓
 * - unknown: ?
 */

export type ConservationStatus = 'FV' | 'U1' | 'U2' | 'XX'
export type ConservationTrend = 'improving' | 'stable' | 'declining' | 'unknown'

export interface Article17Habitat {
  code: string
  name: string
  nameIrish?: string
  status: ConservationStatus
  trend: ConservationTrend
  pressures: string[]
  threats: string[]
  priorityHabitat: boolean
  // Brief assessment summary
  assessment: string
}

/**
 * Article 17 2025 Conservation Status for Irish Annex I Habitats
 * Data extracted from NPWS Article 17 Report 2025
 */
export const ARTICLE_17_HABITATS: Record<string, Article17Habitat> = {
  // Coastal and Marine Habitats
  '1110': {
    code: '1110',
    name: 'Sandbanks which are slightly covered by sea water all the time',
    status: 'U1',
    trend: 'stable',
    pressures: ['Fishing', 'Pollution'],
    threats: ['Climate change', 'Fishing pressure'],
    priorityHabitat: false,
    assessment:
      'Inadequate status due to incomplete knowledge of extent and pressures from fishing activities.',
  },
  '1130': {
    code: '1130',
    name: 'Estuaries',
    status: 'U1',
    trend: 'stable',
    pressures: ['Pollution', 'Development', 'Aquaculture'],
    threats: ['Eutrophication', 'Climate change'],
    priorityHabitat: false,
    assessment: 'Inadequate status due to water quality issues and development pressures.',
  },
  '1140': {
    code: '1140',
    name: 'Mudflats and sandflats not covered by seawater at low tide',
    status: 'U1',
    trend: 'stable',
    pressures: ['Aquaculture', 'Recreation', 'Pollution'],
    threats: ['Climate change', 'Invasive species'],
    priorityHabitat: false,
    assessment: 'Inadequate status with stable trend. Important for wading birds.',
  },
  '1150': {
    code: '1150',
    name: 'Coastal lagoons',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Pollution', 'Infilling'],
    threats: ['Climate change', 'Development'],
    priorityHabitat: true,
    assessment: 'Bad status and declining. Priority habitat requiring urgent conservation action.',
  },
  '1160': {
    code: '1160',
    name: 'Large shallow inlets and bays',
    status: 'U1',
    trend: 'stable',
    pressures: ['Aquaculture', 'Fishing', 'Pollution'],
    threats: ['Climate change', 'Invasive species'],
    priorityHabitat: false,
    assessment: 'Inadequate status due to multiple pressures from maritime activities.',
  },
  '1170': {
    code: '1170',
    name: 'Reefs',
    status: 'U1',
    trend: 'unknown',
    pressures: ['Fishing', 'Pollution', 'Climate change'],
    threats: ['Ocean acidification', 'Temperature change'],
    priorityHabitat: false,
    assessment: 'Inadequate status. Trend unknown due to monitoring limitations.',
  },
  '1210': {
    code: '1210',
    name: 'Annual vegetation of drift lines',
    status: 'U1',
    trend: 'declining',
    pressures: ['Recreation', 'Beach cleaning', 'Coastal squeeze'],
    threats: ['Climate change', 'Sea level rise'],
    priorityHabitat: false,
    assessment: 'Declining due to recreational pressures and coastal management practices.',
  },
  '1220': {
    code: '1220',
    name: 'Perennial vegetation of stony banks',
    status: 'U1',
    trend: 'declining',
    pressures: ['Coastal erosion', 'Recreation', 'Development'],
    threats: ['Climate change', 'Sea level rise'],
    priorityHabitat: false,
    assessment: 'Declining due to coastal erosion and development pressures.',
  },
  '1230': {
    code: '1230',
    name: 'Vegetated sea cliffs of the Atlantic and Baltic coasts',
    status: 'FV',
    trend: 'stable',
    pressures: ['Grazing', 'Erosion'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status - one of few habitats in good condition.',
  },
  '1310': {
    code: '1310',
    name: 'Salicornia and other annuals colonising mud and sand',
    status: 'U1',
    trend: 'stable',
    pressures: ['Grazing', 'Pollution'],
    threats: ['Climate change', 'Invasive species'],
    priorityHabitat: false,
    assessment: 'Inadequate status but stable trend.',
  },
  '1330': {
    code: '1330',
    name: 'Atlantic salt meadows',
    status: 'U1',
    trend: 'declining',
    pressures: ['Grazing', 'Drainage', 'Infilling'],
    threats: ['Climate change', 'Sea level rise'],
    priorityHabitat: false,
    assessment: 'Declining due to agricultural practices and coastal squeeze.',
  },
  '1410': {
    code: '1410',
    name: 'Mediterranean salt meadows',
    status: 'U1',
    trend: 'declining',
    pressures: ['Grazing', 'Drainage'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Declining, similar pressures to Atlantic salt meadows.',
  },

  // Dune Habitats
  '2110': {
    code: '2110',
    name: 'Embryonic shifting dunes',
    status: 'U2',
    trend: 'declining',
    pressures: ['Recreation', 'Coastal erosion', 'Stabilisation'],
    threats: ['Climate change', 'Sea level rise'],
    priorityHabitat: false,
    assessment: 'Bad status due to recreational pressure and natural erosion.',
  },
  '2120': {
    code: '2120',
    name: 'Shifting dunes along the shoreline with Ammophila arenaria',
    status: 'U2',
    trend: 'declining',
    pressures: ['Recreation', 'Erosion', 'Development'],
    threats: ['Climate change', 'Sea level rise'],
    priorityHabitat: false,
    assessment: 'Bad and declining status, similar to embryonic dunes.',
  },
  '2130': {
    code: '2130',
    name: 'Fixed coastal dunes with herbaceous vegetation',
    status: 'U2',
    trend: 'declining',
    pressures: ['Grazing', 'Recreation', 'Invasive species'],
    threats: ['Climate change', 'Scrub encroachment'],
    priorityHabitat: true,
    assessment: 'Priority habitat in bad condition. Declining due to multiple pressures.',
  },
  '2170': {
    code: '2170',
    name: 'Dunes with Salix repens ssp. argentea',
    status: 'U2',
    trend: 'declining',
    pressures: ['Grazing', 'Drainage', 'Invasive species'],
    threats: ['Scrub encroachment', 'Climate change'],
    priorityHabitat: false,
    assessment: 'Bad status with declining trend.',
  },
  '2190': {
    code: '2190',
    name: 'Humid dune slacks',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Grazing', 'Water abstraction'],
    threats: ['Climate change', 'Invasive species'],
    priorityHabitat: false,
    assessment: 'Bad status due to hydrological changes.',
  },

  // Freshwater Habitats
  '3110': {
    code: '3110',
    name: 'Oligotrophic waters containing very few minerals',
    status: 'U1',
    trend: 'declining',
    pressures: ['Eutrophication', 'Invasive species', 'Peat extraction'],
    threats: ['Climate change', 'Pollution'],
    priorityHabitat: false,
    assessment: 'Inadequate and declining due to nutrient enrichment.',
  },
  '3130': {
    code: '3130',
    name: 'Oligotrophic to mesotrophic standing waters',
    status: 'U1',
    trend: 'declining',
    pressures: ['Eutrophication', 'Invasive species', 'Agriculture'],
    threats: ['Climate change', 'Nutrient pollution'],
    priorityHabitat: false,
    assessment: 'Declining due to agricultural runoff and invasive species.',
  },
  '3140': {
    code: '3140',
    name: 'Hard oligo-mesotrophic waters with benthic vegetation',
    status: 'U1',
    trend: 'declining',
    pressures: ['Eutrophication', 'Agriculture'],
    threats: ['Climate change', 'Pollution'],
    priorityHabitat: false,
    assessment: 'Declining water quality affecting characteristic vegetation.',
  },
  '3150': {
    code: '3150',
    name: 'Natural eutrophic lakes with Magnopotamion or Hydrocharition',
    status: 'U1',
    trend: 'declining',
    pressures: ['Eutrophication', 'Agriculture', 'Invasive species'],
    threats: ['Climate change', 'Pollution'],
    priorityHabitat: false,
    assessment: 'Declining due to excessive nutrient loading.',
  },
  '3160': {
    code: '3160',
    name: 'Natural dystrophic lakes and ponds',
    status: 'U1',
    trend: 'declining',
    pressures: ['Drainage', 'Peat extraction', 'Forestry'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Associated with peatlands, declining with bog drainage.',
  },
  '3180': {
    code: '3180',
    name: 'Turloughs',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Agriculture', 'Development'],
    threats: ['Climate change', 'Water abstraction'],
    priorityHabitat: true,
    assessment:
      'Priority habitat unique to Ireland. Bad status due to drainage and agricultural intensification.',
  },
  '3260': {
    code: '3260',
    name: 'Water courses of plain to montane levels',
    status: 'U2',
    trend: 'declining',
    pressures: ['Pollution', 'Drainage', 'Channelisation'],
    threats: ['Climate change', 'Eutrophication'],
    priorityHabitat: false,
    assessment: 'Bad status due to widespread water quality issues.',
  },
  '3270': {
    code: '3270',
    name: 'Rivers with muddy banks with Chenopodion rubri and Bidention',
    status: 'U1',
    trend: 'stable',
    pressures: ['Flood management', 'Invasive species'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Inadequate but stable status.',
  },

  // Heath and Scrub Habitats
  '4010': {
    code: '4010',
    name: 'Northern Atlantic wet heaths with Erica tetralix',
    status: 'U2',
    trend: 'declining',
    pressures: ['Overgrazing', 'Burning', 'Drainage', 'Afforestation'],
    threats: ['Climate change', 'Agricultural intensification'],
    priorityHabitat: false,
    assessment: 'Bad status due to inappropriate grazing and burning regimes.',
  },
  '4030': {
    code: '4030',
    name: 'European dry heaths',
    status: 'U2',
    trend: 'declining',
    pressures: ['Overgrazing', 'Undergrazing', 'Burning', 'Bracken invasion'],
    threats: ['Climate change', 'Agricultural changes'],
    priorityHabitat: false,
    assessment: 'Bad status due to inappropriate management.',
  },
  '4060': {
    code: '4060',
    name: 'Alpine and Boreal heaths',
    status: 'U1',
    trend: 'stable',
    pressures: ['Grazing', 'Recreation', 'Climate change'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Inadequate but relatively stable mountain habitat.',
  },
  '5130': {
    code: '5130',
    name: 'Juniperus communis formations on heaths or calcareous grasslands',
    status: 'U2',
    trend: 'declining',
    pressures: ['Grazing', 'Disease', 'Lack of regeneration'],
    threats: ['Phytophthora', 'Climate change'],
    priorityHabitat: false,
    assessment: 'Bad and declining due to disease and poor regeneration.',
  },

  // Grassland Habitats
  '6130': {
    code: '6130',
    name: 'Calaminarian grasslands of the Violetalia calaminariae',
    status: 'U1',
    trend: 'stable',
    pressures: ['Scrub encroachment', 'Quarrying'],
    threats: ['Abandonment'],
    priorityHabitat: false,
    assessment: 'Rare habitat on metalliferous soils, inadequate but stable.',
  },
  '6210': {
    code: '6210',
    name: 'Semi-natural dry grasslands and scrubland facies on calcareous substrates',
    status: 'U2',
    trend: 'declining',
    pressures: ['Agricultural improvement', 'Undergrazing', 'Abandonment'],
    threats: ['Scrub encroachment', 'Climate change'],
    priorityHabitat: true,
    assessment: 'Priority habitat when orchid-rich. Bad status due to agricultural changes.',
  },
  '6230': {
    code: '6230',
    name: 'Species-rich Nardus grasslands',
    status: 'U2',
    trend: 'declining',
    pressures: ['Agricultural intensification', 'Drainage', 'Overgrazing'],
    threats: ['Climate change', 'Nutrient enrichment'],
    priorityHabitat: true,
    assessment: 'Priority habitat in bad condition due to agricultural changes.',
  },
  '6410': {
    code: '6410',
    name: 'Molinia meadows on calcareous, peaty or clayey-silt-laden soils',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Agricultural improvement', 'Abandonment'],
    threats: ['Climate change', 'Nutrient enrichment'],
    priorityHabitat: false,
    assessment: 'Bad status due to drainage and agricultural intensification.',
  },
  '6430': {
    code: '6430',
    name: 'Hydrophilous tall herb fringe communities',
    status: 'U1',
    trend: 'declining',
    pressures: ['Drainage', 'Invasive species', 'Nutrient enrichment'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Declining riparian habitat.',
  },
  '6510': {
    code: '6510',
    name: 'Lowland hay meadows',
    status: 'U2',
    trend: 'improving',
    pressures: ['Agricultural intensification', 'Abandonment'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Improving trend due to agri-environment schemes and All-Ireland Pollinator Plan.',
  },

  // Bog and Fen Habitats
  '7110': {
    code: '7110',
    name: 'Active raised bogs',
    status: 'U2',
    trend: 'improving',
    pressures: ['Peat extraction', 'Drainage', 'Burning'],
    threats: ['Climate change'],
    priorityHabitat: true,
    assessment:
      'Priority habitat showing improvement due to restoration programmes including Bord na Móna.',
  },
  '7120': {
    code: '7120',
    name: 'Degraded raised bogs still capable of natural regeneration',
    status: 'U2',
    trend: 'improving',
    pressures: ['Drainage', 'Peat extraction'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Improving due to peatland restoration. Source of regeneration for active bog.',
  },
  '7130': {
    code: '7130',
    name: 'Blanket bogs',
    status: 'U2',
    trend: 'declining',
    pressures: ['Overgrazing', 'Burning', 'Drainage', 'Erosion', 'Afforestation'],
    threats: ['Climate change'],
    priorityHabitat: true,
    assessment: 'Priority habitat (active only) in bad condition across much of its range.',
  },
  '7140': {
    code: '7140',
    name: 'Transition mires and quaking bogs',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Peat extraction', 'Nutrient enrichment'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Bad status due to drainage and associated pressures.',
  },
  '7150': {
    code: '7150',
    name: 'Depressions on peat substrates of the Rhynchosporion',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Trampling', 'Peat cutting'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Declining as part of wider peatland degradation.',
  },
  '7210': {
    code: '7210',
    name: 'Calcareous fens with Cladium mariscus',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Nutrient enrichment', 'Scrub encroachment'],
    threats: ['Climate change', 'Water abstraction'],
    priorityHabitat: true,
    assessment: 'Priority habitat in bad condition.',
  },
  '7220': {
    code: '7220',
    name: 'Petrifying springs with tufa formation',
    status: 'U1',
    trend: 'stable',
    pressures: ['Trampling', 'Water abstraction', 'Pollution'],
    threats: ['Climate change'],
    priorityHabitat: true,
    assessment: 'Priority habitat, inadequate but stable.',
  },
  '7230': {
    code: '7230',
    name: 'Alkaline fens',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Peat extraction', 'Agricultural improvement'],
    threats: ['Climate change', 'Nutrient enrichment'],
    priorityHabitat: false,
    assessment: 'Bad status due to drainage and nutrient enrichment.',
  },

  // Rocky Habitats
  '8110': {
    code: '8110',
    name: 'Siliceous scree of the montane to snow levels',
    status: 'FV',
    trend: 'stable',
    pressures: ['Recreation', 'Grazing'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status - mountain habitat relatively protected.',
  },
  '8120': {
    code: '8120',
    name: 'Calcareous and calcshist screes of the montane to alpine levels',
    status: 'FV',
    trend: 'stable',
    pressures: ['Recreation'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status.',
  },
  '8210': {
    code: '8210',
    name: 'Calcareous rocky slopes with chasmophytic vegetation',
    status: 'FV',
    trend: 'stable',
    pressures: ['Recreation', 'Grazing'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status - rocky habitat well protected.',
  },
  '8220': {
    code: '8220',
    name: 'Siliceous rocky slopes with chasmophytic vegetation',
    status: 'FV',
    trend: 'stable',
    pressures: ['Recreation'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status.',
  },
  '8240': {
    code: '8240',
    name: 'Limestone pavements',
    status: 'U1',
    trend: 'stable',
    pressures: ['Grazing', 'Scrub encroachment', 'Stone removal'],
    threats: ['Climate change', 'Agricultural changes'],
    priorityHabitat: true,
    assessment: 'Priority habitat, inadequate but stable. Important Burren habitat.',
  },
  '8310': {
    code: '8310',
    name: 'Caves not open to the public',
    status: 'FV',
    trend: 'stable',
    pressures: ['Recreation', 'Disturbance'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Favourable status where access is controlled.',
  },
  '8330': {
    code: '8330',
    name: 'Submerged or partially submerged sea caves',
    status: 'U1',
    trend: 'unknown',
    pressures: ['Pollution', 'Recreation'],
    threats: ['Climate change'],
    priorityHabitat: false,
    assessment: 'Inadequate status, trend unknown due to monitoring limitations.',
  },

  // Forest Habitats
  '91A0': {
    code: '91A0',
    name: 'Old sessile oak woods with Ilex and Blechnum in the British Isles',
    status: 'U1',
    trend: 'stable',
    pressures: ['Invasive species', 'Deer browsing', 'Lack of regeneration'],
    threats: ['Climate change', 'Disease'],
    priorityHabitat: false,
    assessment: 'Inadequate status due to invasive species (particularly Rhododendron) and deer.',
  },
  '91D0': {
    code: '91D0',
    name: 'Bog woodland',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Peat extraction', 'Afforestation'],
    threats: ['Climate change'],
    priorityHabitat: true,
    assessment: 'Priority habitat in bad condition, rare in Ireland.',
  },
  '91E0': {
    code: '91E0',
    name: 'Alluvial forests with Alnus glutinosa and Fraxinus excelsior',
    status: 'U2',
    trend: 'declining',
    pressures: ['Drainage', 'Invasive species', 'Clearance', 'Ash dieback'],
    threats: ['Climate change', 'Ash dieback disease'],
    priorityHabitat: true,
    assessment: 'Priority habitat severely impacted by ash dieback disease.',
  },
  '91J0': {
    code: '91J0',
    name: 'Taxus baccata woods of the British Isles',
    status: 'U1',
    trend: 'stable',
    pressures: ['Grazing', 'Invasive species', 'Lack of regeneration'],
    threats: ['Climate change'],
    priorityHabitat: true,
    assessment: 'Priority habitat, rare yew woodland, inadequate but stable.',
  },
}

/**
 * Get conservation status display info
 */
export function getStatusDisplay(status: ConservationStatus): {
  label: string
  color: string
  bgColor: string
  description: string
} {
  const statusMap: Record<
    ConservationStatus,
    { label: string; color: string; bgColor: string; description: string }
  > = {
    FV: {
      label: 'Favourable',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      description: 'The habitat is in good condition and not under threat.',
    },
    U1: {
      label: 'Unfavourable-Inadequate',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      description: 'The habitat is not in favourable condition but not severely degraded.',
    },
    U2: {
      label: 'Unfavourable-Bad',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      description: 'The habitat is in serious decline or very degraded condition.',
    },
    XX: {
      label: 'Unknown',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      description: 'Insufficient data to assess conservation status.',
    },
  }
  return statusMap[status]
}

/**
 * Get trend display info
 */
export function getTrendDisplay(trend: ConservationTrend): {
  label: string
  icon: string
  color: string
} {
  const trendMap: Record<ConservationTrend, { label: string; icon: string; color: string }> = {
    improving: { label: 'Improving', icon: '↑', color: 'text-green-600' },
    stable: { label: 'Stable', icon: '→', color: 'text-blue-600' },
    declining: { label: 'Declining', icon: '↓', color: 'text-red-600' },
    unknown: { label: 'Unknown', icon: '?', color: 'text-gray-500' },
  }
  return trendMap[trend]
}

/**
 * Get Article 17 data for a habitat code
 */
export function getArticle17Data(habitatCode: string): Article17Habitat | null {
  return ARTICLE_17_HABITATS[habitatCode] || null
}

/**
 * Get conservation status summary for multiple habitats
 */
export function getHabitatsSummary(habitatCodes: string[]): {
  total: number
  favourable: number
  unfavourableInadequate: number
  unfavourableBad: number
  unknown: number
  improving: number
  declining: number
  priorityCount: number
} {
  const habitats = habitatCodes.map((code) => ARTICLE_17_HABITATS[code]).filter(Boolean)

  return {
    total: habitats.length,
    favourable: habitats.filter((h) => h.status === 'FV').length,
    unfavourableInadequate: habitats.filter((h) => h.status === 'U1').length,
    unfavourableBad: habitats.filter((h) => h.status === 'U2').length,
    unknown: habitats.filter((h) => h.status === 'XX').length,
    improving: habitats.filter((h) => h.trend === 'improving').length,
    declining: habitats.filter((h) => h.trend === 'declining').length,
    priorityCount: habitats.filter((h) => h.priorityHabitat).length,
  }
}
