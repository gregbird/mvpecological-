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

/** Hybrid search: keyword (tsvector) + semantic (pgvector) via API route */
export async function searchDocuments(
  _organizationId: string,
  query: string,
  limit: number = 20
): Promise<DocumentSearchResult[]> {
  if (!query.trim()) return []

  const response = await fetch('/api/dropbox/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Search failed' }))
    throw new Error(errorData.error || 'Search failed')
  }

  const data = (await response.json()) as { results: DocumentSearchResult[] }
  return data.results
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
