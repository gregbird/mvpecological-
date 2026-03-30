'use client'

import * as React from 'react'
import {
  parseShapefile,
  isShapefileType,
  validateBoundary,
  getLocationFromBoundary,
  calculatePerimeter,
  type IrishLocationInfo,
} from '@/lib/gis'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { wgs84ToGridRef } from '@/lib/utils/grid-reference'
import centroid from '@turf/centroid'
import type { Project } from '@/types/database'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

export interface SiteState {
  id?: string
  siteCode: string
  siteName: string | null
  sortOrder: number
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null
  centerPoint: GeoJSON.Point | null
  gridReference: string | null
  county: string | null
  townland: string | null
  province: string | null
  bufferDistances: number[]
  visibleLayers: string[]
  attributes: Record<string, unknown>
  isNew: boolean
  isDirty: boolean
}

interface BoundaryInfo {
  centerLat: string
  centerLng: string
  area: string
  perimeter: string
  gridRef: string
  pointCount: number
}

/**
 * Generate a site code from project name.
 * "Tralee Bay Wind Farm" → "TBWF"
 * Falls back to first 4 uppercase chars if initials are too short.
 */
export function generateSiteCodePrefix(projectName: string): string {
  const words = projectName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
  const initials = words.map((w) => w[0]?.toUpperCase() ?? '').join('')
  if (initials.length >= 2) return initials.slice(0, 6)
  return (
    projectName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 4) || 'SITE'
  )
}

export function generateSiteCode(prefix: string, existingCodes: string[]): string {
  let num = 1
  // Find next available number
  for (const code of existingCodes) {
    const match = code.match(/(\d+)$/)
    if (match) {
      const existing = parseInt(match[1], 10)
      if (existing >= num) num = existing + 1
    }
  }
  return `${prefix} ${String(num).padStart(5, '0')}`
}

function siteFromDB(site: ProjectSiteWithGeoJSON): SiteState {
  return {
    id: site.id,
    siteCode: site.site_code,
    siteName: site.site_name,
    sortOrder: site.sort_order,
    boundary: site.boundary,
    centerPoint: site.center_point,
    gridReference: site.grid_reference,
    county: site.county,
    townland: site.townland,
    province: site.province,
    bufferDistances: site.buffer_distances ?? [2, 5],
    visibleLayers: site.visible_layers ?? [],
    attributes: site.attributes ?? {},
    isNew: false,
    isDirty: false,
  }
}

export function useSiteManagement(project: Project, existingSites: ProjectSiteWithGeoJSON[]) {
  const [sites, setSites] = React.useState<SiteState[]>(() => existingSites.map(siteFromDB))
  const [activeSiteIndex, setActiveSiteIndex] = React.useState(0)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [locationInfo, setLocationInfo] = React.useState<IrishLocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync from DB when existingSites changes
  React.useEffect(() => {
    if (existingSites.length > 0) {
      setSites(existingSites.map(siteFromDB))
    }
  }, [existingSites])

  const activeSite = sites[activeSiteIndex] ?? null
  const codePrefix = generateSiteCodePrefix(project.name)

  // Fetch location info when active site boundary changes
  React.useEffect(() => {
    if (!activeSite?.boundary) {
      setLocationInfo(null)
      return
    }

    const fetchLocation = async () => {
      setIsLoadingLocation(true)
      try {
        const result = await getLocationFromBoundary(activeSite.boundary!)
        if (result.success && result.location) {
          setLocationInfo(result.location)
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingLocation(false)
      }
    }

    const timeoutId = setTimeout(fetchLocation, 500)
    return () => clearTimeout(timeoutId)
  }, [activeSite?.boundary])

  // Calculate boundary info for active site
  const boundaryInfo: BoundaryInfo | null = React.useMemo(() => {
    if (!activeSite?.boundary?.geometry) return null

    const coords = activeSite.boundary.geometry.coordinates?.[0]
    if (!coords || coords.length < 3) return null

    const center = centroid(activeSite.boundary)
    const centerLng = center.geometry.coordinates[0]
    const centerLat = center.geometry.coordinates[1]

    if (!isFinite(centerLat) || !isFinite(centerLng)) return null

    return {
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area: calculateAreaHectares(activeSite.boundary.geometry).toFixed(2),
      perimeter: calculatePerimeter(activeSite.boundary).toFixed(2),
      gridRef: (() => {
        try {
          return wgs84ToGridRef(centerLat, centerLng, 3, true)
        } catch {
          return 'Outside Ireland'
        }
      })(),
      pointCount: coords.length - 1,
    }
  }, [activeSite?.boundary])

  // Add a new empty site
  const addSite = React.useCallback(() => {
    const existingCodes = sites.map((s) => s.siteCode)
    const newCode = generateSiteCode(codePrefix, existingCodes)

    const newSite: SiteState = {
      siteCode: newCode,
      siteName: null,
      sortOrder: sites.length,
      boundary: null,
      centerPoint: null,
      gridReference: null,
      county: null,
      townland: null,
      province: null,
      bufferDistances: [2, 5],
      visibleLayers: [],
      attributes: {},
      isNew: true,
      isDirty: true,
    }

    setSites((prev) => [...prev, newSite])
    setActiveSiteIndex(sites.length)
  }, [sites, codePrefix])

  // Remove a site by index
  const removeSite = React.useCallback(
    (index: number) => {
      setSites((prev) => prev.filter((_, i) => i !== index))
      if (activeSiteIndex >= index && activeSiteIndex > 0) {
        setActiveSiteIndex((prev) => prev - 1)
      }
    },
    [activeSiteIndex]
  )

  // Update active site's boundary from map drawing.
  // If the active site already has a boundary, create a new site instead.
  const handleBoundaryChange = React.useCallback(
    (features: GeoJSON.FeatureCollection) => {
      if (features.features.length > 0) {
        const feature = features.features[features.features.length - 1]
        if (
          feature?.geometry?.type === 'Polygon' &&
          feature.geometry.coordinates?.[0]?.length >= 4
        ) {
          const poly = feature as GeoJSON.Feature<GeoJSON.Polygon>
          const center = centroid(poly)
          const active = sites[activeSiteIndex]

          if (!active?.boundary) {
            // Active site has no boundary → assign to it
            setSites((prev) =>
              prev.map((s, i) =>
                i === activeSiteIndex
                  ? { ...s, boundary: poly, centerPoint: center.geometry, isDirty: true }
                  : s
              )
            )
          } else {
            // Active site already has a boundary → create new site
            const existingCodes = sites.map((s) => s.siteCode)
            const newCode = generateSiteCode(codePrefix, existingCodes)
            const newSite: SiteState = {
              siteCode: newCode,
              siteName: null,
              sortOrder: sites.length,
              boundary: poly,
              centerPoint: center.geometry,
              gridReference: null,
              county: null,
              townland: null,
              province: null,
              bufferDistances: [2, 5],
              visibleLayers: [],
              attributes: {},
              isNew: true,
              isDirty: true,
            }
            setSites((prev) => [...prev, newSite])
            setActiveSiteIndex(sites.length) // switch to newly created site
          }

          return true
        }
      } else {
        setSites((prev) =>
          prev.map((s, i) =>
            i === activeSiteIndex ? { ...s, boundary: null, centerPoint: null, isDirty: true } : s
          )
        )
        return true
      }
      return false
    },
    [activeSiteIndex, sites, codePrefix]
  )

  // Handle file upload — can create multiple sites from multi-polygon shapefiles
  const handleFileUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return null

      setIsProcessing(true)
      try {
        if (isShapefileType(file)) {
          const result = await parseShapefile(file)
          if (!result.success || result.features.length === 0) return null

          if (result.features.length === 1) {
            // Single polygon → set as active site boundary
            const center = centroid(result.features[0])
            setSites((prev) =>
              prev.map((s, i) =>
                i === activeSiteIndex
                  ? {
                      ...s,
                      boundary: result.features[0],
                      centerPoint: center.geometry,
                      attributes: result.features[0].properties ?? {},
                      isDirty: true,
                    }
                  : s
              )
            )
          } else {
            // Multiple polygons → create a site per polygon
            const existingCodes = sites.map((s) => s.siteCode)
            const newSites: SiteState[] = result.features.map((feat, idx) => {
              const code = generateSiteCode(codePrefix, [
                ...existingCodes,
                ...Array.from({ length: idx }, (_, j) =>
                  generateSiteCode(
                    codePrefix,
                    existingCodes.concat(Array.from({ length: j }, () => ''))
                  )
                ),
              ])
              existingCodes.push(code)
              const center = centroid(feat)
              return {
                siteCode: code,
                siteName: (feat.properties?.name as string) ?? null,
                sortOrder: sites.length + idx,
                boundary: feat,
                centerPoint: center.geometry,
                gridReference: null,
                county: null,
                townland: null,
                province: null,
                bufferDistances: [2, 5],
                visibleLayers: [],
                attributes: feat.properties ?? {},
                isNew: true,
                isDirty: true,
              }
            })

            // Replace empty (boundary-less) sites with the new shapefile sites
            setSites((prev) => {
              const withBoundary = prev.filter((s) => s.boundary)
              return [...withBoundary, ...newSites]
            })
            setActiveSiteIndex(0)
          }

          return 'upload' as const
        }

        // GeoJSON handling
        const fileName = file.name.toLowerCase()
        if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
          const text = await file.text()
          const geojson = JSON.parse(text)

          let feature: GeoJSON.Feature<GeoJSON.Polygon> | null = null
          if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
            feature = geojson.features.find(
              (f: GeoJSON.Feature) =>
                f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
            )
          } else if (geojson.type === 'Feature') {
            feature = geojson
          } else if (geojson.type === 'Polygon') {
            feature = { type: 'Feature', geometry: geojson, properties: {} }
          }

          if (!feature) return null

          const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          if (geom.type === 'MultiPolygon') {
            feature = {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: geom.coordinates[0] },
              properties: feature.properties,
            } as GeoJSON.Feature<GeoJSON.Polygon>
          }

          const validation = validateBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
          if (!validation.valid) return null

          const poly = feature as GeoJSON.Feature<GeoJSON.Polygon>
          const center = centroid(poly)
          setSites((prev) =>
            prev.map((s, i) =>
              i === activeSiteIndex
                ? { ...s, boundary: poly, centerPoint: center.geometry, isDirty: true }
                : s
            )
          )
          return 'upload' as const
        }

        return null
      } catch (error) {
        console.error('File parse error:', error)
        return null
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [activeSiteIndex, sites, codePrefix]
  )

  // Update a site field
  const updateSite = React.useCallback((index: number, updates: Partial<SiteState>) => {
    setSites((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates, isDirty: true } : s)))
  }, [])

  const hasDirtySites = sites.some((s) => s.isDirty)

  return {
    sites,
    activeSite,
    activeSiteIndex,
    setActiveSiteIndex,
    addSite,
    removeSite,
    updateSite,
    handleBoundaryChange,
    handleFileUpload,
    boundaryInfo,
    locationInfo,
    isLoadingLocation,
    isProcessing,
    fileInputRef,
    codePrefix,
    hasDirtySites,
  }
}
