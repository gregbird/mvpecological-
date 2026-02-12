import { NextRequest, NextResponse } from 'next/server'

const NPWS_USER_AGENT = 'Mozilla/5.0 (compatible; DulraBot/1.0; Ecological Assessment Tool)'

/**
 * Lightweight NPWS page scraper for NHA/pNHA sites.
 * Extracts Qualifying Interests, Statutory Instrument URL, County, and Coordinates.
 * Much faster than the full AI deep-research endpoint.
 *
 * Input: { siteCode, siteType }
 * Output: { qualifyingInterests, statutoryInstrumentUrl, county, coordinates }
 */
export async function POST(request: NextRequest) {
  try {
    const { siteCode, siteType } = await request.json()

    if (!siteCode || !siteType) {
      return NextResponse.json({ error: 'siteCode and siteType required' }, { status: 400 })
    }

    const typePath = siteType === 'NHA' ? 'nha' : siteType === 'pNHA' ? 'pnha' : null
    if (!typePath) {
      return NextResponse.json({ error: 'Only NHA/pNHA supported' }, { status: 400 })
    }

    const url = `https://www.npws.ie/protected-sites/${typePath}/${siteCode}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': NPWS_USER_AGENT },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: 'NPWS page not found' }, { status: 404 })
    }

    const html = await response.text()

    // Extract Qualifying Interests
    const qualifyingInterests: string[] = []
    const qiMatch = html.match(/Qualifying Interests[\s\S]*?<\/(?:div|section|ul|p)>/i)
    if (qiMatch) {
      const qiText = qiMatch[0]
        .replace(/<[^>]+>/g, ' ')
        .replace(/Qualifying Interests/i, '')
        .trim()
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

    return NextResponse.json({
      qualifyingInterests,
      statutoryInstrumentUrl,
      county,
      coordinates,
    })
  } catch (error) {
    console.error('NPWS scrape error:', error)
    return NextResponse.json({ error: 'Failed to scrape NPWS page' }, { status: 500 })
  }
}
