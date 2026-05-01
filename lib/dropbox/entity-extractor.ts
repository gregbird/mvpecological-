/**
 * Entity extraction for indexed document chunks.
 *
 * Given a chunk of text from an Irish ecological report, identify mentions of:
 *   - species  (common name and/or Latin binomial)
 *   - habitat  (FOSSITT codes like GA1, WS1, or full names like "Improved grassland")
 *   - site     (SAC/SPA/NHA/pNHA names, e.g. "Lough Owel SAC")
 *   - designation (EU/Irish designation terms: SAC, SPA, NHA, pNHA, Annex I/II)
 *
 * Uses a cheap LLM with JSON-mode structured output. Cheap (~$0.001 per 20
 * chunks) and accurate enough for retrieval + comparative analysis. Failures
 * are non-fatal — indexing continues without mentions rather than blocking
 * the user's ability to search.
 */

export type EntityType = 'species' | 'habitat' | 'site' | 'designation'

export interface ExtractedEntity {
  type: EntityType
  value: string
  canonical: string | null
  confidence: number
  snippet: string
}

export interface ChunkEntities {
  chunkIndex: number
  entities: ExtractedEntity[]
}

import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'

const MAX_CHUNKS_PER_CALL = 5
const MAX_CONTENT_CHARS = 2000

const SYSTEM_PROMPT = `You are an ecological-text entity extractor for Irish consulting reports.

Extract mentions of:
- species: common name or Latin binomial (e.g. "Otter", "Lutra lutra", "Badger sett" → "Badger (Meles meles)")
- habitat: FOSSITT codes (GA1, WS1, WL2, WN1, FW2, PB4, etc.) or full FOSSITT habitat names
- site: designated sites by name ("Lough Owel SAC", "Bellacorick Bog NHA")
- designation: EU/Irish designations without a site name (SAC, SPA, NHA, pNHA, Annex I, Annex II, Red List, FPO)

For each entity provide:
- type: one of species|habitat|site|designation
- value: the exact text as it appears in the chunk
- canonical: normalized form when safely inferable
  - species: Latin binomial when both Latin and common are present ("Otter (Lutra lutra)" → "Lutra lutra")
  - habitat: FOSSITT code when known ("Improved grassland" → "GA1")
  - site: preserve official name including designation suffix
  - designation: uppercase abbreviation ("special area of conservation" → "SAC")
  - Use null if you are unsure
- confidence: 0..1 reflecting certainty
- snippet: ~120 char window around the mention for context

Rules:
- Do NOT invent entities that are not in the text.
- Do NOT list generic ecological terms (e.g. "biodiversity", "habitat") as entities.
- If a species appears multiple times in one chunk, list it only once (highest-confidence snippet).
- Return an empty entities[] for a chunk with no identifiable entities.`

interface ExtractionResponse {
  chunks: Array<{
    chunkIndex: number
    entities: Array<{
      type: EntityType
      value: string
      canonical: string | null
      confidence: number
      snippet: string
    }>
  }>
}

function buildUserPrompt(chunks: Array<{ index: number; content: string }>): string {
  const body = chunks
    .map(
      (c) =>
        `[Chunk ${c.index}]\n${c.content.slice(0, MAX_CONTENT_CHARS).replace(/\s+/g, ' ').trim()}`
    )
    .join('\n\n---\n\n')

  return `Extract entities from each chunk below. Return strict JSON matching the schema:
{
  "chunks": [
    {
      "chunkIndex": number,
      "entities": [
        { "type": "species"|"habitat"|"site"|"designation",
          "value": string, "canonical": string|null,
          "confidence": number, "snippet": string }
      ]
    }
  ]
}

${body}`
}

async function extractBatch(
  chunks: Array<{ index: number; content: string }>
): Promise<ChunkEntities[]> {
  const content = await callClaude({
    model: CLAUDE_CHEAP_MODEL,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(chunks) }],
    maxTokens: 4000,
  })
  let parsed: ExtractionResponse
  try {
    parsed = JSON.parse(content) as ExtractionResponse
  } catch {
    // Malformed JSON — treat as no entities rather than failing the document.
    return chunks.map((c) => ({ chunkIndex: c.index, entities: [] }))
  }

  // Map by index to guarantee ordering + coverage of every input chunk.
  const byIndex = new Map<number, ChunkEntities>()
  for (const c of chunks) {
    byIndex.set(c.index, { chunkIndex: c.index, entities: [] })
  }
  for (const chunk of parsed.chunks ?? []) {
    const target = byIndex.get(chunk.chunkIndex)
    if (!target) continue
    target.entities = (chunk.entities ?? [])
      .filter(
        (e): e is ExtractedEntity =>
          !!e &&
          typeof e.value === 'string' &&
          e.value.trim().length > 0 &&
          ['species', 'habitat', 'site', 'designation'].includes(e.type)
      )
      .map((e) => ({
        type: e.type,
        value: e.value.trim(),
        canonical: e.canonical?.trim() || null,
        confidence: Math.max(0, Math.min(1, Number(e.confidence) || 0)),
        snippet: (e.snippet || '').slice(0, 240),
      }))
  }

  return Array.from(byIndex.values())
}

/**
 * Extract entities from a batch of chunks. Processes in groups of
 * MAX_CHUNKS_PER_CALL to keep prompts small and costs predictable.
 */
export async function extractEntitiesFromChunks(
  chunks: Array<{ index: number; content: string }>
): Promise<ChunkEntities[]> {
  if (chunks.length === 0) return []

  const results: ChunkEntities[] = []
  for (let i = 0; i < chunks.length; i += MAX_CHUNKS_PER_CALL) {
    const slice = chunks.slice(i, i + MAX_CHUNKS_PER_CALL)
    const batch = await extractBatch(slice)
    results.push(...batch)
  }
  return results
}
