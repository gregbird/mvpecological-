'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { getPhotoPublicUrl } from '@/lib/supabase/queries'
import type { Photo } from '@/types/database'

// Fix default marker icons in webpack/next.js
const proto = L.Icon.Default.prototype as unknown as Record<string, unknown>
delete proto._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface PhotoMapViewProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

/** Parse a PostGIS `POINT(lon lat)` string or WKB-style location */
function parseLocation(location: unknown): [number, number] | null {
  if (!location) return null

  if (typeof location === 'string') {
    const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (match) {
      const lng = parseFloat(match[1])
      const lat = parseFloat(match[2])
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
    }
  }

  // Handle GeoJSON-like object
  if (typeof location === 'object' && location !== null) {
    const loc = location as Record<string, unknown>
    if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
      const [lng, lat] = loc.coordinates as number[]
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
    }
  }

  return null
}

export default function PhotoMapView({ photos, onPhotoClick }: PhotoMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([53.1424, -7.6921], 7)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer)
    })

    const bounds: L.LatLngExpression[] = []

    for (const photo of photos) {
      const coords = parseLocation(photo.location)
      if (!coords) continue

      bounds.push(coords)

      const url = getPhotoPublicUrl(photo.storage_path)

      const marker = L.marker(coords).addTo(map)
      marker.bindPopup(
        `<div style="text-align:center;max-width:200px">
          <img src="${url}" style="width:100%;border-radius:4px;margin-bottom:4px" loading="lazy" />
          <div style="font-size:12px">${photo.caption ?? 'Photo'}</div>
        </div>`,
        { maxWidth: 220 }
      )
      marker.on('click', () => onPhotoClick(photo))
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 })
    }
  }, [photos, onPhotoClick])

  return <div ref={mapRef} className="h-full w-full" />
}
