import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CHEAP_MODEL } from '@/lib/ai/openai-models'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { PROJECT_TYPE_LABELS_LONG } from '@/lib/config/survey'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, survey_type, county, expected_end_date, expected_start_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch desk research findings summary
    const { data: findings } = await supabase
      .from('desk_research_findings')
      .select('source, data_type, title, is_protected, red_list_status')
      .eq('project_id', projectId)
      .limit(50)

    const designatedSites = findings?.filter((f) => f.data_type === 'designated_site') || []
    const speciesRecords = findings?.filter((f) => f.data_type === 'species_record') || []
    const protectedSpecies = speciesRecords.filter((f) => f.is_protected)
    const redListSpecies = speciesRecords.filter(
      (f) => f.red_list_status && f.red_list_status !== 'LC'
    )
    const sources = [...new Set(findings?.map((f) => f.source).filter(Boolean))] as string[]

    const siteNames = designatedSites
      .slice(0, 5)
      .map((s) => s.title)
      .filter(Boolean)
      .join(', ')

    const speciesNames = speciesRecords
      .slice(0, 5)
      .map((s) => s.title)
      .filter(Boolean)
      .join(', ')

    const surveyLabel = PROJECT_TYPE_LABELS_LONG[project.survey_type || ''] || 'Ecological Survey'

    const prompt = `You are an Irish ecological consultant. Generate a 3-sentence executive summary for this project:

Project: ${project.name}
Survey Type: ${surveyLabel}
Location: ${project.county || 'Ireland'}
Desk Research Findings:
- Designated sites found: ${designatedSites.length}${siteNames ? ` (including ${siteNames})` : ''}
- Species records: ${speciesRecords.length}${speciesNames ? ` (including ${speciesNames})` : ''}
- Protected species: ${protectedSpecies.length}
- Red List species: ${redListSpecies.length}
- Data sources checked: ${sources.join(', ') || 'none yet'}

Write exactly 3 sentences covering: (1) what the project is and where, (2) key ecological sensitivities found, (3) significance for the assessment. Be factual and concise. No headings or bullet points.`

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
            content:
              'You are an expert Irish ecological consultant. Write concise, professional project summaries. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
          },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 150,
      }),
    })

    if (!aiResponse.ok) {
      const error = await aiResponse.json()
      return NextResponse.json(
        { error: error.error?.message || 'OpenAI API error' },
        { status: 500 }
      )
    }

    const data = await aiResponse.json()
    const summary = toIrishEnglish(data.choices[0]?.message?.content?.trim() || '')

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Project summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
