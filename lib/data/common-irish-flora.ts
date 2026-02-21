/**
 * Common Irish Flora species for Relevé Survey dropdown
 * Source: Standard Irish botanical survey species commonly encountered
 */

export interface FloraSpecies {
  latin: string
  english: string
}

export const COMMON_IRISH_FLORA: FloraSpecies[] = [
  { latin: 'Agrostis capillaris', english: 'Common Bent' },
  { latin: 'Anthoxanthum odoratum', english: 'Sweet Vernal-grass' },
  { latin: 'Calluna vulgaris', english: 'Heather' },
  { latin: 'Cynosurus cristatus', english: "Crested Dog's-tail" },
  { latin: 'Dactylis glomerata', english: "Cock's-foot" },
  { latin: 'Digitalis purpurea', english: 'Foxglove' },
  { latin: 'Erica tetralix', english: 'Cross-leaved Heath' },
  { latin: 'Festuca ovina', english: "Sheep's-fescue" },
  { latin: 'Festuca rubra', english: 'Red Fescue' },
  { latin: 'Galium verum', english: "Lady's Bedstraw" },
  { latin: 'Holcus lanatus', english: 'Yorkshire-fog' },
  { latin: 'Juncus effusus', english: 'Soft-rush' },
  { latin: 'Lolium perenne', english: 'Perennial Ryegrass' },
  { latin: 'Lotus corniculatus', english: "Bird's-foot-trefoil" },
  { latin: 'Molinia caerulea', english: 'Purple Moor-grass' },
  { latin: 'Nardus stricta', english: 'Mat-grass' },
  { latin: 'Plantago lanceolata', english: 'Ribwort Plantain' },
  { latin: 'Potentilla erecta', english: 'Tormentil' },
  { latin: 'Ranunculus acris', english: 'Meadow Buttercup' },
  { latin: 'Rumex acetosa', english: 'Common Sorrel' },
  { latin: 'Trifolium pratense', english: 'Red Clover' },
  { latin: 'Trifolium repens', english: 'White Clover' },
  { latin: 'Ulex europaeus', english: 'Gorse' },
]

/** DOMIN Scale for cover-abundance assessment (1-10) */
export const DOMIN_SCALE = [
  { value: 1, label: '1 — Single occurrence, < 4% cover' },
  { value: 2, label: '2 — Few occurrences, < 4% cover' },
  { value: 3, label: '3 — Many occurrences, < 4% cover' },
  { value: 4, label: '4 — 4–10% cover' },
  { value: 5, label: '5 — 11–25% cover' },
  { value: 6, label: '6 — 26–33% cover' },
  { value: 7, label: '7 — 34–50% cover' },
  { value: 8, label: '8 — 51–75% cover' },
  { value: 9, label: '9 — 76–90% cover' },
  { value: 10, label: '10 — 91–100% cover' },
] as const

export const SOIL_STABILITY_OPTIONS = ['Firm', 'Soft', 'Waterlogged', 'Unstable'] as const

export const ASPECT_OPTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Flat'] as const

/** Get English name from Latin name */
export function getEnglishName(latin: string): string {
  return COMMON_IRISH_FLORA.find((s) => s.latin === latin)?.english ?? ''
}
