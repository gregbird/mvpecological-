/**
 * Catchments.ie API Client
 * Fetches detailed WFD (Water Framework Directive) data from the official Irish water data portal
 *
 * API Endpoint: https://wfdapi.edenireland.ie/api/
 * Documentation: https://catchments.ie
 */

const CATCHMENTS_API_URL = 'https://wfdapi.edenireland.ie/api'

export interface CatchmentsWFDStatus {
  Year: string
  Period: string
  Status: string
  StatusCode?: string
  EcologicalStatus?: string
  ChemicalStatus?: string
  BiologicalElements?: string
  HydromorphologicalElements?: string
  PhysicochemicalElements?: string
  SpecificPollutants?: string
}

export interface CatchmentsTrend {
  ParameterName: string
  TrendDesc: string
  TrendCode?: string
  StartYear?: number
  EndYear?: number
  PValue?: number
}

export interface CatchmentsFailure {
  Name: string
  FailureType?: string
  ParameterName?: string
  Threshold?: number
  MeasuredValue?: number
}

export interface CatchmentsInputOutput {
  Code: string
  Name: string
  Type: string
  Direction: 'Input' | 'Output'
}

export interface CatchmentsWaterBodyData {
  Code: string
  Name: string
  Type: 'River' | 'Lake' | 'Transitional' | 'Coastal' | 'Groundwater'
  Tier1Risk?: string
  CurrentStatus?: string
  StatusHistory: CatchmentsWFDStatus[]
  Trends: CatchmentsTrend[]
  Failures: CatchmentsFailure[]
  InputOutputs: CatchmentsInputOutput[]
  CatchmentName?: string
  SubCatchmentName?: string
  RiverBasinDistrict?: string
  Area?: number
  Length?: number
  Url?: string
}

/**
 * Fetch detailed WFD data for a water body from Catchments.ie API
 *
 * The API endpoint is: https://wfdapi.edenireland.ie/api/WaterBody/{code}
 * where code is the EU_CD format like IE_EA_07_178
 */
export async function getWaterBodyData(
  waterBodyCode: string
): Promise<CatchmentsWaterBodyData | null> {
  if (!waterBodyCode) return null

  // The code needs to be in EU_CD format (e.g., IE_EA_07_178)
  // If we get MS_CD format (e.g., EA_07_178), we need to add IE_ prefix
  let euCode = waterBodyCode
  if (!euCode.startsWith('IE_') && !euCode.startsWith('UK_')) {
    euCode = `IE_${waterBodyCode}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    // The API endpoint uses /WaterBody/ (capital W and B)
    const url = `${CATCHMENTS_API_URL}/WaterBody/${encodeURIComponent(euCode)}`

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[Catchments.ie] Error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    return parseWaterBodyResponse(data, euCode)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Catchments.ie] Request timeout')
    } else {
      console.error('[Catchments.ie] Error:', error)
    }
    return null
  }
}

/**
 * Parse the API response into our structured format
 *
 * Real API response structure:
 * {
 *   "Catchment": [{"Name": "Boyne", "Code": "07"}],
 *   "Subcatchment": [{"Name": "...", "Code": "07_7"}],
 *   "Code": "IE_EA_07_178",
 *   "Name": "Glass",
 *   "Type": "Lake",
 *   "Rbd": "Eastern",
 *   "Tier1Risk": "Review",
 *   "Status": [{
 *     "Code": "SW 2019-2024",
 *     "Status": [{"Status": "Good", "Name": "Ecological Status or Potential", ...}],
 *     "Failures": [],
 *     "HasFailures": false
 *   }],
 *   "Trends": [...],
 *   "InputtingWaterbodies": [...],
 *   "ReceivingWaterbodies": [...]
 * }
 */
function parseWaterBodyResponse(
  data: Record<string, unknown>,
  code: string
): CatchmentsWaterBodyData {
  const statusHistory: CatchmentsWFDStatus[] = []
  const trends: CatchmentsTrend[] = []
  const failures: CatchmentsFailure[] = []
  const inputOutputs: CatchmentsInputOutput[] = []

  // Parse status history - API returns array of assessment periods
  if (Array.isArray(data.Status)) {
    for (const period of data.Status) {
      // Each period has a Code (like "SW 2019-2024") and Status array
      const periodCode = ((period as Record<string, unknown>).Code as string) || ''
      const periodStatuses =
        ((period as Record<string, unknown>).Status as Array<Record<string, unknown>>) || []
      const periodFailures =
        ((period as Record<string, unknown>).Failures as Array<Record<string, unknown>>) || []

      // Get the ecological status from the Status array
      const ecologicalStatus = periodStatuses.find(
        (s) => s.Name === 'Ecological Status or Potential'
      )
      const chemicalStatus = periodStatuses.find((s) => s.Name === 'Chemical Status')

      if (ecologicalStatus || chemicalStatus) {
        statusHistory.push({
          Year: periodCode.replace('SW ', ''),
          Period: periodCode,
          Status:
            (ecologicalStatus?.Status as string) ||
            (chemicalStatus?.Status as string) ||
            'Unassigned',
          StatusCode: periodCode,
          EcologicalStatus: ecologicalStatus?.Status as string,
          ChemicalStatus: chemicalStatus?.Status as string,
          BiologicalElements: undefined,
          HydromorphologicalElements: undefined,
          PhysicochemicalElements: undefined,
          SpecificPollutants: undefined,
        })
      }

      // Collect failures from each period
      for (const f of periodFailures) {
        failures.push({
          Name: (f.Name as string) || (f.FailureName as string) || '',
          FailureType: f.FailureType as string,
          ParameterName: f.ParameterName as string,
          Threshold: f.Threshold as number,
          MeasuredValue: f.MeasuredValue as number,
        })
      }
    }
  }

  // Parse trends
  if (Array.isArray(data.Trends)) {
    for (const t of data.Trends as Array<Record<string, unknown>>) {
      trends.push({
        ParameterName:
          (t.ParameterName as string) || (t.Parameter as string) || (t.Name as string) || '',
        TrendDesc: (t.TrendDesc as string) || (t.Trend as string) || (t.Direction as string) || '',
        TrendCode: t.TrendCode as string,
        StartYear: t.StartYear as number,
        EndYear: t.EndYear as number,
        PValue: t.PValue as number,
      })
    }
  }

  // Parse inputting water bodies (upstream)
  if (Array.isArray(data.InputtingWaterbodies)) {
    for (const w of data.InputtingWaterbodies as Array<Record<string, unknown>>) {
      inputOutputs.push({
        Code: (w.Code as string) || '',
        Name: (w.Name as string) || '',
        Type: (w.Type as string) || 'Unknown',
        Direction: 'Input',
      })
    }
  }

  // Parse receiving water bodies (downstream)
  if (Array.isArray(data.ReceivingWaterbodies)) {
    for (const w of data.ReceivingWaterbodies as Array<Record<string, unknown>>) {
      inputOutputs.push({
        Code: (w.Code as string) || '',
        Name: (w.Name as string) || '',
        Type: (w.Type as string) || 'Unknown',
        Direction: 'Output',
      })
    }
  }

  // Get type from API response
  const apiType = data.Type as string
  let waterBodyType: 'River' | 'Lake' | 'Transitional' | 'Coastal' | 'Groundwater' = 'River'
  if (apiType) {
    const typeUpper = apiType.toLowerCase()
    if (typeUpper.includes('lake')) waterBodyType = 'Lake'
    else if (typeUpper.includes('river')) waterBodyType = 'River'
    else if (typeUpper.includes('transitional')) waterBodyType = 'Transitional'
    else if (typeUpper.includes('coastal')) waterBodyType = 'Coastal'
    else if (typeUpper.includes('groundwater')) waterBodyType = 'Groundwater'
  }

  // Get current status (latest from history - sort by year descending)
  const sortedHistory = [...statusHistory].sort((a, b) => {
    const yearA = a.Year?.split('-')[1] || a.Year || ''
    const yearB = b.Year?.split('-')[1] || b.Year || ''
    return yearB.localeCompare(yearA)
  })
  const latestStatus = sortedHistory.find((s) => s.Status && s.Status !== 'Unassigned')

  // Get catchment name from Catchment array
  const catchmentArray = data.Catchment as Array<Record<string, string>> | undefined
  const catchmentName = catchmentArray?.[0]?.Name

  // Get subcatchment name from Subcatchment array
  const subcatchmentArray = data.Subcatchment as Array<Record<string, string>> | undefined
  const subcatchmentName = subcatchmentArray?.[0]?.Name

  return {
    Code: (data.Code as string) || code,
    Name: (data.Name as string) || '',
    Type: waterBodyType,
    Tier1Risk: data.Tier1Risk as string,
    CurrentStatus: latestStatus?.Status,
    StatusHistory: statusHistory,
    Trends: trends,
    Failures: failures,
    InputOutputs: inputOutputs,
    CatchmentName: catchmentName,
    SubCatchmentName: subcatchmentName,
    RiverBasinDistrict: data.Rbd as string,
    Area: undefined,
    Length: undefined,
    Url: `https://www.catchments.ie/data/#/waterbody/${encodeURIComponent((data.Code as string) || code)}`,
  }
}

/**
 * Get WFD status trend description for display
 */
export function getTrendDescription(trendCode: string): string {
  const descriptions: Record<string, string> = {
    Upwards: 'Increasing (degrading)',
    Downwards: 'Decreasing (improving)',
    'No trend': 'Stable',
    Stable: 'Stable',
    Unknown: 'Insufficient data',
  }
  return descriptions[trendCode] || trendCode
}

/**
 * Get risk level color
 */
export function getRiskColor(risk?: string): string {
  if (!risk) return '#9ca3af'

  const colors: Record<string, string> = {
    'At risk': '#ef4444',
    'Not at risk': '#22c55e',
    Review: '#eab308',
    'Under review': '#eab308',
  }
  return colors[risk] || '#9ca3af'
}

/**
 * Get trend icon direction
 */
export function getTrendDirection(trend: string): 'up' | 'down' | 'stable' | 'unknown' {
  const lower = trend.toLowerCase()
  if (lower.includes('upward') || lower.includes('increasing')) return 'up'
  if (lower.includes('downward') || lower.includes('decreasing')) return 'down'
  if (lower.includes('stable') || lower.includes('no trend')) return 'stable'
  return 'unknown'
}

/**
 * Format status history for display
 */
export function formatStatusHistory(
  history: CatchmentsWFDStatus[]
): Array<{ period: string; status: string; details: string[] }> {
  return history
    .sort((a, b) => (b.Year || '').localeCompare(a.Year || ''))
    .map((s) => {
      const details: string[] = []
      if (s.EcologicalStatus) details.push(`Ecological: ${s.EcologicalStatus}`)
      if (s.ChemicalStatus) details.push(`Chemical: ${s.ChemicalStatus}`)
      if (s.BiologicalElements) details.push(`Biological: ${s.BiologicalElements}`)

      return {
        period: s.Period || s.Year || 'Unknown',
        status: s.Status || 'Not Assessed',
        details,
      }
    })
}

/**
 * Get Catchments.ie URL for a water body
 */
export function getCatchmentsUrl(waterBodyCode: string): string {
  return `https://catchments.ie/waterbodies/${encodeURIComponent(waterBodyCode)}`
}
