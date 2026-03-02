import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/dropbox/embeddings'

interface SearchResult {
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { query, limit = 20 } = (await request.json()) as { query: string; limit?: number }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()
    const maxResults = Math.min(limit, 50)

    // Run keyword search and semantic search in parallel
    const adminSupabase = createAdminClient()

    const [keywordResults, semanticResults] = await Promise.all([
      // Keyword search (tsvector + ILIKE fallback)
      adminSupabase
        .rpc('search_document_chunks', {
          p_organization_id: profile.organization_id,
          p_query: trimmedQuery,
          p_limit: maxResults,
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Keyword search error:', error)
            return [] as SearchResult[]
          }
          return (data ?? []) as SearchResult[]
        }),

      // Semantic search (pgvector cosine similarity)
      generateEmbedding(trimmedQuery)
        .then((embedding) =>
          adminSupabase
            .rpc('search_document_chunks_semantic', {
              p_organization_id: profile.organization_id,
              p_embedding: JSON.stringify(embedding),
              p_match_threshold: 0.3,
              p_limit: maxResults,
            })
            .then(({ data, error }) => {
              if (error) {
                console.error('Semantic search error:', error)
                return [] as SearchResult[]
              }
              // Map similarity to rank field for unified interface
              return ((data ?? []) as Array<SearchResult & { similarity: number }>).map((r) => ({
                ...r,
                rank: r.similarity ?? r.rank,
              }))
            })
        )
        .catch((err) => {
          // Semantic search failure is non-fatal
          console.error('Semantic search failed (non-fatal):', err)
          return [] as SearchResult[]
        }),
    ])

    // Merge and deduplicate: keyword results first, then semantic-only results
    const seenChunkIds = new Set<string>()
    const merged: SearchResult[] = []

    // Add keyword results first (higher priority for exact matches)
    for (const result of keywordResults) {
      seenChunkIds.add(result.chunk_id)
      merged.push(result)
    }

    // Add semantic results that weren't found by keyword search
    for (const result of semanticResults) {
      if (!seenChunkIds.has(result.chunk_id)) {
        seenChunkIds.add(result.chunk_id)
        merged.push(result)
      }
    }

    return NextResponse.json({ results: merged.slice(0, maxResults) })
  } catch (error) {
    console.error('Search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
