import { NextRequest, NextResponse } from 'next/server'

const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

/**
 * API Route to proxy NBDC taxon details requests
 * This is needed because NBDC doesn't allow CORS requests from browsers
 */
export async function POST(request: NextRequest) {
  try {
    const { taxonId } = await request.json()

    if (!taxonId) {
      return NextResponse.json({ error: 'taxonId is required' }, { status: 400 })
    }

    // Get taxon details from NBDC
    const response = await fetch(
      `${NBDC_BASE_URL}/api/services/app/taxonService/GetTaxon?taxonId=${taxonId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }
    )

    if (!response.ok) {
      console.error(`[NBDC API] GetTaxon failed: ${response.statusText}`)
      return NextResponse.json({ error: 'NBDC taxon fetch failed' }, { status: response.status })
    }

    const data = await response.json()

    if (!data.success || !data.result) {
      return NextResponse.json({ taxon: null })
    }

    const r = data.result
    const designations = (r.designations || '').toLowerCase()

    // Check for protected status - Irish and EU legislation
    const protectionIndicators = [
      'wildlife act', // Irish Wildlife Acts
      'habitats directive', // EU Habitats Directive (Annex II, IV, V)
      'birds directive', // EU Birds Directive (Annex I)
      'flora protection', // Flora Protection Order
      'protected', // Generic "protected" mentions
      'annex ii',
      'annex iv',
      'annex v',
      'annex i',
      'bern convention', // Bern Convention
      'bonn convention', // Bonn Convention (migratory species)
      'cites', // CITES
    ]
    const isProtected = protectionIndicators.some((indicator) => designations.includes(indicator))

    // Check for invasive species
    const invasiveIndicators = ['invasive', 'ias regulation', 'third schedule']
    const isInvasive = invasiveIndicators.some((indicator) => designations.includes(indicator))

    // Check for threatened status - Red List categories
    const threatenedIndicators = [
      'critically endangered',
      'endangered',
      'vulnerable',
      'near threatened',
      'red list',
      'red data',
      'threatened',
    ]
    const isThreatened = threatenedIndicators.some((indicator) => designations.includes(indicator))

    // Return enriched species data
    return NextResponse.json({
      taxon: {
        taxonId: r.taxonId,
        scientificName: r.taxonName,
        commonName: r.commonName,
        taxonGroup: r.taxonGroupName,
        designations: r.designations,
        isProtected,
        isInvasive,
        isThreatened,
        totalRecordsInIreland: r.recordCount,
        gridSquares10km: r.tenKRecordCount,
        gridSquares50km: r.fiftyKRecordCount,
        oldestRecordDate: r.oldestRecord ? r.oldestRecord.split('T')[0] : null,
        newestRecordDate: r.newestRecord ? r.newestRecord.split('T')[0] : null,
        nbdcUrl: `${NBDC_BASE_URL}/species/${r.taxonId}`,
      },
    })
  } catch (error) {
    console.error('[NBDC API] Taxon error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
