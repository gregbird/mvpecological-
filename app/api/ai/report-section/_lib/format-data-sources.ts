import type { AquaticResearchData, DeepResearchData, FindingData } from './types'

/**
 * Render the "DATA SOURCES AND REFERENCES" block that goes at the end of
 * PROJECT DATA and is used by the AI to populate the report's Appendix.
 * Aggregates source URLs + per-source details from findings, deep research,
 * and aquatic research, then appends the standard CIEEM/Fossitt references.
 */
export function formatDataSources(
  parts: string[],
  findings: FindingData[],
  deepResearch: DeepResearchData[],
  aquaticResearch: AquaticResearchData[]
): void {
  parts.push('# DATA SOURCES AND REFERENCES')

  const sourceUrls: Record<string, { name: string; url: string; details: string[] }> = {
    npws: {
      name: 'National Parks and Wildlife Service (NPWS)',
      url: 'https://www.npws.ie',
      details: [],
    },
    gbif: {
      name: 'Global Biodiversity Information Facility (GBIF)',
      url: 'https://www.gbif.org',
      details: [],
    },
    nbdc: {
      name: 'National Biodiversity Data Centre (NBDC)',
      url: 'https://maps.biodiversityireland.ie',
      details: [],
    },
    epa: {
      name: 'Environmental Protection Agency (EPA)',
      url: 'https://www.epa.ie',
      details: [],
    },
    catchments: {
      name: 'Catchments.ie',
      url: 'https://www.catchments.ie',
      details: [],
    },
    fpo: {
      name: 'Flora (Protection) Order 2022 — NPWS',
      url: 'https://www.npws.ie/legislation/irish-law/flora-protection-order',
      details: [],
    },
  }

  for (const f of findings) {
    const entry = sourceUrls[f.source]
    if (!entry) continue
    if (f.source === 'npws') {
      const raw = f.raw_data as Record<string, unknown> | null
      const siteCode = raw?.siteCode || (raw?.metadata as Record<string, unknown>)?.siteCode
      if (siteCode) {
        const detail = `${f.title} (${siteCode})`
        if (!entry.details.includes(detail)) entry.details.push(detail)
      }
    } else {
      if (!entry.details.includes(f.title)) entry.details.push(f.title)
    }
  }

  for (const dr of deepResearch) {
    const entry = sourceUrls['npws']
    const detail = `${dr.site_name} (${dr.site_code}) — ${dr.site_type}`
    if (!entry.details.includes(detail)) entry.details.push(detail)
  }

  for (const ar of aquaticResearch) {
    const epaEntry = sourceUrls['epa']
    const detail = `${ar.water_body_name} (${ar.water_body_code}) — ${ar.water_body_type}`
    if (!epaEntry.details.includes(detail)) epaEntry.details.push(detail)
    if (ar.linked_sac_name) {
      const npwsEntry = sourceUrls['npws']
      const sacDetail = `${ar.linked_sac_name} (${ar.linked_sac_code}) — SAC`
      if (!npwsEntry.details.includes(sacDetail)) npwsEntry.details.push(sacDetail)
    }
  }

  // NLC habitat data source — only emitted when habitat findings exist
  const hasNlcData = findings.some((f) => f.data_type === 'habitat')
  if (hasNlcData) {
    parts.push(
      `- National Land Cover Map (NLC) 2018 — https://www.tailte.ie/surveying/products/professional-mapping/national-land-cover/`
    )
    parts.push(`  Source of desktop habitat data (FOSSITT classification)`)
  }

  const usedSources = Object.values(sourceUrls).filter((s) => s.details.length > 0)
  for (const source of usedSources) {
    parts.push(`- ${source.name} — ${source.url}`)
    for (const detail of source.details.slice(0, 10)) {
      parts.push(`  • ${detail}`)
    }
    if (source.details.length > 10) {
      parts.push(`  ... and ${source.details.length - 10} more`)
    }
  }

  parts.push('')
  parts.push('Standard references:')
  parts.push('- Fossitt, J.A. (2000) A Guide to Habitats in Ireland. Heritage Council, Kilkenny.')
  parts.push(
    '- Smith, G.F. et al. (2011) Best Practice Guidance for Habitat Survey and Mapping. Heritage Council.'
  )
  parts.push(
    '- CIEEM (2018) Guidelines for Ecological Impact Assessment in the UK and Ireland. CIEEM, Winchester.'
  )
  parts.push('')
}
