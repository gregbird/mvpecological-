import { createClient } from '@/lib/supabase/client'
import type { Database, Project, ProjectMember, WorkflowStep } from '@/types/database'

type InsertProject = Database['public']['Tables']['projects']['Insert']
type UpdateProject = Database['public']['Tables']['projects']['Update']
type InsertProjectMember = Database['public']['Tables']['project_members']['Insert']

// Project with relations
export interface ProjectWithRelations extends Project {
  client?: { id: string; name: string } | null
  members?: (ProjectMember & { profile: { id: string; full_name: string; email: string } })[]
  workflow_steps?: WorkflowStep[]
}

// Get single project by ID with boundary as GeoJSON
export async function getProject(projectId: string): Promise<ProjectWithRelations | null> {
  const supabase = createClient()

  // First get the project with GeoJSON boundary using RPC
  const { data: projectData, error: projectError } = await supabase.rpc(
    'get_project_with_geojson',
    {
      p_project_id: projectId,
    }
  )

  if (projectError || !projectData) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Project fetch error:', projectError?.code)
    }
    return null
  }

  // Then get the related data
  const { data: relatedData, error: relatedError } = await supabase
    .from('projects')
    .select(
      `
      client:clients(id, name),
      members:project_members(
        *,
        profile:profiles(id, full_name, email)
      ),
      workflow_steps(*)
    `
    )
    .eq('id', projectId)
    .single()

  if (relatedError) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Related data fetch error:', relatedError.code)
    }
  }

  // Merge project data with related data
  const project = projectData as Record<string, unknown>
  return {
    ...project,
    client: relatedData?.client || null,
    members: relatedData?.members || [],
    workflow_steps: relatedData?.workflow_steps || [],
  } as unknown as ProjectWithRelations
}

// Get all projects for organization
export async function getProjects(organizationId: string): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Projects fetch skipped - using mock data:', error.code)
    }
    return []
  }

  return (data ?? []) as Project[]
}

// Get projects assigned to user
export async function getAssignedProjects(userId: string): Promise<ProjectWithRelations[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      client:clients(id, name),
      members:project_members!inner(
        *,
        profile:profiles(id, full_name, email)
      ),
      workflow_steps(*)
    `
    )
    .eq('members.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Assigned projects fetch skipped - using mock data:', error.code)
    }
    return []
  }

  return (data ?? []) as unknown as ProjectWithRelations[]
}

// Create new project
export async function createProject(project: InsertProject): Promise<Project | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert(project as Database['public']['Tables']['projects']['Insert'])
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create project')
  }

  return data as unknown as Project
}

// Update project
export async function updateProject(
  projectId: string,
  updates: UpdateProject
): Promise<Project | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update project')
  }

  return data as unknown as Project
}

// Update project boundary (GIS data)
// Uses RPC function to properly convert GeoJSON to PostGIS geometry
export async function updateProjectBoundary(
  projectId: string,
  boundary: GeoJSON.Feature<GeoJSON.Polygon> | GeoJSON.Polygon,
  centerPoint: GeoJSON.Point | { type: 'Point'; coordinates: [number, number] },
  gridReference: string,
  bufferDistances?: number[],
  visibleLayers?: string[],
  townland?: string,
  county?: string,
  province?: string
): Promise<Project | null> {
  const supabase = createClient()

  // Use RPC function to convert GeoJSON to PostGIS geometry
  // Cast to Json type for Supabase RPC
  const { data, error } = await supabase.rpc('update_project_boundary', {
    p_project_id: projectId,
    p_boundary:
      boundary as unknown as Database['public']['Functions']['update_project_boundary']['Args']['p_boundary'],
    p_center_point:
      centerPoint as unknown as Database['public']['Functions']['update_project_boundary']['Args']['p_center_point'],
    p_grid_reference: gridReference,
    p_buffer_distances: bufferDistances || undefined,
    p_visible_layers: visibleLayers || undefined,
    p_townland: townland || undefined,
    p_county: county || undefined,
    p_province: province || undefined,
  })

  if (error) {
    throw new Error(error.message || 'Failed to update project boundary')
  }

  return data as unknown as Project
}

// Delete project
export async function deleteProject(projectId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    throw new Error(error.message || 'Failed to delete project')
  }

  return true
}

// Add project member
export async function addProjectMember(member: InsertProjectMember): Promise<ProjectMember | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_members')
    .insert(member as Database['public']['Tables']['project_members']['Insert'])
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to add project member')
  }

  return data as unknown as ProjectMember
}

// Remove project member
export async function removeProjectMember(projectId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to remove project member')
  }

  return true
}
