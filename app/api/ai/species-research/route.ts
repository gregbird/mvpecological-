import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Species Deep Research API
 * Uses OpenAI to generate a detailed species analysis including
 * protection status, ecology, survey recommendations, and development implications.
 *
 * Input: { scientificName, commonName, siteArea, recordCount, designations, taxonGroup }
 * Output: { summary }
 */
export async function POST(request: NextRequest) {
  try {
    const { scientificName, commonName, siteArea, recordCount, designations, taxonGroup } =
      await request.json()

    if (!scientificName) {
      return NextResponse.json({ error: 'scientificName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Build context
    const contextParts: string[] = []
    contextParts.push(
      `Provide a detailed ecological analysis for the species "${scientificName}"${commonName ? ` (${commonName})` : ''} found in an Irish ecological survey area.`
    )

    if (taxonGroup) contextParts.push(`\nTaxon Group: ${taxonGroup}`)
    if (recordCount) contextParts.push(`Records found in survey area: ${recordCount}`)
    if (designations) contextParts.push(`Known designations: ${designations}`)
    if (siteArea) contextParts.push(`Survey area: ${siteArea}`)

    contextParts.push(`\nProvide your analysis in this exact format:

**Species Summary:**
[2-3 sentences: what this species is, its ecological role, and why it matters in an Irish context]

**Protection Status:**
[List all relevant protections: Wildlife Act, EU Habitats Directive Annex, EU Birds Directive, Red List status, Flora Protection Order if applicable]

**Habitat & Ecology:**
[Key habitat requirements, breeding season, foraging behaviour relevant to ecological assessments]

**Survey Recommendations:**
[What surveys are recommended if this species may be affected by development - timing, methods, effort]

**Development Implications:**
[What a developer/planner must consider - buffer zones, seasonal constraints, mitigation measures, licensing requirements]`)

    // Call OpenAI
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
              'You are an expert Irish ecological consultant with deep knowledge of protected species under the Wildlife Acts 1976-2021, EU Habitats Directive, EU Birds Directive, and Irish planning requirements for ecological assessments. Provide detailed, factual analyses suitable for Preliminary Ecological Appraisals (PEA) and Ecological Impact Assessments (EcIA).',
          },
          { role: 'user', content: contextParts.join('\n') },
        ],
        temperature: 0.3,
        max_tokens: 800,
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
    console.error('Species research error:', error)
    return NextResponse.json({ error: 'Failed to generate species research' }, { status: 500 })
  }
}
