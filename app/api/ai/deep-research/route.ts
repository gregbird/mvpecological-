import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'
import { getNPWSSiteData, type NPWSSiteData } from '@/lib/data/npws-site-lookup'

/**
 * AI Deep Research API
 * Fetches the SSCO PDF for a designated site, extracts text,
 * and uses OpenAI to generate a detailed conservation summary.
 *
 * Input: { siteCode, siteName, siteType }
 * Output: { summary, habitats, species, sscoUrl, siteData }
 */
export async function POST(request: NextRequest) {
  try {
    const { siteCode, siteName, siteType } = await request.json()

    if (!siteCode || !siteName) {
      return NextResponse.json({ error: 'siteCode and siteName are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // 1. Get site data from Excel-derived JSON
    const siteData = getNPWSSiteData(siteCode)

    // 2. Try to fetch and parse SSCO PDF
    let pdfText = ''
    const sscoUrl = siteData?.sscoUrl || null

    if (sscoUrl) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000)

        const pdfResponse = await fetch(sscoUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DulraBot/1.0; Ecological Assessment Tool)',
          },
        })
        clearTimeout(timeoutId)

        if (pdfResponse.ok) {
          const arrayBuffer = await pdfResponse.arrayBuffer()
          const pdfData = await extractText(new Uint8Array(arrayBuffer), { mergePages: true })
          pdfText =
            typeof pdfData.text === 'string'
              ? pdfData.text
              : Array.isArray(pdfData.text)
                ? (pdfData.text as string[]).join('\n')
                : String(pdfData.text || '')

          // Limit text to avoid token limits (approx 8000 chars)
          if (pdfText.length > 8000) {
            pdfText = pdfText.substring(0, 8000)
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch/parse SSCO PDF: ${sscoUrl}`, err)
      }
    }

    // 3. For NHA sites without Excel data, scrape the NPWS web page as fallback
    let webPageText = ''
    if (!siteData && siteType === 'NHA') {
      try {
        const nhaUrl = `https://www.npws.ie/protected-sites/nha/${siteCode}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const webResponse = await fetch(nhaUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DulraBot/1.0; Ecological Assessment Tool)',
          },
        })
        clearTimeout(timeoutId)

        if (webResponse.ok) {
          const html = await webResponse.text()
          webPageText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()

          if (webPageText.length > 6000) {
            webPageText = webPageText.substring(0, 6000)
          }
        }
      } catch (err) {
        console.warn(`Failed to scrape NHA page for ${siteCode}:`, err)
      }
    }

    // 4. Build habitat and species context from Excel data
    const habitatContext = buildHabitatContext(siteData)
    const speciesContext = buildSpeciesContext(siteData)

    // 5. Build AI prompt
    const prompt = buildPrompt({
      siteName,
      siteCode,
      siteType,
      pdfText,
      webPageText,
      habitatContext,
      speciesContext,
      siteData,
    })

    // 6. Call OpenAI
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
              'You are an expert Irish ecological consultant with deep knowledge of NPWS designated sites, EU Habitats Directive, EU Birds Directive, and Site-Specific Conservation Objectives (SSCO). Provide detailed, factual analyses suitable for Appropriate Assessment screening and Ecological Impact Assessment reports.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
      siteCode,
      sscoUrl,
      hadPdfContent: !!pdfText,
      hadWebContent: !!webPageText,
      siteData: siteData
        ? {
            siteType: siteData.siteType,
            siteArea: siteData.siteArea,
            latitude: siteData.latitude,
            longitude: siteData.longitude,
            siUrl: siteData.siUrl,
            sscoUrl: siteData.sscoUrl,
            habitats: siteData.habitats || [],
            species: siteData.species || [],
            birdSpecies: siteData.birdSpecies || [],
            isWetland: siteData.isWetland || false,
          }
        : null,
    })
  } catch (error) {
    console.error('Deep research error:', error)
    return NextResponse.json({ error: 'Failed to generate deep research' }, { status: 500 })
  }
}

function buildHabitatContext(siteData: NPWSSiteData | null): string {
  if (!siteData?.habitats?.length) return ''
  return siteData.habitats.map((h) => `- [${h.code}] ${h.name}`).join('\n')
}

function buildSpeciesContext(siteData: NPWSSiteData | null): string {
  if (!siteData) return ''

  const species: string[] = []

  if (siteData.species?.length) {
    species.push(...siteData.species.map((s) => `- [${s.code}] ${s.name} (Annex II)`))
  }

  if (siteData.birdSpecies?.length) {
    species.push(...siteData.birdSpecies.map((s) => `- [${s.code}] ${s.name} (Bird SCI)`))
  }

  return species.join('\n')
}

function buildPrompt({
  siteName,
  siteCode,
  siteType,
  pdfText,
  webPageText,
  habitatContext,
  speciesContext,
  siteData,
}: {
  siteName: string
  siteCode: string
  siteType: string
  pdfText: string
  webPageText: string
  habitatContext: string
  speciesContext: string
  siteData: NPWSSiteData | null
}): string {
  const parts: string[] = []

  parts.push(
    `Provide a detailed conservation analysis for the Irish designated site "${siteName}" (${siteType} - Site Code: ${siteCode}).`
  )

  if (siteData) {
    parts.push(`\nSite area: ${siteData.siteArea?.toFixed(1)} hectares`)
    parts.push(
      `Location: ${siteData.latitude?.toFixed(4)}°N, ${Math.abs(siteData.longitude || 0).toFixed(4)}°W`
    )
  }

  if (habitatContext) {
    parts.push(`\nAnnex I Qualifying Interest Habitats:\n${habitatContext}`)
  }

  if (speciesContext) {
    parts.push(`\nQualifying Interest Species:\n${speciesContext}`)
  }

  if (pdfText) {
    parts.push(`\nSite-Specific Conservation Objectives (SSCO) document content:\n${pdfText}`)
  }

  if (webPageText) {
    parts.push(`\nNPWS Site Synopsis (scraped from web page):\n${webPageText}`)
  }

  parts.push(`\nProvide your analysis in this exact format:

**Conservation Summary:**
[3-4 sentences describing the site's ecological importance, key habitats, and conservation significance]

**Key Habitats & Condition:**
[For each qualifying habitat, one line: habitat name - current condition/status if known]

**Species of Interest:**
[Key protected species and their significance at this site]

**Threats & Pressures:**
[Main threats and pressures affecting the site]

**Implications for Development:**
[What a developer/planner should consider if proposing works near this site]`)

  return parts.join('\n')
}
