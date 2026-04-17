/**
 * Canonical entity resolution for the Evidence Matrix feature.
 *
 * The matrix joins two very different data shapes:
 *   1. `desk_research_findings` rows — structured fields in raw_data
 *      (scientificName, fossittCode, siteCode, etc.) with a `data_type` enum.
 *   2. `document_chunk_mentions` rows — free-text entity_value extracted by
 *      the LLM from company reports, plus an optional entity_canonical.
 *
 * To group them as "the same entity" we need a shared key. This module is the
 * single source of truth for that key — every caller should go through
 * `canonicalKeyForFinding()` or `canonicalKeyForMention()` so matrix bucketing
 * stays consistent.
 *
 * Key format: `${type}:${normalised}` — lowercased, with designation suffixes
 * stripped from site names and whitespace collapsed.
 */

import type { DeskResearchFinding, DocumentChunkMention } from '@/types/database'

export type EntityType = 'species' | 'habitat' | 'site' | 'designation'

export interface ResolvedEntity {
  type: EntityType
  canonical: string // lowercased key form (stable, used for grouping)
  displayName: string // pretty form for UI
}

/** Strip SAC/SPA/NHA/pNHA designation suffix from a site name so
 *  "Lough Owel SAC" and "Lough Owel" map to the same bucket. */
function stripDesignationSuffix(name: string): string {
  return name
    .replace(/\s+\b(SAC|SPA|NHA|pNHA|cSAC|pSAC|SCI)\b\s*$/i, '')
    .replace(/\s+\(.*?\)\s*$/, '') // trailing parenthesised site codes
    .trim()
}

/** Normalise a human string into a stable grouping key. */
function normaliseKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:'"`]/g, '')
}

/** Accept the sloppy real-world designation abbreviations and return the
 *  canonical uppercase form. */
const DESIGNATION_ALIASES: Record<string, string> = {
  sac: 'SAC',
  'special area of conservation': 'SAC',
  spa: 'SPA',
  'special protection area': 'SPA',
  nha: 'NHA',
  'natural heritage area': 'NHA',
  pnha: 'pNHA',
  'proposed natural heritage area': 'pNHA',
  'annex i': 'Annex I',
  'annex ii': 'Annex II',
  'annex iv': 'Annex IV',
  'annex v': 'Annex V',
  'red list': 'Red List',
  'red data list': 'Red List',
  fpo: 'FPO',
  'flora protection order': 'FPO',
}

function canonicaliseDesignation(value: string): { canonical: string; displayName: string } {
  const normalised = normaliseKey(value)
  const aliased = DESIGNATION_ALIASES[normalised]
  if (aliased) {
    return { canonical: aliased.toLowerCase(), displayName: aliased }
  }
  return { canonical: normalised, displayName: value.trim() }
}

/**
 * Resolve a desk_research_finding into a canonical entity key.
 * Returns null if the finding is not one of the matrix-eligible types
 * (e.g. `other`, `water_quality` if we later exclude it).
 */
export function canonicalKeyForFinding(finding: DeskResearchFinding): ResolvedEntity | null {
  const raw = (finding.raw_data ?? {}) as Record<string, unknown>

  switch (finding.data_type) {
    case 'species_record': {
      const scientific = typeof raw.scientificName === 'string' ? raw.scientificName : null
      const common = typeof raw.commonName === 'string' ? raw.commonName : null
      // Prefer scientific name as the canonical form — it's unambiguous across
      // common-name variants.
      const canonicalSource = scientific ?? common ?? finding.title
      if (!canonicalSource) return null
      const displayName =
        scientific && common ? `${common} (${scientific})` : (scientific ?? common ?? finding.title)
      return {
        type: 'species',
        canonical: normaliseKey(canonicalSource),
        displayName,
      }
    }

    case 'habitat': {
      const fossitt = typeof raw.fossittCode === 'string' ? raw.fossittCode : null
      const nlcLabel = typeof raw.nlcLabel === 'string' ? raw.nlcLabel : null
      if (fossitt) {
        return {
          type: 'habitat',
          canonical: normaliseKey(fossitt),
          displayName: nlcLabel ? `${fossitt} — ${nlcLabel}` : fossitt,
        }
      }
      if (!finding.title) return null
      return {
        type: 'habitat',
        canonical: normaliseKey(finding.title),
        displayName: finding.title,
      }
    }

    case 'designated_site': {
      const siteCode = typeof raw.siteCode === 'string' ? raw.siteCode : null
      // Site codes are unique and unambiguous — prefer them. Fall back to the
      // stripped site name so "Lough Owel SAC" still buckets with "Lough Owel".
      if (siteCode) {
        return {
          type: 'site',
          canonical: `code:${normaliseKey(siteCode)}`,
          displayName: finding.title || siteCode,
        }
      }
      if (!finding.title) return null
      const stripped = stripDesignationSuffix(finding.title)
      return {
        type: 'site',
        canonical: normaliseKey(stripped),
        displayName: finding.title,
      }
    }

    // water_quality, catchment, company_report, other → not bucketed in matrix.
    // company_report findings come through the mentions side.
    default:
      return null
  }
}

/**
 * Resolve a document_chunk_mention into a canonical entity key. Mirrors the
 * finding resolver so mentions and findings collide on the same bucket.
 */
export function canonicalKeyForMention(mention: DocumentChunkMention): ResolvedEntity {
  const base = mention.entity_canonical?.trim() || mention.entity_value.trim()
  const type = mention.entity_type as EntityType

  if (type === 'designation') {
    const { canonical, displayName } = canonicaliseDesignation(base)
    return { type, canonical, displayName }
  }

  if (type === 'site') {
    const stripped = stripDesignationSuffix(base)
    return {
      type,
      canonical: normaliseKey(stripped),
      displayName: base,
    }
  }

  // species + habitat: straightforward normalisation
  return {
    type,
    canonical: normaliseKey(base),
    displayName: base,
  }
}

/** Builds a stable Map key from type + canonical. */
export function entityMapKey(entity: ResolvedEntity): string {
  return `${entity.type}:${entity.canonical}`
}
