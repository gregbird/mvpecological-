import { NextRequest, NextResponse } from 'next/server'
import {
  findMatchingSACs,
  getAquaticHabitats,
  getAquaticSpecies,
  AQUATIC_HABITAT_CODES,
  AQUATIC_SPECIES_CODES,
} from '@/lib/data/aquatic-sac-lookup'

/**
 * AI Aquatic Deep Research API
 * Finds linked SACs for rivers/lakes and generates AI analysis
 *
 * Input: { waterBodyName, waterBodyType, waterBodyCode, wfdStatus, catchmentName }
 * Output: { summary, linkedSACs, wfdAnalysis, resources }
 */

export async function POST(request: NextRequest) {
  try {
    const { waterBodyName, waterBodyType, waterBodyCode, wfdStatus, catchmentName, catchmentId } =
      await request.json()

    if (!waterBodyName) {
      return NextResponse.json({ error: 'waterBodyName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // 1. Find matching SACs
    const linkedSACs = findMatchingSACs(waterBodyName, waterBodyType)
    const bestMatch = linkedSACs.length > 0 ? linkedSACs[0] : null

    // 2. Extract aquatic habitats and species from best match
    let aquaticHabitats: Array<{ code: string; name: string; description: string }> = []
    let aquaticSpecies: Array<{ code: string; name: string; commonName: string }> = []

    if (bestMatch) {
      aquaticHabitats = getAquaticHabitats(bestMatch.habitats)
      aquaticSpecies = getAquaticSpecies(bestMatch.species)
    }

    // 3. Build context for AI
    const contextParts: string[] = []

    contextParts.push(`Water Body: ${waterBodyName}`)
    contextParts.push(`Type: ${waterBodyType || 'Unknown'}`)

    if (waterBodyCode) {
      contextParts.push(`EPA Code: ${waterBodyCode}`)
    }

    if (wfdStatus) {
      contextParts.push(`WFD Status: ${wfdStatus}`)
    }

    if (catchmentName) {
      contextParts.push(`Catchment: ${catchmentName}`)
    }

    if (bestMatch) {
      contextParts.push(`\nLinked Natura 2000 Site: ${bestMatch.siteName} (${bestMatch.siteCode})`)
      contextParts.push(`Match confidence: ${bestMatch.matchScore}% - ${bestMatch.matchReason}`)

      if (aquaticHabitats.length > 0) {
        contextParts.push(`\nAnnex I Aquatic Habitats:`)
        for (const h of aquaticHabitats) {
          contextParts.push(`- [${h.code}] ${h.name}`)
        }
      }

      if (aquaticSpecies.length > 0) {
        contextParts.push(`\nAnnex II Aquatic Species (Qualifying Interests):`)
        for (const s of aquaticSpecies) {
          contextParts.push(`- [${s.code}] ${s.commonName}`)
        }
      }

      // Add all habitats for context
      if (bestMatch.habitats.length > aquaticHabitats.length) {
        const otherHabitats = bestMatch.habitats.filter(
          (h) => !Object.keys(AQUATIC_HABITAT_CODES).includes(h.code)
        )
        if (otherHabitats.length > 0) {
          contextParts.push(`\nOther Annex I Habitats in SAC:`)
          for (const h of otherHabitats.slice(0, 5)) {
            contextParts.push(`- [${h.code}] ${h.name}`)
          }
          if (otherHabitats.length > 5) {
            contextParts.push(`- ... and ${otherHabitats.length - 5} more`)
          }
        }
      }

      // Add all species for context
      if (bestMatch.species.length > aquaticSpecies.length) {
        const otherSpecies = bestMatch.species.filter(
          (s) => !Object.keys(AQUATIC_SPECIES_CODES).includes(s.code)
        )
        if (otherSpecies.length > 0) {
          contextParts.push(`\nOther Annex II Species in SAC:`)
          for (const s of otherSpecies.slice(0, 5)) {
            contextParts.push(`- [${s.code}] ${s.name}`)
          }
        }
      }
    }

    // 4. Build AI prompt
    const prompt = buildAquaticPrompt({
      waterBodyName,
      waterBodyType: waterBodyType || 'water body',
      context: contextParts.join('\n'),
      wfdStatus,
      hasLinkedSAC: !!bestMatch,
      aquaticSpecies,
    })

    // 5. Call OpenAI
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
              'You are an expert Irish freshwater ecologist with deep knowledge of the Water Framework Directive (WFD), EU Habitats Directive, Irish rivers and lakes, aquatic habitats, and water quality assessment. You understand the ecological requirements of protected species like Atlantic Salmon, Freshwater Pearl Mussel, and Lamprey species. Provide detailed, factual analyses suitable for Ecological Impact Assessment reports and Appropriate Assessment screening.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
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

    // 6. Build resource URLs
    const resources = {
      catchmentsUrl: 'https://www.catchments.ie',
      epaWaterMapUrl: 'https://gis.epa.ie/EPAMaps/Water',
      hydroNetUrl: 'https://epa.ie/hydronet/',
      wfdDataUrl: 'https://www.catchments.ie/wfd-data-dashboards/',
    }

    // Add SAC-specific URLs if we have a match
    if (bestMatch) {
      Object.assign(resources, {
        sacUrl: `https://www.npws.ie/protected-sites/sac/${bestMatch.siteCode.replace('IE', '')}`,
        sscoUrl: bestMatch.sscoUrl,
        siUrl: bestMatch.siUrl,
      })
    }

    return NextResponse.json({
      summary,
      waterBodyName,
      waterBodyType,
      waterBodyCode,
      wfdStatus,
      linkedSACs: linkedSACs.map((sac) => ({
        siteCode: sac.siteCode,
        siteName: sac.siteName,
        matchScore: sac.matchScore,
        matchReason: sac.matchReason,
        siteArea: sac.siteArea,
        sscoUrl: sac.sscoUrl,
        aquaticHabitats: getAquaticHabitats(sac.habitats),
        aquaticSpecies: getAquaticSpecies(sac.species),
        allHabitats: sac.habitats,
        allSpecies: sac.species,
      })),
      resources,
    })
  } catch (error) {
    console.error('Aquatic research error:', error)
    return NextResponse.json({ error: 'Failed to generate aquatic research' }, { status: 500 })
  }
}

function buildAquaticPrompt({
  waterBodyName,
  waterBodyType,
  context,
  wfdStatus,
  hasLinkedSAC,
  aquaticSpecies,
}: {
  waterBodyName: string
  waterBodyType: string
  context: string
  wfdStatus?: string
  hasLinkedSAC: boolean
  aquaticSpecies: Array<{ code: string; name: string; commonName: string }>
}): string {
  const parts: string[] = []

  parts.push(
    `Provide a detailed ecological analysis for the Irish ${waterBodyType.toLowerCase()} "${waterBodyName}" for use in ecological assessment.`
  )

  parts.push(`\n**Available Data:**\n${context}`)

  // Customize prompt based on what data we have
  if (hasLinkedSAC && aquaticSpecies.length > 0) {
    parts.push(`\nProvide your analysis in this exact format:

**Ecological Summary:**
[3-4 sentences describing the water body's ecological importance, its connection to the linked SAC, and key conservation features]

**Water Quality (WFD):**
[Current WFD status (${wfdStatus || 'if known'}), what this means for the qualifying species, and ecological implications]

**Protected Species:**
[For each Annex II species listed, describe: habitat requirements, sensitivity to impacts, and why this water body is important for the species. Focus especially on: ${aquaticSpecies.map((s) => s.commonName).join(', ')}]

**Key Habitats:**
[Describe the Annex I aquatic habitats present and their ecological function]

**Connectivity:**
[How this water body connects to the wider river system and why this matters for migratory species like salmon and lamprey]

**Threats & Sensitivities:**
[Main pressures and sensitivities: water quality, hydrological changes, barriers to fish passage, sedimentation, invasive species]

**Implications for Development:**
[What a developer must consider: buffer zones, timing restrictions, pollution prevention, and when Appropriate Assessment is required]`)
  } else {
    parts.push(`\nProvide your analysis in this exact format:

**Ecological Summary:**
[3-4 sentences describing the water body's ecological characteristics and importance]

**Water Quality (WFD):**
[Current WFD status (${wfdStatus || 'if known'}), what this means ecologically, and key pressures]

**Likely Aquatic Species:**
[Based on habitat type and location, what protected species (salmon, lamprey, otter, crayfish) might use this water body]

**Habitat Features:**
[Key habitat features: riffle/pool sequences, spawning gravels, marginal vegetation, connectivity]

**Threats & Pressures:**
[Main pressures affecting water quality and ecology]

**Implications for Development:**
[What a developer should consider if proposing works near this water body]`)
  }

  return parts.join('\n')
}
