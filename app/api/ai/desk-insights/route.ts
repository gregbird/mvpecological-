import { NextRequest, NextResponse } from 'next/server'
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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Irish ecological consultant preparing a desk study assessment for a Preliminary Ecological Appraisal (PEA). You have deep knowledge of:
- Irish designated sites (SAC, SPA, NHA, pNHA) and their conservation objectives
- EU Habitats Directive and Birds Directive requirements
- Water Framework Directive (WFD) and freshwater ecology
- Protected species under Irish Wildlife Acts
- Appropriate Assessment (AA) screening requirements
- CIEEM guidelines for ecological assessment

Your analysis should be:
- Professional and suitable for inclusion in ecological reports
- Based ONLY on the data provided - do not speculate
- Clear about data gaps and uncertainties
- Actionable with specific field survey recommendations
- Compliant with Irish and EU environmental legislation`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
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
    (f) => f.data_type === 'species_record' && (f.is_protected || (f.raw_data as any)?.isProtected)
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
  const aquaticFeatures = input.findings.filter((f) => f.data_type === 'water_quality')

  // === DESIGNATED SITES ===
  parts.push('## DESIGNATED SITES')
  parts.push(`Total: ${designatedSites.length} sites identified`)
  parts.push('')

  for (const site of designatedSites) {
    const assessment = parseAssessment(site.notes)
    const rawData = site.raw_data as any

    parts.push(`### ${site.title}`)
    parts.push(`- Source: ${site.source.toUpperCase()}`)
    parts.push(`- Site Type: ${rawData?.siteType || rawData?.SITETYPE || 'Unknown'}`)
    parts.push(`- Site Code: ${rawData?.siteCode || rawData?.SITECODE || 'N/A'}`)
    if (site.distance_from_boundary_km != null) {
      parts.push(`- Distance from site: ${site.distance_from_boundary_km.toFixed(2)} km`)
    }
    parts.push(`- Assessment Relevance: ${assessment.relevance.toUpperCase()}`)
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Find matching deep research - first check database, then raw_data
    const siteCode = rawData?.siteCode || rawData?.SITECODE
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
    (s) => s.is_protected || (s.raw_data as any)?.isProtected
  )
  const otherSpecies = speciesRecords.filter(
    (s) => !s.is_protected && !(s.raw_data as any)?.isProtected
  )

  if (protectedSpecies.length > 0) {
    parts.push('### Protected Species (Wildlife Acts / Habitats Directive)')
    for (const species of protectedSpecies) {
      const assessment = parseAssessment(species.notes)
      const rawData = species.raw_data as any

      parts.push(`- **${species.title}**`)
      parts.push(`  Scientific name: ${rawData?.scientificName || 'N/A'}`)
      parts.push(`  Taxon group: ${rawData?.taxonGroup || 'Unknown'}`)
      if (species.distance_from_boundary_km != null) {
        parts.push(`  Distance from site: ${species.distance_from_boundary_km.toFixed(2)} km`)
      }
      if (rawData?.redListStatus) {
        parts.push(`  Red List Status: ${rawData.redListStatus}`)
      }
      if (rawData?.designations?.length) {
        parts.push(`  Designations: ${rawData.designations.join(', ')}`)
      }
      if (rawData?.recordCount) {
        parts.push(`  Historical records: ${rawData.recordCount}`)
      }
      parts.push(`  Assessment: ${assessment.relevance.toUpperCase()}`)
      if (assessment.notes) {
        parts.push(`  Ecologist Notes: "${assessment.notes}"`)
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
    for (const species of otherSpecies.slice(0, 10)) {
      const assessment = parseAssessment(species.notes)
      const rawData = species.raw_data as any
      const distance =
        species.distance_from_boundary_km != null
          ? ` - ${species.distance_from_boundary_km.toFixed(1)}km`
          : ''
      parts.push(
        `- ${species.title} (${rawData?.taxonGroup || 'Unknown'})${distance} - ${assessment.relevance}`
      )

      // Include Deep Research AI Analysis if available for other species too
      const deepResearch = rawData?.deepResearch
      if (deepResearch?.aiAnalysis) {
        const summary = deepResearch.aiAnalysis.substring(0, 300)
        parts.push(`  Deep Research: ${summary}...`)
      }
    }
    if (otherSpecies.length > 10) {
      parts.push(`- ... and ${otherSpecies.length - 10} more species`)
    }
    parts.push('')
  }

  // === AQUATIC FEATURES ===
  parts.push('## AQUATIC FEATURES')
  parts.push(`Total: ${aquaticFeatures.length} water bodies identified`)
  parts.push('')

  for (const feature of aquaticFeatures) {
    const assessment = parseAssessment(feature.notes)
    const rawData = feature.raw_data as any

    parts.push(`### ${feature.title}`)
    parts.push(`- Type: ${rawData?.waterBodyType || 'Unknown'}`)
    parts.push(
      `- EPA Code: ${rawData?.waterBodyCode || rawData?.RiverCode || rawData?.LakeCode || 'N/A'}`
    )
    if (rawData?.wfdStatus) {
      parts.push(`- WFD Status: ${rawData.wfdStatus}`)
    }
    if (feature.distance_from_boundary_km != null) {
      parts.push(`- Distance: ${feature.distance_from_boundary_km.toFixed(2)} km`)
    }
    parts.push(`- Assessment: ${assessment.relevance.toUpperCase()}`)
    if (assessment.notes) {
      parts.push(`- Ecologist Notes: "${assessment.notes}"`)
    }

    // Find matching aquatic research
    const waterCode = rawData?.waterBodyCode || rawData?.RiverCode || rawData?.LakeCode
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

  return parts.join('\n')
}

function buildPrompt(context: string): string {
  return `Based on the following comprehensive desk study data for an ecological assessment project in Ireland, provide a detailed Ecological Summary suitable for a Preliminary Ecological Appraisal (PEA) report.

${context}

---

Provide your analysis in the following structured format (Greg's 4-Category Structure):

## Ecological Summary

### 🌿 Habitats

[For each habitat identified, provide:
- **[FOSSITT Code] - [Habitat Name]:** Description and condition
- Area coverage if known
- Ecological significance
- Any notable features

Example format:
- **GA1 - Improved Agricultural Grassland:** Dominant habitat type, covers 60% of site. Poor condition due to intensive grazing.
- **WL1 - Hedgerows:** Linear habitat along northern boundary. Good condition, species-rich with Hawthorn and Blackthorn.]

### 🦎 Species

**Birds:**
[List key bird species with:
- Common name (Scientific name)
- Number of records and distance from site
- Conservation status (Annex I, Red/Amber listed, etc.)
- Breeding/wintering status if known]

**Mammals:**
[List mammal species with:
- Common name (Scientific name)
- Likelihood of presence based on habitat
- Legal protection (Annex II/IV, Wildlife Acts)
- Survey recommendations]

**Flora:**
[List any notable or protected plant species, or state "No protected flora recorded"]

**Other Taxa:**
[Include amphibians, reptiles, invertebrates if relevant]

### 💧 Aquatic Features

[For each water body:
- **[Water Body Name]:** Type (River/Lake/Stream)
- WFD Status and Risk Level
- Key pressures identified
- Downstream connectivity (especially to designated sites)
- Associated aquatic species of conservation concern]

### 🏛️ Designated Areas

[Create a table format:]

| Site | Code | Type | Distance | Qualifying Interests |
|------|------|------|----------|---------------------|
[List all designated sites with their key qualifying interests]

---

## Key Ecological Constraints

[Bulleted list of the main constraints identified, ranked by importance. Be specific about:
- Which findings drive each constraint
- Implications for project design
- Regulatory requirements triggered]

## Recommended Field Surveys

### Essential Surveys
[Surveys that MUST be completed based on the evidence - be specific about species/habitats]

### Recommended Surveys
[Surveys that are advisable based on habitat suitability]

### Optimal Survey Timing

| Survey Type | Optimal Months | Constraints |
|-------------|----------------|-------------|
[List each survey type with optimal timing]

## Data Gaps and Limitations

[What information is missing that should be addressed through field survey or further desk study]

---

IMPORTANT:
- Base all conclusions on the data provided - do not speculate
- Be specific about which findings drive each recommendation
- Use the ecologist's assessment notes to understand site-specific priorities
- Reference the deep research and WFD data where available
- Format should be clear and easily digestible for report writing`
}
