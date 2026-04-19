import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { createClient } from '@/lib/supabase/server'
import { SYNTHESIS_MODEL } from '@/lib/ai/openai-models'

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

    const { projectId, projectName, projectLocation, siteId } = (await request.json()) as {
      projectId?: string
      projectName?: string
      projectLocation?: string
      siteId?: string | null
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    // 0. (Multi-site) Fetch site context if scoped
    let siteContext: {
      siteCode: string
      siteName: string | null
      county: string | null
      townland: string | null
    } | null = null
    if (siteId) {
      const { data: siteRow } = await supabase
        .from('project_sites')
        .select('site_code, site_name, county, townland')
        .eq('id', siteId)
        .maybeSingle()
      if (siteRow) {
        siteContext = {
          siteCode: siteRow.site_code,
          siteName: siteRow.site_name,
          county: siteRow.county,
          townland: siteRow.townland,
        }
      }
    }

    // 1. Fetch saved findings with assessment data (filtered by site if scoped)
    let findingsQuery = supabase
      .from('desk_research_findings')
      .select(
        'id, title, content, source, data_type, raw_data, distance_from_boundary_km, is_protected, notes'
      )
      .eq('project_id', projectId)
      .eq('is_saved', true)
    if (siteId) findingsQuery = findingsQuery.eq('site_id', siteId)
    const { data: findings, error: findingsError } = await findingsQuery

    if (findingsError) {
      console.error('Error fetching findings:', findingsError)
      return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 })
    }

    // Pre-compute finding IDs for the site (used to filter research tables which lack site_id)
    const siteFindingIds = (findings ?? []).map((f) => f.id)

    // 2. Fetch deep research results (designated sites)
    // deep_research_results has finding_id FK but no site_id — filter via finding_id when site-scoped.
    let deepResearch: DeepResearchData[] | null = null
    if (siteId && siteFindingIds.length === 0) {
      // No findings for this site → no research results possible. Skip query.
      deepResearch = []
    } else {
      let deepQuery = supabase
        .from('deep_research_results')
        .select(
          'site_code, site_name, site_type, habitats, conservation_summary, threats_pressures, ai_analysis'
        )
        .eq('project_id', projectId)
      if (siteId) deepQuery = deepQuery.in('finding_id', siteFindingIds)
      const { data, error: deepError } = await deepQuery
      if (deepError) {
        console.error('Error fetching deep research:', deepError)
      }
      deepResearch = (data || []) as unknown as DeepResearchData[]
    }

    // 3. Fetch aquatic research results (water bodies)
    let aquaticResearch: AquaticResearchData[] | null = null
    if (siteId && siteFindingIds.length === 0) {
      aquaticResearch = []
    } else {
      let aquaticQuery = supabase
        .from('aquatic_research_results')
        .select(
          'water_body_code, water_body_name, water_body_type, current_status, risk_level, status_history, trends, failures, linked_sac_code, linked_sac_name, linked_sac_habitats, linked_sac_species, ai_analysis'
        )
        .eq('project_id', projectId)
      if (siteId) aquaticQuery = aquaticQuery.in('finding_id', siteFindingIds)
      const { data, error: aquaticError } = await aquaticQuery
      if (aquaticError) {
        console.error('Error fetching aquatic research:', aquaticError)
      }
      aquaticResearch = (data || []) as unknown as AquaticResearchData[]
    }

    // 4. Build comprehensive context for AI (with site-aware project header)
    const effectiveLocation = siteContext
      ? [siteContext.townland, siteContext.county].filter(Boolean).join(', ') ||
        projectLocation ||
        'Ireland'
      : projectLocation || 'Ireland'
    const effectiveProjectName = siteContext
      ? `${projectName || 'Unknown Project'} — Site ${siteContext.siteCode}${
          siteContext.siteName ? ` (${siteContext.siteName})` : ''
        }`
      : projectName || 'Unknown Project'

    const context = buildContext({
      findings: (findings || []) as FindingData[],
      deepResearch: deepResearch || [],
      aquaticResearch: aquaticResearch || [],
      projectName: effectiveProjectName,
      projectLocation: effectiveLocation,
    })

    // 5. Generate AI insights
    const prompt = buildPrompt(context)

    const siteScopeNote = siteContext
      ? `\n\nIMPORTANT: This desk study covers a single site (${siteContext.siteCode}${
          siteContext.siteName ? ` — ${siteContext.siteName}` : ''
        }) of a multi-site project. All data provided has already been filtered to this site. Restrict your analysis to this site only — do not reference other sites in the project.`
      : ''

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SYNTHESIS_MODEL,
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
- Use markdown formatting with headers, tables, and bullet points
- Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour)${siteScopeNote}`,
          },
          { role: 'user', content: prompt },
        ],
        reasoning_effort: 'medium',
        max_completion_tokens: 12000,
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
    const insights = toIrishEnglish(data.choices[0]?.message?.content?.trim() || '')

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
    if (assessment.relevance !== 'unassessed') {
      parts.push(`- Ecologist Priority: ${assessment.relevance.toUpperCase()}`)
    }
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Find matching deep research - first check database, then raw_data
    const siteCode = siteCodeVal !== 'N/A' ? siteCodeVal : undefined
    const deepData = input.deepResearch.find((d) => d.site_code === siteCode)

    // Also check if deep research is stored in raw_data (for sites not saved to DB)
    const rawDeepResearch = rawData?.deepResearch

    if (deepData) {
      parts.push(`\n  **NPWS Conservation Profile:**`)

      if (deepData.habitats?.length > 0) {
        parts.push(`  Qualifying Interest Habitats:`)
        for (const h of deepData.habitats.slice(0, 10)) {
          parts.push(`    - [${h.habitatCode}] ${h.habitatName}${h.status ? ` (${h.status})` : ''}`)
        }
        if (deepData.habitats.length > 10) {
          parts.push(`    - ... and ${deepData.habitats.length - 10} more`)
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
        parts.push(`  Conservation Context: ${summary}`)
      }
    } else if (rawDeepResearch) {
      // Fallback to raw_data.deepResearch if not in DB
      parts.push(`\n  **NPWS Conservation Profile:**`)

      if (rawDeepResearch.aiAnalysis) {
        const summary = rawDeepResearch.aiAnalysis.substring(0, 500)
        parts.push(`  Conservation Context: ${summary}`)
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
        parts.push(`  ⚠ INVASIVE / NON-NATIVE SPECIES`)
      }
      if (assessment.relevance !== 'unassessed') {
        parts.push(`  Ecologist Priority: ${assessment.relevance.toUpperCase()}`)
      }
      if (assessment.notes) {
        parts.push(`  Ecologist Notes: "${assessment.notes}"`)
      }

      // Include Deep Research AI Analysis if available (authoritative source)
      const deepResearch = rawData?.deepResearch
      if (deepResearch?.aiAnalysis) {
        const summary = deepResearch.aiAnalysis.substring(0, 600)
        parts.push(`  **Species Conservation Profile:**`)
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
      const taxon =
        rawData?.taxonGroup || otherNbdc?.taxonGroup || otherMeta?.taxonGroup || 'Unknown'
      const sciName = rawData?.scientificName || otherMeta?.scientificName
      const recCount = rawData?.recordCount || otherMeta?.recordCount
      const designationStr = rawData?.designations?.length
        ? rawData.designations.join(', ')
        : otherNbdc?.designations || otherMeta?.designations || null
      const redList = rawData?.redListStatus
      const isInvasive = !!otherNbdc?.isInvasive

      const bits: string[] = []
      bits.push(`(${taxon})`)
      if (dist != null) bits.push(`${Number(dist).toFixed(1)}km`)
      if (recCount) bits.push(`${recCount} records`)
      if (isInvasive) bits.push('⚠ INVASIVE/NON-NATIVE')
      if (redList) bits.push(`Red List: ${redList}`)
      if (designationStr) bits.push(`Designations: ${designationStr}`)
      if (assessment.relevance !== 'unassessed') {
        bits.push(`Priority: ${assessment.relevance.toUpperCase()}`)
      }

      parts.push(`- **${species.title}**${sciName ? ` (*${sciName}*)` : ''} — ${bits.join(' · ')}`)

      // Include Deep Research AI Analysis if available for other species too
      const deepResearch = rawData?.deepResearch
      if (deepResearch?.aiAnalysis) {
        const summary = deepResearch.aiAnalysis.substring(0, 300)
        parts.push(`  Species Conservation Profile: ${summary}`)
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
    if (assessment.relevance !== 'unassessed') {
      parts.push(`- Ecologist Priority: ${assessment.relevance.toUpperCase()}`)
    }
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Find matching aquatic research
    const aquaticData = input.aquaticResearch.find((a) => a.water_body_code === waterCode)

    if (aquaticData) {
      parts.push(`\n  **EPA WFD Profile:**`)
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
        for (const t of aquaticData.trends.slice(0, 6)) {
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
        if (aquaticData.linked_sac_habitats?.length > 0) {
          parts.push(
            `  SAC Qualifying Habitats: ${aquaticData.linked_sac_habitats.map((h) => `[${h.code}] ${h.name}`).join(', ')}`
          )
        }
        if (aquaticData.linked_sac_species?.length > 0) {
          parts.push(
            `  SAC Aquatic Species: ${aquaticData.linked_sac_species.map((s) => s.commonName || s.name).join(', ')}`
          )
        }
      }

      if (aquaticData.ai_analysis) {
        const summary = aquaticData.ai_analysis.substring(0, 400)
        parts.push(`  Conservation Context: ${summary}`)
      }
    }
    parts.push('')
  }

  // === HABITAT DATA ===
  // Multi-site projects may save the same habitat polygon once per site buffer;
  // dedupe identical (fossittCode + areaHa + bufferKm) entries before handing to AI.
  const habitatFindings = input.findings.filter((f) => f.data_type === 'habitat')
  if (habitatFindings.length > 0) {
    const seen = new Map<
      string,
      {
        fossittCode: string
        title: string
        nlcLabel: string
        areaHa: string
        pct: string | number
        bufferKm: string | number
        aiSummary?: string
        notes?: string
      }
    >()

    for (const h of habitatFindings) {
      const raw = h.raw_data as Record<string, unknown> | null
      const fossittCode = String(raw?.fossittCode || '\u2014')
      const nlcLabel = String(raw?.nlcLabel || '')
      const areaHa = raw?.areaHectares != null ? Number(raw.areaHectares).toFixed(2) : '?'
      const pct = (raw?.percentCover as string | number) ?? '?'
      const bufferKm = (raw?.bufferKm as string | number) ?? '?'
      const key = `${fossittCode}|${areaHa}|${bufferKm}`

      if (!seen.has(key)) {
        seen.set(key, {
          fossittCode,
          title: h.title,
          nlcLabel,
          areaHa,
          pct,
          bufferKm,
          aiSummary: raw?.aiSummary as string | undefined,
          notes: h.notes || undefined,
        })
      }
    }

    parts.push('## HABITAT DATA (NLC 2018)')
    parts.push(`Total: ${seen.size} unique habitat types identified`)
    parts.push('')

    for (const h of seen.values()) {
      parts.push(`### [${h.fossittCode}] ${h.title}`)
      parts.push(`- NLC Label: ${h.nlcLabel}`)
      parts.push(`- Area: ${h.areaHa} ha (${h.pct}% of ${h.bufferKm} km buffer)`)
      if (h.aiSummary) {
        parts.push(`- AI Summary: ${h.aiSummary.substring(0, 400)}`)
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
  return `You are writing a desk study ecological summary for a PEA report in Ireland. Analyse the provided data and produce a comprehensive structured summary.

${context}

---

Write the summary using the following markdown headings. Each category lists every finding as a bullet point, followed by a 1–2 sentence assessment paragraph. Only include categories that have data in the context above.

## Designated Areas

- **[Site Name]** ([Site Code]) — [Type: SAC/SPA/NHA/pNHA] — [Distance] km from site. [Qualifying interests and conservation status if available from the NPWS Conservation Profile]
- [Continue for ALL designated sites from the data]

[Assessment: proximity risks, likely AA Screening determination (Required / Possibly Required / Unlikely) with brief justification, and hydrological/functional connectivity concerns]

## Habitats

- **[FOSSITT Code] [Habitat Name]** — [Area in hectares, % cover of buffer]. [Ecological sensitivity tier and survey recommendation with timing]
- [List ALL habitat types from the provided HABITAT DATA section — they have already been de-duplicated]
- [Flag any FOSSITT codes that may correspond to EU Habitats Directive Annex I habitats]

[Assessment: habitat sensitivity summary, Annex I analogues requiring verification, and priority survey windows]

## Protected & Notable Species

- **[Common Name]** (*[Scientific Name]*) — [Legal designations and Red List status exactly as given; if the context has neither, write "No statutory designation — recorded presence only"]. [Record count]. [Taxon group]
- [List species that have statutory protection (Wildlife Acts, Habitats Directive Annex II/IV, Birds Directive Annex I, BoCCI Amber/Red, FPO 2022) OR a Red List status]

[Assessment: protected species concerns and targeted survey requirements with optimal timing windows]

## Invasive / Non-Native Species

- **[Common Name]** (*[Scientific Name]*) — [Invasive listing, e.g., "S.I. 477/2011 Third Schedule", "High Risk 2013", "S.I. 374/2024"; if the context only flags "INVASIVE/NON-NATIVE" without a statute, write "Non-native — not Red List assessed"]. [Taxon group]
- [List every species marked with the ⚠ INVASIVE / NON-NATIVE flag in the context]
- [NEVER write "Conservation status: Unassessed" for invasives — they are not Red List candidates]

[Assessment: biosecurity implications, priority species for management/eradication, and pre-works invasive species survey requirements]

## Aquatic Features

- **[Water Body Name]** ([EPA Code]) — [Type]. WFD Status: [Status]. Risk: [Risk level]. [Linked SAC qualifying habitats/species if listed in the EPA WFD Profile]
- [Include status history trends and environmental failures where available]

[Assessment: surface water pathways, hydrological connectivity to European sites, and construction-phase water protection priorities]

## Document Review

- **[Document/File Name]** — [Key findings or relevant excerpts]
- [ONLY include this section if the context contains a "## COMPANY REPORTS & DOCUMENTS" section with actual uploaded files. Do NOT fabricate this section from NPWS Conservation Profiles or EPA WFD Profiles — those belong to their parent sections above]

[Assessment: how uploaded company reports inform the current assessment]

## Data Gaps & Field Survey Priorities

- [Specific desk-study gaps that require field verification — e.g., Annex I habitat confirmation, breeding bird surveys, bat roost potential, otter/badger signs, protected flora]
- [For each gap: recommended method and optimal survey window]
- [Note any data sources that were absent or returned no records where presence was expected]

---

RULES:
- Each heading starts with "## " (h2 markdown)
- Include EVERY designated site, habitat (after de-dup), protected species, invasive species, and water body from the provided data — one bullet per record
- Only include a category heading if the context actually contains data for it
- Base ALL conclusions strictly on the provided data — do not invent species, sites, habitats, or designations
- Reference site codes, FOSSITT codes, distances, and conservation designations throughout
- Never write "Conservation status: Unassessed" — that value refers to ecologist workflow state, not species biology. If no statutory designation exists, state "No statutory designation" for native species or "Non-native — not Red List assessed" for invasives
- Each bullet is concise (1–2 lines)
- Bold the primary name/title; italicise scientific names
- Use Irish English spelling throughout`
}
