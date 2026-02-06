import { createClient } from '@/lib/supabase/client'
import type { Database, TargetNote } from '@/types/database'

type InsertTargetNote = Database['public']['Tables']['target_notes']['Insert']
type UpdateTargetNote = Database['public']['Tables']['target_notes']['Update']

// Target note with creator info
export interface TargetNoteWithCreator extends TargetNote {
  creator?: { id: string; full_name: string; email: string } | null
  finding?: { id: string; title: string; data_type: string } | null
}

// Get all target notes for a project
export async function getProjectTargetNotes(projectId: string): Promise<TargetNoteWithCreator[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .select(
      `
      *,
      creator:profiles!target_notes_created_by_fkey(id, full_name, email),
      finding:desk_research_findings(id, title, data_type)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching target notes:', error)
    return []
  }

  return (data ?? []) as unknown as TargetNoteWithCreator[]
}

// Get target notes by category
export async function getTargetNotesByCategory(
  projectId: string,
  category: TargetNote['category']
): Promise<TargetNoteWithCreator[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .select(
      `
      *,
      creator:profiles!target_notes_created_by_fkey(id, full_name, email),
      finding:desk_research_findings(id, title, data_type)
    `
    )
    .eq('project_id', projectId)
    .eq('category', category)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching target notes by category:', error)
    return []
  }

  return (data ?? []) as unknown as TargetNoteWithCreator[]
}

// Get a single target note
export async function getTargetNote(noteId: string): Promise<TargetNoteWithCreator | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .select(
      `
      *,
      creator:profiles!target_notes_created_by_fkey(id, full_name, email),
      finding:desk_research_findings(id, title, data_type)
    `
    )
    .eq('id', noteId)
    .single()

  if (error) {
    console.error('Error fetching target note:', error)
    return null
  }

  return data as unknown as TargetNoteWithCreator
}

// Create a new target note
export async function createTargetNote(note: InsertTargetNote): Promise<TargetNote | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .insert(note as Database['public']['Tables']['target_notes']['Insert'])
    .select()
    .single()

  if (error) {
    console.error('Error creating target note:', error)
    return null
  }

  return data as unknown as TargetNote
}

// Update a target note
export async function updateTargetNote(
  noteId: string,
  updates: UpdateTargetNote
): Promise<TargetNote | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating target note:', error)
    return null
  }

  return data as unknown as TargetNote
}

// Delete a target note
export async function deleteTargetNote(noteId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('target_notes').delete().eq('id', noteId)

  if (error) {
    console.error('Error deleting target note:', error)
    return false
  }

  return true
}

// Verify a target note (mark as checked in the field)
export async function verifyTargetNote(
  noteId: string,
  verifierId: string
): Promise<TargetNote | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('target_notes')
    .update({
      is_verified: true,
      verified_by: verifierId,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    console.error('Error verifying target note:', error)
    return null
  }

  return data as unknown as TargetNote
}

// Get target notes stats for a project
export async function getTargetNotesStats(projectId: string): Promise<{
  total: number
  byCategory: { category: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  verified: number
  pending: number
}> {
  const supabase = createClient()

  // Get all notes for the project
  const { data, error } = await supabase
    .from('target_notes')
    .select('category, priority, is_verified')
    .eq('project_id', projectId)

  if (error || !data) {
    console.error('Error fetching target notes stats:', error)
    return {
      total: 0,
      byCategory: [],
      byPriority: [],
      verified: 0,
      pending: 0,
    }
  }

  // Calculate stats
  const categoryMap = new Map<string, number>()
  const priorityMap = new Map<string, number>()
  let verified = 0
  let pending = 0

  for (const note of data) {
    categoryMap.set(note.category, (categoryMap.get(note.category) || 0) + 1)
    const priority = note.priority || 'normal'
    priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1)
    if (note.is_verified) {
      verified++
    } else {
      pending++
    }
  }

  return {
    total: data.length,
    byCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    })),
    byPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({
      priority,
      count,
    })),
    verified,
    pending,
  }
}
