import { createClient } from '@/lib/supabase/client'

export interface DocumentSearchResult {
  chunk_id: string
  document_id: string
  file_name: string
  file_path: string
  chunk_index: number
  content: string
  page_start: number | null
  page_end: number | null
  rank: number
  total_chunks: number | null
  file_extension: string | null
}

/** Full-text search across indexed document chunks using PostgreSQL tsvector */
export async function searchDocuments(
  organizationId: string,
  query: string,
  limit: number = 20
): Promise<DocumentSearchResult[]> {
  if (!query.trim()) return []

  const supabase = createClient()
  const { data, error } = await supabase.rpc('search_document_chunks', {
    p_organization_id: organizationId,
    p_query: query,
    p_limit: limit,
  })

  if (error) {
    throw new Error(`Document search failed: ${error.message}`)
  }

  return (data ?? []) as DocumentSearchResult[]
}

/** Get indexed document count for an organization */
export async function getIndexedDocumentCount(organizationId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('indexed_documents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'ready')

  if (error) {
    console.error('Error fetching document count:', error)
    return 0
  }

  return count ?? 0
}
