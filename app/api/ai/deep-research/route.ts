import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CHEAP_MODEL } from '@/lib/ai/openai-models'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { extractText } from 'unpdf'
import { getNPWSSiteData, type NPWSSiteData } from '@/lib/data/npws-site-lookup'
import { getArticle17Data } from '@/lib/data/article17-habitats'

const NPWS_USER_AGENT = 'Mozilla/5.0 (compatible; DulraBot/1.0; Ecological Assessment Tool)'
const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

/**
 * AI Deep Research API
 * Fetches SSCO/Synopsis PDFs for designated sites, extracts text,
 * enriches with NBDC species data, and uses OpenAI to generate
 * a detailed conservation summary.
 *
 * Supports: SAC, SPA (SSCO PDF + Excel), NHA, pNHA (Synopsis PDF + web scraping)
 *
 * Input: { siteCode, siteName, siteType }
 * Output: { summary, habitats, species, sscoUrl, siteData, nbdcSpecies }
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { siteCode, siteName, siteType } = await request.json()

    if (!siteCode || !siteName) {
      return NextResponse.json({ error: 'siteCode and siteName are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // 1. Get site data from Excel-derived JSON (SAC/SPA only)
    const siteData = getNPWSSiteData(siteCode)

    // 2. Try to fetch and parse SSCO PDF (SAC/SPA with known SSCO URL)
    let pdfText = ''
    const sscoUrl = siteData?.sscoUrl || null

    if (sscoUrl) {
      pdfText = await fetchAndParsePdf(sscoUrl)
    }

    // 3. For NHA/pNHA: fetch Synopsis PDF from NPWS
    let synopsisPdfText = ''
    const synopsisUrl = buildSynopsisPdfUrl(siteCode)

    if (!siteData && (siteType === 'NHA' || siteType === 'pNHA')) {
      synopsisPdfText = await fetchAndParsePdf(synopsisUrl)
    }

    // 4. For NHA/pNHA: always scrape NPWS web page for structured data (QIs, SI URL)
    let scrapedData: ScrapedSiteData | null = null
    if (!siteData && (siteType === 'NHA' || siteType === 'pNHA')) {
      scrapedData = await scrapeNPWSPage(siteCode, siteType)
    }
    const webPageText = !synopsisPdfText && scrapedData?.plainText ? scrapedData.plainText : ''

    // 5. Build habitat and species context from Excel data
    const habitatContext = buildHabitatContext(siteData)
    const speciesContext = buildSpeciesContext(siteData)

    // 6. NBDC species enrichment (for all site types)
    const speciesNames = collectSpeciesNames(siteData)
    const nbdcResults = await enrichSpeciesFromNBDC(speciesNames)

    // 7. Build AI prompt with all available data
    const qiContext = scrapedData?.qualifyingInterests?.length
      ? `\nQualifying Interests (from NPWS):\n${scrapedData.qualifyingInterests.map((qi) => `- ${qi}`).join('\n')}`
      : ''

    const prompt = buildPrompt({
      siteName,
      siteCode,
      siteType,
      pdfText: pdfText || synopsisPdfText,
      webPageText: webPageText + qiContext,
      habitatContext,
      speciesContext,
      siteData,
      nbdcContext: buildNBDCContext(nbdcResults),
    })

    // 8. Call OpenAI
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
              'You are an expert Irish ecological consultant with deep knowledge of NPWS designated sites, EU Habitats Directive, EU Birds Directive, and Site-Specific Conservation Objectives (SSCO). Provide detailed, factual analyses suitable for Appropriate Assessment screening and Ecological Impact Assessment reports. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
          },
          { role: 'user', content: prompt },
        ],
        // GPT-5 reasoning models consume tokens for internal "thinking" before
        // producing output — these count toward max_completion_tokens. A low
        // limit (e.g. 1000) means reasoning eats the entire budget and we get
        // empty content back. Bumped to leave headroom for both reasoning and
        // a substantial conservation analysis.
        max_completion_tokens: 6000,
      }),
    })

    if (!aiResponse.ok) {
      const error = await aiResponse.json()
      console.error('[deep-research] OpenAI error:', error)
      return NextResponse.json(
        { error: error.error?.message || 'OpenAI API error' },
        { status: 500 }
      )
    }

    const data = await aiResponse.json()
    const rawContent = data.choices[0]?.message?.content?.trim() || ''
    const finishReason = data.choices[0]?.finish_reason
    if (!rawContent) {
      console.error(
        '[deep-research] Empty AI response. finish_reason:',
        finishReason,
        'usage:',
        data.usage
      )
      return NextResponse.json(
        {
          error: `AI returned empty content (finish_reason: ${finishReason}). Likely token limit hit during reasoning. Try increasing max_completion_tokens.`,
        },
        { status: 500 }
      )
    }
    const summary = toIrishEnglish(rawContent)

    return NextResponse.json({
      summary,
      siteCode,
      sscoUrl: sscoUrl || (synopsisPdfText ? synopsisUrl : null),
      hadPdfContent: !!(pdfText || synopsisPdfText),
      hadWebContent: !!(webPageText || scrapedData),
      hadNbdcData: nbdcResults.length > 0,
      nbdcSpecies: nbdcResults,
      scrapedSiteInfo: scrapedData
        ? {
            qualifyingInterests: scrapedData.qualifyingInterests,
            statutoryInstrumentUrl: scrapedData.statutoryInstrumentUrl,
            county: scrapedData.county,
            coordinates: scrapedData.coordinates,
          }
        : null,
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

// ============================================================================
// PDF Fetching & Parsing
// ============================================================================

/**
 * Build Synopsis PDF URL from site code
 * Works for SAC, SPA, NHA, pNHA - all use the same pattern
 */
function buildSynopsisPdfUrl(siteCode: string): string {
  // Ensure 6-digit format (e.g., '001159' not 'IE0001159')
  const numericCode = siteCode.replace(/^IE/, '').padStart(6, '0')
  return `https://www.npws.ie/sites/default/files/protected-sites/synopsis/SY${numericCode}.pdf`
}

/**
 * Fetch a PDF from URL and extract text using unpdf
 */
async function fetchAndParsePdf(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': NPWS_USER_AGENT },
    })
    clearTimeout(timeoutId)

    if (!response.ok) return ''

    const arrayBuffer = await response.arrayBuffer()
    const pdfData = await extractText(new Uint8Array(arrayBuffer), { mergePages: true })
    let text =
      typeof pdfData.text === 'string'
        ? pdfData.text
        : Array.isArray(pdfData.text)
          ? (pdfData.text as string[]).join('\n')
          : String(pdfData.text || '')

    // Limit text to avoid token limits
    if (text.length > 8000) {
      text = text.substring(0, 8000)
    }
    return text
  } catch (err) {
    console.warn(`Failed to fetch/parse PDF: ${url}`, err)
    return ''
  }
}

// ============================================================================
// Web Scraping for NHA/pNHA
// ============================================================================

interface ScrapedSiteData {
  plainText: string
  qualifyingInterests: string[]
  statutoryInstrumentUrl: string | null
  county: string | null
  coordinates: { lat: number; lng: number } | null
}

/**
 * Scrape NPWS web page for structured site information
 */
async function scrapeNPWSPage(siteCode: string, siteType: string): Promise<ScrapedSiteData | null> {
  const typePath = siteType === 'NHA' ? 'nha' : siteType === 'pNHA' ? 'pnha' : null
  if (!typePath) return null

  try {
    const url = `https://www.npws.ie/protected-sites/${typePath}/${siteCode}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': NPWS_USER_AGENT },
    })
    clearTimeout(timeoutId)

    if (!response.ok) return null

    const html = await response.text()

    // Extract Qualifying Interests
    const qiMatch = html.match(/Qualifying Interests[\s\S]*?<\/(?:div|section|ul|p)>/i)
    const qualifyingInterests: string[] = []
    if (qiMatch) {
      const qiText = qiMatch[0]
        .replace(/<[^>]+>/g, ' ')
        .replace(/Qualifying Interests/i, '')
        .trim()
      // Parse items like "Peatlands [4]" or "Blanket Bogs"
      const items = qiText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      qualifyingInterests.push(...items)
    }

    // Extract Statutory Instrument URL
    let statutoryInstrumentUrl: string | null = null
    const siMatch = html.match(/href="(https?:\/\/www\.irishstatutebook\.ie[^"]+)"/i)
    if (siMatch) {
      statutoryInstrumentUrl = siMatch[1]
    }

    // Extract County
    let county: string | null = null
    const countyMatch = html.match(/County[\s:]*<[^>]*>([^<]+)/i)
    if (countyMatch) {
      county = countyMatch[1].trim()
    }

    // Extract Coordinates
    let coordinates: { lat: number; lng: number } | null = null
    const latMatch = html.match(/Latitude[:\s]*([0-9.-]+)/i)
    const lngMatch = html.match(/Longitude[:\s]*([0-9.-]+)/i)
    if (latMatch && lngMatch) {
      coordinates = { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) }
    }

    // Full plain text (for AI fallback)
    let plainText = html
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

    if (plainText.length > 6000) {
      plainText = plainText.substring(0, 6000)
    }

    return { plainText, qualifyingInterests, statutoryInstrumentUrl, county, coordinates }
  } catch (err) {
    console.warn(`Failed to scrape ${siteType} page for ${siteCode}:`, err)
    return null
  }
}

// ============================================================================
// NBDC Species Enrichment (server-side)
// ============================================================================

interface NBDCEnrichedResult {
  scientificName: string
  commonName: string | null
  taxonGroup: string | null
  designations: string | null
  isProtected: boolean
  isInvasive: boolean
  isThreatened: boolean
  totalRecords: number
  nbdcUrl: string | null
}

/**
 * Collect species names from site data for NBDC enrichment
 */
function collectSpeciesNames(siteData: NPWSSiteData | null): string[] {
  if (!siteData) return []
  const names: string[] = []
  if (siteData.species) {
    names.push(...siteData.species.map((s) => s.name))
  }
  if (siteData.birdSpecies) {
    names.push(...siteData.birdSpecies.map((s) => s.name))
  }
  return names
}

/**
 * Clean scientific name by removing author citation
 */
function cleanScientificName(name: string): string {
  let cleaned = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  cleaned = cleaned.replace(/\s+[A-Z][a-z]*\.?\s*$/, '').trim()
  cleaned = cleaned.replace(/\s+[A-ZÁ-Ž][a-zá-ž]*\.?\s*&.*$/, '').trim()
  return cleaned
}

/**
 * Search NBDC for a species and get taxon details (server-side, no CORS issues)
 */
async function lookupNBDCSpecies(scientificName: string): Promise<NBDCEnrichedResult | null> {
  try {
    const cleanName = cleanScientificName(scientificName)

    // Step 1: Search for taxonId
    const searchResponse = await fetch(`${NBDC_BASE_URL}/Species/GetSpecies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        speciesName: cleanName,
        taxonomicSource: '0',
        iDisplayStart: '0',
        iDisplayLength: '10',
        sEcho: '1',
      }),
    })

    if (!searchResponse.ok) return null
    const searchData = await searchResponse.json()

    // Find taxonId from search results
    let taxonId: number | null = null
    const searchLower = cleanName.toLowerCase()

    for (const row of searchData.aaData || []) {
      const scientificNameInRow = row[7]
      if (scientificNameInRow?.toLowerCase() === searchLower) {
        const id = parseInt(row[1], 10)
        if (!isNaN(id)) {
          taxonId = id
          break
        }
      }
    }
    if (!taxonId) {
      for (const row of searchData.aaData || []) {
        const displayName = row[2]
        const scientificNameInRow = row[7]
        if (
          displayName?.toLowerCase().includes(searchLower) ||
          scientificNameInRow?.toLowerCase().includes(searchLower)
        ) {
          const id = parseInt(row[1], 10)
          if (!isNaN(id)) {
            taxonId = id
            break
          }
        }
      }
    }

    if (!taxonId) return null

    // Step 2: Get taxon details
    const taxonResponse = await fetch(
      `${NBDC_BASE_URL}/api/services/app/taxonService/GetTaxon?taxonId=${taxonId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    )

    if (!taxonResponse.ok) return null
    const taxonData = await taxonResponse.json()
    if (!taxonData.success || !taxonData.result) return null

    const r = taxonData.result
    const designations = (r.designations || '').toLowerCase()

    const protectionIndicators = [
      'wildlife act',
      'habitats directive',
      'birds directive',
      'flora protection',
      'protected',
      'annex ii',
      'annex iv',
      'annex v',
      'annex i',
      'bern convention',
      'bonn convention',
      'cites',
    ]
    const invasiveIndicators = ['invasive', 'ias regulation', 'third schedule']
    const threatenedIndicators = [
      'critically endangered',
      'endangered',
      'vulnerable',
      'near threatened',
      'red list',
      'red data',
      'threatened',
    ]

    return {
      scientificName: r.taxonName,
      commonName: r.commonName,
      taxonGroup: r.taxonGroupName,
      designations: r.designations,
      isProtected: protectionIndicators.some((i) => designations.includes(i)),
      isInvasive: invasiveIndicators.some((i) => designations.includes(i)),
      isThreatened: threatenedIndicators.some((i) => designations.includes(i)),
      totalRecords: r.recordCount || 0,
      nbdcUrl: `${NBDC_BASE_URL}/species/${r.taxonId}`,
    }
  } catch (err) {
    console.warn(`NBDC lookup failed for ${scientificName}:`, err)
    return null
  }
}

/**
 * Enrich multiple species from NBDC (with concurrency limit)
 */
async function enrichSpeciesFromNBDC(speciesNames: string[]): Promise<NBDCEnrichedResult[]> {
  if (speciesNames.length === 0) return []

  const unique = Array.from(new Set(speciesNames))
  // Limit to 10 species to avoid excessive API calls and latency
  const toEnrich = unique.slice(0, 10)

  const results: NBDCEnrichedResult[] = []
  // Process in batches of 3 for reasonable concurrency
  for (let i = 0; i < toEnrich.length; i += 3) {
    const batch = toEnrich.slice(i, i + 3)
    const batchResults = await Promise.allSettled(batch.map((name) => lookupNBDCSpecies(name)))
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }
  }

  return results
}

/**
 * Build NBDC context string for AI prompt
 */
function buildNBDCContext(nbdcResults: NBDCEnrichedResult[]): string {
  if (nbdcResults.length === 0) return ''

  return nbdcResults
    .map((sp) => {
      const parts = [`- ${sp.scientificName}`]
      if (sp.commonName) parts[0] += ` (${sp.commonName})`
      if (sp.taxonGroup) parts.push(`  Group: ${sp.taxonGroup}`)
      if (sp.isProtected) parts.push(`  Status: PROTECTED`)
      if (sp.isInvasive) parts.push(`  Status: INVASIVE`)
      if (sp.isThreatened) parts.push(`  Status: THREATENED`)
      if (sp.designations) parts.push(`  Designations: ${sp.designations}`)
      parts.push(`  Irish records: ${sp.totalRecords}`)
      return parts.join('\n')
    })
    .join('\n')
}

const STATUS_LABEL: Record<string, string> = {
  FV: 'Favourable',
  U1: 'Unfavourable-Inadequate',
  U2: 'Unfavourable-Bad',
  XX: 'Unknown',
}

function buildHabitatContext(siteData: NPWSSiteData | null): string {
  if (!siteData?.habitats?.length) return ''
  return siteData.habitats
    .map((h) => {
      const art17 = getArticle17Data(h.code)
      if (!art17) return `- [${h.code}] ${h.name}`
      const status = STATUS_LABEL[art17.status] || art17.status
      const priority = art17.priorityHabitat ? ' [PRIORITY HABITAT]' : ''
      const pressures = art17.pressures?.length
        ? `\n    Main pressures: ${art17.pressures.slice(0, 5).join(', ')}`
        : ''
      const threats = art17.threats?.length
        ? `\n    Main threats: ${art17.threats.slice(0, 5).join(', ')}`
        : ''
      return `- [${h.code}] ${h.name}${priority}\n    National status: ${status}, trend ${art17.trend}${pressures}${threats}`
    })
    .join('\n')
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
  nbdcContext,
}: {
  siteName: string
  siteCode: string
  siteType: string
  pdfText: string
  webPageText: string
  habitatContext: string
  speciesContext: string
  siteData: NPWSSiteData | null
  nbdcContext: string
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

  if (nbdcContext) {
    parts.push(`\nNBDC Species Data (Irish biodiversity records):\n${nbdcContext}`)
  }

  if (pdfText) {
    const pdfLabel =
      siteType === 'NHA' || siteType === 'pNHA'
        ? 'Site Synopsis (from NPWS PDF)'
        : 'Site-Specific Conservation Objectives (SSCO) document content'
    parts.push(`\n${pdfLabel}:\n${pdfText}`)
  }

  if (webPageText) {
    parts.push(`\nNPWS Site Synopsis (scraped from web page):\n${webPageText}`)
  }

  parts.push(`\nProvide your analysis in this exact format using the available
data above plus your general knowledge of Irish ecology, NPWS designated sites,
EU Habitats/Birds Directives, and CIEEM guidance. When Article 17 status data is
provided for a habitat, reference it specifically (FV/U1/U2 + trend). When such
data is not available (e.g. for NHA/pNHA sites that aren't in the Article 17
report), use general ecological knowledge of the site type and habitats present.
Do NOT ask the user for additional data — work with what is given plus your
expertise. Output the analysis directly without preamble.

**Conservation Summary:**
[3-4 sentences describing the site's ecological importance, key habitats, and conservation significance]

**Key Habitats & Condition:**
[For each qualifying habitat, one line. If Article 17 status was provided: "habitat name — Status: <FV/U1/U2 label> (<trend>)". Otherwise: "habitat name — typical condition / sensitivity for this habitat type in Ireland".]

**Species of Interest:**
[Key protected species and their significance at this site]

**Threats & Pressures:**
[Use pressures/threats from Article 17 data when available, otherwise list typical pressures for this site type and habitats]

**Implications for Development:**
[What a developer/planner should consider if proposing works near this site, prioritising any habitats with Unfavourable (U1/U2) status]`)

  return parts.join('\n')
}
