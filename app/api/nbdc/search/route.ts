import { NextRequest, NextResponse } from 'next/server'

const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

/**
 * API Route to proxy NBDC species search requests
 * This is needed because NBDC doesn't allow CORS requests from browsers
 */
/**
 * Clean scientific name by removing author citation
 * e.g., "Ficaria verna Huds." -> "Ficaria verna"
 * e.g., "Meles meles (Linnaeus, 1758)" -> "Meles meles"
 */
function cleanScientificName(name: string): string {
  // Remove anything in parentheses at the end (author with year)
  let cleaned = name.replace(/\s*\([^)]*\)\s*$/, '').trim()

  // Remove author abbreviations (capital letter followed by period or lowercase letters)
  // Match patterns like "Huds.", "L.", "Linnaeus", etc. at the end
  cleaned = cleaned.replace(/\s+[A-Z][a-z]*\.?\s*$/, '').trim()

  // Also handle cases like "Á. Löve & D. Löve"
  cleaned = cleaned.replace(/\s+[A-ZÁ-Ž][a-zá-ž]*\.?\s*&.*$/, '').trim()

  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const { scientificName: rawName } = await request.json()

    if (!rawName) {
      return NextResponse.json({ error: 'scientificName is required' }, { status: 400 })
    }

    // Clean the scientific name by removing author citation
    const scientificName = cleanScientificName(rawName)

    // Search NBDC for species
    const response = await fetch(`${NBDC_BASE_URL}/Species/GetSpecies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        speciesName: scientificName,
        taxonomicSource: '0',
        iDisplayStart: '0',
        iDisplayLength: '10',
        sEcho: '1',
      }),
    })

    if (!response.ok) {
      console.error(`[NBDC API] Species search failed: ${response.statusText}`)
      return NextResponse.json({ error: 'NBDC search failed' }, { status: response.status })
    }

    const data = await response.json()

    // Find exact or close match and extract taxonId
    let taxonId: number | null = null
    const searchLower = scientificName.toLowerCase()

    for (const row of data.aaData || []) {
      const displayName = row[2] // "Badger (Meles meles)" or "Meles meles"
      if (displayName?.toLowerCase().includes(searchLower)) {
        const id = parseInt(row[1], 10)
        if (!isNaN(id)) {
          taxonId = id
          break
        }
      }
    }

    return NextResponse.json({ taxonId, cleanedName: scientificName })
  } catch (error) {
    console.error('[NBDC API] Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
