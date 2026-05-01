import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/dropbox/embeddings'
import { expandQuery } from '@/lib/dropbox/synonym-expander'
import { rerankSearchResults } from '@/lib/dropbox/reranker'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'

const MAX_CONTEXT_CHARS = 24000

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
    const expandedQuery = expandQuery(trimmedQuery)
    const adminSupabase = createAdminClient()

    // Run keyword + semantic search in parallel to get top chunks.
    // Pull a wider pool (15 each) than the eventual context cap — the reranker
    // trims down to the most relevant for synthesis.
    const [keywordResults, semanticResults] = await Promise.all([
      adminSupabase
        .rpc('search_document_chunks', {
          p_organization_id: profile.organization_id,
          p_query: expandedQuery,
          p_limit: 15,
        })
        .then(({ data }) => data ?? []),

      generateEmbedding(trimmedQuery)
        .then((embedding) =>
          adminSupabase
            .rpc('search_document_chunks_semantic', {
              p_organization_id: profile.organization_id,
              p_embedding: JSON.stringify(embedding),
              p_match_threshold: 0.45,
              p_limit: 15,
            })
            .then(({ data }) =>
              // Normalise to a common `rank` field so downstream code can treat
              // keyword and semantic results uniformly.
              (data ?? []).map((r) => ({ ...r, rank: r.similarity ?? 0 }))
            )
        )
        .catch(() => []),
    ])

    // Merge and deduplicate
    const seenIds = new Set<string>()
    const mergedChunks: Array<{
      chunk_id: string
      content: string
      file_name: string
      chunk_index: number
      rank: number
    }> = []

    for (const r of [...keywordResults, ...semanticResults]) {
      if (!seenIds.has(r.chunk_id)) {
        seenIds.add(r.chunk_id)
        mergedChunks.push({
          chunk_id: r.chunk_id,
          content: r.content,
          file_name: r.file_name,
          chunk_index: r.chunk_index,
          rank: r.rank,
        })
      }
    }

    if (mergedChunks.length === 0) {
      return NextResponse.json({
        answer: 'No relevant documents found for your query.',
        sources: [],
      })
    }

    // Rerank via LLM so the synthesis step sees the most relevant chunks first
    // (and drops low-score candidates before they enter the context window).
    const allChunks = await rerankSearchResults(trimmedQuery, mergedChunks)

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

    // Generate AI answer.
    // System prompt is tuned for Irish ecological consulting: reinforce
    // citation discipline, encourage cross-source synthesis (which feeds into
    // Greg's comparative analysis feature), and prevent the model from
    // fabricating content when evidence is thin.
    let answer: string
    try {
      answer = await callClaude({
        model: CLAUDE_CHEAP_MODEL,
        system: `You are an ecological research assistant for an Irish consulting firm.
Use only the provided document excerpts. Your answer should:
- Be SHORT: aim for 3-6 sentences total, or a tight bullet list of max 5 items.
  Do NOT produce long prose, do NOT repeat the question, do NOT add preamble.
- Cite sources inline as [Source N] every time you state a claim.
- When the same topic appears in multiple sources, summarise what they agree on
  and call out disagreements in a single brief sentence.
- Use correct Irish ecological terminology (SAC, SPA, NHA, pNHA, FOSSITT codes,
  Annex I/II, Red List). Prefer Latin binomials for species when documented.
- If the excerpts lack the answer, say so in one line rather than speculating.
Use Irish English spelling (colour, behaviour, analyse, organisation).`,
        messages: [
          {
            role: 'user',
            content: `Question: ${trimmedQuery}\n\nDocument excerpts:\n\n${context}`,
          },
        ],
        maxTokens: 1500,
      })
    } catch (err) {
      console.error('Claude answer generation failed:', err)
      return NextResponse.json({
        answer: 'Failed to generate AI answer. Search results are still available below.',
        sources: contextChunks.map((c) => ({ fileName: c.file_name, section: c.chunk_index + 1 })),
      })
    }
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
