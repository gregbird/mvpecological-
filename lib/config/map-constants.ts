// Shared map constants used by project-map.tsx and project-map-with-draw.tsx

// Ireland center coordinates (Leaflet uses [lat, lng])
export const IRELAND_CENTER: [number, number] = [53.1424, -7.6921]
export const DEFAULT_ZOOM = 7

export type MapStyle = 'streets' | 'satellite' | 'hybrid' | 'topo'

// Tile layer URLs (all free, no API key required)
export const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; label: string }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Streets (OSM)',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: 'Satellite (ESRI)',
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Labels &copy; OpenStreetMap contributors',
    label: 'Hybrid (Satellite + Labels)',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Topographic',
  },
}

// Finding type colors (used for map markers by data type)
export const FINDING_TYPE_COLORS: Record<string, string> = {
  designated_site: '#22c55e', // Green for protected sites
  species_record: '#3b82f6', // Blue for species
  water_quality: '#06b6d4', // Cyan for water
  catchment: '#8b5cf6', // Purple for catchments
  other: '#6b7280', // Gray for other
}
