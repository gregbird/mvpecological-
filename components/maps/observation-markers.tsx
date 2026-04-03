'use client'

interface ObservationMarkersProps {
  observationPoints: GeoJSON.FeatureCollection
  /** react-leaflet components (passed to avoid duplicate require) */
  rl: {
    CircleMarker: React.ComponentType<Record<string, unknown>>
    Popup: React.ComponentType<Record<string, unknown>>
  }
}

/**
 * Renders species observation point markers on the map.
 * Protected species are shown in red, others in green.
 */
export function ObservationMarkers({ observationPoints, rl }: ObservationMarkersProps) {
  const { CircleMarker, Popup } = rl

  return (
    <>
      {observationPoints.features.map((feature, index) => {
        const coords = (feature.geometry as GeoJSON.Point).coordinates
        const props = feature.properties
        const isProtected = props?.is_protected

        return (
          <CircleMarker
            key={`obs-${index}`}
            center={[coords[1], coords[0]]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: isProtected ? '#ef4444' : '#22c55e',
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">
                  {props?.species_name_common || props?.species_name_scientific}
                </h3>
                <p className="text-sm text-gray-600">{props?.species_name_scientific}</p>
                {isProtected && (
                  <span className="rounded bg-red-100 px-1 text-xs text-red-800">Protected</span>
                )}
                {props?.count && <p className="mt-1 text-sm">Count: {props.count}</p>}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
