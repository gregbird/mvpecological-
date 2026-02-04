'use client'

import * as React from 'react'

import {
  searchRivers,
  searchLakes,
  searchCatchments,
  getWFDStatusColor,
  type EPARiver,
  type EPALake,
  type EPACatchment,
} from '@/lib/external-apis/epa'
import { getLayerMetadata } from '@/lib/config/layer-metadata'

/**
 * Get EPA source URL for a layer type
 */
function getEPASourceUrl(layerType: 'rivers' | 'lakes' | 'catchments'): string {
  const metadata = getLayerMetadata(layerType)
  return metadata?.sourceUrl || 'https://www.epa.ie/'
}

// Map layer IDs to EPA data types
const LAYER_TO_EPA_TYPE: Record<string, 'rivers' | 'lakes' | 'catchments' | 'wfd_river_status'> = {
  rivers: 'rivers',
  lakes: 'lakes',
  catchments: 'catchments',
  wfd_river_status: 'rivers', // River status uses same river data with status coloring
}

// EPA feature colors
const EPA_COLORS = {
  rivers: '#0284c7', // sky-600
  lakes: '#0369a1', // sky-700
  catchments: '#38bdf8', // sky-400
}

export interface EPALayerData {
  rivers: EPARiver[]
  lakes: EPALake[]
  catchments: EPACatchment[]
}

/**
 * Hook for fetching and rendering EPA layers within buffer zone
 */
export function useEPALayers(
  map: L.Map | null,
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null,
  visibleLayers: string[],
  searchRadius = 5
) {
  const [data, setData] = React.useState<EPALayerData>({
    rivers: [],
    lakes: [],
    catchments: [],
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const layersRef = React.useRef<L.Layer[]>([])

  // Get active EPA layer types from visible layers
  const activeTypes = React.useMemo(() => {
    const types: Set<'rivers' | 'lakes' | 'catchments'> = new Set()
    for (const layerId of visibleLayers) {
      const epaType = LAYER_TO_EPA_TYPE[layerId]
      if (epaType === 'rivers' || epaType === 'lakes' || epaType === 'catchments') {
        types.add(epaType)
      }
    }
    return Array.from(types)
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
        minLng: minLng - bufferDeg,
        minLat: minLat - bufferDeg,
        maxLng: maxLng + bufferDeg,
        maxLat: maxLat + bufferDeg,
      }
    },
    [searchRadius]
  )

  // Fetch EPA data when boundary or active layers change
  React.useEffect(() => {
    if (!boundary || activeTypes.length === 0) {
      setData({ rivers: [], lakes: [], catchments: [] })
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const bbox = getBoundingBox(boundary)
        const bboxParams = {
          bbox: {
            minLat: bbox.minLat,
            maxLat: bbox.maxLat,
            minLng: bbox.minLng,
            maxLng: bbox.maxLng,
          },
          limit: 100,
        }

        console.log('[EPA] Fetching data for activeTypes:', activeTypes, 'bbox:', bboxParams.bbox)

        // Fetch only active types in parallel
        const results = await Promise.all([
          activeTypes.includes('rivers') ? searchRivers(bboxParams) : Promise.resolve([]),
          activeTypes.includes('lakes') ? searchLakes(bboxParams) : Promise.resolve([]),
          activeTypes.includes('catchments') ? searchCatchments(bboxParams) : Promise.resolve([]),
        ])

        console.log(
          '[EPA] Results - rivers:',
          results[0].length,
          'lakes:',
          results[1].length,
          'catchments:',
          results[2].length
        )

        setData({
          rivers: results[0],
          lakes: results[1],
          catchments: results[2],
        })
      } catch (error) {
        console.error('Error fetching EPA data:', error)
        setData({ rivers: [], lakes: [], catchments: [] })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [boundary, activeTypes, getBoundingBox])

  // Render layers on map
  React.useEffect(() => {
    if (!map) return

    const L = require('leaflet')

    // Clear existing layers
    layersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer)
      } catch {
        // Ignore cleanup errors
      }
    })
    layersRef.current = []

    const showRiverStatus = visibleLayers.includes('wfd_river_status')

    // Add rivers
    if (visibleLayers.includes('rivers') || showRiverStatus) {
      for (const river of data.rivers) {
        if (!river.geometry) continue

        const color = showRiverStatus ? getWFDStatusColor(river.WFD_Status) : EPA_COLORS.rivers

        try {
          const layer = L.geoJSON(river.geometry, {
            style: {
              color: color,
              weight: 3,
              opacity: 0.8,
            },
          })

          // Use catchments.ie URL if available, otherwise fall back to EPA
          const riverUrl = river.CatchmentsUrl || getEPASourceUrl('rivers')
          layer.bindPopup(`
            <div style="min-width: 240px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${river.RiverName}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">WFD River Water Body</div>
              <table style="font-size: 12px; width: 100%;">
                ${river.RiverCode ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Code:</td><td style="font-weight: 500;">${river.RiverCode}</td></tr>` : ''}
                ${river.BasinName ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Basin:</td><td style="font-weight: 500;">${river.BasinName}</td></tr>` : ''}
                ${river.Length_km ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Length:</td><td style="font-weight: 500;">${river.Length_km.toFixed(1)} km</td></tr>` : ''}
                ${river.RiverType ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Type:</td><td style="font-weight: 500;">${river.RiverType}</td></tr>` : ''}
                ${river.LocalAuthority ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Authority:</td><td style="font-weight: 500;">${river.LocalAuthority}</td></tr>` : ''}
              </table>
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <a href="${riverUrl}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; text-decoration: none;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  ${river.CatchmentsUrl ? 'View on Catchments.ie' : 'View on EPA website'}
                </a>
              </div>
            </div>
          `)

          layer.bindTooltip(river.RiverName, {
            permanent: false,
            direction: 'top',
          })

          layer.addTo(map)
          layersRef.current.push(layer)
        } catch (error) {
          console.error('Error adding river to map:', error)
        }
      }
    }

    // Add lakes
    if (visibleLayers.includes('lakes')) {
      for (const lake of data.lakes) {
        if (!lake.geometry) continue

        try {
          const layer = L.geoJSON(lake.geometry, {
            style: {
              color: EPA_COLORS.lakes,
              weight: 2,
              fillColor: EPA_COLORS.lakes,
              fillOpacity: 0.3,
            },
          })

          // Use catchments.ie URL if available, otherwise fall back to EPA
          const lakeUrl = lake.CatchmentsUrl || getEPASourceUrl('lakes')
          layer.bindPopup(`
            <div style="min-width: 240px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${lake.LakeName}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">WFD Lake Water Body</div>
              <table style="font-size: 12px; width: 100%;">
                ${lake.LakeCode ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Code:</td><td style="font-weight: 500;">${lake.LakeCode}</td></tr>` : ''}
                ${lake.BasinName ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Basin:</td><td style="font-weight: 500;">${lake.BasinName}</td></tr>` : ''}
                ${lake.Area_ha ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Area:</td><td style="font-weight: 500;">${lake.Area_ha.toFixed(1)} ha</td></tr>` : ''}
                ${lake.CatchmentName ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Catchment:</td><td style="font-weight: 500;">${lake.CatchmentName}</td></tr>` : ''}
                ${lake.LocalAuthority ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Authority:</td><td style="font-weight: 500;">${lake.LocalAuthority}</td></tr>` : ''}
              </table>
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <a href="${lakeUrl}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; text-decoration: none;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  ${lake.CatchmentsUrl ? 'View on Catchments.ie' : 'View on EPA website'}
                </a>
              </div>
            </div>
          `)

          layer.bindTooltip(lake.LakeName, {
            permanent: false,
            direction: 'top',
          })

          layer.addTo(map)
          layersRef.current.push(layer)
        } catch (error) {
          console.error('Error adding lake to map:', error)
        }
      }
    }

    // Add catchments
    if (visibleLayers.includes('catchments')) {
      for (const catchment of data.catchments) {
        if (!catchment.geometry) continue

        try {
          const layer = L.geoJSON(catchment.geometry, {
            style: {
              color: EPA_COLORS.catchments,
              weight: 2,
              fillColor: EPA_COLORS.catchments,
              fillOpacity: 0.1,
              dashArray: '5, 5',
            },
          })

          // Build catchments.ie URL for the catchment
          const catchmentUrl = `https://www.catchments.ie/data/#/catchment/${catchment.CatchmentId}`
          layer.bindPopup(`
            <div style="min-width: 240px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${catchment.CatchmentName}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">WFD Catchment</div>
              <table style="font-size: 12px; width: 100%;">
                ${catchment.CatchmentId ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">ID:</td><td style="font-weight: 500;">${catchment.CatchmentId}</td></tr>` : ''}
                ${catchment.Area_km2 ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">Area:</td><td style="font-weight: 500;">${catchment.Area_km2.toFixed(1)} km²</td></tr>` : ''}
                ${catchment.RiverBasinDistrict ? `<tr><td style="color: #666; padding: 2px 8px 2px 0;">District:</td><td style="font-weight: 500;">${catchment.RiverBasinDistrict}</td></tr>` : ''}
              </table>
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <a href="${catchmentUrl}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; text-decoration: none;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  View on Catchments.ie
                </a>
              </div>
            </div>
          `)

          layer.bindTooltip(catchment.CatchmentName, {
            permanent: false,
            direction: 'top',
          })

          layer.addTo(map)
          layersRef.current.push(layer)
        } catch (error) {
          console.error('Error adding catchment to map:', error)
        }
      }
    }

    return () => {
      layersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer)
        } catch {
          // Ignore cleanup errors
        }
      })
    }
  }, [map, data, visibleLayers])

  return {
    data,
    isLoading,
    counts: {
      rivers: data.rivers.length,
      lakes: data.lakes.length,
      catchments: data.catchments.length,
      total: data.rivers.length + data.lakes.length + data.catchments.length,
    },
  }
}
