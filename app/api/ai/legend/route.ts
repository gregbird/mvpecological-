import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Legend Generator API
 * Uses OpenAI to generate a descriptive legend/caption for map screenshots.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectName, location, layers, habitatCount, findingsCount, targetNotesCount } =
      await request.json()

    if (!projectName) {
      return NextResponse.json({ error: 'projectName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const prompt = `You are an ecological consultant assistant. Generate a concise map legend description (2-3 sentences) for a Preliminary Ecological Appraisal (PEA) report map.

Project: ${projectName}
Location: ${location || 'Ireland'}
Visible layers: ${layers || 'Site boundary'}
Habitats mapped: ${habitatCount || 0}
Desk research findings: ${findingsCount || 0}
Target notes: ${targetNotesCount || 0}

Write a professional caption suitable for a figure in an ecological report. Include what the map shows and its relevance to the assessment. Do not use bullet points. Keep it factual and brief.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const legend = data.choices?.[0]?.message?.content?.trim() || ''

    return NextResponse.json({ legend })
  } catch (error) {
    console.error('Legend generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
