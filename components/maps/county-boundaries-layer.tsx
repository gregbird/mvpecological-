'use client'

import * as React from 'react'
import { GeoJSON, Popup } from 'react-leaflet'
import type { Layer, LeafletMouseEvent } from 'leaflet'

import {
  getBoundaryLayerById,
  getCountyColor,
  BOUNDARY_LAYER_METADATA,
} from '@/lib/config/boundary-layers'

interface CountyBoundariesLayerProps {
  visible?: boolean
  onCountyClick?: (countyName: string, properties: CountyProperties) => void
  highlightedCounty?: string | null
  colorByProvince?: boolean // If true, color counties by province
}

interface CountyProperties {
  name: string
  nameIrish: string
  province: string
  englishName: string
}

export function CountyBoundariesLayer({
  visible = true,
  onCountyClick,
  highlightedCounty,
  colorByProvince = true,
}: CountyBoundariesLayerProps) {
  const [geoData, setGeoData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Get layer config
  const layerConfig = getBoundaryLayerById('counties')

  // Load GeoJSON data
  React.useEffect(() => {
    if (!visible || geoData) return

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/data/counties-ireland.geojson')
        if (!response.ok) {
          throw new Error(`Failed to load county boundaries: ${response.status}`)
        }
        const data = await response.json()
        setGeoData(data)
      } catch (err) {
        console.error('Error loading county boundaries:', err)
        setError(err instanceof Error ? err.message : 'Failed to load county boundaries')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [visible, geoData])

  // Style function for features
  const getStyle = React.useCallback(
    (feature?: GeoJSON.Feature) => {
      if (!feature || !layerConfig) {
        return {
          color: '#f97316',
          weight: 2,
          fillColor: '#f97316',
          fillOpacity: 0.05,
        }
      }

      const props = feature.properties as CountyProperties
      const isHighlighted = highlightedCounty === props?.name

      // Determine color
      let color = layerConfig.color
      let fillColor = layerConfig.fillColor

      if (colorByProvince && props?.province) {
        color = getCountyColor(props.province)
        fillColor = color
      }

      return {
        color: isHighlighted ? '#fbbf24' : color,
        weight: isHighlighted ? 3 : layerConfig.weight,
        fillColor: fillColor,
        fillOpacity: isHighlighted ? 0.15 : layerConfig.fillOpacity,
        dashArray: isHighlighted ? undefined : '4, 4',
      }
    },
    [layerConfig, highlightedCounty, colorByProvince]
  )

  // Event handlers for each feature
  const onEachFeature = React.useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const props = feature.properties as CountyProperties

      // Hover effects
      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target
          target.setStyle({
            weight: 3,
            fillOpacity: 0.15,
            dashArray: undefined,
          })
          target.bringToFront()
        },
        mouseout: (e: LeafletMouseEvent) => {
          const target = e.target
          target.setStyle(getStyle(feature))
        },
        click: () => {
          if (onCountyClick && props) {
            onCountyClick(props.name, props)
          }
        },
      })
    },
    [getStyle, onCountyClick]
  )

  if (!visible || loading || error || !geoData) {
    return null
  }

  return (
    <GeoJSON key="county-boundaries" data={geoData} style={getStyle} onEachFeature={onEachFeature}>
      {geoData.features.map((feature, index) => {
        const props = feature.properties as CountyProperties
        return (
          <Popup key={`county-popup-${index}`}>
            <div className="min-w-50 p-2">
              <h3 className="text-base font-semibold">{props.name}</h3>
              {props.nameIrish && <p className="text-sm text-gray-600 italic">{props.nameIrish}</p>}
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Province:</span> {props.province}
                </p>
                <p>
                  <span className="font-medium">Authority:</span> {props.englishName}
                </p>
              </div>
              <div className="mt-3 border-t pt-2">
                <p className="text-xs text-gray-500">
                  Source:{' '}
                  <a
                    href={BOUNDARY_LAYER_METADATA.counties.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Tailte Éireann
                  </a>
                </p>
              </div>
            </div>
          </Popup>
        )
      })}
    </GeoJSON>
  )
}

// Export a wrapper for use outside react-leaflet context
export function CountyBoundariesLayerWrapper(props: CountyBoundariesLayerProps) {
  return <CountyBoundariesLayer {...props} />
}
