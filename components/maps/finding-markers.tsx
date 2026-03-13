'use client'

import type L from 'leaflet'
import type { DeskResearchFinding } from '@/components/desk-research/finding-card'
import { FINDING_SOURCE_COLORS, getSpeciesColor } from '@/components/maps/map-types'

interface FindingMarkersProps {
  findings: DeskResearchFinding[]
  selectedFinding?: DeskResearchFinding | null
  onFindingClick?: (finding: DeskResearchFinding) => void
  /** react-leaflet components passed from parent (to avoid duplicate require) */
  rl: {
    CircleMarker: React.ComponentType<Record<string, unknown>>
    GeoJSON: React.ComponentType<Record<string, unknown>>
    Popup: React.ComponentType<Record<string, unknown>>
  }
}

/**
 * Renders desk research findings on the map by geometry type
 * (Point, Polygon, MultiPolygon, LineString, MultiLineString, GeometryCollection).
 */
export function FindingMarkers({
  findings,
  selectedFinding,
  onFindingClick,
  rl,
}: FindingMarkersProps) {
  const { CircleMarker, GeoJSON, Popup } = rl

  return (
    <>
      {findings.map((finding) => {
        if (!finding.location) return null

        // Skip species record dots on map (feedback: not helpful)
        if (finding.dataType === 'species_record') return null

        const isSelected = selectedFinding?.id === finding.id
        // Use species-aware color function for species records
        const color = getSpeciesColor(finding)
        const sourceColor = FINDING_SOURCE_COLORS[finding.source] || '#6b7280'

        // Determine marker size based on status (protected/invasive are larger)
        const metadata = finding.metadata as Record<string, unknown> | undefined
        const isImportantSpecies =
          metadata?.isProtected || metadata?.isInvasive || finding.source === 'fpo'
        const baseRadius = isImportantSpecies ? 10 : 8

        // Render based on geometry type
        if (finding.location.type === 'Point') {
          const [lng, lat] = finding.location.coordinates as [number, number]
          return (
            <CircleMarker
              key={`finding-${finding.id}`}
              center={[lat, lng]}
              radius={isSelected ? baseRadius + 4 : baseRadius}
              pathOptions={{
                color: isSelected ? '#fbbf24' : '#ffffff',
                weight: isSelected ? 3 : isImportantSpecies ? 2.5 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.85,
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const L = require('leaflet')
                  L.DomEvent.stopPropagation(e)
                  onFindingClick?.(finding)
                },
              }}
            >
              <Popup>
                <div className="max-w-xs p-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: sourceColor }}
                    >
                      {finding.source.toUpperCase()}
                    </span>
                    {/* Species status badges */}
                    {!!metadata?.isProtected && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                        Protected
                      </span>
                    )}
                    {!!metadata?.isInvasive && (
                      <span className="rounded bg-orange-500 px-1.5 py-0.5 text-xs font-medium text-white">
                        Invasive
                      </span>
                    )}
                    {!!metadata?.isThreatened && !metadata?.isProtected && (
                      <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-medium text-white">
                        Threatened
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{finding.title}</h3>
                  {/* Scientific name if different from title */}
                  {typeof metadata?.scientificName === 'string' &&
                    metadata.scientificName !== finding.title && (
                      <p className="text-xs text-gray-500 italic">{metadata.scientificName}</p>
                    )}
                  {finding.content && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                  )}
                  {/* Designations */}
                  {typeof metadata?.designations === 'string' && (
                    <p className="mt-1 text-xs text-red-700">
                      {metadata.designations.split('||')[0].trim()}
                    </p>
                  )}
                  {finding.metadata?.distance !== undefined && (
                    <p className="mt-1 text-xs text-gray-500">
                      {finding.metadata.distance === 0
                        ? 'Within boundary'
                        : `${finding.metadata.distance.toFixed(1)} km from boundary`}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        } else if (
          finding.location.type === 'Polygon' ||
          finding.location.type === 'MultiPolygon'
        ) {
          return (
            <GeoJSON
              key={`finding-${finding.id}`}
              data={finding.location}
              style={{
                color: isSelected ? '#fbbf24' : color,
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 0.4 : 0.2,
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const L = require('leaflet')
                  L.DomEvent.stopPropagation(e)
                  onFindingClick?.(finding)
                },
              }}
            >
              <Popup>
                <div className="max-w-xs p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: sourceColor }}
                    >
                      {finding.source.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold">{finding.title}</h3>
                  {finding.content && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                  )}
                </div>
              </Popup>
            </GeoJSON>
          )
        } else if (
          finding.location.type === 'LineString' ||
          finding.location.type === 'MultiLineString'
        ) {
          return (
            <GeoJSON
              key={`finding-${finding.id}`}
              data={finding.location}
              style={{
                color: isSelected ? '#fbbf24' : color,
                weight: isSelected ? 4 : 3,
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const L = require('leaflet')
                  L.DomEvent.stopPropagation(e)
                  onFindingClick?.(finding)
                },
              }}
            >
              <Popup>
                <div className="max-w-xs p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: sourceColor }}
                    >
                      {finding.source.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold">{finding.title}</h3>
                  {finding.content && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                  )}
                </div>
              </Popup>
            </GeoJSON>
          )
        } else if (finding.location.type === 'GeometryCollection') {
          // Render first point from GeometryCollection
          const geoms = (finding.location as GeoJSON.GeometryCollection).geometries
          const firstPoint = geoms.find((g) => g.type === 'Point') as GeoJSON.Point | undefined
          if (!firstPoint) return null

          const [lng, lat] = firstPoint.coordinates
          const recordCount = finding.metadata?.recordCount || geoms.length

          return (
            <CircleMarker
              key={`finding-${finding.id}`}
              center={[lat, lng]}
              radius={isSelected ? 12 : 8}
              pathOptions={{
                color: isSelected ? '#fbbf24' : '#ffffff',
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.8,
              }}
              eventHandlers={{
                click: (e: L.LeafletMouseEvent) => {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const L = require('leaflet')
                  L.DomEvent.stopPropagation(e)
                  onFindingClick?.(finding)
                },
              }}
            >
              <Popup>
                <div className="max-w-xs p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: sourceColor }}
                    >
                      {finding.source.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {recordCount} location{recordCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="font-semibold">{finding.title}</h3>
                  {finding.content && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{finding.content}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        }

        return null
      })}
    </>
  )
}
