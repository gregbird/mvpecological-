import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CHEAP_MODEL } from '@/lib/ai/openai-models'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import {
  findMatchingSACs,
  getAquaticHabitats,
  getAquaticSpecies,
  AQUATIC_HABITAT_CODES,
  AQUATIC_SPECIES_CODES,
} from '@/lib/data/aquatic-sac-lookup'
import {
  getWaterBodyData,
  formatStatusHistory,
  CatchmentsWaterBodyData,
} from '@/lib/external-apis/catchments'
import { calculateRiverDistanceToSAC, type DownstreamTraceResult } from '@/lib/gis/river-distance'

/**
 * AI Aquatic Deep Research API
 * Finds linked SACs for rivers/lakes and generates AI analysis with real WFD data
 *
 * Input: { waterBodyName, waterBodyType, waterBodyCode, wfdStatus, catchmentName }
 * Output: { summary, linkedSACs, wfdData, resources }
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
      projectLat,
      projectLng,
    } = await request.json()

    if (!waterBodyName) {
      return NextResponse.json({ error: 'waterBodyName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // 1. Find matching SACs (with geographic filtering when coordinates available)
    const linkedSACs = findMatchingSACs(waterBodyName, waterBodyType, projectLat, projectLng)
    const bestMatch = linkedSACs.length > 0 ? linkedSACs[0] : null

    // 2. Fetch WFD data and river distance in parallel
    const knownSACCodes = linkedSACs.map((s) => s.siteCode)

    const [wfdData, riverDistanceResult] = (await Promise.all([
      waterBodyCode ? getWaterBodyData(waterBodyCode) : Promise.resolve(null),
      waterBodyCode && projectLat && projectLng
        ? calculateRiverDistanceToSAC(
            { lat: projectLat, lng: projectLng },
            waterBodyCode,
            knownSACCodes
          ).catch(
            (): DownstreamTraceResult => ({
              riverDistanceKm: null,
              downstreamPath: [],
              sacReached: null,
              truncatedAt15km: false,
              error: 'River distance calculation unavailable',
            })
          )
        : Promise.resolve(null),
    ])) as [CatchmentsWaterBodyData | null, DownstreamTraceResult | null]

    // 3. Extract aquatic habitats and species from best match
    let aquaticHabitats: Array<{ code: string; name: string; description: string }> = []
    let aquaticSpecies: Array<{ code: string; name: string; commonName: string }> = []

    if (bestMatch) {
      aquaticHabitats = getAquaticHabitats(bestMatch.habitats)
      aquaticSpecies = getAquaticSpecies(bestMatch.species)
    }

    // 4. Build context for AI with real data
    const contextParts: string[] = []

    contextParts.push(`Water Body: ${waterBodyName}`)
    contextParts.push(`Type: ${waterBodyType || 'Unknown'}`)

    if (waterBodyCode) {
      contextParts.push(`EPA Code: ${waterBodyCode}`)
    }

    // Add real WFD data if available
    if (wfdData) {
      contextParts.push(`\n--- REAL WFD DATA FROM CATCHMENTS.IE ---`)
      contextParts.push(`Current WFD Status: ${wfdData.CurrentStatus || 'Not assessed'}`)
      contextParts.push(`Risk Assessment: ${wfdData.Tier1Risk || 'Unknown'}`)

      if (wfdData.StatusHistory.length > 0) {
        contextParts.push(`\nStatus History:`)
        const formattedHistory = formatStatusHistory(wfdData.StatusHistory).slice(0, 4)
        for (const h of formattedHistory) {
          contextParts.push(`- ${h.period}: ${h.status}`)
          if (h.details.length > 0) {
            contextParts.push(`  (${h.details.join(', ')})`)
          }
        }
      }

      if (wfdData.Trends.length > 0) {
        contextParts.push(`\nWater Quality Trends:`)
        for (const t of wfdData.Trends) {
          contextParts.push(`- ${t.ParameterName}: ${t.TrendDesc}`)
        }
      }

      if (wfdData.Failures.length > 0) {
        contextParts.push(`\nEnvironmental Failures:`)
        for (const f of wfdData.Failures) {
          contextParts.push(`- ${f.Name}`)
        }
      }

      if (wfdData.InputOutputs.length > 0) {
        const inputs = wfdData.InputOutputs.filter((io) => io.Direction === 'Input')
        const outputs = wfdData.InputOutputs.filter((io) => io.Direction === 'Output')
        if (inputs.length > 0) {
          contextParts.push(`\nUpstream Water Bodies: ${inputs.map((i) => i.Name).join(', ')}`)
        }
        if (outputs.length > 0) {
          contextParts.push(`Downstream Water Bodies: ${outputs.map((o) => o.Name).join(', ')}`)
        }
      }

      if (wfdData.CatchmentName) {
        contextParts.push(`Catchment: ${wfdData.CatchmentName}`)
      }
      if (wfdData.SubCatchmentName) {
        contextParts.push(`Sub-Catchment: ${wfdData.SubCatchmentName}`)
      }
    } else if (wfdStatus) {
      // Fallback to EPA data if Catchments.ie data not available
      contextParts.push(`WFD Status (from EPA): ${wfdStatus}`)
    }

    // Add river distance data if available
    if (riverDistanceResult?.riverDistanceKm != null) {
      contextParts.push(`\n--- RIVER NETWORK DISTANCE ---`)
      contextParts.push(`Distance along river: ${riverDistanceResult.riverDistanceKm} km`)
      if (riverDistanceResult.sacReached) {
        contextParts.push(
          `SAC reached: ${riverDistanceResult.sacReached.siteCode} at ${riverDistanceResult.sacReached.distanceKm} km`
        )
      }
      if (riverDistanceResult.truncatedAt15km) {
        contextParts.push(`Note: Trace stopped at 15km Zone of Influence threshold`)
      }
      if (riverDistanceResult.downstreamPath.length > 0) {
        contextParts.push(`Downstream path:`)
        for (const step of riverDistanceResult.downstreamPath) {
          contextParts.push(
            `- ${step.waterBodyName} (${step.waterBodyType}): ${step.distanceKm} km (cumulative: ${step.cumulativeKm} km)`
          )
        }
      }
    }

    if (catchmentName) {
      contextParts.push(`Catchment: ${catchmentName}`)
    }

    if (bestMatch) {
      contextParts.push(`\n--- LINKED NATURA 2000 SITE ---`)
      contextParts.push(`Linked SAC: ${bestMatch.siteName} (${bestMatch.siteCode})`)
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

    // 5. Build AI prompt
    const prompt = buildAquaticPrompt({
      waterBodyName,
      waterBodyType: waterBodyType || 'water body',
      context: contextParts.join('\n'),
      wfdData,
      hasLinkedSAC: !!bestMatch,
      aquaticSpecies,
    })

    // 6. Call OpenAI
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
              'You are an expert Irish freshwater ecologist with deep knowledge of the Water Framework Directive (WFD), EU Habitats Directive, Irish rivers and lakes, aquatic habitats, and water quality assessment. You understand the ecological requirements of protected species like Atlantic Salmon, Freshwater Pearl Mussel, and Lamprey species. Provide detailed, factual analyses suitable for Ecological Impact Assessment reports and Appropriate Assessment screening. IMPORTANT: Base your analysis ONLY on the provided data. Do not speculate about species presence if no data confirms it. If data is limited, clearly state what is known and what is unknown. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
          },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 6000,
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

    // 7. Build resource URLs
    const resources: Record<string, string | undefined> = {
      catchmentsUrl: 'https://www.catchments.ie',
      epaWaterMapUrl: 'https://gis.epa.ie/EPAMaps/Water',
      hydroNetUrl: 'https://epa.ie/hydronet/',
      wfdDataUrl: 'https://www.catchments.ie/wfd-data-dashboards/',
    }

    // Add water body specific URL
    if (waterBodyCode) {
      resources.waterBodyUrl = `https://catchments.ie/waterbodies/${encodeURIComponent(waterBodyCode)}`
    }

    // Add SAC-specific URLs if we have a match
    if (bestMatch) {
      resources.sacUrl = `https://www.npws.ie/protected-sites/sac/${bestMatch.siteCode.replace('IE', '')}`
      resources.sscoUrl = bestMatch.sscoUrl
      resources.siUrl = bestMatch.siUrl
    }

    return NextResponse.json({
      summary,
      waterBodyName,
      waterBodyType,
      waterBodyCode,
      wfdStatus: wfdData?.CurrentStatus || wfdStatus,
      wfdData: wfdData
        ? {
            currentStatus: wfdData.CurrentStatus,
            risk: wfdData.Tier1Risk,
            statusHistory: formatStatusHistory(wfdData.StatusHistory),
            trends: wfdData.Trends,
            failures: wfdData.Failures,
            connectivity: wfdData.InputOutputs,
            catchmentName: wfdData.CatchmentName,
            subCatchmentName: wfdData.SubCatchmentName,
          }
        : null,
      riverDistance: riverDistanceResult
        ? {
            riverDistanceKm: riverDistanceResult.riverDistanceKm,
            downstreamPath: riverDistanceResult.downstreamPath,
            sacReached: riverDistanceResult.sacReached,
            truncatedAt15km: riverDistanceResult.truncatedAt15km,
            error: riverDistanceResult.error,
          }
        : null,
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
  wfdData,
  hasLinkedSAC,
  aquaticSpecies,
}: {
  waterBodyName: string
  waterBodyType: string
  context: string
  wfdData: CatchmentsWaterBodyData | null
  hasLinkedSAC: boolean
  aquaticSpecies: Array<{ code: string; name: string; commonName: string }>
}): string {
  const parts: string[] = []

  parts.push(
    `Provide a detailed ecological analysis for the Irish ${waterBodyType.toLowerCase()} "${waterBodyName}" for use in ecological assessment.`
  )

  parts.push(`\n**Available Data:**\n${context}`)

  // Customize prompt based on what data we have
  if (wfdData) {
    // We have real Catchments.ie data
    parts.push(`\nProvide your analysis in this exact format:

**Ecological Summary:**
[3-4 sentences describing the water body's ecological importance based on the WFD data provided. Reference the actual status and risk assessment.]

**Water Quality Assessment:**
[Analyze the WFD status history provided. Describe the trend (improving/declining/stable). Explain what the current status means ecologically. Reference any failures or trends from the data.]

${
  hasLinkedSAC && aquaticSpecies.length > 0
    ? `**Protected Species:**
[For each Annex II species listed in the linked SAC, describe: habitat requirements, sensitivity to the current water quality conditions, and implications of the WFD status for their conservation. Focus on: ${aquaticSpecies.map((s) => s.commonName).join(', ')}]

**Key Habitats:**
[Describe the Annex I aquatic habitats present in the linked SAC and their ecological function]`
    : `**Aquatic Biodiversity:**
[Based on the water body type, location, and WFD status, describe the likely aquatic communities. Be factual - only mention species if there is evidence in the data.]`
}

**Hydrological Connectivity:**
[Describe the upstream/downstream connections if provided. Explain why connectivity matters for migratory species and nutrient flow.]

**Pressures & Threats:**
[Analyze the failures and trends from the WFD data. Explain what the identified pollutants or issues mean for aquatic ecology. Be specific about what the data shows.]

**Implications for Development:**
[Based on the actual WFD status and any linked SAC, provide specific guidance: buffer zones, timing restrictions, pollution prevention measures, and when Appropriate Assessment may be required.]`)
  } else {
    // No Catchments.ie data - more limited analysis
    parts.push(`\nNote: No detailed WFD data was available from Catchments.ie for this water body. Provide your analysis based on the limited data available.

Provide your analysis in this exact format:

**Ecological Summary:**
[2-3 sentences describing the water body's general characteristics based on type and location. State clearly that detailed WFD data was not available.]

**Water Quality (WFD):**
[State the known WFD status if available, or note that it is unknown. Do not speculate about water quality.]

${
  hasLinkedSAC && aquaticSpecies.length > 0
    ? `**Protected Species:**
[For each Annex II species in the linked SAC: ${aquaticSpecies.map((s) => s.commonName).join(', ')}. Describe their general habitat requirements.]`
    : `**Potential Ecological Value:**
[Based on water body type, describe general ecological features without speculating about specific species presence.]`
}

**Data Gaps:**
[List what information is missing and what further data collection would be valuable.]

**Precautionary Recommendations:**
[Given limited data, what precautionary measures should be considered for any development near this water body?]`)
  }

  return parts.join('\n')
}
