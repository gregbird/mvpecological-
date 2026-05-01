import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'
import { toIrishEnglish } from '@/lib/ai/irish-english'

/**
 * AI Species Deep Research API
 * Uses Claude to generate a detailed species analysis including
 * protection status, ecology, survey recommendations, and development implications.
 *
 * Input: { scientificName, commonName, siteArea, recordCount, designations, taxonGroup,
 *          fpoData, article17Data, relatedSites, totalIrishRecords, gridSquares10km,
 *          isProtected, isInvasive, isThreatened }
 * Output: { summary }
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const {
      scientificName,
      commonName,
      siteArea,
      recordCount,
      designations,
      taxonGroup,
      fpoData,
      article17Data,
      relatedSites,
      totalIrishRecords,
      gridSquares10km,
      isProtected,
      isInvasive,
      isThreatened,
    } = await request.json()

    if (!scientificName) {
      return NextResponse.json({ error: 'scientificName is required' }, { status: 400 })
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
    if (isProtected) contextParts.push('This is a legally protected species in Ireland.')
    if (isInvasive) contextParts.push('This is classified as an invasive species in Ireland.')
    if (isThreatened) contextParts.push('This species has a threatened conservation status.')

    // Irish distribution
    if (totalIrishRecords || gridSquares10km) {
      const distParts: string[] = []
      if (totalIrishRecords) distParts.push(`${totalIrishRecords} total Irish records`)
      if (gridSquares10km) distParts.push(`across ${gridSquares10km} 10km grid squares`)
      contextParts.push(`\nIrish Distribution: ${distParts.join(' ')}`)
    }

    // FPO data
    if (fpoData) {
      contextParts.push(`\nFlora Protection Order (FPO) 2022 Records:\n${fpoData}`)
    }

    // Article 17 data
    if (article17Data) {
      contextParts.push(`\nArticle 17 Habitats Directive Distribution:\n${article17Data}`)
    }

    // Related designated sites
    if (relatedSites && relatedSites.length > 0) {
      const siteLines = relatedSites
        .slice(0, 20)
        .map(
          (s: { siteCode: string; siteName: string; siteType: string }) =>
            `- ${s.siteName} (${s.siteType} ${s.siteCode})`
        )
      contextParts.push(
        `\nSAC/SPA Sites Where This Species is a Qualifying Interest (${relatedSites.length} sites):\n${siteLines.join('\n')}`
      )
    }

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
[What a developer/planner must consider - buffer zones, seasonal constraints, mitigation measures, licensing requirements]

**Related Designated Sites:**
[SAC/SPA sites where this species is a qualifying interest, and Appropriate Assessment implications]

**Irish Distribution:**
[Summary of species distribution in Ireland based on available data]`)

    const raw = await callClaude({
      model: CLAUDE_CHEAP_MODEL,
      system:
        'You are an expert Irish ecological consultant with deep knowledge of protected species under the Wildlife Acts 1976-2021, EU Habitats Directive, EU Birds Directive, and Irish planning requirements for ecological assessments. Provide detailed, factual analyses suitable for Preliminary Ecological Appraisals (PEA) and Ecological Impact Assessments (EcIA). Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
      messages: [{ role: 'user', content: contextParts.join('\n') }],
      maxTokens: 6000,
    })

    const summary = toIrishEnglish(raw.trim())

    return NextResponse.json({
      summary,
      scientificName,
    })
  } catch (error) {
    console.error('Species research error:', error)
    return NextResponse.json({ error: 'Failed to generate species research' }, { status: 500 })
  }
}
