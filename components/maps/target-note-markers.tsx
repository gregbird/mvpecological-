'use client'

import type L from 'leaflet'

import type { TargetNoteMarker } from '@/components/maps/map-types'
import { TARGET_NOTE_COLORS } from '@/components/maps/map-types'

interface TargetNoteMarkersProps {
  targetNotes: TargetNoteMarker[]
  selectedTargetNote?: TargetNoteMarker | null
  onTargetNoteClick?: (note: TargetNoteMarker) => void
  /** react-leaflet components (passed to avoid duplicate require) */
  rl: {
    CircleMarker: React.ComponentType<Record<string, unknown>>
    Popup: React.ComponentType<Record<string, unknown>>
  }
}

/**
 * Renders target note markers on the map with category colours,
 * selection highlighting, and popup details.
 */
export function TargetNoteMarkers({
  targetNotes,
  selectedTargetNote,
  onTargetNoteClick,
  rl,
}: TargetNoteMarkersProps) {
  const { CircleMarker, Popup } = rl

  return (
    <>
      {targetNotes.map((note) => {
        if (!note.location?.coordinates) return null
        const [lng, lat] = note.location.coordinates
        const isSelected = selectedTargetNote?.id === note.id
        const color = TARGET_NOTE_COLORS[note.category] || '#8b5cf6'
        const isHighPriority = note.priority === 'high'
        const baseRadius = isHighPriority ? 10 : 8

        return (
          <CircleMarker
            key={`target-note-${note.id}`}
            center={[lat, lng]}
            radius={isSelected ? baseRadius + 4 : baseRadius}
            pathOptions={{
              color: isSelected ? '#fbbf24' : '#ffffff',
              weight: isSelected ? 3 : 2,
              fillColor: note.isVerified ? '#22c55e' : color,
              fillOpacity: isSelected ? 1 : 0.85,
            }}
            eventHandlers={{
              click: (e: L.LeafletMouseEvent) => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const L = require('leaflet')
                L.DomEvent.stopPropagation(e)
                onTargetNoteClick?.(note)
              },
            }}
          >
            <Popup>
              <div className="max-w-xs p-2">
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-white capitalize"
                    style={{ backgroundColor: color }}
                  >
                    {note.category.replace('_', ' ')}
                  </span>
                  {isHighPriority && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      High Priority
                    </span>
                  )}
                  {note.isVerified && (
                    <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      Verified
                    </span>
                  )}
                </div>
                <h3 className="font-semibold">{note.title}</h3>
                {note.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{note.description}</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
