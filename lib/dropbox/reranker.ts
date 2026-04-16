/**
 * LLM-based reranker for hybrid search results.
 *
 * Hybrid retrieval (keyword + semantic) produces a candidate set with decent
 * recall but inconsistent precision — a keyword hit on "habitat" may rank
 * above a semantically relevant chunk that actually answers the question.
 *
 * This reranker re-scores the top N candidates using a cheap LLM with a
 * structured JSON response, then sorts by LLM relevance. Cost is tiny
 * (~$0.001 per search) and improves user-visible result ordering noticeably
 * for ambiguous queries. Failures degrade gracefully: on error we return
 * the original ordering unchanged rather than blocking the user.
 */

import { CHEAP_MODEL } from '@/lib/ai/openai-models'

const RERANK_MODEL = CHEAP_MODEL
const MAX_CONTENT_CHARS = 800
const SCORE_CUTOFF = 3

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Missing OPENAI_API_KEY environment variable')
  return key
}

export interface RerankCandidate {
  chunk_id: string
  content: string
  file_name: string
  rank: number
}

const SYSTEM_PROMPT = `You rank search results for an Irish ecological consulting platform.
Given a user's query and a list of document chunks, score each chunk's
relevance to the query on a 0-10 scale:
  0  = irrelevant or off-topic
  5  = on-topic but not specific to the query
  8+ = directly answers or contains key information for the query
Be strict. Most chunks should score 3-7. Reserve 9-10 for chunks that
materially answer the query.

Return JSON of the form:
{ "scores": [ { "id": "<chunk_id>", "score": <0..10> } ] }
Include every input chunk_id exactly once.`

interface RerankResponse {
  scores: Array<{ id: string; score: number }>
}

/**
 * Re-score candidates with an LLM and return them sorted by relevance.
 * Returns the original list untouched if the LLM call or parse fails.
 */
export async function rerankSearchResults<T extends RerankCandidate>(
  query: string,
  candidates: T[]
): Promise<T[]> {
  if (candidates.length <= 1) return candidates

  const userPrompt = [
    `Query: ${query}`,
    '',
    'Chunks:',
    ...candidates.map(
      (c, i) =>
        `[${i + 1}] id=${c.chunk_id} source=${c.file_name}\n${c.content
          .slice(0, MAX_CONTENT_CHARS)
          .replace(/\s+/g, ' ')
          .trim()}`
    ),
  ].join('\n\n')

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Rerank failed (${response.status}):`, errorText)
      return candidates
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices[0]?.message?.content ?? '{"scores":[]}'
    const parsed = JSON.parse(content) as RerankResponse

    const scoreMap = new Map<string, number>()
    for (const { id, score } of parsed.scores ?? []) {
      if (typeof id === 'string' && typeof score === 'number') {
        scoreMap.set(id, Math.max(0, Math.min(10, score)))
      }
    }

    // Candidates missing a score keep their original rank position by being
    // sorted last. Candidates under SCORE_CUTOFF are dropped entirely.
    const scored = candidates
      .map((c) => ({
        candidate: c,
        score: scoreMap.get(c.chunk_id) ?? -1,
      }))
      .filter(({ score }) => score < 0 || score >= SCORE_CUTOFF)
      .sort((a, b) => b.score - a.score)

    return scored.map(({ candidate, score }) =>
      score >= 0 ? { ...candidate, rank: score / 10 } : candidate
    )
  } catch (error) {
    console.error('Rerank error (non-fatal):', error)
    return candidates
  }
}
