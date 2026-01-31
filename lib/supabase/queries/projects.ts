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

// Get single project by ID
export async function getProject(projectId: string): Promise<ProjectWithRelations | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
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

  if (error) {
    // Supabase bağlantısı yoksa veya tablo yoksa sessizce devam et (mock data kullanılacak)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Supabase] Project fetch skipped - using mock data:', error.code)
    }
    return null
  }

  return data as unknown as ProjectWithRelations
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
    console.error('Error creating project:', error)
    return null
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
    console.error('Error updating project:', error)
    return null
  }

  return data as unknown as Project
}

// Update project boundary (GIS data)
export async function updateProjectBoundary(
  projectId: string,
  boundary: unknown,
  centerPoint: unknown,
  gridReference: string
): Promise<Project | null> {
  const supabase = createClient()

  console.log('[updateProjectBoundary] Attempting to update:', {
    projectId,
    gridReference,
    hasBoundary: !!boundary,
    hasCenterPoint: !!centerPoint,
  })

  const { data, error } = await supabase
    .from('projects')
    .update({
      boundary,
      center_point: centerPoint,
      grid_reference: gridReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating project boundary:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    // Check if it's a connection issue or mock data scenario
    if (error.code === 'PGRST116' || error.code === '42P01') {
      console.warn('[updateProjectBoundary] Table or row not found - possibly using mock data')
    }
    return null
  }

  console.log('[updateProjectBoundary] Success:', data?.id)
  return data as unknown as Project
}

// Delete project
export async function deleteProject(projectId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return false
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
    console.error('Error adding project member:', error)
    return null
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
    console.error('Error removing project member:', error)
    return false
  }

  return true
}
