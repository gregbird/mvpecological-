import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export interface ProjectSiteWithGeoJSON {
  id: string
  project_id: string
  site_code: string
  site_name: string | null
  sort_order: number
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | null
  center_point: GeoJSON.Point | null
  grid_reference: string | null
  county: string | null
  townland: string | null
  province: string | null
  buffer_distances: number[] | null
  visible_layers: string[] | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

function parseGeoJSON(raw: unknown): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!raw) return null
  const geom = raw as GeoJSON.Geometry
  if (geom.type === 'Polygon') {
    return { type: 'Feature', geometry: geom, properties: {} }
  }
  return null
}

function parseSiteFromRPC(raw: Record<string, unknown>): ProjectSiteWithGeoJSON {
  return {
    id: raw.id as string,
    project_id: raw.project_id as string,
    site_code: raw.site_code as string,
    site_name: (raw.site_name as string) ?? null,
    sort_order: (raw.sort_order as number) ?? 0,
    boundary: parseGeoJSON(raw.boundary),
    center_point: (raw.center_point as GeoJSON.Point) ?? null,
    grid_reference: (raw.grid_reference as string) ?? null,
    county: (raw.county as string) ?? null,
    townland: (raw.townland as string) ?? null,
    province: (raw.province as string) ?? null,
    buffer_distances: (raw.buffer_distances as number[]) ?? null,
    visible_layers: (raw.visible_layers as string[]) ?? null,
    attributes: (raw.attributes as Record<string, unknown>) ?? {},
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  }
}

export async function getProjectSites(projectId: string): Promise<ProjectSiteWithGeoJSON[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_project_sites_with_geojson', {
    p_project_id: projectId,
  })

  if (error) throw new Error(`Failed to fetch project sites: ${error.message}`)

  const sites = data as unknown as Record<string, unknown>[]
  if (!Array.isArray(sites)) return []

  return sites.map(parseSiteFromRPC)
}

export interface UpsertSiteParams {
  projectId: string
  siteCode: string
  siteName?: string
  sortOrder?: number
  boundary?: GeoJSON.Feature<GeoJSON.Polygon>
  centerPoint?: GeoJSON.Point
  gridReference?: string
  county?: string
  townland?: string
  province?: string
  bufferDistances?: number[]
  visibleLayers?: string[]
  attributes?: Record<string, unknown>
}

export async function upsertProjectSite(params: UpsertSiteParams): Promise<string> {
  const supabase = createClient()

  type RpcArgs = Database['public']['Functions']['upsert_project_site']['Args']

  const args: RpcArgs = {
    p_project_id: params.projectId,
    p_site_code: params.siteCode,
    p_site_name: params.siteName,
    p_sort_order: params.sortOrder ?? 0,
    p_boundary: params.boundary
      ? (JSON.parse(JSON.stringify(params.boundary.geometry)) as RpcArgs['p_boundary'])
      : undefined,
    p_center_point: params.centerPoint
      ? (JSON.parse(JSON.stringify(params.centerPoint)) as RpcArgs['p_center_point'])
      : undefined,
    p_grid_reference: params.gridReference,
    p_county: params.county,
    p_townland: params.townland,
    p_province: params.province,
    p_buffer_distances: params.bufferDistances ?? [2, 5],
    p_visible_layers: params.visibleLayers,
    p_attributes: params.attributes ? JSON.parse(JSON.stringify(params.attributes)) : {},
  }

  const { data, error } = await supabase.rpc('upsert_project_site', args)

  if (error) throw new Error(`Failed to upsert site: ${error.message}`)
  return data as string
}

export async function deleteProjectSite(siteId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('delete_project_site', {
    p_site_id: siteId,
  })

  if (error) throw new Error(`Failed to delete site: ${error.message}`)
  return data as boolean
}
