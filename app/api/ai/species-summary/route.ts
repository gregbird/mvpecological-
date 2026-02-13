import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Species Summary API
 * Quick 2-3 sentence inline summary for species cards.
 * Uses enrichment data (NBDC, FPO, Article 17) for context-aware summaries.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      scientificName,
      commonName,
      taxonGroup,
      designations,
      isProtected,
      isInvasive,
      isThreatened,
      totalIrishRecords,
      gridSquares10km,
      recordCount,
      distance,
      hasFPO,
      hasArticle17,
      relatedSitesCount,
    } = await request.json()

    if (!scientificName) {
      return NextResponse.json({ error: 'scientificName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Build structured context
    const contextParts: string[] = []

    // Species identity
    if (taxonGroup) contextParts.push(`Taxon group: ${taxonGroup}`)

    // Legal protection status
    const protectionParts: string[] = []
    if (isProtected) protectionParts.push('legally protected under Wildlife Acts')
    if (hasFPO) protectionParts.push('listed in Flora Protection Order 2022')
    if (hasArticle17) protectionParts.push('Habitats Directive Annex species')
    if (designations) protectionParts.push(designations)
    if (protectionParts.length > 0) {
      contextParts.push(`Protection: ${protectionParts.join('; ')}`)
    }

    if (isInvasive) contextParts.push('This is an invasive species in Ireland')
    if (isThreatened) contextParts.push('This species is on the Irish Red List (threatened)')

    // Distribution data
    if (totalIrishRecords) contextParts.push(`${totalIrishRecords.toLocaleString()} Irish records`)
    if (gridSquares10km) contextParts.push(`found in ${gridSquares10km} 10km grid squares`)

    // Project-specific context
    if (recordCount) contextParts.push(`${recordCount} records in the project area`)
    if (distance !== undefined && distance !== null) {
      contextParts.push(
        distance === 0
          ? 'recorded within the project boundary'
          : `nearest record ${distance} km from site`
      )
    }
    if (relatedSitesCount && relatedSitesCount > 0) {
      contextParts.push(
        `qualifying interest for ${relatedSitesCount} nearby designated site${relatedSitesCount > 1 ? 's' : ''}`
      )
    }

    const contextStr = contextParts.length > 0 ? `\nData: ${contextParts.join('. ')}.` : ''

    const prompt = `Summarise ${scientificName}${commonName ? ` (${commonName})` : ''} for an ecological assessment in Ireland in 2-3 sentences.${contextStr}
Include: what it is, its conservation status, and what it means for this project (e.g. survey implications, seasonal constraints, or habitat requirements).
Be specific and practical — avoid generic statements. Respond with ONLY the summary.`

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
              'You are an Irish ecological consultant preparing a Preliminary Ecological Appraisal. Give concise, practical species summaries that help the ecologist understand survey and mitigation implications. Reference Irish legislation and guidance where relevant.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
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
