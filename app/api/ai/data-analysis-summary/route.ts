import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CHEAP_MODEL } from '@/lib/ai/openai-models'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { createClient } from '@/lib/supabase/server'

/**
 * Data Analysis Summary API
 * Generates a concise summary for a specific tab in the Data Analysis step.
 * Used by the "Create a Summary" button in Step 5.
 *
 * Input: { projectId, tabContext, siteId? }
 * Output: { summary }
 */

type TabContext = 'desk-assessment' | 'field-survey' | 'habitats' | 'target-notes'

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { projectId, tabContext, siteId } = (await request.json()) as {
      projectId: string
      tabContext: TabContext
      siteId?: string | null
    }

    if (!projectId || !tabContext) {
      return NextResponse.json({ error: 'projectId and tabContext are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    // Fetch project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, site_code, county, townland')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const context = await buildTabContext(supabase, projectId, tabContext, siteId ?? null)

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHEAP_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a senior Irish ecological consultant writing a concise data summary for a Preliminary Ecological Appraisal (PEA) report.

Rules:
- Write in Irish English (colour, favour, analyse, etc.)
- Be professional and evidence-based
- Base ALL conclusions on the provided data — never speculate
- Use markdown formatting: headers, bullet points, tables where appropriate
- Keep the summary concise (300-500 words)
- Reference specific sites, species, habitats, and distances`,
          },
          {
            role: 'user',
            content: `Write a concise summary for the "${tabContext}" section of the Data Analysis for project "${project?.name || 'Unknown'}" in ${project?.county || 'Ireland'}.

${context}

Summarise the key findings, highlight notable items (protected species, sensitive habitats, constraints), and note any data gaps.`,
          },
        ],
        max_completion_tokens: 6000,
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
    const summary = toIrishEnglish(data.choices[0]?.message?.content?.trim() || '')

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Data analysis summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTabContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  tabContext: TabContext,
  siteId: string | null
): Promise<string> {
  const parts: string[] = []

  switch (tabContext) {
    case 'desk-assessment': {
      let query = supabase
        .from('desk_research_findings')
        .select(
          'title, source, data_type, distance_from_boundary_km, is_protected, notes, raw_data'
        )
        .eq('project_id', projectId)
        .eq('is_saved', true)
      if (siteId) query = query.eq('site_id', siteId)
      const { data: findings = [] } = await query

      parts.push(`## Desk Research Findings (${findings?.length ?? 0} total)`)
      const byType = new Map<string, number>()
      for (const f of findings ?? []) {
        byType.set(f.data_type, (byType.get(f.data_type) || 0) + 1)
      }
      for (const [type, count] of byType) {
        parts.push(`- ${type.replace('_', ' ')}: ${count}`)
      }

      const protectedCount = (findings ?? []).filter((f) => f.is_protected).length
      if (protectedCount > 0) parts.push(`- Protected species: ${protectedCount}`)

      for (const f of (findings ?? []).slice(0, 30)) {
        const dist =
          f.distance_from_boundary_km != null ? `${f.distance_from_boundary_km.toFixed(1)}km` : ''
        parts.push(`  - ${f.title} (${f.source}, ${f.data_type}) ${dist}`)
        const raw = f.raw_data as Record<string, unknown> | null
        if (raw) {
          const meta = (raw.metadata ?? {}) as Record<string, unknown>
          const aiSummary = raw.aiSummary || meta.aiSummary
          if (aiSummary) parts.push(`    AI: ${String(aiSummary).substring(0, 200)}`)
        }
      }
      break
    }

    case 'field-survey': {
      let query = supabase
        .from('surveys')
        .select('id, survey_type, status, survey_date, notes, start_time, end_time')
        .eq('project_id', projectId)
      if (siteId) query = query.eq('site_id', siteId)
      const { data: surveys = [] } = await query

      parts.push(`## Field Surveys (${surveys?.length ?? 0} total)`)
      const completed = (surveys ?? []).filter((s) => s.status === 'completed').length
      parts.push(`- Completed: ${completed}`)

      for (const s of surveys ?? []) {
        const timing = s.start_time && s.end_time ? ` (${s.start_time}–${s.end_time})` : ''
        parts.push(`- ${s.survey_type} (${s.status}) — ${s.survey_date}${timing}`)
        if (s.notes) parts.push(`  Notes: ${s.notes.substring(0, 200)}`)
      }

      // Also fetch observation stats
      const surveyIds = (surveys ?? []).map((s) => s.id)
      if (surveyIds.length > 0) {
        const { data: obs = [] } = await supabase
          .from('species_observations')
          .select('species_name_scientific, is_protected, taxon_group')
          .in('survey_id', surveyIds)

        parts.push(`\n## Species Observations (${obs?.length ?? 0} total)`)
        const protObs = (obs ?? []).filter((o) => o.is_protected).length
        if (protObs > 0) parts.push(`- Protected species observed: ${protObs}`)

        // Taxon group breakdown
        const byTaxon = new Map<string, number>()
        for (const o of obs ?? []) {
          const group = o.taxon_group || 'Unknown'
          byTaxon.set(group, (byTaxon.get(group) || 0) + 1)
        }
        for (const [group, count] of byTaxon) {
          parts.push(`- ${group}: ${count}`)
        }
      }

      // Fetch dominant relevé species (DOMIN scores)
      const { data: releveSurveys = [] } = await supabase
        .from('releve_surveys')
        .select('id')
        .eq('project_id', projectId)
      const releveIds = (releveSurveys ?? []).map((r) => r.id)
      if (releveIds.length > 0) {
        const { data: releveSpecies = [] } = await supabase
          .from('releve_species')
          .select('species_name_latin, species_cover_domin')
          .in('releve_id', releveIds)
          .order('species_cover_domin', { ascending: false })
          .limit(15)

        if (releveSpecies && releveSpecies.length > 0) {
          parts.push(`\n## Dominant Relevé Species (DOMIN scale)`)
          for (const rs of releveSpecies) {
            parts.push(`- ${rs.species_name_latin}: DOMIN ${rs.species_cover_domin ?? '—'}`)
          }
        }
      }
      break
    }

    case 'habitats': {
      let query = supabase
        .from('habitat_polygons')
        .select(
          'fossitt_code, fossitt_name, area_hectares, condition, threats, eu_annex_code, notes'
        )
        .eq('project_id', projectId)
      if (siteId) query = query.eq('site_id', siteId)
      const { data: habitats = [] } = await query

      parts.push(`## Habitat Polygons (${habitats?.length ?? 0} total)`)
      const totalArea = (habitats ?? []).reduce((sum, h) => sum + (h.area_hectares || 0), 0)
      parts.push(`- Total area: ${totalArea.toFixed(2)} ha`)

      for (const h of habitats ?? []) {
        parts.push(
          `- [${h.fossitt_code}] ${h.fossitt_name} — ${(h.area_hectares || 0).toFixed(2)} ha (${h.condition || 'unknown'})`
        )
        if (h.eu_annex_code) parts.push(`  EU Annex: ${h.eu_annex_code}`)
        const threats = h.threats as string[] | null
        if (threats?.length) parts.push(`  Threats: ${threats.join(', ')}`)
        if (h.notes) parts.push(`  Notes: ${String(h.notes).substring(0, 150)}`)
      }
      break
    }

    case 'target-notes': {
      let query = supabase
        .from('target_notes')
        .select('category, priority, description, is_verified')
        .eq('project_id', projectId)
      if (siteId) query = query.eq('site_id', siteId)
      const { data: notes = [] } = await query

      parts.push(`## Target Notes (${notes?.length ?? 0} total)`)
      const verified = (notes ?? []).filter((n) => n.is_verified).length
      parts.push(`- Verified: ${verified}`)

      // Priority breakdown
      const byPriority = new Map<string, number>()
      for (const n of notes ?? []) {
        const p = n.priority || 'normal'
        byPriority.set(p, (byPriority.get(p) || 0) + 1)
      }
      parts.push('\n### Priority Distribution')
      for (const [priority, count] of byPriority) {
        parts.push(`- ${priority}: ${count}`)
      }

      // Category breakdown
      const byCat = new Map<string, number>()
      for (const n of notes ?? []) {
        byCat.set(n.category, (byCat.get(n.category) || 0) + 1)
      }
      parts.push('\n### Categories')
      for (const [cat, count] of byCat) {
        parts.push(`- ${cat}: ${count}`)
      }

      for (const n of (notes ?? []).slice(0, 20)) {
        parts.push(
          `- [${n.category}] ${n.priority || 'normal'} — ${(n.description || '').substring(0, 150)}`
        )
      }
      break
    }
  }

  return parts.join('\n')
}
