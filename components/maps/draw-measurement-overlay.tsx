'use client'

export interface DrawMeasurement {
  /** Area in hectares */
  areaHa: number
  /** Perimeter in meters */
  perimeterM: number
}

interface DrawMeasurementOverlayProps {
  measurement: DrawMeasurement | null
}

/**
 * Floating overlay that displays live area/perimeter measurements
 * while the user is drawing a polygon on the map.
 */
export function DrawMeasurementOverlay({ measurement }: DrawMeasurementOverlayProps) {
  if (!measurement) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
      className="bg-background/95 text-foreground rounded-lg border px-4 py-2 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-4 text-sm font-medium">
        <span>
          Area:{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">
            {measurement.areaHa < 0.01
              ? `${(measurement.areaHa * 10000).toFixed(0)} m\u00B2`
              : `${measurement.areaHa.toFixed(2)} ha`}
          </strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          Perimeter:{' '}
          <strong className="text-blue-600 dark:text-blue-400">
            {measurement.perimeterM < 1000
              ? `${measurement.perimeterM.toFixed(0)} m`
              : `${(measurement.perimeterM / 1000).toFixed(2)} km`}
          </strong>
        </span>
      </div>
    </div>
  )
}
