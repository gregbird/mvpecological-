import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import * as XLSX from 'xlsx'
import { gridRefToItm } from '@/lib/utils/grid-reference'

const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'
const FETCH_TIMEOUT = 20_000 // 20 seconds per external request
const MAX_XLSX_SIZE = 10 * 1024 * 1024 // 10 MB
// Raised from 50 so multi-site projects (20+ sites) can send a single
// dedupe'd batch of grid refs covering all sites in one request instead of
// paying per-request overhead for each site.
const MAX_GRID_REFS = 200
const VALID_RESOLUTIONS = [1000, 2000, 10000] as const
const SESSION_TTL = 5 * 60 * 1000 // 5 minutes

export interface NBDCReportSpecies {
  gridSquare: string
  speciesGroup: string
  speciesName: string
  recordCount: number
  dateOfLastRecord: string | null
  datasetTitle: string | null
  designation: string | null
}

// ── Session cache ────────────────────────────────────────────────────────────
let cachedSession: { cookies: string; xsrfToken: string; expiresAt: number } | null = null

async function getNBDCSession(): Promise<{ cookies: string; xsrfToken: string } | null> {
  // Return cached session if still valid
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession
  }

  try {
    const response = await fetch(`${NBDC_BASE_URL}/Map/Terrestrial`, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })

    let setCookies: string[] = []

    if (typeof response.headers.getSetCookie === 'function') {
      setCookies = response.headers.getSetCookie()
    }

    if (setCookies.length === 0) {
      const raw = response.headers.get('set-cookie') || ''
      if (raw) {
        setCookies = raw.split(/,\s*(?=[A-Za-z_]+=)/)
      }
    }

    if (setCookies.length === 0) {
      console.error('[NBDC Session] No set-cookie headers received')
      return null
    }

    const cookieValues: string[] = []
    let xsrfToken = ''

    for (const cookie of setCookies) {
      const nameValue = cookie.split(';')[0].trim()
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

    if (!xsrfToken) {
      console.error('[NBDC Session] XSRF token not found')
      return null
    }

    const session = { cookies: cookieValues.join('; '), xsrfToken }
    cachedSession = { ...session, expiresAt: Date.now() + SESSION_TTL }
    return session
  } catch (error) {
    console.error('[NBDC Session] Failed to get session:', error)
    return null
  }
}

// ── Report generation + parse ────────────────────────────────────────────────

async function generateAndParseReport(
  gridRef: string,
  resolution: number,
  session: { cookies: string; xsrfToken: string }
): Promise<NBDCReportSpecies[]> {
  try {
    const tStart = Date.now()
    const cleanRef = gridRef.replace(/\s+/g, '')
    const itm = gridRefToItm(cleanRef)
    const xMin = itm.easting
    const yMin = itm.northing
    const xMax = xMin + resolution
    const yMax = yMin + resolution

    // Generate report
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
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
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

    // Download XLSX with size guard
    const xlsxUrl = reportData.result.reportUrl
    const xlsxResponse = await fetch(xlsxUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })

    if (!xlsxResponse.ok) {
      console.error(`[NBDC Report] XLSX download failed for ${cleanRef}: ${xlsxResponse.status}`)
      return []
    }

    const contentLength = parseInt(xlsxResponse.headers.get('content-length') || '0')
    if (contentLength > MAX_XLSX_SIZE) {
      console.error(`[NBDC Report] XLSX too large for ${cleanRef}: ${contentLength} bytes`)
      return []
    }

    const buffer = await xlsxResponse.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })

    const sheet = workbook.Sheets['Species Result']
    if (!sheet) {
      console.error(`[NBDC Report] No "Species Result" sheet for ${cleanRef}`)
      return []
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    // Validate column names on first row
    if (rows.length > 0 && !rows[0]['Species name']) {
      console.error('[NBDC Report] Column name mismatch. Keys:', Object.keys(rows[0]))
      return []
    }

    const parsed = rows
      .map((row) => ({
        gridSquare:
          !row['Grid square'] || row['Grid square'] === 'Custom'
            ? cleanRef
            : String(row['Grid square']),
        speciesGroup: String(row['Species group'] || ''),
        speciesName: String(row['Species name'] || ''),
        recordCount: Number(row['Record count'] || 0),
        dateOfLastRecord: row['Date of last record'] ? String(row['Date of last record']) : null,
        datasetTitle: row['Title of dataset'] ? String(row['Title of dataset']) : null,
        designation: row['Designation'] ? String(row['Designation']) : null,
      }))
      .filter((s) => s.speciesName.length > 0)

    console.error(`[NBDC Report] ${cleanRef}: ${parsed.length} species in ${Date.now() - tStart}ms`)
    return parsed
  } catch (error) {
    // Catch gridRefToItm throws, timeouts, parse errors — don't poison other batches
    console.error(`[NBDC Report] Error processing ${gridRef}:`, error)
    return []
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { gridReferences, resolution = 10000 } = body

    // Input validation
    if (!gridReferences || !Array.isArray(gridReferences) || gridReferences.length === 0) {
      return NextResponse.json({ error: 'gridReferences array is required' }, { status: 400 })
    }
    if (!VALID_RESOLUTIONS.includes(resolution)) {
      return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 })
    }

    const refs = gridReferences
      .filter((r: unknown) => typeof r === 'string' && r.length >= 2 && r.length <= 10)
      .slice(0, MAX_GRID_REFS)

    if (refs.length === 0) {
      return NextResponse.json({ error: 'No valid grid references' }, { status: 400 })
    }

    // Get NBDC session
    const t0 = Date.now()
    const session = await getNBDCSession()
    if (!session) {
      return NextResponse.json(
        { species: [], error: 'Failed to establish NBDC session' },
        { status: 502 }
      )
    }
    const tSession = Date.now()

    const allSpecies: NBDCReportSpecies[] = []

    // Pooled worker pattern — 10 concurrent NBDC requests at any given time.
    // Previously this was a chunked `Promise.all` which suffers from
    // head-of-line blocking: one slow grid ref stalls the entire chunk,
    // leaving the other 7 workers idle until it completes. The pool keeps
    // every worker busy and finishes a 200-ref batch much faster in practice.
    const CONCURRENCY = 10
    const results: NBDCReportSpecies[][] = new Array(refs.length)
    let nextIdx = 0
    const workers = Array.from({ length: Math.min(CONCURRENCY, refs.length) }, async () => {
      while (true) {
        const myIdx = nextIdx++
        if (myIdx >= refs.length) return
        results[myIdx] = await generateAndParseReport(refs[myIdx], resolution, session)
      }
    })
    await Promise.all(workers)

    for (const r of results) {
      if (r) allSpecies.push(...r)
    }

    const tDone = Date.now()
    console.error(
      `[NBDC Report] ${refs.length} grid refs @ ${resolution}m — session: ${tSession - t0}ms, reports: ${tDone - tSession}ms, total: ${tDone - t0}ms`
    )

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
