/**
 * Irish County/City Development Plans lookup table.
 *
 * Each of the 31 local authorities has a statutory development plan.
 * Ecologists reference the Natural Heritage / Biodiversity chapter
 * during desk research (PEA, EcIA, AA Screening, NIS).
 *
 * Last verified: March 2026
 * Update frequency: Plans change every 6-10 years. Review annually.
 */

export interface CountyDevelopmentPlan {
  /** Local authority name */
  authority: string
  /** Short county name for matching */
  county: string
  /** Full plan title */
  planName: string
  /** Plan period */
  period: string
  /** Main plan page URL */
  planUrl: string
  /** Direct URL to biodiversity / natural heritage chapter */
  biodiversityChapterUrl: string
  /** Biodiversity chapter name (varies by county) */
  biodiversityChapterName: string
  /** County Biodiversity Action Plan URL (if available) */
  biodiversityActionPlanUrl: string | null
}

export const COUNTY_DEVELOPMENT_PLANS: CountyDevelopmentPlan[] = [
  {
    authority: 'Carlow County Council',
    county: 'Carlow',
    planName: 'Carlow County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://consult.carlow.ie/en/consultation/carlow-county-development-plan-2022-2028',
    biodiversityChapterUrl:
      'https://consult.carlow.ie/en/consultation/proposed-material-amendments-draft-carlow-county-development-plan-2022-2028/chapter/chapter-10-natural-and-built-heritage',
    biodiversityChapterName: 'Chapter 10: Natural and Built Heritage',
    biodiversityActionPlanUrl: 'https://actionforbiodiversity.ie/counties/carlow/',
  },
  {
    authority: 'Cavan County Council',
    county: 'Cavan',
    planName: 'Cavan County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.cavancoco.ie/file-library/planning/development-plans/development-plan-2022-2028/',
    biodiversityChapterUrl:
      'https://www.cavancoco.ie/file-library/planning/development-plans/development-plan-2022-2028/',
    biodiversityChapterName: 'Chapter 10: Natural Heritage and Biodiversity',
    biodiversityActionPlanUrl: 'https://www.cavanheritage.ie/biodiversity',
  },
  {
    authority: 'Clare County Council',
    county: 'Clare',
    planName: 'Clare County Development Plan 2023-2029',
    period: '2023-2029',
    planUrl: 'https://www.clarecoco.ie/services/planning/plans/clarecountydevelopmentplan23-2029/',
    biodiversityChapterUrl:
      'https://clarecdp2023-2029.clarecoco.ie/stage3-amendments/adoption/volume-1-written-statement-clare-county-development-plan-2023-2029-51406.pdf',
    biodiversityChapterName: 'Chapter 14: Biodiversity, Natural Heritage and Green Infrastructure',
    biodiversityActionPlanUrl:
      'https://www.clarecoco.ie/services/heritage-biodiversity/biodiversity/biodiversity-action-plan/draft-clare-county-biodiversity-action-plan-2025-2031-58346.pdf',
  },
  {
    authority: 'Cork City Council',
    county: 'Cork City',
    planName: 'Cork City Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.corkcity.ie/en/cork-city-development-plan/',
    biodiversityChapterUrl:
      'https://consult.corkcity.ie/ga/consultation/draft-cork-city-development-plan-2022-2028/chapter/6-green-and-blue-infrastructure-open-space-and-biodiversity',
    biodiversityChapterName:
      'Chapter 6: Green and Blue Infrastructure, Open Space and Biodiversity',
    biodiversityActionPlanUrl:
      'https://actionforbiodiversity.ie/app/uploads/2023/08/Cork-City-heritage-and-biodiversity-plan-2021-2026.pdf',
  },
  {
    authority: 'Cork County Council',
    county: 'Cork',
    planName: 'Cork County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.corkcoco.ie/en/resident/planning-and-development/cork-county-development-plan-2022-2028',
    biodiversityChapterUrl:
      'https://www.corkcoco.ie/en/resident/planning-and-development/cork-county-development-plan-2022-2028/volume-one',
    biodiversityChapterName: 'Chapters 14-15: Green Infrastructure & Biodiversity',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Donegal County Council',
    county: 'Donegal',
    planName: 'County Donegal Development Plan 2024-2030',
    period: '2024-2030',
    planUrl: 'https://www.donegaldevplan.ie/',
    biodiversityChapterUrl: 'https://www.donegaldevplan.ie/documents',
    biodiversityChapterName: 'Natural and Built Heritage',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Dublin City Council',
    county: 'Dublin City',
    planName: 'Dublin City Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.dublincity.ie/residential/planning/strategic-planning/dublin-city-development-plan/development-plan-2022-2028',
    biodiversityChapterUrl:
      'https://www.dublincity.ie/dublin-city-development-plan-2022-2028/written-statement/chapter-10-green-infrastructure-and-recreation/105-policies-and-objectives',
    biodiversityChapterName: 'Chapter 10: Green Infrastructure and Recreation',
    biodiversityActionPlanUrl:
      'https://www.dublincity.ie/sites/default/files/2022-07/dcc-bioap-2021-2025-webv_21.07.22.pdf',
  },
  {
    authority: 'Dun Laoghaire-Rathdown County Council',
    county: 'Dun Laoghaire-Rathdown',
    planName: 'Dun Laoghaire-Rathdown County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.dlrcoco.ie/CDP2022-2028',
    biodiversityChapterUrl:
      'https://www.dlrcoco.ie/sites/default/files/atoms/files/written_statement.pdf',
    biodiversityChapterName: 'Green Infrastructure and Biodiversity',
    biodiversityActionPlanUrl:
      'https://actionforbiodiversity.ie/app/uploads/2023/08/Dun-Laoghaoire-Rathdown-Biodiversity-Action-Plan-2021-2025.pdf',
  },
  {
    authority: 'Fingal County Council',
    county: 'Fingal',
    planName: 'Fingal Development Plan 2023-2029',
    period: '2023-2029',
    planUrl: 'https://www.fingal.ie/development-plan-2023-2029',
    biodiversityChapterUrl:
      'https://consult.fingal.ie/en/consultation/draft-fingal-county-development-plan-2023-2029/chapter/chapter-9-green-infrastructure-and-natural-heritage',
    biodiversityChapterName: 'Chapter 9: Green Infrastructure and Natural Heritage',
    biodiversityActionPlanUrl:
      'https://consult.fingal.ie/en/system/files/materials/30041/Draft%20Fingal%20Biodiversity%20Plan%202022-2030.pdf',
  },
  {
    authority: 'Galway City Council',
    county: 'Galway City',
    planName: 'Galway City Development Plan 2023-2029',
    period: '2023-2029',
    planUrl: 'https://www.galwaycity.ie/services/planning/development-plan-2023-2029',
    biodiversityChapterUrl:
      'https://consult.galwaycity.ie/en/consultation/draft-galway-city-development-plan-2023-2029/chapter/chapter-5-natural-heritage-recreation-and-amenity',
    biodiversityChapterName: 'Chapter 5: Natural Heritage, Recreation and Amenity',
    biodiversityActionPlanUrl:
      'https://www.galwaycity.ie/sites/default/files/2025-11/Galway%20City%20Council%20Biodiversity%20Action%20Plan%202025-2030.pdf',
  },
  {
    authority: 'Galway County Council',
    county: 'Galway',
    planName: 'Galway County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.galway.ie/en/planning-building/plans-and-strategies/galway-county-development-plan-2022-2028',
    biodiversityChapterUrl:
      'https://consult.galway.ie/en/consultation/adopted-galway-county-development-plan-2022-2028/chapter/chapter-10-natural-heritage-biodiversity-and-greenblue-infrastructure',
    biodiversityChapterName:
      'Chapter 10: Natural Heritage, Biodiversity and Green/Blue Infrastructure',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Kerry County Council',
    county: 'Kerry',
    planName: 'Kerry County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.kerrycoco.ie/kerry-county-development-plan-2022-2028/',
    biodiversityChapterUrl:
      'https://consult.kerrycoco.ie/en/consultation/draft-kerry-county-development-plan-2022-2028/chapter/chapter-11-environment',
    biodiversityChapterName: 'Chapter 11: Environment',
    biodiversityActionPlanUrl:
      'https://www.heritagecouncil.ie/content/files/Kerry-Biodiversity-Action-Plan-2022-2028.pdf',
  },
  {
    authority: 'Kildare County Council',
    county: 'Kildare',
    planName: 'Kildare County Development Plan 2023-2029',
    period: '2023-2029',
    planUrl:
      'https://kildarecoco.ie/AllServices/Planning/DevelopmentPlans/KildareCountyDevelopmentPlan2023-2029/',
    biodiversityChapterUrl:
      'https://consult.kildarecoco.ie/en/consultation/draft-kildare-county-development-plan-2023-2029/chapter/12-biodiversity-green-infrastructure',
    biodiversityChapterName: 'Chapter 12: Biodiversity and Green Infrastructure',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Kilkenny County Council',
    county: 'Kilkenny',
    planName: 'Kilkenny City and County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl:
      'https://kilkennycoco.ie/eng/services/planning/development-plans/city-and-county-development-plan/adopted-city-and-county-development-plan.html',
    biodiversityChapterUrl:
      'https://consult.kilkenny.ie/en/consultation/kilkenny-city-and-county-draft-development-plan-2021-2027/chapter/92-natural-heritage-and-biodiversity',
    biodiversityChapterName: 'Section 9.2: Natural Heritage and Biodiversity',
    biodiversityActionPlanUrl:
      'https://kilkennycoco.ie/eng/publications/council_publications/kilkenny-biodiversity-action-plan-2025-2030.pdf',
  },
  {
    authority: 'Laois County Council',
    county: 'Laois',
    planName: 'Laois County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl: 'https://consult.laois.ie/en/consultation/laois-county-development-plan-2021-2027',
    biodiversityChapterUrl:
      'https://consult.laois.ie/ga/consultation/draft-laois-county-development-plan-2021-2027/chapter/chapter-11-biodiversity-and-natural-heritage',
    biodiversityChapterName: 'Chapter 11: Biodiversity and Natural Heritage',
    biodiversityActionPlanUrl:
      'https://laois.ie/departments/heritage/biodiversity/local-biodiversity-action-plan/',
  },
  {
    authority: 'Leitrim County Council',
    county: 'Leitrim',
    planName: 'Leitrim County Development Plan 2023-2029',
    period: '2023-2029',
    planUrl:
      'https://www.leitrim.ie/council/services/planning-building/forward-planning-development/leitrim-county-development-plan/leitrim-county-development-plan-2023-2029/leitrim-county-development-plan.html',
    biodiversityChapterUrl:
      'https://www.leitrim.ie/council/services/planning-building/forward-planning-development/leitrim-county-development-plan/leitrim-county-development-plan-2023-2029/leitrim-county-development-plan.html',
    biodiversityChapterName: 'Heritage and Biodiversity (Volume I Written Statement)',
    biodiversityActionPlanUrl:
      'https://actionforbiodiversity.ie/app/uploads/2023/08/County-Leitrim-Biodiversity-Action-Plan-2022-2027.pdf',
  },
  {
    authority: 'Limerick City and County Council',
    county: 'Limerick',
    planName: 'Limerick Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.limerick.ie/council/services/planning-and-placemaking/development-plan-strategies/limerick-development-plan-0',
    biodiversityChapterUrl:
      'https://mypoint.limerick.ie/en/consultation/draft-limerick-development-plan-2022-2028/chapter/chapter-5-environment-heritage-landscape-and-green-infrastructure',
    biodiversityChapterName: 'Chapter 5: Environment, Heritage, Landscape and Green Infrastructure',
    biodiversityActionPlanUrl:
      'https://www.limerick.ie/sites/default/files/media/documents/2026-01/limerick-biodiversity-action-plan-2025-2030-english.pdf',
  },
  {
    authority: 'Longford County Council',
    county: 'Longford',
    planName: 'Longford County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl:
      'https://www.longfordcoco.ie/services/planning/longford-county-development-plan-2021-2027/',
    biodiversityChapterUrl:
      'https://www.longfordcoco.ie/services/planning/longford-county-development-plan-2021-2027/volume-1-compressed.pdf',
    biodiversityChapterName: 'Natural Heritage, Biodiversity and Green Infrastructure (Volume 1)',
    biodiversityActionPlanUrl:
      'https://www.heritagecouncil.ie/content/images/Longford-biodiversity-action-plan-2025-2030.pdf',
  },
  {
    authority: 'Louth County Council',
    county: 'Louth',
    planName: 'Louth County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl:
      'https://louthcoco.ie/en/publications/development-plans/louth-county-development-plan-2021-2027/',
    biodiversityChapterUrl:
      'https://www.louthcoco.ie/en/publications/development-plans/louth-county-development-plan-2021-2027/volume-1-lcdp-2021-2027-.html',
    biodiversityChapterName: 'Chapter 8: Natural Heritage, Biodiversity and Green Infrastructure',
    biodiversityActionPlanUrl:
      'https://actionforbiodiversity.ie/app/uploads/2023/08/Louth-Local-Biodiversity-Action-Plan-2021-2026.pdf',
  },
  {
    authority: 'Mayo County Council',
    county: 'Mayo',
    planName: 'Mayo County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.mayo.ie/planning/county-development-plans/2022-2028',
    biodiversityChapterUrl:
      'https://consult.mayo.ie/sites/default/files/Vol.%201%20-%20Mayo%20CDP%2022-28%20Final.pdf',
    biodiversityChapterName: 'Natural Heritage and Environment (Volume 1)',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Meath County Council',
    county: 'Meath',
    planName: 'Meath County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl:
      'https://www.meath.ie/council/council-services/planning-and-building/development-plans/meath-county-development-plan',
    biodiversityChapterUrl:
      'https://consult.meath.ie/en/consultation/meath-adopted-county-development-plan/chapter/08-cultural-and-natural-heritage-strategy',
    biodiversityChapterName: 'Chapter 8: Cultural and Natural Heritage Strategy',
    biodiversityActionPlanUrl:
      'https://www.meath.ie/council/council-services/heritage-biodiversity-and-architectural-conservation/biodiversity/pollinator-plan/meath-biodiversity-action-plan',
  },
  {
    authority: 'Monaghan County Council',
    county: 'Monaghan',
    planName: 'Monaghan County Development Plan 2025-2031',
    period: '2025-2031',
    planUrl: 'https://monaghan.ie/planning/monaghan-county-development-plan-2025-2031-july25/',
    biodiversityChapterUrl:
      'https://monaghan.ie/planning/wp-content/uploads/sites/4/2024/09/Written-Statement-Draft-Monaghan-County-Development-Plan-2025-2031.pdf',
    biodiversityChapterName: 'Heritage and Environment (Written Statement)',
    biodiversityActionPlanUrl:
      'https://actionforbiodiversity.ie/app/uploads/2023/08/Monaghan-Biodiversity-and-Heritage-Strategic-Plan-2020-2025.pdf',
  },
  {
    authority: 'Offaly County Council',
    county: 'Offaly',
    planName: 'Offaly County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl: 'https://www.offaly.ie/c/county-development-plan/',
    biodiversityChapterUrl:
      'https://www.offaly.ie/eng/Services/Planning/County-Development-Plan-2021-2027/Stage-2-Draft/Chapter-4-Biodiversity-and-Landscape-pdf.pdf',
    biodiversityChapterName: 'Chapter 4: Biodiversity and Landscape',
    biodiversityActionPlanUrl:
      'https://www.offaly.ie/app/uploads/Offaly-Biodiversity-action-Plan-2025-2030.pdf',
  },
  {
    authority: 'Roscommon County Council',
    county: 'Roscommon',
    planName: 'Roscommon County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.rosdevplan.ie/',
    biodiversityChapterUrl:
      'https://www.rosdevplan.ie/roscommon-county-development-plan-2022-2028/',
    biodiversityChapterName: 'Natural Heritage, Biodiversity and Green Infrastructure',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Sligo County Council',
    county: 'Sligo',
    planName: 'Sligo County Development Plan 2024-2030',
    period: '2024-2030',
    planUrl: 'https://www.sligococo.ie/cdp/',
    biodiversityChapterUrl: 'https://www.sligococo.ie/cdp/',
    biodiversityChapterName: 'Natural Heritage and Biodiversity',
    biodiversityActionPlanUrl:
      'https://consult.sligococo.ie/sites/default/files/uploads/consultation/2263/Draft%20County%20Sligo%20Biodiversity%20Action%20Plan%202025-2030.pdf',
  },
  {
    authority: 'South Dublin County Council',
    county: 'South Dublin',
    planName: 'South Dublin County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.sdcc.ie/en/services/planning-building-control/development-plan/plan-2022-2028/',
    biodiversityChapterUrl:
      'https://www.sdcc.ie/en/devplan2022/stages%20of%20the%20plan/stage-2-draft-plan/chapter-3-natural-cultural-and-built-heritage.pdf',
    biodiversityChapterName:
      'Chapter 3: Natural, Cultural and Built Heritage + Chapter 4: Green Infrastructure',
    biodiversityActionPlanUrl:
      'https://consult.sdublincoco.ie/en/system/files/materials/4437/Connecting%20with%20Nature%20-%20Draft%20Biodiversity%20Action%20Plan%20for%20South%20Dublin%20County_0.pdf',
  },
  {
    authority: 'Tipperary County Council',
    county: 'Tipperary',
    planName: 'Tipperary County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.tipperarycoco.ie/cdp',
    biodiversityChapterUrl:
      'https://www.tipperarycoco.ie/planning-and-building/development-plan-consultation/tipperary-county-development-plan-2022-2028',
    biodiversityChapterName: 'Environment and Heritage (Volume 1 Written Statement)',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Waterford City and County Council',
    county: 'Waterford',
    planName: 'Waterford City and County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://waterfordcouncil.ie/documents/development-plan-2022-2028/',
    biodiversityChapterUrl:
      'https://consult.waterfordcouncil.ie/en/consultation/waterford-city-county-development-plan-2022-%E2%80%93-2028/chapter/chapter-9-climate-action-biodiversity-environment',
    biodiversityChapterName: 'Chapter 9: Climate Action, Biodiversity and Environment',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Westmeath County Council',
    county: 'Westmeath',
    planName: 'Westmeath County Development Plan 2021-2027',
    period: '2021-2027',
    planUrl:
      'https://www.westmeathcoco.ie/en/ourservices/planning/developmentplans/countydevelopmentplan2021-2027/',
    biodiversityChapterUrl:
      'https://consult.westmeathcoco.ie/en/consultation/draft-westmeath-county-development-plan-2021-2027/chapter/12-natural-heritage-and-green-infrastructure',
    biodiversityChapterName: 'Chapter 12: Natural Heritage and Green Infrastructure',
    biodiversityActionPlanUrl:
      'https://consult.westmeathcoco.ie/en/consultation/westmeath-biodiversity-action-plan-2024-2030',
  },
  {
    authority: 'Wexford County Council',
    county: 'Wexford',
    planName: 'Wexford County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl:
      'https://www.wexfordcoco.ie/planning/development-and-local-area-plans/current-plans/wexford-county-development-plan-2022-2028',
    biodiversityChapterUrl:
      'https://consult.wexfordcoco.ie/en/consultation/wexford-county-development-plan-2022-2028/chapter/chapter-13-heritage-and-conservation',
    biodiversityChapterName: 'Chapter 13: Heritage and Conservation',
    biodiversityActionPlanUrl: null,
  },
  {
    authority: 'Wicklow County Council',
    county: 'Wicklow',
    planName: 'Wicklow County Development Plan 2022-2028',
    period: '2022-2028',
    planUrl: 'https://www.wicklow.ie/Living/CDP2021',
    biodiversityChapterUrl:
      'https://consult.wicklow.ie/en/consultation/proposed-amendments-draft-wicklow-county-development-plan-2022-2028/chapter/chapter-17-natural-heritage-and-biodiversity',
    biodiversityChapterName: 'Chapter 17: Natural Heritage and Biodiversity',
    biodiversityActionPlanUrl:
      'https://www.wicklow.ie/Portals/0/adam/Documents/hXS6rIFVXU-ywDJXh3QAkA/Link/Draft%20County%20Wicklow%20Biodiversity%20Action%20Plan%202025.pdf',
  },
]

/** Find development plan by county name (case-insensitive, partial match) */
export function findPlanByCounty(countyName: string): CountyDevelopmentPlan | undefined {
  const normalized = countyName.toLowerCase().trim()
  return COUNTY_DEVELOPMENT_PLANS.find(
    (p) => p.county.toLowerCase() === normalized || p.authority.toLowerCase().includes(normalized)
  )
}

/** Get all county names for dropdown */
export function getCountyNames(): string[] {
  return COUNTY_DEVELOPMENT_PLANS.map((p) => p.county)
}
