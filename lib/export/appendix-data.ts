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

const EM_DASH = '—'

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
  if (designation) parts.push(cleanProtectionString(String(designation)))

  if (finding.red_list_status) parts.push(finding.red_list_status)

  if (metadata.isInvasive === true && !parts.some((p) => /invasive/i.test(p))) {
    parts.push('Invasive')
  }

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

/**
 * Convert NBDC-style "||" and ">>" separators into readable punctuation.
 * Raw: "Protected Species: Wildlife Acts || Threatened Species: BoCCI >> Amber List"
 * Clean: "Wildlife Acts; BoCCI - Amber List"
 */
function cleanProtectionString(raw: string): string {
  return raw
    .replace(/\s*>>\s*/g, ' - ')
    .replace(/\s*\|\|\s*/g, '; ')
    .replace(/(Protected Species|Threatened Species|Invasive Species):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================
// Main extraction function
// ============================================================

/** Extract appendix table data from saved findings. */
export function prepareAppendixData(findings: DeskResearchFinding[]): AppendixData {
  const grouped = groupFindingsByType(findings)

  // --- Designated Sites (dedup by siteCode + siteType — keep closest) ---
  const designatedSitesMap = new Map<string, DesignatedSiteRow>()
  for (const f of grouped.designated_site) {
    const rawData = getRawData(f)
    const metadata = getMetadata(rawData)

    const siteCode = String(rawData.siteCode ?? rawData.SITECODE ?? metadata.siteCode ?? '')
    const siteType = String(rawData.SITE_TYPE ?? metadata.siteType ?? '')
    const dedupKey = `${siteCode}|${siteType}`

    const row: DesignatedSiteRow = {
      name: f.title,
      siteNumber: siteCode,
      siteType,
      distanceKm:
        f.distance_from_boundary_km != null
          ? `${f.distance_from_boundary_km.toFixed(1)} km`
          : EM_DASH,
      aiSummary: getAiSummary(rawData),
    }

    const existing = designatedSitesMap.get(dedupKey)
    if (!existing) {
      designatedSitesMap.set(dedupKey, row)
    } else {
      const existingD = parseFloat(existing.distanceKm) || Infinity
      const newD = parseFloat(row.distanceKm) || Infinity
      if (newD < existingD) designatedSitesMap.set(dedupKey, row)
    }
  }
  const designatedSites = Array.from(designatedSitesMap.values()).sort((a, b) => {
    const da = parseFloat(a.distanceKm) || 999
    const db = parseFloat(b.distanceKm) || 999
    return da - db
  })

  // --- Species Records (dedup by scientific name) ---
  const speciesMap = new Map<string, SpeciesRecordRow>()
  for (const f of grouped.species_record) {
    const rawData = getRawData(f)
    const metadata = getMetadata(rawData)
    const nbdcData = rawData.nbdcData as Record<string, unknown> | undefined

    const scientific = String(rawData.scientificName ?? metadata.scientificName ?? f.title)
    const common = String(nbdcData?.commonName ?? metadata.commonName ?? '')
    const name = common ? `${scientific} (${common})` : scientific

    if (speciesMap.has(scientific)) continue

    speciesMap.set(scientific, {
      name,
      aiSummary: getAiSummary(rawData),
      protectionStatus: getProtectionStatusDetail(f),
      sortOrder: getSpeciesSortOrder(f),
    })
  }
  const speciesRecords = Array.from(speciesMap.values()).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name)
  })

  // --- Habitat Data (aggregated by FOSSITT code — sum areas + sum percent cover) ---
  type HabitatAccumulator = {
    fossittCode: string
    habitatName: string
    nlcLabels: Set<string>
    totalArea: number
    totalPercent: number
  }
  const habitatAccMap = new Map<string, HabitatAccumulator>()
  for (const f of grouped.habitat) {
    const rawData = getRawData(f)
    const fossittCode = String(rawData.fossittCode ?? EM_DASH)
    const fossittName = String(rawData.fossittName ?? f.title)
    const nlcLabel = String(rawData.nlcLabel ?? '')
    const areaHa = Number(rawData.areaHectares ?? 0)
    const pctRaw = Number(rawData.percentCover ?? 0)

    const acc = habitatAccMap.get(fossittCode) ?? {
      fossittCode,
      habitatName: fossittName,
      nlcLabels: new Set<string>(),
      totalArea: 0,
      totalPercent: 0,
    }
    if (nlcLabel) acc.nlcLabels.add(nlcLabel)
    if (Number.isFinite(areaHa)) acc.totalArea += areaHa
    if (Number.isFinite(pctRaw)) acc.totalPercent += pctRaw
    habitatAccMap.set(fossittCode, acc)
  }
  const habitats: HabitatRow[] = Array.from(habitatAccMap.values())
    .map((a) => ({
      fossittCode: a.fossittCode,
      habitatName: a.habitatName,
      nlcLabel: Array.from(a.nlcLabels).join(', '),
      areaHectares: a.totalArea > 0 ? `${a.totalArea.toFixed(2)} ha` : EM_DASH,
      percentCover: a.totalPercent > 0 ? `${a.totalPercent.toFixed(1)}%` : EM_DASH,
    }))
    .sort((a, b) => a.fossittCode.localeCompare(b.fossittCode))

  // --- Aquatic Features (dedup by name — keep closer) ---
  const aquaticMap = new Map<string, AquaticFeatureRow>()
  for (const f of grouped.aquatic) {
    const rawData = getRawData(f)
    const metadata = getMetadata(rawData)

    const siteType = String(metadata.siteType ?? rawData.waterBodyType ?? '')
    let waterBodyType = 'River'
    if (siteType.toLowerCase().includes('lake')) waterBodyType = 'Lake'
    else if (siteType.toLowerCase().includes('transitional')) waterBodyType = 'Transitional'
    else if (f.data_type === 'catchment') waterBodyType = 'Catchment'

    const wfdStatus = String(
      rawData.WFD_Status ?? rawData.wfdStatus ?? metadata.designation ?? EM_DASH
    )

    const row: AquaticFeatureRow = {
      name: f.title,
      waterBodyType,
      wfdStatus,
      distanceKm:
        f.distance_from_boundary_km != null
          ? `${f.distance_from_boundary_km.toFixed(1)} km`
          : EM_DASH,
      aiSummary: getAiSummary(rawData),
    }

    const existing = aquaticMap.get(f.title)
    if (!existing) {
      aquaticMap.set(f.title, row)
    } else {
      const existingD = parseFloat(existing.distanceKm) || Infinity
      const newD = parseFloat(row.distanceKm) || Infinity
      if (newD < existingD) aquaticMap.set(f.title, row)
    }
  }
  const aquaticFeatures = Array.from(aquaticMap.values()).sort((a, b) => {
    const da = parseFloat(a.distanceKm) || 999
    const db = parseFloat(b.distanceKm) || 999
    return da - db
  })

  return { designatedSites, speciesRecords, habitats, aquaticFeatures }
}
