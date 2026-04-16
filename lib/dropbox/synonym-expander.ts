/**
 * Query synonym expansion for Irish ecological search.
 *
 * Ecology reports mix Latin binomials and common names freely — "Otter" and
 * "Lutra lutra" refer to the same animal but tsvector stemming won't bridge
 * them. This module builds a common↔Latin dictionary from reference data and
 * expands user queries with OR clauses before sending to
 * `search_document_chunks`, so the tsquery catches both forms.
 *
 * Expansion is intentionally conservative: we only expand when the query is a
 * clean match for a known species (Latin binomial or common name). Multi-term
 * free-text queries are passed through unchanged to avoid garbling tsquery
 * operators. This keeps behaviour predictable and keeps search responsive.
 */

import fs from 'node:fs'
import path from 'node:path'
import { COMMON_IRISH_FLORA } from '@/lib/data/common-irish-flora'

interface SpeciesPair {
  latin: string
  common: string
}

interface Article17Entry {
  commonName: string
  scientificName: string
}

interface Article12Entry {
  commonName: string
  scientificName: string
}

/**
 * Build the synonym dictionary once at module load. We pull from two sources:
 *   - COMMON_IRISH_FLORA (compile-time, ~23 flora species)
 *   - article17-species.json (runtime read, ~150 Annex species)
 *   - article12-birds.json  (runtime read, ~100 bird species)
 *
 * If a JSON file is missing or malformed (e.g. during tests) we fall back to
 * just the compiled list — better to have partial expansion than crash.
 */
function loadSpeciesPairs(): SpeciesPair[] {
  const pairs: SpeciesPair[] = COMMON_IRISH_FLORA.map((s) => ({
    latin: s.latin,
    common: s.english,
  }))

  // Only read files in a server-side / Node runtime. `process.cwd()` is the
  // Next.js project root in both dev and production builds.
  try {
    const article17Path = path.join(process.cwd(), 'public', 'data', 'article17-species.json')
    const raw = fs.readFileSync(article17Path, 'utf8')
    const data = JSON.parse(raw) as { species: Article17Entry[] }
    for (const entry of data.species ?? []) {
      if (entry.commonName && entry.scientificName) {
        pairs.push({ latin: entry.scientificName, common: entry.commonName })
      }
    }
  } catch {
    // Fallback: skip
  }

  try {
    const article12Path = path.join(process.cwd(), 'public', 'data', 'article12-birds.json')
    const raw = fs.readFileSync(article12Path, 'utf8')
    const data = JSON.parse(raw) as { species?: Article12Entry[]; birds?: Article12Entry[] }
    const list = data.species ?? data.birds ?? []
    for (const entry of list) {
      if (entry.commonName && entry.scientificName) {
        pairs.push({ latin: entry.scientificName, common: entry.commonName })
      }
    }
  } catch {
    // Fallback: skip
  }

  return pairs
}

interface SynonymIndex {
  byCommon: Map<string, string> // common.toLowerCase() → latin
  byLatin: Map<string, string> // latin.toLowerCase() → common
}

let cachedIndex: SynonymIndex | null = null

function getIndex(): SynonymIndex {
  if (cachedIndex) return cachedIndex
  const pairs = loadSpeciesPairs()
  const byCommon = new Map<string, string>()
  const byLatin = new Map<string, string>()
  for (const { latin, common } of pairs) {
    byCommon.set(common.toLowerCase(), latin)
    byLatin.set(latin.toLowerCase(), common)
  }
  cachedIndex = { byCommon, byLatin }
  return cachedIndex
}

/**
 * Expand a query by adding species synonyms as OR clauses.
 *
 * Behaviour:
 *   - Single-token queries ("otter")       → "otter OR \"Lutra lutra\""
 *   - Two-word queries that look like Latin binomials ("Lutra lutra")
 *                                           → "\"Lutra lutra\" OR otter"
 *   - Everything else                      → unchanged
 *
 * Output is formatted for `websearch_to_tsquery('english', ...)`, which
 * supports OR and quoted phrases (Postgres 14+).
 */
export function expandQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return trimmed

  const { byCommon, byLatin } = getIndex()
  const lower = trimmed.toLowerCase()
  const tokens = lower.split(/\s+/)

  // Case 1: Exact common-name hit (single or multi-word, e.g. "Kerry Slug")
  const latinMatch = byCommon.get(lower)
  if (latinMatch) {
    return `${trimmed} OR "${latinMatch}"`
  }

  // Case 2: Exact Latin binomial hit (two tokens: "Lutra lutra")
  if (tokens.length === 2) {
    const commonMatch = byLatin.get(lower)
    if (commonMatch) {
      return `"${trimmed}" OR ${commonMatch}`
    }
  }

  // Case 3: Leave as-is. Expanding free-text queries risks breaking
  // tsquery parsing and hurting precision more than it helps.
  return trimmed
}

/**
 * Exposed for tests / debugging: how many synonym pairs we loaded.
 */
export function getSynonymCount(): number {
  const { byCommon } = getIndex()
  return byCommon.size
}
