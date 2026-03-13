import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'

const NBDC_BASE_URL = 'https://maps.biodiversityireland.ie'

/**
 * API Route to proxy NBDC grid-based species records
 * Fetches species recorded in a given Irish Grid square from Biodiversity Ireland
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { gridReference, startYear } = await request.json()

    if (!gridReference) {
      return NextResponse.json({ error: 'gridReference is required' }, { status: 400 })
    }

    // Remove spaces from grid reference for the API call
    const gridRef = gridReference.replace(/\s+/g, '')

    // Try the NBDC API endpoint for grid-based records
    const url = new URL(`${NBDC_BASE_URL}/Api/Records/Grid/${gridRef}`)
    if (startYear) {
      url.searchParams.set('startYear', startYear.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      // If the direct API doesn't work, try the ABP service endpoint
      const fallbackUrl = new URL(
        `${NBDC_BASE_URL}/api/services/app/recordService/GetRecordsByGrid`
      )
      fallbackUrl.searchParams.set('gridRef', gridRef)
      if (startYear) {
        fallbackUrl.searchParams.set('startYear', startYear.toString())
      }

      const fallbackResponse = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ gridRef, startYear }),
      })

      if (!fallbackResponse.ok) {
        console.error(
          `[NBDC Grid] Both endpoints failed. Primary: ${response.status}, Fallback: ${fallbackResponse.status}`
        )
        return NextResponse.json({ records: [], error: 'NBDC grid search unavailable' })
      }

      const fallbackData = await fallbackResponse.json()
      return NextResponse.json({
        records: fallbackData.result || fallbackData || [],
      })
    }

    const data = await response.json()
    return NextResponse.json({ records: Array.isArray(data) ? data : data.records || [] })
  } catch (error) {
    console.error('[NBDC Grid] Error:', error)
    return NextResponse.json({ records: [], error: 'Internal server error' })
  }
}
