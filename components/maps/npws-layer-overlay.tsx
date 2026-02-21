'use client'

import * as React from 'react'

import {
  queryDesignatedSites,
  getSiteTypeColor,
  getSiteTypeDisplayName,
  type NPWSDesignatedSite,
  type DesignatedSiteType,
} from '@/lib/external-apis/npws'
/**
 * Get the direct NPWS URL for a specific site
 * Format: https://www.npws.ie/protected-sites/{type}/{sitecode}
 */
function getNPWSSiteUrl(siteType: DesignatedSiteType, siteCode: string): string {
  // Map site type to URL path
  const typeToPath: Record<DesignatedSiteType, string> = {
    SAC: 'sac',
    SPA: 'spa',
    NHA: 'nha',
    pNHA: 'pnha',
  }
  const path = typeToPath[siteType] || 'sac'
  return `https://www.npws.ie/protected-sites/${path}/${siteCode}`
}

interface NPWSLayerOverlayProps {
  map: L.Map | null
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null
  visibleLayers: string[]
  searchRadius?: number // in km
  onSitesLoaded?: (sites: NPWSDesignatedSite[]) => void
}

// Map layer IDs to site types (updated for new NPWS FeatureServer)
const LAYER_TO_SITE_TYPE: Record<string, DesignatedSiteType> = {
  sac: 'SAC',
  spa: 'SPA',
  nha: 'NHA',
  pnha: 'pNHA',
}

export function NPWSLayerOverlay({
  map,
  boundary,
  visibleLayers,
  searchRadius = 5,
  onSitesLoaded,
}: NPWSLayerOverlayProps) {
  const [sites, setSites] = React.useState<NPWSDesignatedSite[]>([])
  const [_isLoading, setIsLoading] = React.useState(false)
  const layersRef = React.useRef<Map<string, L.Layer>>(new Map())

  // Get active NPWS site types from visible layers
  const activeSiteTypes = React.useMemo(() => {
    const types: DesignatedSiteType[] = []
    for (const layerId of visibleLayers) {
      const siteType = LAYER_TO_SITE_TYPE[layerId]
      if (siteType) {
        types.push(siteType)
      }
    }
    return types
  }, [visibleLayers])

  // Calculate bounding box from boundary with buffer
  const getBoundingBox = React.useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
      const coords = feature.geometry.coordinates[0]
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity

      for (const coord of coords) {
        minLng = Math.min(minLng, coord[0])
        maxLng = Math.max(maxLng, coord[0])
        minLat = Math.min(minLat, coord[1])
        maxLat = Math.max(maxLat, coord[1])
      }

      // Add buffer (approximate degrees for km)
      const bufferDeg = searchRadius / 111 // ~111km per degree
      return {
        minX: minLng - bufferDeg,
        minY: minLat - bufferDeg,
        maxX: maxLng + bufferDeg,
        maxY: maxLat + bufferDeg,
      }
    },
    [searchRadius]
  )

  // Fetch NPWS sites when boundary or active layers change
  React.useEffect(() => {
    if (!boundary || activeSiteTypes.length === 0) {
      setSites([])
      onSitesLoaded?.([])
      return
    }

    const fetchSites = async () => {
      setIsLoading(true)
      try {
        const bbox = getBoundingBox(boundary)
        const fetchedSites = await queryDesignatedSites({
          bbox,
          siteTypes: activeSiteTypes,
        })
        setSites(fetchedSites)
        onSitesLoaded?.(fetchedSites)
      } catch (error) {
        console.error('Error fetching NPWS sites:', error)
        setSites([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSites()
  }, [boundary, activeSiteTypes, getBoundingBox, onSitesLoaded])

  // Render sites on map
  React.useEffect(() => {
    if (!map) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')

    // Clear existing layers
    layersRef.current.forEach((layer) => {
      map.removeLayer(layer)
    })
    layersRef.current.clear()

    // Add new layers for visible sites
    for (const site of sites) {
      if (!site.geometry || !site.SITE_TYPE) continue

      // Check if this site type is visible
      const layerId = Object.entries(LAYER_TO_SITE_TYPE).find(
        ([, type]) => type === site.SITE_TYPE
      )?.[0]
      if (!layerId || !visibleLayers.includes(layerId)) continue

      const color = getSiteTypeColor(site.SITE_TYPE as DesignatedSiteType)
      const displayName = getSiteTypeDisplayName(site.SITE_TYPE as DesignatedSiteType)

      try {
        const geoJsonLayer = L.geoJSON(site.geometry, {
          style: {
            color: color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.15,
            dashArray: '5, 5',
          },
        })

        // Add popup with site info - direct link to specific site page
        const siteUrl = getNPWSSiteUrl(site.SITE_TYPE as DesignatedSiteType, site.SITECODE)
        geoJsonLayer.bindPopup(`
          <div style="min-width: 220px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${site.SITENAME}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${displayName}</div>
            <table style="font-size: 12px; width: 100%;">
              <tr>
                <td style="color: #666;">Site Code:</td>
                <td style="font-weight: 500;">${site.SITECODE}</td>
              </tr>
              ${site.AREA_HA ? `<tr><td style="color: #666;">Area:</td><td style="font-weight: 500;">${site.AREA_HA.toLocaleString()} ha</td></tr>` : ''}
            </table>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <a href="${siteUrl}" target="_blank" rel="noopener noreferrer"
                 style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; text-decoration: none;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                View on NPWS website
              </a>
            </div>
          </div>
        `)

        // Add tooltip with site name
        geoJsonLayer.bindTooltip(site.SITENAME, {
          permanent: false,
          direction: 'top',
          className: 'npws-tooltip',
        })

        geoJsonLayer.addTo(map)
        layersRef.current.set(`${site.SITE_TYPE}-${site.OBJECTID}`, geoJsonLayer)
      } catch (error) {
        console.error('Error adding site to map:', error)
      }
    }

    return () => {
      // Cleanup on unmount
      layersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer)
        } catch {
          // Ignore cleanup errors
        }
      })
    }
  }, [map, sites, visibleLayers])

  // Return loading state for parent to use if needed
  return null
}

// Hook for using NPWS layer state
export function useNPWSLayers(
  map: L.Map | null,
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null,
  visibleLayers: string[],
  searchRadius = 5,
  ignoredItems: Set<string> = new Set(),
  deletedItems: Set<string> = new Set(),
  /** Pre-fetched sites from useLayerData — skip internal fetch when provided */
  externalSites?: NPWSDesignatedSite[]
) {
  const [sites, setSites] = React.useState<NPWSDesignatedSite[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Track previous values to prevent unnecessary re-fetches
  const prevBoundaryRef = React.useRef<string | null>(null)
  const prevSiteTypesRef = React.useRef<string>('')

  // Sync external sites when provided
  React.useEffect(() => {
    if (externalSites && externalSites.length > 0) {
      setSites(externalSites)
    }
  }, [externalSites])

  // Get active NPWS site types from visible layers
  const activeSiteTypes = React.useMemo(() => {
    const types: DesignatedSiteType[] = []
    for (const layerId of visibleLayers) {
      const siteType = LAYER_TO_SITE_TYPE[layerId]
      if (siteType) {
        types.push(siteType)
      }
    }
    return types
  }, [visibleLayers])

  // Calculate bounding box from boundary with buffer
  const getBoundingBox = React.useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
      // Safety check for valid geometry
      if (!feature?.geometry?.coordinates?.[0]) {
        return null
      }

      const coords = feature.geometry.coordinates[0]
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity

      for (const coord of coords) {
        minLng = Math.min(minLng, coord[0])
        maxLng = Math.max(maxLng, coord[0])
        minLat = Math.min(minLat, coord[1])
        maxLat = Math.max(maxLat, coord[1])
      }

      // Add buffer (approximate degrees for km)
      const bufferDeg = searchRadius / 111 // ~111km per degree
      return {
        minX: minLng - bufferDeg,
        minY: minLat - bufferDeg,
        maxX: maxLng + bufferDeg,
        maxY: maxLat + bufferDeg,
      }
    },
    [searchRadius]
  )

  // Fetch NPWS sites (skipped when externalSites provided)
  React.useEffect(() => {
    // Skip internal fetch when using external data
    if (externalSites && externalSites.length > 0) return

    // Create stable keys for comparison
    const boundaryKey = boundary?.geometry?.coordinates?.[0]
      ? JSON.stringify(boundary.geometry.coordinates[0].slice(0, 3)) // First 3 coords for stability
      : null
    const siteTypesKey = activeSiteTypes.sort().join(',')

    // Skip if nothing changed
    if (boundaryKey === prevBoundaryRef.current && siteTypesKey === prevSiteTypesRef.current) {
      return
    }

    // Update refs
    prevBoundaryRef.current = boundaryKey
    prevSiteTypesRef.current = siteTypesKey

    if (!boundaryKey || activeSiteTypes.length === 0) {
      // Only clear if not already empty to prevent infinite loops
      setSites((prev) => (prev.length === 0 ? prev : []))
      return
    }

    const fetchSites = async () => {
      setIsLoading(true)
      try {
        const bbox = getBoundingBox(boundary!)
        if (!bbox) {
          setSites((prev) => (prev.length === 0 ? prev : []))
          return
        }
        const fetchedSites = await queryDesignatedSites({
          bbox,
          siteTypes: activeSiteTypes,
        })
        setSites(fetchedSites)
      } catch (error) {
        console.error('Error fetching NPWS sites:', error)
        setSites((prev) => (prev.length === 0 ? prev : []))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSites()
  }, [boundary, activeSiteTypes, getBoundingBox, externalSites])

  // Render effect
  React.useEffect(() => {
    if (!map) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')
    const layers: L.Layer[] = []

    // Add layers for visible sites
    for (const site of sites) {
      if (!site.geometry || !site.SITE_TYPE) continue

      // Check if this site type is visible
      const layerId = Object.entries(LAYER_TO_SITE_TYPE).find(
        ([, type]) => type === site.SITE_TYPE
      )?.[0]
      if (!layerId || !visibleLayers.includes(layerId)) continue

      // Skip ignored or deleted sites
      const siteKey = `npws-${site.SITE_TYPE}-${site.SITECODE}`
      if (ignoredItems.has(siteKey) || deletedItems.has(siteKey)) continue

      const color = getSiteTypeColor(site.SITE_TYPE as DesignatedSiteType)
      const displayName = getSiteTypeDisplayName(site.SITE_TYPE as DesignatedSiteType)

      try {
        const geoJsonLayer = L.geoJSON(site.geometry, {
          style: {
            color: color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.15,
            dashArray: '5, 5',
          },
        })

        const siteUrl2 = getNPWSSiteUrl(site.SITE_TYPE as DesignatedSiteType, site.SITECODE)
        geoJsonLayer.bindPopup(`
          <div style="min-width: 220px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${site.SITENAME}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${displayName}</div>
            <table style="font-size: 12px; width: 100%;">
              <tr>
                <td style="color: #666;">Site Code:</td>
                <td style="font-weight: 500;">${site.SITECODE}</td>
              </tr>
              ${site.AREA_HA ? `<tr><td style="color: #666;">Area:</td><td style="font-weight: 500;">${site.AREA_HA.toLocaleString()} ha</td></tr>` : ''}
            </table>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <a href="${siteUrl2}" target="_blank" rel="noopener noreferrer"
                 style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; text-decoration: none;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                View on NPWS website
              </a>
            </div>
          </div>
        `)

        geoJsonLayer.bindTooltip(site.SITENAME, {
          permanent: false,
          direction: 'top',
        })

        geoJsonLayer.addTo(map)
        layers.push(geoJsonLayer)
      } catch (error) {
        console.error('Error adding site to map:', error)
      }
    }

    return () => {
      layers.forEach((layer) => {
        try {
          map.removeLayer(layer)
        } catch {
          // Ignore cleanup errors
        }
      })
    }
  }, [map, sites, visibleLayers, ignoredItems, deletedItems])

  return {
    sites,
    isLoading,
    siteCount: sites.length,
    sitesByType: React.useMemo(() => {
      const byType: Record<string, NPWSDesignatedSite[]> = {}
      for (const site of sites) {
        if (site.SITE_TYPE) {
          if (!byType[site.SITE_TYPE]) {
            byType[site.SITE_TYPE] = []
          }
          byType[site.SITE_TYPE].push(site)
        }
      }
      return byType
    }, [sites]),
  }
}
