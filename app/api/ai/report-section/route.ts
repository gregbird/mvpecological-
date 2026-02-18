import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PEA_REPORT_SECTIONS } from '@/lib/supabase/queries/reports'

/**
 * AI Report Section Generator API
 * Generates individual PEA report sections using OpenAI GPT-4o
 * with real project data from Supabase.
 *
 * POST /api/ai/report-section
 * Body: { projectId, sectionId, reportType, ecologistOpinion? }
 * Response: { sectionId, content, metadata: { model, tokensUsed, dataSources } }
 */

const SYSTEM_PROMPT = `You are a senior Irish ecological consultant writing sections for a Preliminary Ecological Appraisal (PEA) report under CIEEM guidelines.

Expertise: Irish designated sites (SAC, SPA, NHA, pNHA), EU Habitats & Birds Directives, Water Framework Directive, Wildlife Acts 1976-2021, AA Screening, FOSSITT habitat classification, Irish Red Lists.

Rules:
- Write professionally for direct inclusion in PEA reports
- Base ALL conclusions strictly on the provided data — never speculate or invent species/sites/counts
- Use Irish English spelling (colour, behaviour, metre)
- Reference Fossitt (2000) habitat classification where applicable
- Reference relevant Irish wildlife legislation and EU Directives
- Clearly identify data gaps and recommend further work where needed
- Structure content with clear paragraphs using markdown formatting (bold, bullet points)
- Be precise and evidence-based
- Include caveats where data is limited

Do NOT:
- Make up specific survey data or counts that weren't provided
- Include personal opinions without scientific basis
- Use informal language or colloquialisms
- Repeat information verbatim from the data — synthesise and interpret`

interface ProjectData {
  name: string
  site_code: string | null
  grid_reference: string | null
  county: string | null
  townland: string | null
  province: string | null
}

interface HabitatData {
  fossitt_code: string
  fossitt_name: string
  area_hectares: number | null
  condition: string | null
  notes: string | null
  threats: string | null
  eu_annex_code: string | null
  evaluation: string | null
  listed_species: string | null
}

interface ObservationData {
  species_name_scientific: string
  species_name_common: string | null
  taxon_group: string | null
  count: number | null
  abundance_dafor: string | null
  evidence_type: string | null
  is_protected: boolean
  confidence_level: string
  behavior_notes: string | null
}

interface FindingData {
  title: string
  source: string
  data_type: string
  raw_data: Record<string, unknown> | null
  distance_from_boundary_km: number | null
  is_protected: boolean | null
  notes: string | null
}

interface SurveyData {
  survey_date: string
  survey_type: string
  weather: Record<string, unknown> | null
  status: string
  notes: string | null
  start_time: string | null
  end_time: string | null
}

interface TargetNoteData {
  category: string
  title: string
  description: string | null
  priority: string | null
  is_verified: boolean | null
}

interface DeepResearchData {
  site_code: string
  site_name: string
  site_type: string
  habitats: unknown
  conservation_summary: unknown
  threats_pressures: unknown
  ai_analysis: string | null
}

interface AquaticResearchData {
  water_body_code: string
  water_body_name: string
  water_body_type: string
  current_status: string | null
  risk_level: string | null
  status_history: unknown
  trends: unknown
  failures: unknown
  linked_sac_code: string | null
  linked_sac_name: string | null
  ai_analysis: string | null
}

// Section-specific prompt instructions
const SECTION_PROMPTS: Record<string, string> = {
  introduction: `Write the Introduction section (~300-400 words). Include:
1. Project background and purpose of the PEA
2. Site location using the provided grid reference, county, and townland
3. Scope of the ecological assessment
4. Brief overview of relevant legislation (Wildlife Acts 1976-2021, EU Habitats & Birds Directives, European Communities Regulations 2011)
5. Report structure overview`,

  methodology: `Write the Methodology section (~400-500 words). Include:
1. **Desk Study** — list all data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with specific counts of findings retrieved
2. **Field Survey** — describe survey types conducted, dates, methods used, weather conditions, and surveyor effort (start/end times)
3. **Habitat Mapping** — reference Fossitt (2000) classification, survey methods used
4. **Limitations** — any constraints on the assessment (seasonal, access, weather)
Reference standard survey guidelines (CIEEM, NRA, Bat Conservation Ireland) where appropriate.`,

  results_sites: `Write the Designated Sites results section (~300-500 words). Include:
1. Summary table of all designated sites (SACs, SPAs, NHAs, pNHAs) with distances
2. For each site within 2km, describe qualifying interests and conservation status
3. Assess potential connectivity between the project site and designated areas
4. Reference deep research data for conservation summaries and threats where available
5. Note any sites requiring AA Screening consideration`,

  results_habitats: `Write the Habitats results section (~400-600 words). Include:
1. Summary of all habitat types recorded using Fossitt codes
2. Description of each habitat: area, condition, notable features
3. Identify any habitats corresponding to EU Habitats Directive Annex I types
4. Note habitat connectivity and ecological corridors
5. Reference any threats identified during surveys
6. Include any relevant evaluation notes`,

  results_fauna: `Write the Fauna results section (~400-600 words). Include:
1. Summary of all fauna observations by taxon group
2. Highlight protected species with specific legislation references
3. Include abundance (DAFOR), evidence type, and confidence level where available
4. Reference behavioural notes where relevant
5. Assess ecological importance of species assemblages
6. Cross-reference with desk study species records`,

  results_flora: `Write the Flora results section (~200-400 words). Include:
1. Plant species recorded during field surveys
2. Notable or indicator species
3. Reference DAFOR abundance scores where available
4. Link flora to habitat descriptions
5. Note any Flora Protection Order species if present`,

  results_invasive: `Write the Invasive Species results section (~200-300 words). Include:
1. Any invasive species observed during field surveys or recorded in desk study
2. Reference the Third Schedule of European Communities (Birds and Natural Habitats) Regulations 2011
3. If no invasive species found, state this clearly but note habitats with potential for colonisation
4. Recommend biosecurity measures where appropriate`,

  evaluation: `Write the Ecological Evaluation section (~400-500 words). Include:
1. Assess ecological value using standard criteria: naturalness, rarity, size/extent, diversity, fragility, typicalness, recorded history, position in ecological unit, potential value
2. Apply geographic frame of reference for each receptor (local, county, national, international)
3. Incorporate the ecologist's professional opinion where provided
4. Summarise key ecological receptors and their sensitivity
5. Reference the Zone of Influence concept`,

  discussion: `Write the Discussion section (~400-500 words). Include:
1. Synthesis of key ecological findings from desk study and field surveys
2. Discuss potential impacts on identified ecological receptors
3. Consider cumulative and in-combination effects
4. Reference the precautionary principle where uncertainty exists
5. Incorporate the ecologist's professional opinion where provided
6. Identify any triggers for Appropriate Assessment Screening`,

  recommendations: `Write the Recommendations section (~300-400 words). Include:
1. **Further Surveys** — specify what surveys are needed, target species/habitats, optimal timing
2. **Mitigation Measures** — follow the mitigation hierarchy (avoid, minimise, remediate, compensate)
3. **Enhancement Opportunities** — biodiversity net gain measures
4. **Monitoring** — ongoing monitoring requirements
5. **Timing Constraints** — seasonal restrictions for works
Be specific and actionable.`,

  appendices: `Write the Appendices section (~100-200 words). List the appendices that should accompany this report:
- Appendix A: Site Location Map
- Appendix B: Habitat Map (reference FOSSITT codes mapped)
- Appendix C: Species List (reference observation counts)
- Appendix D: Site Photographs
- Appendix E: Survey Datasheets
Add brief descriptions of what each appendix contains based on the available data.`,
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, sectionId, reportType: _reportType, ecologistOpinion } = await request.json()

    if (!projectId || !sectionId) {
      return NextResponse.json({ error: 'projectId and sectionId are required' }, { status: 400 })
    }

    const sectionDef = PEA_REPORT_SECTIONS.find((s) => s.id === sectionId)
    if (!sectionDef) {
      return NextResponse.json({ error: `Unknown section: ${sectionId}` }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Fetch all project data in parallel
    const [
      projectResult,
      habitatsResult,
      observationsResult,
      findingsResult,
      surveysResult,
      targetNotesResult,
      deepResearchResult,
      aquaticResearchResult,
      workflowResult,
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('name, site_code, grid_reference, county, townland, province')
        .eq('id', projectId)
        .single(),
      supabase
        .from('habitat_polygons')
        .select(
          'fossitt_code, fossitt_name, area_hectares, condition, notes, threats, eu_annex_code, evaluation, listed_species'
        )
        .eq('project_id', projectId)
        .eq('include_in_report', true),
      supabase
        .from('species_observations')
        .select(
          'species_name_scientific, species_name_common, taxon_group, count, abundance_dafor, evidence_type, is_protected, confidence_level, behavior_notes, survey_id'
        )
        .in(
          'survey_id',
          (await supabase.from('surveys').select('id').eq('project_id', projectId)).data?.map(
            (s) => s.id
          ) || []
        )
        .eq('include_in_report', true),
      supabase
        .from('desk_research_findings')
        .select(
          'title, source, data_type, raw_data, distance_from_boundary_km, is_protected, notes'
        )
        .eq('project_id', projectId)
        .eq('is_saved', true)
        .eq('include_in_report', true),
      supabase
        .from('surveys')
        .select('survey_date, survey_type, weather, status, notes, start_time, end_time')
        .eq('project_id', projectId),
      supabase
        .from('target_notes')
        .select('category, title, description, priority, is_verified')
        .eq('project_id', projectId)
        .eq('include_in_report', true),
      supabase
        .from('deep_research_results')
        .select(
          'site_code, site_name, site_type, habitats, conservation_summary, threats_pressures, ai_analysis'
        )
        .eq('project_id', projectId),
      supabase
        .from('aquatic_research_results')
        .select(
          'water_body_code, water_body_name, water_body_type, current_status, risk_level, status_history, trends, failures, linked_sac_code, linked_sac_name, ai_analysis'
        )
        .eq('project_id', projectId),
      supabase
        .from('workflow_steps')
        .select('metadata')
        .eq('project_id', projectId)
        .eq('step_number', 3)
        .single(),
    ])

    if (projectResult.error) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = projectResult.data as ProjectData
    const habitats = (habitatsResult.data || []) as HabitatData[]
    const observations = (observationsResult.data || []) as ObservationData[]
    const findings = (findingsResult.data || []) as FindingData[]
    const surveys = (surveysResult.data || []) as SurveyData[]
    const targetNotes = (targetNotesResult.data || []) as TargetNoteData[]
    const deepResearch = (deepResearchResult.data || []) as unknown as DeepResearchData[]
    const aquaticResearch = (aquaticResearchResult.data || []) as unknown as AquaticResearchData[]
    const deskInsights = (workflowResult.data?.metadata as Record<string, unknown>)?.aiInsights as
      | string
      | undefined

    // Build context
    const context = buildReportContext({
      project,
      habitats,
      observations,
      findings,
      surveys,
      targetNotes,
      deepResearch,
      aquaticResearch,
      deskInsights,
    })

    // Build section-specific prompt
    const sectionPrompt = SECTION_PROMPTS[sectionId] || `Write the ${sectionDef.title} section.`

    const userPrompt = `You are writing the **${sectionDef.title}** section of a PEA report.

${sectionPrompt}

${ecologistOpinion ? `\n**Ecologist's Professional Opinion:**\n${ecologistOpinion}\n\nIncorporate this professional opinion into the section where relevant.` : ''}

---

PROJECT DATA:

${context}

---

Write the section content now. Use markdown formatting (bold, bullet points, tables where appropriate). Do not include the section title as a heading — it will be added separately.`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
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
    const content = data.choices[0]?.message?.content?.trim() || ''
    const tokensUsed = data.usage?.total_tokens || 0

    // Track which data sources contributed
    const dataSources: string[] = []
    if (findings.length > 0) dataSources.push('desk_research_findings')
    if (habitats.length > 0) dataSources.push('habitat_polygons')
    if (observations.length > 0) dataSources.push('species_observations')
    if (surveys.length > 0) dataSources.push('surveys')
    if (targetNotes.length > 0) dataSources.push('target_notes')
    if (deepResearch.length > 0) dataSources.push('deep_research_results')
    if (aquaticResearch.length > 0) dataSources.push('aquatic_research_results')
    if (deskInsights) dataSources.push('desk_insights')

    return NextResponse.json({
      sectionId,
      content,
      metadata: {
        model: 'gpt-4o',
        tokensUsed,
        dataSources,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Report section generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report section' },
      { status: 500 }
    )
  }
}

interface ReportContextInput {
  project: ProjectData
  habitats: HabitatData[]
  observations: ObservationData[]
  findings: FindingData[]
  surveys: SurveyData[]
  targetNotes: TargetNoteData[]
  deepResearch: DeepResearchData[]
  aquaticResearch: AquaticResearchData[]
  deskInsights?: string
}

function buildReportContext(input: ReportContextInput): string {
  const parts: string[] = []

  // 1. Project info
  const p = input.project
  parts.push('# PROJECT INFORMATION')
  parts.push(`Project Name: ${p.name}`)
  if (p.site_code) parts.push(`Site Code: ${p.site_code}`)
  if (p.grid_reference) parts.push(`Grid Reference: ${p.grid_reference}`)
  if (p.county) parts.push(`County: ${p.county}`)
  if (p.townland) parts.push(`Townland: ${p.townland}`)
  if (p.province) parts.push(`Province: ${p.province}`)
  parts.push('')

  // 2. Surveys
  parts.push('# FIELD SURVEYS')
  if (input.surveys.length > 0) {
    parts.push(`Total surveys: ${input.surveys.length}`)
    for (const s of input.surveys) {
      const weather = s.weather as Record<string, unknown> | null
      parts.push(`- ${s.survey_type} survey on ${s.survey_date} (${s.status})`)
      if (s.start_time && s.end_time) {
        parts.push(`  Time: ${s.start_time} to ${s.end_time}`)
      }
      if (weather) {
        const weatherParts: string[] = []
        if (weather.temperature != null) weatherParts.push(`${weather.temperature}°C`)
        if (weather.windSpeed != null) weatherParts.push(`wind ${weather.windSpeed} km/h`)
        if (weather.cloudCover != null) weatherParts.push(`cloud ${weather.cloudCover}%`)
        if (weather.precipitation) weatherParts.push(`${weather.precipitation}`)
        if (weatherParts.length > 0) parts.push(`  Weather: ${weatherParts.join(', ')}`)
      }
      if (s.notes) parts.push(`  Notes: ${s.notes}`)
    }
  } else {
    parts.push('No field surveys recorded.')
  }
  parts.push('')

  // 3. Habitats
  parts.push('# HABITATS')
  if (input.habitats.length > 0) {
    const totalArea = input.habitats.reduce((sum, h) => sum + (h.area_hectares || 0), 0)
    parts.push(`Total habitat types: ${input.habitats.length}`)
    parts.push(`Total area: ${totalArea.toFixed(2)} hectares`)
    parts.push('')
    for (const h of input.habitats) {
      parts.push(`## ${h.fossitt_code} — ${h.fossitt_name}`)
      if (h.area_hectares) parts.push(`Area: ${h.area_hectares.toFixed(2)} ha`)
      if (h.condition) parts.push(`Condition: ${h.condition}`)
      if (h.eu_annex_code) parts.push(`EU Annex I: ${h.eu_annex_code}`)
      if (h.evaluation) parts.push(`Evaluation: ${h.evaluation}`)
      if (h.threats) parts.push(`Threats: ${h.threats}`)
      if (h.listed_species) parts.push(`Listed species: ${h.listed_species}`)
      if (h.notes) parts.push(`Notes: ${h.notes}`)
      parts.push('')
    }
  } else {
    parts.push('No habitat polygons mapped.')
  }
  parts.push('')

  // 4. Species observations
  parts.push('# SPECIES OBSERVATIONS')
  if (input.observations.length > 0) {
    const protectedObs = input.observations.filter((o) => o.is_protected)
    parts.push(`Total observations: ${input.observations.length}`)
    parts.push(`Protected species: ${protectedObs.length}`)

    // Group by taxon
    const byTaxon: Record<string, ObservationData[]> = {}
    for (const obs of input.observations) {
      const group = obs.taxon_group || 'Unknown'
      if (!byTaxon[group]) byTaxon[group] = []
      byTaxon[group].push(obs)
    }

    for (const [taxon, obs] of Object.entries(byTaxon)) {
      parts.push(`\n## ${taxon} (${obs.length} records)`)
      for (const o of obs) {
        const details: string[] = []
        if (o.species_name_common) details.push(o.species_name_common)
        if (o.count != null) details.push(`count: ${o.count}`)
        if (o.abundance_dafor) details.push(`DAFOR: ${o.abundance_dafor}`)
        if (o.evidence_type) details.push(`evidence: ${o.evidence_type}`)
        if (o.is_protected) details.push('PROTECTED')
        if (o.confidence_level) details.push(`confidence: ${o.confidence_level}`)
        parts.push(
          `- ${o.species_name_scientific}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
        )
        if (o.behavior_notes) parts.push(`  Behaviour: ${o.behavior_notes}`)
      }
    }
  } else {
    parts.push('No species observations recorded.')
  }
  parts.push('')

  // 5. Desk research findings
  parts.push('# DESK RESEARCH FINDINGS')
  if (input.findings.length > 0) {
    const byType: Record<string, FindingData[]> = {}
    for (const f of input.findings) {
      if (!byType[f.data_type]) byType[f.data_type] = []
      byType[f.data_type].push(f)
    }

    for (const [type, items] of Object.entries(byType)) {
      parts.push(`\n## ${type.replace('_', ' ').toUpperCase()} (${items.length} records)`)
      for (const f of items) {
        parts.push(`- **${f.title}** [${f.source.toUpperCase()}]`)
        if (f.distance_from_boundary_km != null) {
          parts.push(`  Distance: ${f.distance_from_boundary_km.toFixed(2)} km`)
        }
        if (f.is_protected) parts.push(`  Protected: Yes`)
        if (f.notes) {
          // Parse assessment notes
          try {
            const parsed = JSON.parse(f.notes)
            if (parsed.relevance) parts.push(`  Relevance: ${parsed.relevance}`)
            if (parsed.notes) parts.push(`  Ecologist notes: ${parsed.notes}`)
          } catch {
            parts.push(`  Notes: ${f.notes}`)
          }
        }
      }
    }
  } else {
    parts.push('No desk research findings saved.')
  }
  parts.push('')

  // 6. Target notes
  parts.push('# TARGET NOTES')
  if (input.targetNotes.length > 0) {
    parts.push(`Total: ${input.targetNotes.length}`)
    for (const tn of input.targetNotes) {
      parts.push(
        `- [${tn.category}] ${tn.title}${tn.priority ? ` (Priority: ${tn.priority})` : ''}${tn.is_verified ? ' [Verified]' : ''}`
      )
      if (tn.description) parts.push(`  ${tn.description}`)
    }
  } else {
    parts.push('No target notes recorded.')
  }
  parts.push('')

  // 7. Deep research (designated sites)
  if (input.deepResearch.length > 0) {
    parts.push('# DEEP RESEARCH — DESIGNATED SITES')
    for (const dr of input.deepResearch) {
      parts.push(`\n## ${dr.site_name} (${dr.site_code}) — ${dr.site_type}`)
      const habitats = dr.habitats as Array<{
        habitatCode: string
        habitatName: string
        status?: string
      }> | null
      if (habitats && Array.isArray(habitats) && habitats.length > 0) {
        parts.push('Qualifying Interest Habitats:')
        for (const h of habitats.slice(0, 8)) {
          parts.push(`  - [${h.habitatCode}] ${h.habitatName}${h.status ? ` (${h.status})` : ''}`)
        }
      }
      const cs = dr.conservation_summary as Record<string, number> | null
      if (cs && cs.total) {
        parts.push(
          `Conservation: ${cs.favourable || 0} favourable, ${cs.unfavourableInadequate || 0} inadequate, ${cs.unfavourableBad || 0} bad`
        )
      }
      const tp = dr.threats_pressures as {
        pressures?: string[]
        threats?: string[]
      } | null
      if (tp) {
        if (tp.pressures?.length) parts.push(`Pressures: ${tp.pressures.join(', ')}`)
        if (tp.threats?.length) parts.push(`Threats: ${tp.threats.join(', ')}`)
      }
      if (dr.ai_analysis) {
        parts.push(`AI Analysis: ${dr.ai_analysis.substring(0, 600)}`)
      }
    }
    parts.push('')
  }

  // 8. Aquatic research
  if (input.aquaticResearch.length > 0) {
    parts.push('# AQUATIC RESEARCH')
    for (const ar of input.aquaticResearch) {
      parts.push(`\n## ${ar.water_body_name} (${ar.water_body_code}) — ${ar.water_body_type}`)
      if (ar.current_status) parts.push(`WFD Status: ${ar.current_status}`)
      if (ar.risk_level) parts.push(`Risk: ${ar.risk_level}`)

      const trends = ar.trends as Array<{
        ParameterName: string
        TrendDesc: string
      }> | null
      if (trends && Array.isArray(trends) && trends.length > 0) {
        parts.push('Trends:')
        for (const t of trends.slice(0, 5)) {
          parts.push(`  - ${t.ParameterName}: ${t.TrendDesc}`)
        }
      }

      const failures = ar.failures as Array<{ Name: string }> | null
      if (failures && Array.isArray(failures) && failures.length > 0) {
        parts.push(`Failures: ${failures.map((f) => f.Name).join(', ')}`)
      }

      if (ar.linked_sac_name) {
        parts.push(`Linked SAC: ${ar.linked_sac_name} (${ar.linked_sac_code})`)
      }
      if (ar.ai_analysis) {
        parts.push(`AI Analysis: ${ar.ai_analysis.substring(0, 400)}`)
      }
    }
    parts.push('')
  }

  // 9. Desk insights (Step 3 AI analysis)
  if (input.deskInsights) {
    parts.push('# DESK ASSESSMENT AI INSIGHTS (from Step 3)')
    parts.push(input.deskInsights.substring(0, 2000))
    parts.push('')
  }

  return parts.join('\n')
}
