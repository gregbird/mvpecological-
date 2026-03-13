import type { DeskResearchFinding } from '@/components/desk-research/finding-card'
import { FINDING_TYPE_COLORS } from '@/lib/config/map-constants'

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  color?: string
}

// Target Note marker interface
export interface TargetNoteMarker {
  id: string
  category: string
  title: string
  description?: string | null
  priority?: string | null
  isVerified?: boolean | null
  location: { coordinates: [number, number] } | null
}

// Finding marker interface for displaying desk research findings on map
export interface FindingMarker {
  id: string
  title: string
  dataType:
    | 'designated_site'
    | 'species_record'
    | 'water_quality'
    | 'catchment'
    | 'habitat'
    | 'company_report'
    | 'other'
  location: { coordinates: [number, number] } | null // [lng, lat] GeoJSON format
  isProtected?: boolean
  source?: string
}

/** Saved habitat polygon for display on map */
export interface HabitatPolygonOverlay {
  id: string
  geometry: GeoJSON.Geometry
  fossittCode: string
  fossittName: string
  condition: string | null
  color?: string
}

export interface BufferColorConfig {
  fill: string
  stroke: string
  name: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Target note category colors for markers
export const TARGET_NOTE_COLORS: Record<string, string> = {
  access_point: '#3b82f6', // blue
  check_feature: '#8b5cf6', // purple
  habitat: '#22c55e', // green
  fauna: '#f59e0b', // amber
  flora: '#ec4899', // pink
  management: '#64748b', // slate
  damage: '#ef4444', // red
  ownership: '#6366f1', // indigo
}

// Buffer zone colors (matching GIS mapping step)
export const BUFFER_COLORS: Record<number, string> = {
  0.5: '#ef4444', // red
  1: '#f97316', // orange
  2: '#eab308', // yellow
  5: '#22c55e', // green
  10: '#3b82f6', // blue
  15: '#8b5cf6', // purple
}

// Species status colors (for species_record findings)
export const SPECIES_STATUS_COLORS = {
  protected: '#dc2626', // Red - protected species (requires attention)
  invasive: '#f97316', // Orange - invasive species (problem species)
  threatened: '#eab308', // Yellow - threatened but not legally protected
  normal: '#3b82f6', // Blue - regular species
}

// Finding source colors
export const FINDING_SOURCE_COLORS: Record<string, string> = {
  npws: '#22c55e', // Green
  gbif: '#3b82f6', // Blue
  nbdc: '#8b5cf6', // Purple
  epa: '#06b6d4', // Cyan
  fpo: '#dc2626', // Red - Flora Protection Order (always protected)
  manual: '#f59e0b', // Amber
  company_reports: '#6366f1', // Indigo
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get color for a species based on its conservation status
 */
export function getSpeciesColor(finding: DeskResearchFinding): string {
  if (finding.dataType !== 'species_record') {
    return FINDING_TYPE_COLORS[finding.dataType] || FINDING_TYPE_COLORS.other
  }

  // FPO species are always protected
  if (finding.source === 'fpo') {
    return SPECIES_STATUS_COLORS.protected
  }

  const metadata = finding.metadata as Record<string, unknown> | undefined

  // Priority: protected > invasive > threatened > normal
  if (metadata?.isProtected) {
    return SPECIES_STATUS_COLORS.protected
  }
  if (metadata?.isInvasive) {
    return SPECIES_STATUS_COLORS.invasive
  }
  if (metadata?.isThreatened) {
    return SPECIES_STATUS_COLORS.threatened
  }

  return SPECIES_STATUS_COLORS.normal
}

// Buffer zone styles with custom colors
export function getBufferZoneStyle(distance: number, colorConfig?: BufferColorConfig) {
  const fillColor = colorConfig?.fill || '#3b82f6'
  const strokeColor = colorConfig?.stroke || '#2563eb'

  // Opacity decreases with distance for better visibility
  const fillOpacity = distance <= 1 ? 0.2 : distance <= 2 ? 0.15 : distance <= 5 ? 0.1 : 0.08
  const weight = distance <= 2 ? 2 : 1.5

  return {
    color: strokeColor,
    fillColor: fillColor,
    fillOpacity,
    weight,
    dashArray: distance > 2 ? '8, 4' : undefined,
  }
}
