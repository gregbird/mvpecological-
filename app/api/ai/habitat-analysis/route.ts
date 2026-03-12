import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'

/**
 * AI Habitat Analysis API
 * Generates a comprehensive ecological analysis of the habitat composition
 * within the project area based on NLC 2018 data mapped to Fossitt codes.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { habitats, projectName, bufferKm } = await request.json()

    if (!habitats || !Array.isArray(habitats) || habitats.length === 0) {
      return NextResponse.json({ error: 'habitats array is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Build habitat summary table for the prompt
    const totalArea = habitats.reduce(
      (sum: number, h: { areaHectares: number }) => sum + h.areaHectares,
      0
    )
    const habitatLines = habitats.map(
      (h: { fossittCode: string; fossittName: string; nlcLabel: string; areaHectares: number }) => {
        const pct = totalArea > 0 ? ((h.areaHectares / totalArea) * 100).toFixed(1) : '0'
        return `- ${h.fossittCode} ${h.fossittName} (NLC: ${h.nlcLabel}): ${h.areaHectares.toLocaleString()} ha (${pct}%)`
      }
    )

    const prompt = `Analyse the following habitat composition within ${bufferKm || 5}km of ${projectName ? `"${projectName}"` : 'the project site'} in Ireland. Data from National Land Cover 2018 mapped to Fossitt habitat codes.

Total area: ${totalArea.toLocaleString()} ha
${habitatLines.join('\n')}

Provide a structured ecological analysis covering:
1. **Dominant Habitats** — What the habitat mix tells us about the landscape character
2. **Conservation-Significant Habitats** — Any Annex I (EU Habitats Directive) habitats present or likely based on the Fossitt codes (e.g. blanket bog PB2, raised bog PB1, wet heath HH3, semi-natural woodland WN)
3. **Ecological Sensitivities** — Water-dependent habitats, peatlands, or other sensitive receptors that may require assessment
4. **Field Survey Recommendations** — What habitats need ground-truthing (NLC is satellite-derived), suggested survey methods (e.g. relevé, DAFOR)
5. **Potential Protected Species** — Based on the habitats present, which protected species might be expected (e.g. otter near watercourses, marsh fritillary in wet grassland)

Be specific to Irish ecological legislation and guidance (Wildlife Act, Habitats Directive, EcIA guidelines). Keep the analysis practical and focused on what an ecological consultant needs for a PEA or EcIA.`

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
            content:
              'You are a senior Irish ecological consultant preparing a desk study for a Preliminary Ecological Appraisal (PEA). Analyse habitat composition data from the National Land Cover 2018 dataset. Reference Irish/EU legislation, Fossitt classification, and best practice guidance. Be specific, practical, and avoid generic statements.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
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
    const analysis = data.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Habitat analysis error:', error)
    return NextResponse.json({ error: 'Failed to generate habitat analysis' }, { status: 500 })
  }
}
