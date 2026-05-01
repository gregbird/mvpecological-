import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'
import { toIrishEnglish } from '@/lib/ai/irish-english'

/**
 * AI Habitat Summary API
 * Quick 2-3 sentence summary for a single Fossitt habitat type.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { fossittCode, fossittName, nlcLabel, areaHectares, percentCover, bufferKm } =
      await request.json()

    if (!fossittCode) {
      return NextResponse.json({ error: 'fossittCode is required' }, { status: 400 })
    }

    const prompt = `Summarise the ecological significance of Fossitt habitat "${fossittCode} — ${fossittName}" (NLC: ${nlcLabel}) for a project-level ecological assessment in Ireland in 2-3 sentences.
It covers ${areaHectares?.toLocaleString() || 'unknown'} ha (${percentCover || '?'}%) within ${bufferKm || 5}km of the project site.
Focus on: conservation importance, any EU Habitats Directive Annex I relevance, key species associations, and whether this habitat requires field verification.
Be specific and practical. Respond with ONLY the summary.`

    const raw = await callClaude({
      model: CLAUDE_CHEAP_MODEL,
      system:
        'You are an Irish ecological consultant. Summarise habitat types for their ecological relevance using Fossitt classification. Reference EU Habitats Directive and Irish legislation where relevant. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
    })

    const summary = toIrishEnglish(raw.trim())

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Habitat summary error:', error)
    return NextResponse.json({ error: 'Failed to generate habitat summary' }, { status: 500 })
  }
}
