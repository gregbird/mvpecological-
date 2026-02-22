import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Dulra Agent Chat API
 * AI assistant that answers questions about project ecological data.
 *
 * POST /api/ai/dulra-agent
 * Body: { projectId, message, chatHistory: [{role, content}] }
 * Response: { reply, metadata: { model, tokensUsed } }
 */

const SYSTEM_PROMPT = `You are Dulra Agent, an AI assistant for the Dulra ecological consultancy platform. You help Irish ecologists understand their project data by answering questions about designated sites, habitats, species, field surveys, and ecological constraints.

Rules:
- Base ALL answers strictly on the provided project data — never speculate or invent information
- Use Irish English spelling (colour, behaviour, metre)
- Reference specific data points (site codes, distances, species names, FOSSITT codes) when answering
- If the data doesn't contain enough information to answer, say so clearly
- Be concise but thorough — cite numbers and specifics
- Format responses with markdown (bold, bullet points, tables) for readability
- When discussing designated sites, always mention distance from site boundary
- When discussing species, note protection status and legislation where relevant

Do NOT:
- Make up data that wasn't provided
- Give generic ecological advice unrelated to the project data
- Include disclaimers about being an AI in every response`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, message, chatHistory } = (await request.json()) as {
      projectId: string
      message: string
      chatHistory: ChatMessage[]
    }

    if (!projectId || !message) {
      return NextResponse.json({ error: 'projectId and message are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 })
    }

    const supabase = await createClient()

    // Fetch all project data in parallel
    const [
      projectResult,
      habitatsResult,
      findingsResult,
      surveysResult,
      targetNotesResult,
      deepResearchResult,
      aquaticResearchResult,
      observationsResult,
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
        .eq('project_id', projectId),
      supabase
        .from('desk_research_findings')
        .select(
          'title, source, data_type, raw_data, distance_from_boundary_km, is_protected, notes'
        )
        .eq('project_id', projectId)
        .eq('is_saved', true),
      supabase
        .from('surveys')
        .select('survey_date, survey_type, weather, status, notes, start_time, end_time')
        .eq('project_id', projectId),
      supabase
        .from('target_notes')
        .select('category, title, description, priority, is_verified')
        .eq('project_id', projectId),
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
        .from('species_observations')
        .select(
          'species_name_scientific, species_name_common, taxon_group, count, abundance_dafor, evidence_type, is_protected, confidence_level, behavior_notes'
        )
        .in(
          'survey_id',
          (await supabase.from('surveys').select('id').eq('project_id', projectId)).data?.map(
            (s) => s.id
          ) || []
        ),
    ])

    if (projectResult.error) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build context string from project data
    const context = buildProjectContext({
      project: projectResult.data,
      habitats: habitatsResult.data || [],
      findings: findingsResult.data || [],
      surveys: surveysResult.data || [],
      targetNotes: targetNotesResult.data || [],
      deepResearch: deepResearchResult.data || [],
      aquaticResearch: aquaticResearchResult.data || [],
      observations: observationsResult.data || [],
    })

    // Build messages array with chat history
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `PROJECT DATA:\n\n${context}`,
      },
    ]

    // Add chat history (last 10 messages for context window management)
    const recentHistory = (chatHistory || []).slice(-10)
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 1000,
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
    const reply = data.choices[0]?.message?.content?.trim() || ''
    const tokensUsed = data.usage?.total_tokens || 0

    return NextResponse.json({
      reply,
      metadata: { model: 'gpt-4o-mini', tokensUsed },
    })
  } catch (error) {
    console.error('Dulra Agent error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    )
  }
}

interface ProjectContextInput {
  project: Record<string, unknown>
  habitats: Record<string, unknown>[]
  findings: Record<string, unknown>[]
  surveys: Record<string, unknown>[]
  targetNotes: Record<string, unknown>[]
  deepResearch: Record<string, unknown>[]
  aquaticResearch: Record<string, unknown>[]
  observations: Record<string, unknown>[]
}

function buildProjectContext(input: ProjectContextInput): string {
  const parts: string[] = []
  const p = input.project

  parts.push('# PROJECT INFORMATION')
  parts.push(`Project Name: ${p.name || 'Unknown'}`)
  if (p.site_code) parts.push(`Site Code: ${p.site_code}`)
  if (p.grid_reference) parts.push(`Grid Reference: ${p.grid_reference}`)
  if (p.county) parts.push(`County: ${p.county}`)
  if (p.townland) parts.push(`Townland: ${p.townland}`)
  parts.push('')

  // Findings
  parts.push('# DESK RESEARCH FINDINGS')
  if (input.findings.length > 0) {
    const byType: Record<string, Record<string, unknown>[]> = {}
    for (const f of input.findings) {
      const dt = (f.data_type as string) || 'other'
      if (!byType[dt]) byType[dt] = []
      byType[dt].push(f)
    }
    for (const [type, items] of Object.entries(byType)) {
      parts.push(`\n## ${type.replace('_', ' ').toUpperCase()} (${items.length})`)
      for (const f of items) {
        parts.push(`- **${f.title}** [${((f.source as string) || '').toUpperCase()}]`)
        if (f.distance_from_boundary_km != null) {
          parts.push(`  Distance: ${(f.distance_from_boundary_km as number).toFixed(2)} km`)
        }
        if (f.is_protected) parts.push('  Protected: Yes')
      }
    }
  } else {
    parts.push('No findings recorded.')
  }
  parts.push('')

  // Habitats
  parts.push('# HABITATS')
  if (input.habitats.length > 0) {
    for (const h of input.habitats) {
      parts.push(`- ${h.fossitt_code} — ${h.fossitt_name}`)
      if (h.area_hectares) parts.push(`  Area: ${(h.area_hectares as number).toFixed(2)} ha`)
      if (h.condition) parts.push(`  Condition: ${h.condition}`)
      if (h.eu_annex_code) parts.push(`  EU Annex I: ${h.eu_annex_code}`)
    }
  } else {
    parts.push('No habitats mapped.')
  }
  parts.push('')

  // Observations
  parts.push('# SPECIES OBSERVATIONS')
  if (input.observations.length > 0) {
    parts.push(`Total: ${input.observations.length}`)
    for (const o of input.observations) {
      const details: string[] = []
      if (o.species_name_common) details.push(o.species_name_common as string)
      if (o.abundance_dafor) details.push(`DAFOR: ${o.abundance_dafor}`)
      if (o.is_protected) details.push('PROTECTED')
      parts.push(
        `- ${o.species_name_scientific}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
      )
    }
  } else {
    parts.push('No species observations.')
  }
  parts.push('')

  // Surveys
  parts.push('# FIELD SURVEYS')
  if (input.surveys.length > 0) {
    for (const s of input.surveys) {
      parts.push(`- ${s.survey_type} on ${s.survey_date} (${s.status})`)
    }
  } else {
    parts.push('No surveys.')
  }
  parts.push('')

  // Target notes
  if (input.targetNotes.length > 0) {
    parts.push('# TARGET NOTES')
    for (const tn of input.targetNotes) {
      parts.push(`- [${tn.category}] ${tn.title}`)
      if (tn.description) parts.push(`  ${tn.description}`)
    }
    parts.push('')
  }

  // Deep research
  if (input.deepResearch.length > 0) {
    parts.push('# DEEP RESEARCH — DESIGNATED SITES')
    for (const dr of input.deepResearch) {
      parts.push(`\n## ${dr.site_name} (${dr.site_code}) — ${dr.site_type}`)
      if (dr.ai_analysis) {
        parts.push(`Analysis: ${(dr.ai_analysis as string).substring(0, 500)}`)
      }
    }
    parts.push('')
  }

  // Aquatic research
  if (input.aquaticResearch.length > 0) {
    parts.push('# AQUATIC RESEARCH')
    for (const ar of input.aquaticResearch) {
      parts.push(
        `- ${ar.water_body_name} (${ar.water_body_type}): WFD ${ar.current_status || 'N/A'}`
      )
    }
    parts.push('')
  }

  return parts.join('\n')
}
