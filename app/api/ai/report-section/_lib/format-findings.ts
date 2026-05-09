import type { FindingData } from './types'

/**
 * Render the inside-boundary and buffer-zone findings blocks. Spatial
 * separation is mandatory per CIEEM convention — buffer-zone findings get
 * their own clearly-labelled block so the AI can produce distinct subsections.
 */
export function formatFindings(
  parts: string[],
  insideFindings: FindingData[],
  bufferFindings: FindingData[],
  bufferRadiusKm: number
): void {
  const totalReportable = insideFindings.length + bufferFindings.length
  if (totalReportable === 0) {
    parts.push('# DESK RESEARCH FINDINGS')
    parts.push('No desk research findings saved.')
    parts.push('')
    return
  }

  renderFindingsBlock(parts, 'FINDINGS WITHIN BOUNDARY', insideFindings)
  if (bufferFindings.length > 0) {
    renderFindingsBlock(
      parts,
      `FINDINGS WITHIN BUFFER ZONE (outside boundary, within ${bufferRadiusKm} km)`,
      bufferFindings
    )
  }
}

function renderFindingsBlock(parts: string[], label: string, items: FindingData[]): void {
  parts.push(`# ${label}`)
  if (items.length === 0) {
    parts.push('No findings in this zone.')
    parts.push('')
    return
  }
  const byType: Record<string, FindingData[]> = {}
  for (const f of items) {
    if (!byType[f.data_type]) byType[f.data_type] = []
    byType[f.data_type].push(f)
  }

  // Habitat findings — rich context from raw_data
  const habitatFindings = byType['habitat'] || []
  if (habitatFindings.length > 0) {
    parts.push(`\n## HABITAT DATA (${habitatFindings.length} types from NLC 2018)`)
    for (const f of habitatFindings) {
      const raw = f.raw_data as Record<string, unknown> | null
      const fossittCode = raw?.fossittCode || '—'
      const nlcLabel = raw?.nlcLabel || ''
      const areaHa = raw?.areaHectares != null ? Number(raw.areaHectares).toFixed(2) : '?'
      const pct = raw?.percentCover || '?'
      const bufferKm = raw?.bufferKm || '?'
      parts.push(`- **[${fossittCode}] ${f.title}**`)
      parts.push(`  NLC Label: ${nlcLabel}`)
      parts.push(`  Area: ${areaHa} ha (${pct}% of ${bufferKm} km buffer)`)
      if (raw?.aiSummary) parts.push(`  AI Summary: ${String(raw.aiSummary).substring(0, 400)}`)
      if (f.notes) parts.push(`  Ecologist Notes: ${f.notes}`)
    }
  }

  // Company report findings — extract document content
  const companyReports = byType['company_report'] || []
  if (companyReports.length > 0) {
    parts.push(`\n## COMPANY REPORT DATA (${companyReports.length} documents)`)
    for (const f of companyReports) {
      parts.push(`- **${f.title}** [${f.source.toUpperCase()}]`)
      const raw = f.raw_data as Record<string, unknown> | null
      if (raw) {
        const content = raw.content || raw.textContent || raw.extractedText
        if (content) parts.push(`  Content: ${String(content).substring(0, 500)}`)
        const chunks = raw.chunks as Array<{ text: string }> | undefined
        if (chunks?.length) {
          parts.push(`  Key excerpts:`)
          for (const chunk of chunks.slice(0, 3)) {
            parts.push(`    - ${chunk.text.substring(0, 300)}`)
          }
        }
      }
      if (f.notes) parts.push(`  Notes: ${f.notes}`)
    }
  }

  // Other types — generic rendering with AI summary fallback
  for (const [type, typeItems] of Object.entries(byType)) {
    if (type === 'habitat' || type === 'company_report') continue
    parts.push(`\n## ${type.replaceAll('_', ' ').toUpperCase()} (${typeItems.length} records)`)
    for (const f of typeItems) {
      parts.push(`- **${f.title}** [${f.source.toUpperCase()}]`)
      if (f.distance_from_boundary_km != null) {
        parts.push(`  Distance: ${f.distance_from_boundary_km.toFixed(2)} km`)
      }
      if (f.is_protected) parts.push(`  Protected: Yes`)
      if (f.notes) {
        try {
          const parsed = JSON.parse(f.notes)
          if (parsed.relevance) parts.push(`  Relevance: ${parsed.relevance}`)
          if (parsed.notes) parts.push(`  Ecologist notes: ${parsed.notes}`)
        } catch {
          parts.push(`  Notes: ${f.notes}`)
        }
      }
      const raw = f.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | undefined
      const aiSummary = metadata?.aiSummary || raw?.aiSummary
      if (aiSummary) parts.push(`  AI Summary: ${String(aiSummary).substring(0, 400)}`)
      const deepResearchRaw = (raw?.deepResearch || raw?.aquaticResearch) as
        | Record<string, unknown>
        | undefined
      if (deepResearchRaw?.aiAnalysis) {
        parts.push(`  Deep Research: ${String(deepResearchRaw.aiAnalysis).substring(0, 500)}`)
      }
    }
  }
  parts.push('')
}
