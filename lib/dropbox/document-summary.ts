/**
 * Document-level summary generation for Contextual Retrieval.
 *
 * Anthropic's September 2024 technique (https://www.anthropic.com/news/contextual-retrieval)
 * reports ~35-49% improvement in retrieval accuracy when each chunk is prepended
 * with a short, document-level context before embedding. The summary tells the
 * retriever *what the document is about*, so a chunk discussing "the species"
 * can still be surfaced by a query mentioning the actual species name.
 *
 * We call this once per document (at index time) and store the result on
 * indexed_documents.summary. The summary is then prepended to each chunk when
 * computing embeddings — NOT when storing chunks, so keyword search keeps its
 * clean content. Uses a cheap LLM for cost (~$0.0005 per document).
 */

import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'

const MAX_INPUT_CHARS = 12000

const SYSTEM_PROMPT = `You write concise contextual summaries of Irish ecological consulting reports.
The summary is used as retrieval context prepended to individual chunks, so it
must capture orienting information that helps disambiguate chunk content:
  - Report type (PEA, EcIA, AA Screening, NIS, Desk Study, Field Survey, etc.)
  - Project / site name and location (townland, county) if stated
  - Key designated sites referenced (SAC, SPA, NHA)
  - Primary species and habitat types discussed
  - Date / time period of survey work if stated

Return a single paragraph, 3-5 sentences, no bullet points, no markdown,
no headings. Plain prose only.`

/**
 * Build a compact representative sample of the document: first page, a middle
 * page, and a late page. This gives the summariser a view of intro / methods /
 * results without exhausting tokens on huge reports.
 */
function buildSampleText(pages: string[]): string {
  if (pages.length === 0) return ''
  if (pages.length <= 3) return pages.join('\n\n').slice(0, MAX_INPUT_CHARS)

  const first = pages[0]
  const middle = pages[Math.floor(pages.length / 2)]
  const last = pages[pages.length - 1]
  const combined = `[BEGINNING]\n${first}\n\n[MIDDLE]\n${middle}\n\n[END]\n${last}`
  return combined.slice(0, MAX_INPUT_CHARS)
}

export async function generateDocumentSummary(params: {
  fileName: string
  pages: string[]
}): Promise<string> {
  const sample = buildSampleText(params.pages)
  if (sample.trim().length < 100) {
    // Too little text to summarise meaningfully.
    return `${params.fileName} — no extractable text to summarise.`
  }

  const summary = await callClaude({
    model: CLAUDE_CHEAP_MODEL,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Filename: ${params.fileName}\n\nSample text:\n\n${sample}`,
      },
    ],
    maxTokens: 500,
  })

  return summary.trim()
}
