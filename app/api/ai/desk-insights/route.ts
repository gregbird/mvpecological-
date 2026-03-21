import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'

/**
 * AI Desk Insights API
 * Generates comprehensive ecological insights from all project data:
 * - Saved findings (with assessment relevance & notes)
 * - Deep research results (designated sites)
 * - Aquatic research results (water bodies)
 *
 * Input: { projectId, projectName, projectLocation }
 * Output: { insights, metadata }
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawData = Record<string, any>

interface FindingData {
  id: string
  title: string
  content: string | null
  source: string
  data_type: string
  raw_data: Record<string, unknown> | null
  distance_from_boundary_km: number | null
  is_protected: boolean | null
  notes: string | null
}

interface DeepResearchData {
  site_code: string
  site_name: string
  site_type: string
  habitats: Array<{ habitatCode: string; habitatName: string; status?: string }>
  conservation_summary: {
    total?: number
    favourable?: number
    unfavourableInadequate?: number
    unfavourableBad?: number
  }
  threats_pressures: {
    pressures?: string[]
    threats?: string[]
  }
  ai_analysis: string | null
}

interface AquaticResearchData {
  water_body_code: string
  water_body_name: string
  water_body_type: string
  current_status: string | null
  risk_level: string | null
  status_history: Array<{ period: string; status: string; details: string[] }>
  trends: Array<{ ParameterName: string; TrendDesc: string }>
  failures: Array<{ Name: string }>
  linked_sac_code: string | null
  linked_sac_name: string | null
  linked_sac_habitats: Array<{ code: string; name: string }>
  linked_sac_species: Array<{ code: string; name: string; commonName: string }>
  ai_analysis: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { projectId, projectName, projectLocation } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    // 1. Fetch saved findings with assessment data
    const { data: findings, error: findingsError } = await supabase
      .from('desk_research_findings')
      .select(
        'id, title, content, source, data_type, raw_data, distance_from_boundary_km, is_protected, notes'
      )
      .eq('project_id', projectId)
      .eq('is_saved', true)

    if (findingsError) {
      console.error('Error fetching findings:', findingsError)
      return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 })
    }

    // 2. Fetch deep research results (designated sites)
    const { data: deepResearch, error: deepError } = await supabase
      .from('deep_research_results')
      .select(
        'site_code, site_name, site_type, habitats, conservation_summary, threats_pressures, ai_analysis'
      )
      .eq('project_id', projectId)

    if (deepError) {
      console.error('Error fetching deep research:', deepError)
    }

    // 3. Fetch aquatic research results (water bodies)
    const { data: aquaticResearch, error: aquaticError } = await supabase
      .from('aquatic_research_results')
      .select(
        'water_body_code, water_body_name, water_body_type, current_status, risk_level, status_history, trends, failures, linked_sac_code, linked_sac_name, linked_sac_habitats, linked_sac_species, ai_analysis'
      )
      .eq('project_id', projectId)

    if (aquaticError) {
      console.error('Error fetching aquatic research:', aquaticError)
    }

    // 4. Build comprehensive context for AI
    const context = buildContext({
      findings: (findings || []) as FindingData[],
      deepResearch: (deepResearch || []) as unknown as DeepResearchData[],
      aquaticResearch: (aquaticResearch || []) as unknown as AquaticResearchData[],
      projectName: projectName || 'Unknown Project',
      projectLocation: projectLocation || 'Ireland',
    })

    // 5. Generate AI insights
    const prompt = buildPrompt(context)

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a senior Irish ecological consultant writing a desk study assessment for a Preliminary Ecological Appraisal (PEA) under CIEEM guidelines.

Expertise: Irish designated sites (SAC, SPA, NHA, pNHA), EU Habitats & Birds Directives, Water Framework Directive, Wildlife Acts 1976-2021, AA Screening, FOSSITT habitat classification, Irish Red Lists.

Rules:
- Write professionally for direct inclusion in PEA reports
- Base ALL conclusions strictly on the provided data — never speculate or invent species/sites
- Clearly identify data gaps
- Give specific, actionable field survey recommendations with optimal timing
- Reference site codes, distances, and conservation status throughout
- Use markdown formatting with headers, tables, and bullet points`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    })

    if (!aiResponse.ok) {
      const error = await aiResponse.json()
      console.error('OpenAI error:', error)
      return NextResponse.json(
        { error: error.error?.message || 'OpenAI API error' },
        { status: 500 }
      )
    }

    const data = await aiResponse.json()
    const insights = data.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({
      insights,
      metadata: {
        totalFindings: findings?.length || 0,
        designatedSites: findings?.filter((f) => f.data_type === 'designated_site').length || 0,
        speciesRecords: findings?.filter((f) => f.data_type === 'species_record').length || 0,
        aquaticFeatures: findings?.filter((f) => f.data_type === 'water_quality').length || 0,
        deepResearchCount: deepResearch?.length || 0,
        aquaticResearchCount: aquaticResearch?.length || 0,
        highRelevanceCount: countHighRelevance(findings as FindingData[]),
        protectedSpeciesCount: countProtectedSpecies(findings as FindingData[]),
      },
    })
  } catch (error) {
    console.error('Desk insights error:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}

function parseAssessment(notes: string | null): { relevance: string; notes: string } {
  if (!notes) return { relevance: 'unassessed', notes: '' }

  if (notes.startsWith('{')) {
    try {
      const parsed = JSON.parse(notes)
      return {
        relevance: parsed.relevance || 'unassessed',
        notes: parsed.notes || '',
      }
    } catch {
      return { relevance: 'unassessed', notes: notes }
    }
  }

  return { relevance: 'unassessed', notes: notes }
}

function countHighRelevance(findings: FindingData[]): number {
  return findings.filter((f) => {
    const assessment = parseAssessment(f.notes)
    return assessment.relevance === 'high'
  }).length
}

function countProtectedSpecies(findings: FindingData[]): number {
  return findings.filter(
    (f) =>
      f.data_type === 'species_record' &&
      (f.is_protected || (f.raw_data as Record<string, unknown> as RawData)?.isProtected)
  ).length
}

interface ContextInput {
  findings: FindingData[]
  deepResearch: DeepResearchData[]
  aquaticResearch: AquaticResearchData[]
  projectName: string
  projectLocation: string
}

function buildContext(input: ContextInput): string {
  const parts: string[] = []

  parts.push(`# Project: ${input.projectName}`)
  parts.push(`Location: ${input.projectLocation}`)
  parts.push('')

  // Group findings by type
  const designatedSites = input.findings.filter((f) => f.data_type === 'designated_site')
  const speciesRecords = input.findings.filter((f) => f.data_type === 'species_record')
  const aquaticFeatures = input.findings.filter(
    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
  )
  const companyReports = input.findings.filter((f) => f.data_type === 'company_report')

  // === DESIGNATED SITES ===
  parts.push('## DESIGNATED SITES')
  parts.push(`Total: ${designatedSites.length} sites identified`)
  parts.push('')

  for (const site of designatedSites) {
    const assessment = parseAssessment(site.notes)
    const rawData = site.raw_data as Record<string, unknown> as RawData

    const siteMetadataObj = rawData?.metadata as Record<string, unknown> | undefined
    const siteType =
      rawData?.siteType || rawData?.SITETYPE || siteMetadataObj?.siteType || 'Unknown'
    const siteCodeVal = rawData?.siteCode || rawData?.SITECODE || siteMetadataObj?.siteCode || 'N/A'
    const distanceKm = site.distance_from_boundary_km ?? siteMetadataObj?.distance ?? null

    parts.push(`### ${site.title}`)
    parts.push(`- Source: ${site.source.toUpperCase()}`)
    parts.push(`- Site Type: ${siteType}`)
    parts.push(`- Site Code: ${siteCodeVal}`)
    if (distanceKm != null) {
      parts.push(`- Distance from site: ${Number(distanceKm).toFixed(2)} km`)
    }
    parts.push(`- Assessment Relevance: ${assessment.relevance.toUpperCase()}`)
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Include AI Summary if available in metadata
    if (siteMetadataObj?.aiSummary) {
      parts.push(`- AI Summary: ${String(siteMetadataObj.aiSummary).substring(0, 400)}`)
    }

    // Find matching deep research - first check database, then raw_data
    const siteCode = siteCodeVal !== 'N/A' ? siteCodeVal : undefined
    const deepData = input.deepResearch.find((d) => d.site_code === siteCode)

    // Also check if deep research is stored in raw_data (for sites not saved to DB)
    const rawDeepResearch = rawData?.deepResearch

    if (deepData) {
      parts.push(`\n  **Deep Research Results (from DB):**`)

      if (deepData.habitats?.length > 0) {
        parts.push(`  Qualifying Interest Habitats:`)
        for (const h of deepData.habitats.slice(0, 5)) {
          parts.push(`    - [${h.habitatCode}] ${h.habitatName}${h.status ? ` (${h.status})` : ''}`)
        }
        if (deepData.habitats.length > 5) {
          parts.push(`    - ... and ${deepData.habitats.length - 5} more`)
        }
      }

      if (deepData.conservation_summary) {
        const cs = deepData.conservation_summary
        if (cs.total) {
          parts.push(
            `  Conservation Status: ${cs.favourable || 0} favourable, ${cs.unfavourableInadequate || 0} inadequate, ${cs.unfavourableBad || 0} bad (of ${cs.total} total)`
          )
        }
      }

      if (deepData.threats_pressures) {
        const tp = deepData.threats_pressures
        if (tp.pressures?.length) {
          parts.push(`  Pressures: ${tp.pressures.slice(0, 3).join(', ')}`)
        }
        if (tp.threats?.length) {
          parts.push(`  Threats: ${tp.threats.slice(0, 3).join(', ')}`)
        }
      }

      if (deepData.ai_analysis) {
        const summary = deepData.ai_analysis.substring(0, 500)
        parts.push(`  AI Conservation Summary: ${summary}...`)
      }
    } else if (rawDeepResearch) {
      // Fallback to raw_data.deepResearch if not in DB
      parts.push(`\n  **Deep Research Results:**`)

      if (rawDeepResearch.aiAnalysis) {
        const summary = rawDeepResearch.aiAnalysis.substring(0, 500)
        parts.push(`  AI Analysis: ${summary}...`)
      }

      if (rawDeepResearch.habitats?.length > 0) {
        parts.push(`  Habitats found: ${rawDeepResearch.habitats.length}`)
      }

      if (rawDeepResearch.species?.length > 0) {
        parts.push(`  Species of conservation interest: ${rawDeepResearch.species.length}`)
      }
    }
    parts.push('')
  }

  // === SPECIES RECORDS ===
  parts.push('## SPECIES RECORDS')
  parts.push(`Total: ${speciesRecords.length} species recorded`)
  parts.push('')

  // Group by protection status
  const protectedSpecies = speciesRecords.filter(
    (s) => s.is_protected || (s.raw_data as Record<string, unknown> as RawData)?.isProtected
  )
  const otherSpecies = speciesRecords.filter(
    (s) => !s.is_protected && !(s.raw_data as Record<string, unknown> as RawData)?.isProtected
  )

  if (protectedSpecies.length > 0) {
    parts.push('### Protected Species (Wildlife Acts / Habitats Directive)')
    for (const species of protectedSpecies) {
      const assessment = parseAssessment(species.notes)
      const rawData = species.raw_data as Record<string, unknown> as RawData

      const speciesMeta = rawData?.metadata as Record<string, unknown> | undefined
      const nbdc = rawData?.nbdcData as Record<string, unknown> | undefined
      const speciesDistance = species.distance_from_boundary_km ?? speciesMeta?.distance ?? null

      parts.push(`- **${species.title}**`)
      parts.push(
        `  Scientific name: ${rawData?.scientificName || speciesMeta?.scientificName || 'N/A'}`
      )
      parts.push(
        `  Taxon group: ${rawData?.taxonGroup || nbdc?.taxonGroup || speciesMeta?.taxonGroup || 'Unknown'}`
      )
      if (speciesDistance != null) {
        parts.push(`  Distance from site: ${Number(speciesDistance).toFixed(2)} km`)
      }
      if (rawData?.redListStatus || nbdc?.isThreatened) {
        parts.push(`  Red List Status: ${rawData?.redListStatus || 'Irish Red List (threatened)'}`)
      }
      const designationStr = rawData?.designations?.length
        ? rawData.designations.join(', ')
        : nbdc?.designations || speciesMeta?.designations || null
      if (designationStr) {
        parts.push(`  Designations: ${designationStr}`)
      }
      const recCount = rawData?.recordCount || speciesMeta?.recordCount
      if (recCount) {
        parts.push(`  Records in project area: ${recCount}`)
      }
      if (nbdc?.totalRecordsInIreland) {
        parts.push(`  Total Irish records: ${nbdc.totalRecordsInIreland}`)
      }
      if (nbdc?.isInvasive) {
        parts.push(`  ⚠ INVASIVE SPECIES`)
      }
      parts.push(`  Assessment: ${assessment.relevance.toUpperCase()}`)
      if (assessment.notes) {
        parts.push(`  Ecologist Notes: "${assessment.notes}"`)
      }

      // Include AI Summary if available
      if (speciesMeta?.aiSummary) {
        parts.push(`  AI Summary: ${String(speciesMeta.aiSummary).substring(0, 400)}`)
      }

      // Include Deep Research AI Analysis if available
      const deepResearch = rawData?.deepResearch
      if (deepResearch?.aiAnalysis) {
        const summary = deepResearch.aiAnalysis.substring(0, 600)
        parts.push(`  **Species Deep Research:**`)
        parts.push(`  ${summary}${deepResearch.aiAnalysis.length > 600 ? '...' : ''}`)
      }
    }
    parts.push('')
  }

  if (otherSpecies.length > 0) {
    parts.push('### Other Species Records')
    for (const species of otherSpecies) {
      const assessment = parseAssessment(species.notes)
      const rawData = species.raw_data as Record<string, unknown> as RawData
      const otherMeta = rawData?.metadata as Record<string, unknown> | undefined
      const otherNbdc = rawData?.nbdcData as Record<string, unknown> | undefined
      const dist = species.distance_from_boundary_km ?? otherMeta?.distance ?? null
      const distStr = dist != null ? ` - ${Number(dist).toFixed(1)}km` : ''
      const taxon =
        rawData?.taxonGroup || otherNbdc?.taxonGroup || otherMeta?.taxonGroup || 'Unknown'
      parts.push(`- ${species.title} (${taxon})${distStr} - ${assessment.relevance}`)

      // Include Deep Research AI Analysis if available for other species too
      const deepResearch = rawData?.deepResearch
      if (deepResearch?.aiAnalysis) {
        const summary = deepResearch.aiAnalysis.substring(0, 300)
        parts.push(`  Deep Research: ${summary}...`)
      }
    }
    parts.push('')
  }

  // === AQUATIC FEATURES ===
  parts.push('## AQUATIC FEATURES')
  parts.push(`Total: ${aquaticFeatures.length} water bodies identified`)
  parts.push('')

  for (const feature of aquaticFeatures) {
    const assessment = parseAssessment(feature.notes)
    const rawData = feature.raw_data as Record<string, unknown> as RawData

    const aquaticMetadata = rawData?.metadata as Record<string, unknown> | undefined
    const waterBodyType =
      rawData?.waterBodyType ||
      aquaticMetadata?.siteType ||
      rawData?.metadata?.siteType ||
      'Unknown'
    const waterCode =
      rawData?.waterBodyCode ||
      rawData?.RiverCode ||
      rawData?.LakeCode ||
      rawData?.CatchmentId ||
      rawData?.siteCode
    const wfdStatus =
      rawData?.wfdStatus ||
      rawData?.WFD_Status ||
      aquaticMetadata?.designation ||
      rawData?.metadata?.designation

    parts.push(`### ${feature.title}`)
    parts.push(`- Type: ${waterBodyType}`)
    parts.push(`- EPA Code: ${waterCode || 'N/A'}`)
    if (wfdStatus) {
      parts.push(`- WFD Status: ${wfdStatus}`)
    }
    if (feature.distance_from_boundary_km != null) {
      parts.push(`- Distance: ${feature.distance_from_boundary_km.toFixed(2)} km`)
    }
    if (rawData?.Length_km) {
      parts.push(`- Length: ${rawData.Length_km} km`)
    }
    if (rawData?.Area_ha) {
      parts.push(`- Area: ${rawData.Area_ha} ha`)
    }
    if (rawData?.CatchmentName) {
      parts.push(`- Catchment: ${rawData.CatchmentName}`)
    }
    parts.push(`- Assessment: ${assessment.relevance.toUpperCase()}`)
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Include AI Summary if available
    if (aquaticMetadata?.aiSummary) {
      parts.push(`- AI Summary: ${String(aquaticMetadata.aiSummary).substring(0, 400)}`)
    }

    // Find matching aquatic research
    const aquaticData = input.aquaticResearch.find((a) => a.water_body_code === waterCode)

    if (aquaticData) {
      parts.push(`\n  **WFD Research Results:**`)
      if (aquaticData.current_status) {
        parts.push(`  Current WFD Status: ${aquaticData.current_status}`)
      }
      if (aquaticData.risk_level) {
        parts.push(`  Risk Assessment: ${aquaticData.risk_level}`)
      }

      if (aquaticData.status_history?.length > 0) {
        parts.push(`  Status History:`)
        for (const h of aquaticData.status_history.slice(0, 3)) {
          parts.push(`    - ${h.period}: ${h.status}`)
        }
      }

      if (aquaticData.trends?.length > 0) {
        parts.push(`  Water Quality Trends:`)
        for (const t of aquaticData.trends.slice(0, 3)) {
          parts.push(`    - ${t.ParameterName}: ${t.TrendDesc}`)
        }
      }

      if (aquaticData.failures?.length > 0) {
        parts.push(
          `  Environmental Failures: ${aquaticData.failures.map((f) => f.Name).join(', ')}`
        )
      }

      if (aquaticData.linked_sac_name) {
        parts.push(`  Linked SAC: ${aquaticData.linked_sac_name} (${aquaticData.linked_sac_code})`)
        if (aquaticData.linked_sac_species?.length > 0) {
          parts.push(
            `  SAC Aquatic Species: ${aquaticData.linked_sac_species.map((s) => s.commonName || s.name).join(', ')}`
          )
        }
      }

      if (aquaticData.ai_analysis) {
        const summary = aquaticData.ai_analysis.substring(0, 400)
        parts.push(`  AI Analysis Summary: ${summary}...`)
      }
    }
    parts.push('')
  }

  // === HABITAT DATA ===
  const habitatFindings = input.findings.filter((f) => f.data_type === 'habitat')
  if (habitatFindings.length > 0) {
    parts.push('## HABITAT DATA (NLC 2018)')
    parts.push(`Total: ${habitatFindings.length} habitat types identified`)
    parts.push('')

    for (const h of habitatFindings) {
      const raw = h.raw_data as Record<string, unknown> | null
      const fossittCode = raw?.fossittCode || '\u2014'
      const nlcLabel = raw?.nlcLabel || ''
      const areaHa = raw?.areaHectares != null ? Number(raw.areaHectares).toFixed(2) : '?'
      const pct = raw?.percentCover || '?'
      const bufferKm = raw?.bufferKm || '?'

      parts.push(`### [${fossittCode}] ${h.title}`)
      parts.push(`- NLC Label: ${nlcLabel}`)
      parts.push(`- Area: ${areaHa} ha (${pct}% of ${bufferKm} km buffer)`)
      if (raw?.aiSummary) {
        parts.push(`- AI Summary: ${String(raw.aiSummary).substring(0, 400)}`)
      }
      if (h.notes) parts.push(`- Ecologist Notes: ${h.notes}`)
      parts.push('')
    }
  }

  // === COMPANY REPORTS ===
  if (companyReports.length > 0) {
    parts.push('## COMPANY REPORTS & DOCUMENTS')
    parts.push(`Total: ${companyReports.length} relevant document excerpts`)
    parts.push('')

    for (const report of companyReports) {
      const raw = report.raw_data as Record<string, unknown> | null
      parts.push(`### ${report.title}`)
      if (raw?.fileName) parts.push(`- File: ${String(raw.fileName)}`)
      if (report.content) {
        parts.push(`- Content: ${report.content.substring(0, 500)}`)
      }
      if (report.notes) parts.push(`- Ecologist Notes: ${report.notes}`)
      parts.push('')
    }
  }

  return parts.join('\n')
}

function buildPrompt(context: string): string {
  return `You are writing a desk study ecological summary for a PEA report in Ireland. Analyze the following data and produce a comprehensive structured summary.

${context}

---

Write the summary using the following markdown headings. Each category should list ALL findings as bullet points, followed by a 1-2 sentence assessment paragraph. Only include categories that have data.

## Designated Areas

- **[Site Name]** ([Site Code]) — [Type: SAC/SPA/NHA/pNHA] — [Distance] km from site. [Key qualifying interests or conservation features if known]
- [Continue for ALL designated sites from the data]

[1-2 sentence assessment: summarize proximity risks, AA Screening implications, and connectivity concerns]

## Habitats

- **[FOSSITT Code] [Habitat Name]** — [Area in hectares, % cover]. [Ecological significance and survey recommendations]
- [List ALL habitat types from the data with their FOSSITT codes]
- [Note any Annex I habitats that may be present]

[1-2 sentence assessment: summarize habitat sensitivity and survey needs]

## Species

- **[Common Name]** (*[Scientific Name]*) — [Conservation status: e.g., Annex II/IV, Wildlife Acts, Red List]. [Number of records]. [Taxon group]
- [List ALL species from the data — group by taxon: birds, mammals, amphibians, invertebrates, flora]
- [Protected/notable species first within each group]

[1-2 sentence assessment: summarize protected species concerns and targeted survey requirements with optimal timing]

## Aquatic Features

- **[Water Body Name]** ([EPA Code]) — [Type: River/Lake/Transitional/Catchment]. WFD Status: [Status]. [Risk level if known]
- [Include status trends, linked SACs, and key pressures where available]

[1-2 sentence assessment: summarize water quality concerns and hydrological connectivity to designated sites]

## Document Review

- **[Document/File Name]** — [Key findings or relevant excerpts from company reports and indexed documents]

[1-2 sentence assessment: summarize how existing company reports inform the current assessment]

---

RULES:
- Each heading must start with "## " (h2 markdown)
- CRITICAL: Include EVERY species, site, habitat, and water body from the provided data — do NOT summarize, group, or skip any records. Each record must be its own bullet point
- Only include a category heading if data exists for it — omit empty categories entirely
- Base ALL conclusions on provided data only — do not invent species, sites, or habitats
- Reference site codes, FOSSITT codes, distances, and conservation status throughout
- Use ecologist assessment notes and AI summaries to inform analysis
- Each bullet should be concise (1-2 lines max)
- Bold the primary name/title in each bullet
- For species: always include the scientific name in italics, taxon group, record count, and conservation designations`
}
