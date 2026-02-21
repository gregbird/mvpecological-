import type { DeskResearchFinding } from '@/types/database'

/**
 * Generates a URL to the original data source for a finding.
 * Used in Desk Assessment tables and sidebar to link back to NPWS, GBIF, NBDC, EPA, etc.
 */
export function getFindingSourceUrl(finding: DeskResearchFinding): string | null {
  const raw = finding.raw_data as Record<string, unknown> | null
  const metadata = raw?.metadata as Record<string, unknown> | null
  const siteCode = (raw?.siteCode || metadata?.siteCode) as string | undefined
  const siteType = (metadata?.siteType || metadata?.designation) as string | undefined

  switch (finding.source) {
    case 'npws': {
      if (!siteCode) return 'https://www.npws.ie/protected-sites'
      const typePathMap: Record<string, string> = {
        SAC: 'protected-sites/sac',
        SPA: 'protected-sites/spa',
        NHA: 'protected-sites/nha',
        pNHA: 'protected-sites/nha',
      }
      const path = typePathMap[siteType || ''] || 'protected-sites'
      return `https://www.npws.ie/${path}/${siteCode}`
    }
    case 'gbif': {
      const gbifUrl = metadata?.gbifUrl as string | undefined
      if (gbifUrl) return gbifUrl
      const scientificName = (raw?.scientificName || metadata?.scientificName) as string | undefined
      if (scientificName)
        return `https://www.gbif.org/occurrence/search?scientificName=${encodeURIComponent(scientificName)}`
      return 'https://www.gbif.org'
    }
    case 'nbdc': {
      const nbdcUrl = metadata?.nbdcUrl as string | undefined
      if (nbdcUrl) return nbdcUrl
      const gbifUrl2 = metadata?.gbifUrl as string | undefined
      if (gbifUrl2) return gbifUrl2
      return 'https://maps.biodiversityireland.ie'
    }
    case 'epa': {
      const riverCode = raw?.RiverCode as string | undefined
      const lakeCode = raw?.LakeCode as string | undefined
      if (riverCode)
        return `https://www.catchments.ie/data/#/waterbody/${encodeURIComponent(riverCode)}`
      if (lakeCode)
        return `https://www.catchments.ie/data/#/waterbody/${encodeURIComponent(lakeCode)}`
      return 'https://gis.epa.ie/EPAMaps/Water'
    }
    case 'catchments': {
      const catchmentId = (raw?.CatchmentID || raw?.catchmentId) as string | undefined
      if (catchmentId)
        return `https://www.catchments.ie/data/#/catchment/${encodeURIComponent(catchmentId)}`
      return 'https://www.catchments.ie'
    }
    default:
      return null
  }
}
