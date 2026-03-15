import type { DeskResearchFinding } from '@/types/database'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'

// ============================================================
// Appendix table row types
// ============================================================

export interface DesignatedSiteRow {
  name: string
  siteNumber: string
  siteType: string
  distanceKm: string
  aiSummary: string
}

export interface SpeciesRecordRow {
  name: string
  aiSummary: string
  protectionStatus: string
  /** Sort priority: 1 = Red (protected), 2 = Orange (invasive/threatened), 3 = Blue (regular) */
  sortOrder: number
}

export interface HabitatRow {
  fossittCode: string
  habitatName: string
  /** NLC source label for reference */
  nlcLabel: string
  areaHectares: string
  percentCover: string
}

export interface AquaticFeatureRow {
  name: string
  waterBodyType: string
  wfdStatus: string
  distanceKm: string
  aiSummary: string
}

export interface AppendixData {
  designatedSites: DesignatedSiteRow[]
  speciesRecords: SpeciesRecordRow[]
  habitats: HabitatRow[]
  aquaticFeatures: AquaticFeatureRow[]
}

// ============================================================
// Helpers
// ============================================================

function getRawData(finding: DeskResearchFinding): Record<string, unknown> {
  return (finding.raw_data as Record<string, unknown>) ?? {}
}

function getMetadata(rawData: Record<string, unknown>): Record<string, unknown> {
  return (rawData.metadata as Record<string, unknown>) ?? {}
}

function getAiSummary(rawData: Record<string, unknown>): string {
  const metadata = getMetadata(rawData)
  const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined

  // Prefer deep research analysis, fall back to quick AI summary
  // Keep short for table cells — long text kills PDF rendering performance
  const MAX_LEN = 120
  if (deepResearch?.aiAnalysis) {
    const analysis = String(deepResearch.aiAnalysis)
    return analysis.length > MAX_LEN ? analysis.slice(0, MAX_LEN - 3) + '...' : analysis
  }
  if (metadata.aiSummary) {
    const summary = String(metadata.aiSummary)
    return summary.length > MAX_LEN ? summary.slice(0, MAX_LEN - 3) + '...' : summary
  }
  return ''
}

/**
 * Determine conservation status color category for sorting.
 * Red (1) = legally protected species
 * Orange (2) = invasive or threatened species
 * Blue (3) = regular species with no special status
 */
function getSpeciesSortOrder(finding: DeskResearchFinding): number {
  const rawData = getRawData(finding)
  const metadata = getMetadata(rawData)

  const isProtected = metadata.isProtected === true || finding.is_protected === true
  const isInvasive = metadata.isInvasive === true
  const isThreatened = metadata.isThreatened === true

  const redList = finding.red_list_status?.toUpperCase() ?? ''
  const isRedListed =
    redList === 'CR' ||
    redList === 'EN' ||
    redList === 'VU' ||
    redList.includes('CRITICALLY') ||
    redList.includes('ENDANGERED') ||
    redList.includes('VULNERABLE')

  if (isProtected || isRedListed) return 1 // Red
  if (isInvasive || isThreatened) return 2 // Orange
  return 3 // Blue
}

function getProtectionStatusDetail(finding: DeskResearchFinding): string {
  const rawData = getRawData(finding)
  const metadata = getMetadata(rawData)

  const parts: string[] = []

  const designation = metadata.designation || metadata.designations
  if (designation) parts.push(String(designation))

  if (finding.red_list_status) parts.push(finding.red_list_status)

  if (metadata.isInvasive === true) parts.push('Invasive')

  if (parts.length > 0) return parts.join(' | ')

  const order = getSpeciesSortOrder(finding)
  switch (order) {
    case 1:
      return 'Protected'
    case 2:
      return 'Invasive / Threatened'
    default:
      return 'Regular'
  }
}

// ============================================================
// Main extraction function
// ============================================================

/** Extract appendix table data from saved findings. */
export function prepareAppendixData(findings: DeskResearchFinding[]): AppendixData {
  const grouped = groupFindingsByType(findings)

  // --- Designated Sites ---
  const designatedSites: DesignatedSiteRow[] = grouped.designated_site
    .map((f) => {
      const rawData = getRawData(f)
      const metadata = getMetadata(rawData)

      const siteCode = String(rawData.siteCode ?? rawData.SITECODE ?? metadata.siteCode ?? '')
      const siteType = String(rawData.SITE_TYPE ?? metadata.siteType ?? '')

      return {
        name: f.title,
        siteNumber: siteCode,
        siteType,
        distanceKm:
          f.distance_from_boundary_km != null
            ? `${f.distance_from_boundary_km.toFixed(1)} km`
            : '\u2014',
        aiSummary: getAiSummary(rawData),
      }
    })
    .sort((a, b) => {
      const da = parseFloat(a.distanceKm) || 999
      const db = parseFloat(b.distanceKm) || 999
      return da - db
    })

  // --- Species Records ---
  const speciesRecords: SpeciesRecordRow[] = grouped.species_record
    .map((f) => {
      const rawData = getRawData(f)
      const metadata = getMetadata(rawData)
      const nbdcData = rawData.nbdcData as Record<string, unknown> | undefined

      const scientific = String(rawData.scientificName ?? metadata.scientificName ?? f.title)
      const common = String(nbdcData?.commonName ?? metadata.commonName ?? '')
      const name = common ? `${scientific} (${common})` : scientific

      const sortOrder = getSpeciesSortOrder(f)

      return {
        name,
        aiSummary: getAiSummary(rawData),
        protectionStatus: getProtectionStatusDetail(f),
        sortOrder,
      }
    })
    // Red (1) first, then Orange (2), then Blue (3), then alphabetically
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })

  // --- Habitat Data (from DB findings) ---
  const habitats: HabitatRow[] = grouped.habitat
    .map((f) => {
      const rawData = getRawData(f)
      const fossittCode = String(rawData.fossittCode ?? '—')
      const fossittName = String(rawData.fossittName ?? f.title)
      const nlcLabel = String(rawData.nlcLabel ?? '')
      const areaHa = Number(rawData.areaHectares ?? 0)
      const pct = rawData.percentCover ? `${rawData.percentCover}%` : '—'

      return {
        fossittCode,
        habitatName: fossittName,
        nlcLabel,
        areaHectares: areaHa > 0 ? `${areaHa.toLocaleString()} ha` : '—',
        percentCover: pct,
      }
    })
    .sort((a, b) => a.fossittCode.localeCompare(b.fossittCode))

  // --- Aquatic Features ---
  const aquaticFeatures: AquaticFeatureRow[] = grouped.aquatic
    .map((f) => {
      const rawData = getRawData(f)
      const metadata = getMetadata(rawData)

      const siteType = String(metadata.siteType ?? rawData.waterBodyType ?? '')
      let waterBodyType = 'River'
      if (siteType.toLowerCase().includes('lake')) waterBodyType = 'Lake'
      else if (siteType.toLowerCase().includes('transitional')) waterBodyType = 'Transitional'
      else if (f.data_type === 'catchment') waterBodyType = 'Catchment'

      const wfdStatus = String(
        rawData.WFD_Status ?? rawData.wfdStatus ?? metadata.designation ?? '—'
      )

      return {
        name: f.title,
        waterBodyType,
        wfdStatus,
        distanceKm:
          f.distance_from_boundary_km != null
            ? `${f.distance_from_boundary_km.toFixed(1)} km`
            : '—',
        aiSummary: getAiSummary(rawData),
      }
    })
    .sort((a, b) => {
      const da = parseFloat(a.distanceKm) || 999
      const db = parseFloat(b.distanceKm) || 999
      return da - db
    })

  return { designatedSites, speciesRecords, habitats, aquaticFeatures }
}
