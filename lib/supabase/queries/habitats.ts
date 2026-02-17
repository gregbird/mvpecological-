import { createClient } from '@/lib/supabase/client'
import type { Database, HabitatPolygon } from '@/types/database'

type InsertHabitat = Database['public']['Tables']['habitat_polygons']['Insert']
type UpdateHabitat = Database['public']['Tables']['habitat_polygons']['Update']

// Get all habitat polygons for a project
export async function getProjectHabitats(projectId: string): Promise<HabitatPolygon[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching habitats:', error)
    return []
  }

  return (data ?? []) as HabitatPolygon[]
}

// Get habitats for a specific survey
export async function getSurveyHabitats(surveyId: string): Promise<HabitatPolygon[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching survey habitats:', error)
    return []
  }

  return (data ?? []) as HabitatPolygon[]
}

// Get single habitat by ID
export async function getHabitat(habitatId: string): Promise<HabitatPolygon | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .select('*')
    .eq('id', habitatId)
    .single()

  if (error) {
    console.error('Error fetching habitat:', error)
    return null
  }

  return data as HabitatPolygon
}

// Create new habitat polygon
export async function createHabitat(habitat: InsertHabitat): Promise<HabitatPolygon | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .insert(habitat as Database['public']['Tables']['habitat_polygons']['Insert'])
    .select()
    .single()

  if (error) {
    console.error('Error creating habitat:', error.message, error.code, error.details, error.hint)
    throw error
  }

  return data as unknown as HabitatPolygon
}

// Update habitat polygon
export async function updateHabitat(
  habitatId: string,
  updates: UpdateHabitat
): Promise<HabitatPolygon | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', habitatId)
    .select()
    .single()

  if (error) {
    console.error('Error updating habitat:', error)
    return null
  }

  return data as unknown as HabitatPolygon
}

// Delete habitat polygon
export async function deleteHabitat(habitatId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('habitat_polygons').delete().eq('id', habitatId)

  if (error) {
    console.error('Error deleting habitat:', error)
    return false
  }

  return true
}

// Get habitat statistics for a project
export async function getHabitatStats(projectId: string): Promise<{
  total: number
  totalArea: number
  byFossittCode: { code: string; name: string; count: number; area: number }[]
  byCondition: { condition: string; count: number }[]
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('habitat_polygons')
    .select('fossitt_code, fossitt_name, area_hectares, condition')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching habitat stats:', error)
    return { total: 0, totalArea: 0, byFossittCode: [], byCondition: [] }
  }

  const habitats = (data ?? []) as Array<{
    fossitt_code: string
    fossitt_name: string
    area_hectares: number | null
    condition: string | null
  }>

  // Group by Fossitt code
  const codeGroups = habitats.reduce(
    (acc, h) => {
      const key = h.fossitt_code
      if (!acc[key]) {
        acc[key] = { code: h.fossitt_code, name: h.fossitt_name, count: 0, area: 0 }
      }
      acc[key].count++
      acc[key].area += h.area_hectares || 0
      return acc
    },
    {} as Record<string, { code: string; name: string; count: number; area: number }>
  )

  // Group by condition
  const conditionGroups = habitats.reduce(
    (acc, h) => {
      const key = h.condition || 'unknown'
      if (!acc[key]) {
        acc[key] = { condition: key, count: 0 }
      }
      acc[key].count++
      return acc
    },
    {} as Record<string, { condition: string; count: number }>
  )

  return {
    total: habitats.length,
    totalArea: habitats.reduce((sum, h) => sum + (h.area_hectares || 0), 0),
    byFossittCode: Object.values(codeGroups).sort((a, b) => b.area - a.area),
    byCondition: Object.values(conditionGroups),
  }
}

// Calculate area from GeoJSON polygon (client-side approximation)
export function calculateAreaHectares(boundary: GeoJSON.Polygon): number {
  // Simple approximation using Shoelace formula
  // For accurate results, use PostGIS ST_Area on server
  const coords = boundary.coordinates[0]
  if (coords.length < 3) return 0

  let area = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i]
    const [x2, y2] = coords[i + 1]
    area += x1 * y2 - x2 * y1
  }
  area = Math.abs(area) / 2

  // Convert from degrees² to hectares (rough approximation at Irish latitudes)
  // 1 degree ≈ 111km at equator, ~70km at Irish latitude
  const kmPerDegree = 70
  const areaKm2 = area * kmPerDegree * kmPerDegree
  const areaHectares = areaKm2 * 100

  return Math.round(areaHectares * 100) / 100
}
