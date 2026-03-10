import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/dropbox/embeddings'

const OPENAI_MODEL = 'gpt-4o-mini'
const MAX_CONTEXT_CHARS = 12000

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Missing OPENAI_API_KEY environment variable')
  return key
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { query } = (await request.json()) as { query: string }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()
    const adminSupabase = createAdminClient()

    // Run keyword + semantic search in parallel to get top chunks
    const [keywordResults, semanticResults] = await Promise.all([
      adminSupabase
        .rpc('search_document_chunks', {
          p_organization_id: profile.organization_id,
          p_query: trimmedQuery,
          p_limit: 10,
        })
        .then(({ data }) => data ?? []),

      generateEmbedding(trimmedQuery)
        .then((embedding) =>
          adminSupabase
            .rpc('search_document_chunks_semantic', {
              p_organization_id: profile.organization_id,
              p_embedding: JSON.stringify(embedding),
              p_match_threshold: 0.3,
              p_limit: 10,
            })
            .then(({ data }) => data ?? [])
        )
        .catch(() => []),
    ])

    // Merge and deduplicate
    const seenIds = new Set<string>()
    const allChunks: Array<{
      chunk_id: string
      content: string
      file_name: string
      chunk_index: number
    }> = []

    for (const r of [...keywordResults, ...semanticResults]) {
      if (!seenIds.has(r.chunk_id)) {
        seenIds.add(r.chunk_id)
        allChunks.push(r)
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json({
        answer: 'No relevant documents found for your query.',
        sources: [],
      })
    }

    // Build context from top chunks, respecting token limits
    let contextLength = 0
    const contextChunks: typeof allChunks = []
    for (const chunk of allChunks) {
      if (contextLength + chunk.content.length > MAX_CONTEXT_CHARS) break
      contextChunks.push(chunk)
      contextLength += chunk.content.length
    }

    const context = contextChunks
      .map(
        (c, i) => `[Source ${i + 1}: ${c.file_name}, Section ${c.chunk_index + 1}]\n${c.content}`
      )
      .join('\n\n---\n\n')

    // Generate AI answer
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `You are a helpful ecological research assistant. Answer the user's question based ONLY on the provided document excerpts. If the documents don't contain enough information to answer, say so clearly. Be concise and cite which source(s) you used (e.g., [Source 1]). Answer in the same language as the documents.`,
          },
          {
            role: 'user',
            content: `Question: ${trimmedQuery}\n\nDocument excerpts:\n\n${context}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI answer generation failed:', errorText)
      return NextResponse.json({
        answer: 'Failed to generate AI answer. Search results are still available below.',
        sources: contextChunks.map((c) => ({ fileName: c.file_name, section: c.chunk_index + 1 })),
      })
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    const answer = data.choices[0]?.message?.content ?? 'No answer generated.'
    const sources = contextChunks.map((c) => ({
      fileName: c.file_name,
      section: c.chunk_index + 1,
    }))

    return NextResponse.json({ answer, sources })
  } catch (error) {
    console.error('Answer route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
