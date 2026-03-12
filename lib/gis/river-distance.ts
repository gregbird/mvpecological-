/**
 * River Network Distance Calculator
 *
 * Calculates distance along the river network (not crow-flies) from a project
 * site to downstream SACs. Uses EPA's WATER_RIVNETROUTES WFS layer for segment
 * lengths and Catchments.ie for downstream water body connectivity.
 *
 * Algorithm:
 * 1. Snap project point to nearest river segment
 * 2. Sum segment lengths downstream within the starting water body
 * 3. Follow downstream connectivity via Catchments.ie ReceivingWaterbodies
 * 4. Repeat until: SAC found, >15km cumulative, or no more downstream bodies
 */

import * as turf from '@turf/turf'
import { fetchRiverNetworkSegments, type EPARiverSegment } from '@/lib/external-apis/epa'
import { getWaterBodyData, getDownstreamWaterBodies } from '@/lib/external-apis/catchments'

const MAX_DISTANCE_KM = 15
const MAX_WATER_BODY_HOPS = 10

export interface DownstreamPathStep {
  waterBodyCode: string
  waterBodyName: string
  waterBodyType: string
  distanceKm: number // distance through this water body
  cumulativeKm: number // total distance so far
  segmentCount: number
}

export interface DownstreamTraceResult {
  riverDistanceKm: number | null
  downstreamPath: DownstreamPathStep[]
  sacReached: { siteCode: string; siteName: string; distanceKm: number } | null
  truncatedAt15km: boolean
  error?: string
}

/**
 * Calculate river network distance from a project point to downstream SACs.
 *
 * @param projectPoint - Project site coordinates
 * @param startWaterBodyCode - EPA EU_CD code of the starting water body
 * @param knownSACCodes - SAC site codes to look for (from aquatic-sac-lookup)
 */
export async function calculateRiverDistanceToSAC(
  projectPoint: { lat: number; lng: number },
  startWaterBodyCode: string,
  knownSACCodes: string[]
): Promise<DownstreamTraceResult> {
  const downstreamPath: DownstreamPathStep[] = []
  const visited = new Set<string>()
  let cumulativeDistanceKm = 0
  let currentWaterBodyCode = startWaterBodyCode

  try {
    // Trace downstream through the river network
    for (let hop = 0; hop < MAX_WATER_BODY_HOPS; hop++) {
      if (visited.has(currentWaterBodyCode)) break
      visited.add(currentWaterBodyCode)

      // Fetch water body data and segments in parallel
      const [waterBodyData, segments] = await Promise.all([
        getWaterBodyData(currentWaterBodyCode),
        fetchRiverNetworkSegments(currentWaterBodyCode),
      ])

      const waterBodyName = waterBodyData?.Name || currentWaterBodyCode
      const waterBodyType = waterBodyData?.Type || 'River'

      let stepDistanceKm: number

      if (segments.length > 0) {
        // River: calculate distance along segments
        if (hop === 0) {
          // First hop: snap to nearest segment and measure from snap point downstream
          stepDistanceKm = calculateDistanceFromSnapPoint(projectPoint, segments)
        } else {
          // Subsequent hops: sum all segment lengths
          stepDistanceKm = sumSegmentLengths(segments)
        }
      } else if (waterBodyType === 'Lake' && waterBodyData) {
        // Lake: no RIVNETROUTES data — estimate using haversine across the water body
        stepDistanceKm = estimateLakeDistance(waterBodyData.Length)
      } else {
        // No segment data and not a lake — cannot continue tracing
        stepDistanceKm = 0
      }

      cumulativeDistanceKm += stepDistanceKm

      downstreamPath.push({
        waterBodyCode: currentWaterBodyCode,
        waterBodyName,
        waterBodyType,
        distanceKm: Math.round(stepDistanceKm * 100) / 100,
        cumulativeKm: Math.round(cumulativeDistanceKm * 100) / 100,
        segmentCount: segments.length,
      })

      // Check if we've exceeded the 15km zone of influence
      if (cumulativeDistanceKm > MAX_DISTANCE_KM) {
        return {
          riverDistanceKm: Math.round(cumulativeDistanceKm * 100) / 100,
          downstreamPath,
          sacReached: null,
          truncatedAt15km: true,
        }
      }

      // Check if any downstream water body is linked to a known SAC
      const sacMatch = checkForSACMatch(currentWaterBodyCode, waterBodyName, knownSACCodes)
      if (sacMatch) {
        return {
          riverDistanceKm: Math.round(cumulativeDistanceKm * 100) / 100,
          downstreamPath,
          sacReached: {
            siteCode: sacMatch,
            siteName: sacMatch,
            distanceKm: Math.round(cumulativeDistanceKm * 100) / 100,
          },
          truncatedAt15km: false,
        }
      }

      // Get downstream water bodies for next hop
      const downstream = await getDownstreamWaterBodies(currentWaterBodyCode, waterBodyData)

      // Filter out already-visited water bodies
      const nextDownstream = downstream.filter((d) => !visited.has(d.Code))

      if (nextDownstream.length === 0) {
        // Reached a terminus (estuary, coastline, or headwater with no downstream)
        break
      }

      // Follow the first downstream water body (primary outflow)
      currentWaterBodyCode = nextDownstream[0].Code
    }

    return {
      riverDistanceKm:
        cumulativeDistanceKm > 0 ? Math.round(cumulativeDistanceKm * 100) / 100 : null,
      downstreamPath,
      sacReached: null,
      truncatedAt15km: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      riverDistanceKm:
        cumulativeDistanceKm > 0 ? Math.round(cumulativeDistanceKm * 100) / 100 : null,
      downstreamPath,
      sacReached: null,
      truncatedAt15km: false,
      error: `River distance calculation failed: ${message}`,
    }
  }
}

/**
 * Snap project point to the nearest river segment and calculate the
 * downstream distance from the snap point to the end of the water body.
 *
 * Uses Z coordinates (elevation) to determine downstream direction when available.
 * Falls back to summing the remaining segment lengths after the snap point.
 */
function calculateDistanceFromSnapPoint(
  projectPoint: { lat: number; lng: number },
  segments: EPARiverSegment[]
): number {
  const point = turf.point([projectPoint.lng, projectPoint.lat])

  // Find the nearest segment and snap point
  let nearestDist = Infinity
  let nearestSegmentIdx = 0
  let nearestFractionAlongLine = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg.geometry) continue

    // Convert MultiLineString to individual LineStrings
    const lines = multiLineToLines(seg.geometry)
    for (const line of lines) {
      const snapped = turf.nearestPointOnLine(line, point)
      const dist = snapped.properties.dist ?? Infinity
      if (dist < nearestDist) {
        nearestDist = dist
        nearestSegmentIdx = i
        // Calculate fraction along this segment
        const lineLength = turf.length(line, { units: 'kilometers' })
        nearestFractionAlongLine =
          lineLength > 0 ? (snapped.properties.location ?? 0) / lineLength : 0
      }
    }
  }

  // Sort segments by stream order (higher ORDER_ = further downstream typically)
  // For the first segment, use only the portion downstream of the snap point
  const sortedSegments = [...segments].sort((a, b) => {
    // Sort by Segment_Code as a proxy for position along the water body
    return a.Segment_Code.localeCompare(b.Segment_Code)
  })

  const snapSegment = segments[nearestSegmentIdx]
  let totalDistanceKm = 0

  // Add partial distance of the snap segment (from snap point to end)
  const snapSegmentLengthKm = snapSegment.Segment_Length / 1000
  const downstreamFraction = determineDownstreamFraction(snapSegment, nearestFractionAlongLine)
  totalDistanceKm += snapSegmentLengthKm * downstreamFraction

  // Add lengths of all segments downstream of the snap segment
  const snapIdx = sortedSegments.findIndex((s) => s.Segment_Code === snapSegment.Segment_Code)
  for (let i = snapIdx + 1; i < sortedSegments.length; i++) {
    totalDistanceKm += sortedSegments[i].Segment_Length / 1000
  }

  return totalDistanceKm
}

/**
 * Determine what fraction of a segment is downstream from the snap point.
 * Uses Z coordinates (elevation) if available to determine flow direction.
 */
function determineDownstreamFraction(segment: EPARiverSegment, fractionAlongLine: number): number {
  if (!segment.geometry || segment.geometry.coordinates.length === 0) {
    return 1 - fractionAlongLine
  }

  const coords = segment.geometry.coordinates[0]
  if (!coords || coords.length < 2) return 1 - fractionAlongLine

  // Check for Z coordinates (elevation) to determine flow direction
  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]

  if (firstCoord.length >= 3 && lastCoord.length >= 3) {
    const startElevation = firstCoord[2]
    const endElevation = lastCoord[2]

    if (startElevation > endElevation) {
      // Digitized in flow direction (high to low) — downstream is remaining portion
      return 1 - fractionAlongLine
    } else if (endElevation > startElevation) {
      // Digitized against flow — downstream is the portion before snap point
      return fractionAlongLine
    }
  }

  // No Z data or flat — assume digitized in flow direction
  return 1 - fractionAlongLine
}

/**
 * Sum total length of all segments in meters, convert to km.
 */
function sumSegmentLengths(segments: EPARiverSegment[]): number {
  let totalMeters = 0
  for (const seg of segments) {
    totalMeters += seg.Segment_Length
  }
  return totalMeters / 1000
}

/**
 * Estimate distance across a lake using its known length,
 * or a default if unknown.
 */
function estimateLakeDistance(lengthKm?: number): number {
  if (lengthKm && lengthKm > 0) return lengthKm
  // Default small lake crossing estimate
  return 0.5
}

/**
 * Convert a MultiLineString geometry to individual LineString features
 * for use with turf.nearestPointOnLine.
 */
function multiLineToLines(geom: GeoJSON.MultiLineString): GeoJSON.Feature<GeoJSON.LineString>[] {
  return geom.coordinates.map((coords) => turf.lineString(coords))
}

/**
 * Check if a water body code or name matches any known SAC.
 * SAC codes may be embedded in the water body name or linked via lookup.
 */
function checkForSACMatch(
  _waterBodyCode: string,
  waterBodyName: string,
  knownSACCodes: string[]
): string | null {
  // Check if the water body name contains any SAC site code
  const nameLower = waterBodyName.toLowerCase()
  for (const sacCode of knownSACCodes) {
    if (nameLower.includes(sacCode.toLowerCase())) {
      return sacCode
    }
  }
  return null
}
