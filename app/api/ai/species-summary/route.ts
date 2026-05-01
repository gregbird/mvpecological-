import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'
import { toIrishEnglish } from '@/lib/ai/irish-english'

/**
 * AI Species Summary API
 * Quick 2-3 sentence inline summary for species cards.
 * Uses enrichment data (NBDC, FPO, Article 17) for context-aware summaries.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

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

    const raw = await callClaude({
      model: CLAUDE_CHEAP_MODEL,
      system:
        'You are an Irish ecological consultant preparing a Preliminary Ecological Appraisal. Give concise, practical species summaries that help the ecologist understand survey and mitigation implications. Reference Irish legislation and guidance where relevant. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
    })

    const summary = toIrishEnglish(raw.trim())

    return NextResponse.json({
      summary,
      scientificName,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Species summary error:', error)
    return NextResponse.json(
      { error: `Failed to generate species summary: ${message}` },
      { status: 500 }
    )
  }
}
