import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import * as XLSX from 'xlsx'
import { gridRefToItm } from '@/lib/utils/grid-reference'

const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

export interface NBDCReportSpecies {
  gridSquare: string
  speciesGroup: string
  speciesName: string
  recordCount: number
  dateOfLastRecord: string | null
  datasetTitle: string | null
  designation: string | null
}

/**
 * Get session cookies + XSRF token from NBDC
 * Required for the report generation API
 */
async function getNBDCSession(): Promise<{ cookies: string; xsrfToken: string } | null> {
  try {
    const response = await fetch(`${NBDC_BASE_URL}/Map/Terrestrial`, {
      redirect: 'follow',
    })

    const setCookieHeader = response.headers.get('set-cookie')
    if (!setCookieHeader) return null

    // Parse cookies from the header
    const cookieParts = setCookieHeader.split(/,(?=[^ ])/)
    const cookieValues: string[] = []
    let xsrfToken = ''

    for (const part of cookieParts) {
      const nameValue = part.split(';')[0].trim()
      if (nameValue.startsWith('XSRF-TOKEN=')) {
        xsrfToken = decodeURIComponent(nameValue.split('=').slice(1).join('='))
        cookieValues.push(nameValue)
      } else if (
        nameValue.startsWith('__RequestVerificationToken=') ||
        nameValue.startsWith('ASP.NET_SessionId=')
      ) {
        cookieValues.push(nameValue)
      }
    }

    if (!xsrfToken) return null

    return { cookies: cookieValues.join('; '), xsrfToken }
  } catch (error) {
    console.error('[NBDC Session] Failed to get session:', error)
    return null
  }
}

/**
 * Generate an NBDC report for a single grid square and parse the XLSX
 */
async function generateAndParseReport(
  gridRef: string,
  resolution: number,
  session: { cookies: string; xsrfToken: string }
): Promise<NBDCReportSpecies[]> {
  const cleanRef = gridRef.replace(/\s+/g, '')

  // Convert grid reference to ING coordinates for bounding box
  const itm = gridRefToItm(cleanRef)
  const xMin = itm.easting
  const yMin = itm.northing
  const xMax = xMin + resolution
  const yMax = yMin + resolution

  // Generate report via NBDC API
  const reportResponse = await fetch(
    `${NBDC_BASE_URL}/api/services/app/reportService/GenerateReport`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': session.xsrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: session.cookies,
      },
      body: JSON.stringify({
        reportType: 1,
        xMin,
        yMin,
        xMax,
        yMax,
        gridSquare: cleanRef,
        resolution,
        uid: `dulra-${cleanRef}-${Date.now()}`,
        mapImageUrl: '',
        overviewMapImageUrl: '',
      }),
    }
  )

  if (!reportResponse.ok) {
    console.error(`[NBDC Report] GenerateReport failed for ${cleanRef}: ${reportResponse.status}`)
    return []
  }

  const reportData = await reportResponse.json()
  if (!reportData.success || !reportData.result?.reportUrl) {
    console.error(`[NBDC Report] No report URL for ${cleanRef}`)
    return []
  }

  // Download the XLSX file
  const xlsxUrl = reportData.result.reportUrl
  const xlsxResponse = await fetch(encodeURI(xlsxUrl))
  if (!xlsxResponse.ok) {
    console.error(`[NBDC Report] Failed to download XLSX for ${cleanRef}: ${xlsxResponse.status}`)
    return []
  }

  const buffer = await xlsxResponse.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })

  // Parse "Species Result" sheet
  const sheet = workbook.Sheets['Species Result']
  if (!sheet) {
    console.error(`[NBDC Report] No "Species Result" sheet in XLSX for ${cleanRef}`)
    return []
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  return rows
    .map((row) => ({
      gridSquare: String(row['Grid square'] || cleanRef),
      speciesGroup: String(row['Species group'] || ''),
      speciesName: String(row['Species name'] || ''),
      recordCount: Number(row['Record count'] || 0),
      dateOfLastRecord: row['Date of last record'] ? String(row['Date of last record']) : null,
      datasetTitle: row['Title of dataset'] ? String(row['Title of dataset']) : null,
      designation: row['Designation'] ? String(row['Designation']) : null,
    }))
    .filter((s) => s.speciesName.length > 0)
}

/**
 * API Route: Fetch species records from NBDC via report generation
 *
 * Accepts an array of Irish Grid references, generates NBDC reports for each,
 * parses the XLSX output, and returns a consolidated species list.
 *
 * Body: { gridReferences: string[], resolution?: number }
 * - gridReferences: e.g. ["O13", "O14"] for 10km, ["O1030"] for 1km
 * - resolution: 10000 (default), 2000, or 1000
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { gridReferences, resolution = 10000 } = await request.json()

    if (!gridReferences || !Array.isArray(gridReferences) || gridReferences.length === 0) {
      return NextResponse.json({ error: 'gridReferences array is required' }, { status: 400 })
    }

    // Limit to prevent excessive API calls
    const maxRefs = resolution === 10000 ? 20 : resolution === 2000 ? 10 : 15
    const refs = gridReferences.slice(0, maxRefs)

    // Get NBDC session (cookies + XSRF token)
    const session = await getNBDCSession()
    if (!session) {
      return NextResponse.json(
        { species: [], error: 'Failed to establish NBDC session' },
        { status: 502 }
      )
    }

    const allSpecies: NBDCReportSpecies[] = []

    // Generate reports in batches of 3 (parallel within batch)
    const batchSize = 3
    for (let i = 0; i < refs.length; i += batchSize) {
      const batch = refs.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map((ref: string) => generateAndParseReport(ref, resolution, session))
      )
      allSpecies.push(...results.flat())
    }

    return NextResponse.json({
      species: allSpecies,
      gridSquaresSearched: refs.length,
      totalRecords: allSpecies.length,
      designatedCount: allSpecies.filter((s) => s.designation).length,
    })
  } catch (error) {
    console.error('[NBDC Report] Error:', error)
    return NextResponse.json({ species: [], error: 'Failed to generate report' }, { status: 500 })
  }
}
