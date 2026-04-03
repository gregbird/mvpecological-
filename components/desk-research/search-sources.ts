import { queryDesignatedSites, getSiteTypeDisplayName } from '@/lib/external-apis/npws'
import { searchOccurrences } from '@/lib/external-apis/gbif'
import { searchRecordsByBbox, type NBDCRecord } from '@/lib/external-apis/nbdc'
import { searchAllAquaticFeatures, getWFDStatusDisplayName } from '@/lib/external-apis/epa'
import { searchFPOByGridRef, type FPORecord } from '@/lib/data/fpo-species'
import type { DeskResearchFinding } from './finding-card'

type BBox = { minLng: number; maxLng: number; minLat: number; maxLat: number }
type ToastFn = (opts: { variant: 'destructive'; title: string; description: string }) => void
type DistanceFn = (location?: GeoJSON.Geometry) => number | undefined

export async function searchNPWS(
  bbox: BBox,
  results: DeskResearchFinding[],
  savedFindings: DeskResearchFinding[],
  calculateDistance: DistanceFn,
  toast: ToastFn
) {
  try {
    const npwsResults = await queryDesignatedSites({
      bbox: { minX: bbox.minLng, minY: bbox.minLat, maxX: bbox.maxLng, maxY: bbox.maxLat },
    })

    const siteTypeUrlMap: Record<string, string> = {
      SAC: 'protected-sites/sac',
      SPA: 'protected-sites/spa',
      NHA: 'protected-sites/nha',
      pNHA: 'protected-sites/pnha',
    }

    for (const site of npwsResults) {
      const isSaved = savedFindings.some((f) => f.metadata?.siteCode === site.SITECODE)
      const urlPath = siteTypeUrlMap[site.SITE_TYPE || ''] || 'protected-sites'
      const distance = calculateDistance(site.geometry)

      results.push({
        id: `npws-${site.SITECODE}`,
        source: 'npws',
        dataType: 'designated_site',
        title: site.SITENAME,
        content: `${getSiteTypeDisplayName(site.SITE_TYPE as 'SAC' | 'SPA' | 'NHA' | 'pNHA')} covering ${site.AREA_HA?.toFixed(1) || 'unknown'} hectares.`,
        location: site.geometry,
        isSaved,
        sourceUrl: `https://www.npws.ie/${urlPath}/${site.SITECODE}`,
        rawData: site as unknown as Record<string, unknown>,
        metadata: { siteCode: site.SITECODE, siteType: site.SITE_TYPE, distance },
      })
    }
  } catch (error) {
    console.error('NPWS search error:', error)
    toast({
      variant: 'destructive',
      title: 'NPWS search failed',
      description: 'Could not fetch designated sites data.',
    })
  }
}

export async function searchGBIF(
  bbox: BBox,
  results: DeskResearchFinding[],
  savedFindings: DeskResearchFinding[],
  calculateDistance: DistanceFn,
  toast: ToastFn
) {
  try {
    const gbifResults = await searchOccurrences({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
      limit: 100,
      year: '2015,2025',
    })

    const speciesGroups = new Map<string, { count: number; records: typeof gbifResults.results }>()
    for (const record of gbifResults.results) {
      const key = record.scientificName || 'Unknown'
      if (!speciesGroups.has(key)) speciesGroups.set(key, { count: 0, records: [] })
      const group = speciesGroups.get(key)!
      group.count++
      group.records.push(record)
    }

    for (const [scientificName, { count, records }] of speciesGroups) {
      const firstRecord = records[0]
      const isSaved = savedFindings.some((f) => f.metadata?.scientificName === scientificName)

      let locationGeometry: GeoJSON.Geometry
      if (count === 1) {
        locationGeometry = {
          type: 'Point',
          coordinates: [firstRecord.decimalLongitude, firstRecord.decimalLatitude],
        }
      } else {
        const geometries: GeoJSON.Point[] = records
          .filter((r) => r.decimalLatitude && r.decimalLongitude)
          .map((r) => ({
            type: 'Point' as const,
            coordinates: [r.decimalLongitude, r.decimalLatitude],
          }))
        locationGeometry = { type: 'GeometryCollection', geometries }
      }

      const distance = calculateDistance(locationGeometry)

      results.push({
        id: `gbif-${scientificName.replace(/\s+/g, '-')}`,
        source: 'gbif',
        dataType: 'species_record',
        title: firstRecord.vernacularName || scientificName,
        content: `${count} record${count > 1 ? 's' : ''} found within search area. Family: ${firstRecord.family || 'Unknown'}.`,
        location: locationGeometry,
        isSaved,
        sourceUrl: firstRecord.speciesKey
          ? `https://www.gbif.org/species/${firstRecord.speciesKey}`
          : `https://www.gbif.org/occurrence/search?scientificName=${encodeURIComponent(scientificName)}`,
        rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
        metadata: {
          scientificName,
          commonName: firstRecord.vernacularName,
          recordCount: count,
          recordDate: firstRecord.eventDate,
          distance,
        },
      })
    }
  } catch (error) {
    console.error('GBIF search error:', error)
    toast({
      variant: 'destructive',
      title: 'GBIF search failed',
      description: 'Could not fetch species occurrence data.',
    })
  }
}

export async function searchNBDC(
  bbox: BBox,
  results: DeskResearchFinding[],
  savedFindings: DeskResearchFinding[],
  calculateDistance: DistanceFn,
  toast: ToastFn
) {
  try {
    const nbdcResults = await searchRecordsByBbox(
      { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
      { startYear: 2015, endYear: new Date().getFullYear(), limit: 100 }
    )

    const speciesGroups = new Map<string, { count: number; records: NBDCRecord[] }>()
    for (const record of nbdcResults) {
      const key = record.LatinName || 'Unknown'
      if (!speciesGroups.has(key)) speciesGroups.set(key, { count: 0, records: [] })
      const group = speciesGroups.get(key)!
      group.count++
      group.records.push(record)
    }

    for (const [latinName, { count, records }] of speciesGroups) {
      const firstRecord = records[0]
      const isSaved = savedFindings.some(
        (f) => f.metadata?.scientificName === latinName && f.source === 'nbdc'
      )

      let locationGeometry: GeoJSON.Geometry
      if (count === 1 && firstRecord.Latitude && firstRecord.Longitude) {
        locationGeometry = {
          type: 'Point',
          coordinates: [firstRecord.Longitude, firstRecord.Latitude],
        }
      } else {
        const geometries: GeoJSON.Point[] = records
          .filter((r) => r.Latitude && r.Longitude)
          .map((r) => ({
            type: 'Point' as const,
            coordinates: [r.Longitude!, r.Latitude!],
          }))
        locationGeometry = { type: 'GeometryCollection', geometries }
      }

      const distance = calculateDistance(locationGeometry)

      results.push({
        id: `nbdc-${latinName.replace(/\s+/g, '-')}-${firstRecord.TaxonId}`,
        source: 'nbdc',
        dataType: 'species_record',
        title: firstRecord.CommonName || latinName,
        content: `${count} Irish record${count > 1 ? 's' : ''} found. Taxon group: ${firstRecord.TaxonGroup || 'Unknown'}. ${firstRecord.GridReference ? `Grid ref: ${firstRecord.GridReference}` : ''}`,
        location: locationGeometry,
        isSaved,
        sourceUrl: `https://maps.biodiversityireland.ie/Species/${firstRecord.TaxonId}`,
        rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
        metadata: {
          scientificName: latinName,
          commonName: firstRecord.CommonName,
          recordCount: count,
          recordDate: firstRecord.Date,
          distance,
        },
      })
    }
  } catch (error) {
    console.error('NBDC search error:', error)
    toast({
      variant: 'destructive',
      title: 'NBDC search failed',
      description: 'Could not fetch Irish biodiversity records.',
    })
  }
}

export async function searchEPA(
  bbox: BBox,
  results: DeskResearchFinding[],
  savedFindings: DeskResearchFinding[],
  calculateDistance: DistanceFn,
  toast: ToastFn
) {
  try {
    const epaResults = await searchAllAquaticFeatures({
      bbox: { minLat: bbox.minLat, maxLat: bbox.maxLat, minLng: bbox.minLng, maxLng: bbox.maxLng },
      limit: 50,
    })

    for (const river of epaResults.rivers) {
      const isSaved = savedFindings.some(
        (f) => f.metadata?.siteCode === river.RiverCode && f.source === 'epa'
      )
      const distance = calculateDistance(river.geometry)
      results.push({
        id: `epa-river-${river.RiverCode || river.OBJECTID}`,
        source: 'epa',
        dataType: 'water_quality',
        title: river.RiverName,
        content: `River${river.Length_km ? ` (${river.Length_km.toFixed(1)} km)` : ''}. ${river.CatchmentName ? `Catchment: ${river.CatchmentName}.` : ''} ${river.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(river.WFD_Status)}` : ''}`,
        location: river.geometry,
        isSaved,
        sourceUrl: `https://www.catchments.ie/data/#/waterbody/${river.RiverCode}`,
        rawData: river as unknown as Record<string, unknown>,
        metadata: {
          siteCode: river.RiverCode,
          siteType: 'River',
          designation: river.WFD_Status,
          distance,
        },
      })
    }

    for (const lake of epaResults.lakes) {
      const isSaved = savedFindings.some(
        (f) => f.metadata?.siteCode === lake.LakeCode && f.source === 'epa'
      )
      const distance = calculateDistance(lake.geometry)
      results.push({
        id: `epa-lake-${lake.LakeCode || lake.OBJECTID}`,
        source: 'epa',
        dataType: 'water_quality',
        title: lake.LakeName,
        content: `Lake${lake.Area_ha ? ` (${lake.Area_ha.toFixed(1)} ha)` : ''}. ${lake.CatchmentName ? `Catchment: ${lake.CatchmentName}.` : ''} ${lake.WFD_Status ? `WFD Status: ${getWFDStatusDisplayName(lake.WFD_Status)}` : ''}`,
        location: lake.geometry,
        isSaved,
        sourceUrl: `https://www.catchments.ie/data/#/waterbody/${lake.LakeCode}`,
        rawData: lake as unknown as Record<string, unknown>,
        metadata: {
          siteCode: lake.LakeCode,
          siteType: 'Lake',
          designation: lake.WFD_Status,
          distance,
        },
      })
    }

    for (const catchment of epaResults.catchments) {
      const isSaved = savedFindings.some(
        (f) => f.metadata?.siteCode === catchment.CatchmentId && f.source === 'epa'
      )
      const distance = calculateDistance(catchment.geometry)
      results.push({
        id: `epa-catchment-${catchment.CatchmentId || catchment.OBJECTID}`,
        source: 'epa',
        dataType: 'catchment',
        title: catchment.CatchmentName,
        content: `Catchment${catchment.Area_km2 ? ` (${catchment.Area_km2.toFixed(1)} km2)` : ''}. ${catchment.RiverBasinDistrict ? `River Basin District: ${catchment.RiverBasinDistrict}` : ''}`,
        location: catchment.geometry,
        isSaved,
        sourceUrl: `https://www.catchments.ie/data/#/catchment/${catchment.CatchmentId}`,
        rawData: catchment as unknown as Record<string, unknown>,
        metadata: {
          siteCode: catchment.CatchmentId,
          siteType: 'Catchment',
          distance,
        },
      })
    }
  } catch (error) {
    console.error('EPA search error:', error)
    toast({
      variant: 'destructive',
      title: 'EPA search failed',
      description: 'Could not fetch water quality and catchment data.',
    })
  }
}

export async function searchFPO(
  gridRefToSearch: string | null,
  results: DeskResearchFinding[],
  savedFindings: DeskResearchFinding[],
  toast: ToastFn
) {
  if (!gridRefToSearch) return

  try {
    const fpoResults = await searchFPOByGridRef(gridRefToSearch)
    const speciesGroups = new Map<string, { count: number; records: FPORecord[] }>()
    for (const record of fpoResults) {
      const key = record.latinName
      if (!speciesGroups.has(key)) speciesGroups.set(key, { count: 0, records: [] })
      const group = speciesGroups.get(key)!
      group.count++
      group.records.push(record)
    }

    for (const [latinName, { count, records }] of speciesGroups) {
      const firstRecord = records[0]
      const isSaved = savedFindings.some(
        (f) => f.metadata?.scientificName === latinName && f.source === 'fpo'
      )
      const locations = [...new Set(records.map((r) => r.locationName).filter(Boolean))]

      results.push({
        id: `fpo-${latinName.replace(/\s+/g, '-')}`,
        source: 'fpo',
        dataType: 'species_record',
        title: `${firstRecord.commonName || latinName} (Protected)`,
        content: `${count} FPO record${count > 1 ? 's' : ''} in this hectad. ${firstRecord.isSensitive ? '⚠️ Sensitive species.' : ''} ${locations.length > 0 ? `Recorded at: ${locations.slice(0, 3).join(', ')}${locations.length > 3 ? '...' : ''}` : ''}`,
        isSaved,
        sourceUrl: 'https://www.npws.ie/legislation/irish-law/flora-protection-order',
        rawData: { recordCount: count, sampleRecords: records.slice(0, 5) },
        metadata: {
          scientificName: latinName,
          commonName: firstRecord.commonName,
          recordCount: count,
          isProtected: true,
          designation: 'Flora Protection Order 2022',
        },
      })
    }
  } catch (error) {
    console.error('FPO search error:', error)
    toast({
      variant: 'destructive',
      title: 'FPO search failed',
      description: 'Could not fetch Flora Protection Order records.',
    })
  }
}
