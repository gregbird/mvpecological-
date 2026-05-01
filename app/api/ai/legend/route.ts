import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'

/**
 * AI Legend Generator API
 * Uses Claude to generate a descriptive legend/caption for map screenshots.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { projectName, location, layers, habitatCount, findingsCount, targetNotesCount } =
      await request.json()

    if (!projectName) {
      return NextResponse.json({ error: 'projectName is required' }, { status: 400 })
    }

    const prompt = `You are an ecological consultant assistant. Generate a concise map legend description (2-3 sentences) for a Preliminary Ecological Appraisal (PEA) report map.

Project: ${projectName}
Location: ${location || 'Ireland'}
Visible layers: ${layers || 'Site boundary'}
Habitats mapped: ${habitatCount || 0}
Desk research findings: ${findingsCount || 0}
Target notes: ${targetNotesCount || 0}

Write a professional caption suitable for a figure in an ecological report. Include what the map shows and its relevance to the assessment. Do not use bullet points. Keep it factual and brief.`

    const legend = (
      await callClaude({
        model: CLAUDE_CHEAP_MODEL,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2000,
      })
    ).trim()

    return NextResponse.json({ legend })
  } catch (error) {
    console.error('Legend generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
