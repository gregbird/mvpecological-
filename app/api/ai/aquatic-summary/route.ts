import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CHEAP_MODEL } from '@/lib/ai/openai-models'
import { toIrishEnglish } from '@/lib/ai/irish-english'

/**
 * AI Aquatic Summary API
 * Quick 2-3 sentence inline summary for aquatic feature cards (rivers, lakes, catchments).
 * Uses EPA metadata (WFD status, catchment, water body type) instead of web scraping.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const {
      waterBodyName,
      waterBodyType,
      waterBodyCode,
      wfdStatus,
      catchmentName,
      distance,
      areaHa,
      lengthKm,
      riverBasinDistrict,
    } = await request.json()

    if (!waterBodyName) {
      return NextResponse.json({ error: 'waterBodyName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Build structured context from EPA metadata
    const contextParts: string[] = []

    // Water body identity
    contextParts.push(`Type: ${waterBodyType || 'Water body'}`)
    if (waterBodyCode) contextParts.push(`Code: ${waterBodyCode}`)

    // WFD status
    if (wfdStatus) {
      contextParts.push(`WFD Status: ${wfdStatus}`)
    }

    // Physical characteristics
    if (lengthKm) contextParts.push(`Length: ${lengthKm} km`)
    if (areaHa) contextParts.push(`Area: ${areaHa} ha`)

    // Catchment context
    if (catchmentName) contextParts.push(`Catchment: ${catchmentName}`)
    if (riverBasinDistrict) contextParts.push(`River Basin District: ${riverBasinDistrict}`)

    // Distance from project
    if (distance !== undefined && distance !== null) {
      contextParts.push(
        distance === 0 ? 'Intersects the project boundary' : `${distance} km from the project site`
      )
    }

    const contextStr = contextParts.join('. ')

    // Tailor prompt by water body type
    const typeSpecificFocus =
      waterBodyType === 'River'
        ? 'riparian habitats, fish passage, otter potential, and downstream pollution sensitivity'
        : waterBodyType === 'Lake'
          ? 'lakeside habitats, water quality sensitivity, and protected species potential (e.g. Arctic Char, White-clawed Crayfish)'
          : 'hydrological connectivity to the project site and cumulative impact considerations'

    const prompt = `Summarise the ecological significance of "${waterBodyName}" (${waterBodyType || 'water body'}) for a project-level ecological assessment in Ireland in 2-3 sentences.
Data: ${contextStr}.
Focus on: WFD implications, ${typeSpecificFocus}.
Be specific and practical. Respond with ONLY the summary.`

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
              'You are an Irish ecological consultant preparing a Preliminary Ecological Appraisal. Summarise aquatic features for their ecological relevance to a proposed development. Reference WFD, EPA guidance, and Irish legislation where relevant. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
          },
          { role: 'user', content: prompt },
        ],
        reasoning_effort: 'minimal',
        max_completion_tokens: 2000,
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

    return NextResponse.json({
      summary,
      waterBodyName,
    })
  } catch (error) {
    console.error('Aquatic summary error:', error)
    return NextResponse.json({ error: 'Failed to generate aquatic summary' }, { status: 500 })
  }
}
