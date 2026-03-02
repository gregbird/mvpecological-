import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReportSectionsForType } from '@/lib/supabase/queries/reports'
import { jsonToSections } from '@/lib/supabase/queries/templates'
import { REPORT_TYPES } from '@/lib/config/template-types'
import { getSectionPrompt, getSectionMaxTokens } from '@/lib/ai/report-section-prompts'

/**
 * AI Report Section Generator API
 * Generates individual report sections using OpenAI GPT-4o
 * with real project data from Supabase.
 * Supports all report types (PEA, EcIA, AA Screening, NIS, Bat, Bird, Habitat, etc.)
 *
 * POST /api/ai/report-section
 * Body: { projectId, sectionId, reportType, organizationId?, ecologistOpinion? }
 * Response: { sectionId, content, metadata: { model, tokensUsed, dataSources } }
 */

// Report type display names for system prompts
const REPORT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_TYPES.map((r) => [r.id, r.name])
)

function buildSystemPrompt(reportType: string): string {
  const reportName = REPORT_TYPE_LABELS[reportType] || 'ecological report'

  return `You are a senior Irish ecological consultant writing sections for a ${reportName} under CIEEM guidelines.

Expertise: Irish designated sites (SAC, SPA, NHA, pNHA), EU Habitats & Birds Directives, Water Framework Directive, Wildlife Acts 1976-2021, AA Screening, FOSSITT habitat classification, Irish Red Lists.

Rules:
- Write professionally for direct inclusion in ${reportName} reports
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
}

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

// AI section prompts are now in lib/ai/report-section-prompts.ts

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      sectionId,
      reportType = 'pea',
      organizationId,
      ecologistOpinion,
    } = await request.json()

    if (!projectId || !sectionId) {
      return NextResponse.json({ error: 'projectId and sectionId are required' }, { status: 400 })
    }

    // Get section definitions for this report type
    const reportSections = getReportSectionsForType(reportType)
    const sectionDef = reportSections.find((s) => s.id === sectionId)
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
      releveSurveysResult,
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
      supabase
        .from('releve_surveys')
        .select(
          'releve_code, habitat_type, soil_type, soil_stability, aspect, slope_degrees, releve_area_sqm, total_vegetation_cover_pct, cover_graminea_pct, cover_forbs_pct, cover_mosses_liverworts_pct, cover_trees_pct, cover_shrubs_pct, cover_litter_pct, cover_bare_soil_pct, cover_bare_rock_pct, cover_open_water_pct, max_height_trees_m, max_height_shrubs_cm, max_height_graminea_cm, max_height_forbs_cm, fauna_observations, releve_comment, id'
        )
        .eq('project_id', projectId),
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

    // Fetch releve species for all releve surveys
    const releveSurveys = (releveSurveysResult.data || []) as ReleveData[]
    const releveIds = releveSurveys.map((r) => r.id)
    let releveSpecies: ReleveSpeciesData[] = []
    if (releveIds.length > 0) {
      const { data: speciesData } = await supabase
        .from('releve_species')
        .select(
          'releve_id, species_name_latin, species_name_english, species_cover_domin, species_cover_pct'
        )
        .in('releve_id', releveIds)
        .order('species_name_latin')
      releveSpecies = (speciesData || []) as ReleveSpeciesData[]
    }

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
      releveSurveys,
      releveSpecies,
    })

    // Build section-specific prompt from centralized prompt definitions
    let sectionPrompt: string
    const promptConfig = getSectionPrompt(reportType, sectionId)
    if (promptConfig) {
      sectionPrompt = promptConfig.prompt
    } else {
      sectionPrompt = `Write the ${sectionDef.title} section. Focus on: ${sectionDef.aiPrompt}.`
    }

    // If org has a custom template, use its section content as additional guidance
    let customTemplateGuidance = ''
    if (organizationId) {
      try {
        const { data: orgTemplate } = await supabase
          .from('report_templates')
          .select('use_custom, sections')
          .eq('organization_id', organizationId)
          .eq('report_type', reportType)
          .single()

        if (orgTemplate?.use_custom && orgTemplate.sections) {
          const customSections = jsonToSections(orgTemplate.sections)
          const customSection = customSections.find((s) => s.id === sectionId)
          if (customSection?.template) {
            customTemplateGuidance = `\n\n**IMPORTANT — Organization Custom Template for this section:**\n${customSection.template}\n\nYou MUST follow this template exactly. If the template says to skip or leave this section empty, output only a brief placeholder note (e.g. "This section is not required for this report."). Structure your output to match the template's format, headings, and content requirements.`
          }
        }
      } catch {
        // Continue without custom template
      }
    }

    const reportName = REPORT_TYPE_LABELS[reportType] || 'ecological report'

    const userPrompt = `You are writing the **${sectionDef.title}** section of a ${reportName}.

${sectionPrompt}${customTemplateGuidance}

${ecologistOpinion ? `\n**Ecologist's Professional Opinion:**\n${ecologistOpinion}\n\nIncorporate this professional opinion into the section where relevant.` : ''}

---

PROJECT DATA:

${context}

---

Write the section content now. Use markdown formatting (bold, bullet points, tables where appropriate). Do not include the section title as a heading — it will be added separately.`

    const maxTokens = getSectionMaxTokens(reportType, sectionId)

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildSystemPrompt(reportType) },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
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
    if (releveSurveys.length > 0) dataSources.push('releve_surveys')

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

interface ReleveData {
  id: string
  releve_code: string
  habitat_type: string | null
  soil_type: string | null
  soil_stability: string | null
  aspect: string | null
  slope_degrees: number | null
  releve_area_sqm: number | null
  total_vegetation_cover_pct: number | null
  cover_graminea_pct: number | null
  cover_forbs_pct: number | null
  cover_mosses_liverworts_pct: number | null
  cover_trees_pct: number | null
  cover_shrubs_pct: number | null
  cover_litter_pct: number | null
  cover_bare_soil_pct: number | null
  cover_bare_rock_pct: number | null
  cover_open_water_pct: number | null
  max_height_trees_m: number | null
  max_height_shrubs_cm: number | null
  max_height_graminea_cm: number | null
  max_height_forbs_cm: number | null
  fauna_observations: string | null
  releve_comment: string | null
}

interface ReleveSpeciesData {
  releve_id: string
  species_name_latin: string
  species_name_english: string | null
  species_cover_domin: number | null
  species_cover_pct: number | null
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
  releveSurveys: ReleveData[]
  releveSpecies: ReleveSpeciesData[]
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

        // Include custom template field data
        const templateFields = weather.templateFields as Record<string, unknown> | undefined
        if (templateFields && typeof templateFields === 'object') {
          const fieldParts = Object.entries(templateFields)
            .filter(([, v]) => v != null && v !== '' && v !== false)
            .map(([k, v]) => {
              const label = k
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/^\w/, (c) => c.toUpperCase())
              return `${label}: ${Array.isArray(v) ? v.join(', ') : v}`
            })
          if (fieldParts.length > 0) {
            parts.push(`  Survey data: ${fieldParts.join('; ')}`)
          }
        }
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

  // 4b. Relevé vegetation surveys
  if (input.releveSurveys.length > 0) {
    parts.push('# RELEVÉ VEGETATION SURVEYS')
    parts.push(`Total relevés: ${input.releveSurveys.length}`)
    for (const r of input.releveSurveys) {
      parts.push(`\n## Relevé ${r.releve_code}${r.habitat_type ? ` — ${r.habitat_type}` : ''}`)
      const siteParts: string[] = []
      if (r.releve_area_sqm != null) siteParts.push(`Area: ${r.releve_area_sqm} sqm`)
      if (r.soil_type) siteParts.push(`Soil: ${r.soil_type}`)
      if (r.soil_stability) siteParts.push(`Stability: ${r.soil_stability}`)
      if (r.slope_degrees != null) siteParts.push(`Slope: ${r.slope_degrees}°`)
      if (r.aspect) siteParts.push(`Aspect: ${r.aspect}`)
      if (siteParts.length > 0) parts.push(siteParts.join(' | '))

      const coverParts: string[] = []
      if (r.total_vegetation_cover_pct != null)
        coverParts.push(`Total vegetation: ${r.total_vegetation_cover_pct}%`)
      if (r.cover_graminea_pct != null) coverParts.push(`Graminea: ${r.cover_graminea_pct}%`)
      if (r.cover_forbs_pct != null) coverParts.push(`Forbs: ${r.cover_forbs_pct}%`)
      if (r.cover_mosses_liverworts_pct != null)
        coverParts.push(`Mosses: ${r.cover_mosses_liverworts_pct}%`)
      if (r.cover_trees_pct != null) coverParts.push(`Trees: ${r.cover_trees_pct}%`)
      if (r.cover_shrubs_pct != null) coverParts.push(`Shrubs: ${r.cover_shrubs_pct}%`)
      if (r.cover_bare_soil_pct != null) coverParts.push(`Bare soil: ${r.cover_bare_soil_pct}%`)
      if (r.cover_bare_rock_pct != null) coverParts.push(`Bare rock: ${r.cover_bare_rock_pct}%`)
      if (r.cover_litter_pct != null) coverParts.push(`Litter: ${r.cover_litter_pct}%`)
      if (r.cover_open_water_pct != null) coverParts.push(`Open water: ${r.cover_open_water_pct}%`)
      if (coverParts.length > 0) parts.push(`Cover: ${coverParts.join(', ')}`)

      const heightParts: string[] = []
      if (r.max_height_trees_m != null) heightParts.push(`Trees: ${r.max_height_trees_m}m`)
      if (r.max_height_shrubs_cm != null) heightParts.push(`Shrubs: ${r.max_height_shrubs_cm}cm`)
      if (r.max_height_graminea_cm != null)
        heightParts.push(`Graminea: ${r.max_height_graminea_cm}cm`)
      if (r.max_height_forbs_cm != null) heightParts.push(`Forbs: ${r.max_height_forbs_cm}cm`)
      if (heightParts.length > 0) parts.push(`Max heights: ${heightParts.join(', ')}`)

      if (r.fauna_observations) parts.push(`Fauna: ${r.fauna_observations}`)
      if (r.releve_comment) parts.push(`Comment: ${r.releve_comment}`)

      // Species for this releve
      const species = input.releveSpecies.filter((s) => s.releve_id === r.id)
      if (species.length > 0) {
        parts.push(`Species (${species.length} recorded):`)
        for (const sp of species) {
          const spParts: string[] = []
          if (sp.species_name_english) spParts.push(sp.species_name_english)
          if (sp.species_cover_domin != null) spParts.push(`DOMIN ${sp.species_cover_domin}`)
          if (sp.species_cover_pct != null) spParts.push(`${sp.species_cover_pct}%`)
          parts.push(
            `- ${sp.species_name_latin}${spParts.length > 0 ? ` (${spParts.join(', ')})` : ''}`
          )
        }
      }
    }
    parts.push('')
  }

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
