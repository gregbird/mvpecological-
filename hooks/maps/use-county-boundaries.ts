'use client'

import * as React from 'react'

/**
 * Loads county GeoJSON from /data/counties-ireland.geojson on demand.
 * Data is cached in state so subsequent toggles reuse the result.
 */
export function useCountyBoundaries(visible: boolean) {
  const [countiesData, setCountiesData] = React.useState<GeoJSON.FeatureCollection | null>(null)
  const [countiesLoading, setCountiesLoading] = React.useState(false)

  React.useEffect(() => {
    if (visible && !countiesData && !countiesLoading) {
      setCountiesLoading(true)
      fetch('/data/counties-ireland.geojson')
        .then((res) => res.json())
        .then((data: GeoJSON.FeatureCollection) => {
          setCountiesData(data)
          setCountiesLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load county boundaries:', err)
          setCountiesLoading(false)
        })
    }
  }, [visible, countiesData, countiesLoading])

  return { countiesData, countiesLoading }
}
