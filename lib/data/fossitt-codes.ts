/**
 * Fossitt Habitat Classification Codes
 * Based on "A Guide to Habitats in Ireland" (Fossitt, 2000)
 */

import data from './json/fossitt-codes.json'

export interface FossittHabitat {
  code: string
  name: string
  level: 1 | 2 | 3
  parent?: string
  color: string
  annex1?: string // EU Habitats Directive Annex I code if applicable
}

export const FOSSITT_HABITATS: FossittHabitat[] = data as FossittHabitat[]

/**
 * Get habitat by code
 */
export function getHabitatByCode(code: string): FossittHabitat | undefined {
  return FOSSITT_HABITATS.find((h) => h.code === code)
}

/**
 * Get habitats by level
 */
export function getHabitatsByLevel(level: 1 | 2 | 3): FossittHabitat[] {
  return FOSSITT_HABITATS.filter((h) => h.level === level)
}

/**
 * Get child habitats
 */
export function getChildHabitats(parentCode: string): FossittHabitat[] {
  return FOSSITT_HABITATS.filter((h) => h.parent === parentCode)
}

/**
 * Get Annex I habitats only
 */
export function getAnnexIHabitats(): FossittHabitat[] {
  return FOSSITT_HABITATS.filter((h) => h.annex1)
}

/**
 * Search habitats by name or code
 */
export function searchHabitats(query: string): FossittHabitat[] {
  const lowerQuery = query.toLowerCase()
  return FOSSITT_HABITATS.filter(
    (h) => h.code.toLowerCase().includes(lowerQuery) || h.name.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Build hierarchical habitat tree
 */
export function buildHabitatTree(): Array<{
  habitat: FossittHabitat
  children: Array<{
    habitat: FossittHabitat
    children: FossittHabitat[]
  }>
}> {
  const level1 = getHabitatsByLevel(1)

  return level1.map((l1) => ({
    habitat: l1,
    children: getChildHabitats(l1.code).map((l2) => ({
      habitat: l2,
      children: getChildHabitats(l2.code),
    })),
  }))
}
