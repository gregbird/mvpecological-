import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Species Summary API
 * Quick 2-3 sentence inline summary for species cards.
 * Follows the same pattern as /api/ai/site-summary.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      scientificName,
      commonName,
      taxonGroup,
      designations,
      isProtected,
      totalIrishRecords,
      gridSquares10km,
      recordCount,
    } = await request.json()

    if (!scientificName) {
      return NextResponse.json({ error: 'scientificName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Build context parts
    const contextParts: string[] = []
    if (taxonGroup) contextParts.push(`Taxon group: ${taxonGroup}`)
    if (designations) contextParts.push(`Designations: ${designations}`)
    if (isProtected) contextParts.push('This is a legally protected species in Ireland')
    if (totalIrishRecords) contextParts.push(`${totalIrishRecords} Irish records`)
    if (gridSquares10km) contextParts.push(`across ${gridSquares10km} 10km grid squares`)
    if (recordCount) contextParts.push(`${recordCount} records found in project area`)

    const contextStr = contextParts.length > 0 ? `\nContext: ${contextParts.join('. ')}.` : ''

    const prompt = `Provide a concise 2-3 sentence ecological summary for ${scientificName}${commonName ? ` (${commonName})` : ''} in an Irish context.${contextStr}
Focus on: what the species is, its ecological significance in Ireland, and key conservation concerns.
Respond with ONLY the 2-3 sentence summary, no headings.`

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
              'You are an expert Irish ecological consultant. Provide concise, factual summaries of species for ecological assessments.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
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
    const summary = data.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({
      summary,
      scientificName,
    })
  } catch (error) {
    console.error('Species summary error:', error)
    return NextResponse.json({ error: 'Failed to generate species summary' }, { status: 500 })
  }
}
