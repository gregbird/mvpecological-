import type { DeskResearchFinding } from '@/types/database'

export interface FindingsByType {
  designated_site: DeskResearchFinding[]
  species_record: DeskResearchFinding[]
  aquatic: DeskResearchFinding[]
  habitat: DeskResearchFinding[]
  other: DeskResearchFinding[]
}

/** Group desk research findings by data_type, merging water_quality + catchment into 'aquatic'. */
export function groupFindingsByType<T extends Pick<DeskResearchFinding, 'data_type'>>(
  findings: T[]
): { designated_site: T[]; species_record: T[]; aquatic: T[]; habitat: T[]; other: T[] } {
  const groups: {
    designated_site: T[]
    species_record: T[]
    aquatic: T[]
    habitat: T[]
    other: T[]
  } = {
    designated_site: [],
    species_record: [],
    aquatic: [],
    habitat: [],
    other: [],
  }

  for (const finding of findings) {
    const type = finding.data_type
    if (type === 'designated_site') {
      groups.designated_site.push(finding)
    } else if (type === 'species_record') {
      groups.species_record.push(finding)
    } else if (type === 'water_quality' || type === 'catchment') {
      groups.aquatic.push(finding)
    } else if (type === 'habitat') {
      groups.habitat.push(finding)
    } else {
      groups.other.push(finding)
    }
  }

  return groups
}
