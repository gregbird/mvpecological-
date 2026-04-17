import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { SYNTHESIS_MODEL } from '@/lib/ai/openai-models'

// Narrative generation with gpt-5 can easily run 30-60 seconds even at low
// reasoning effort — bump past the default serverless timeout.
export const maxDuration = 120
import {
  canonicalKeyForFinding,
  canonicalKeyForMention,
  entityMapKey,
  type EntityType,
  type ResolvedEntity,
} from '@/lib/evidence/resolve-entity'
import type { DeskResearchFinding, DocumentChunkMention } from '@/types/database'

/**
 * Evidence Matrix endpoint.
 *
 * Joins structured desk research findings (designated sites / species / habitats)
 * with extracted entity mentions from indexed company reports to produce a
 * cross-source comparative view: what entities appear in which sources, what
 * overlaps, what gaps.
 *
 * GET /api/projects/[id]/evidence-matrix?siteId=<uuid>&generateNarrative=true
 */

interface SourceRef {
  kind: 'npws' | 'nbdc' | 'gbif' | 'epa' | 'catchments' | 'manual' | 'company_reports'
  findingId?: string
  chunkId?: string
  documentId?: string
  label: string
  snippet?: string
  page?: number | null
}

interface EvidenceEntity {
  type: EntityType
  canonical: string
  displayName: string
  sources: SourceRef[]
  sourceKinds: string[] // distinct kinds, for overlap counting
  overlapCount: number // distinct source kinds
  isGap: boolean // in official sources, not in company reports
  isCoveredOnlyByReports: boolean // only in company reports
}

interface EvidenceMatrixResponse {
  entities: EvidenceEntity[]
  narrative: string | null
  metadata: {
    totalFindings: number
    totalMentions: number
    distinctEntities: number
    overlapsCount: number
    gapsCount: number
    onlyReportsCount: number
  }
}

/**
 * Shape returned by the mentions join query. Kept inline so we don't
 * over-expose the raw DB types to callers.
 */
interface MentionWithContext extends DocumentChunkMention {
  document_chunks: {
    document_id: string
    page_start: number | null
    indexed_documents: {
      file_name: string
      organization_id: string
    } | null
  } | null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const generateNarrative = searchParams.get('generateNarrative') === 'true'

    const supabase = await createClient()

    // Verify project access (RLS does this on findings query, but we double-
    // check so we can return a clean 404 instead of an empty result set).
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== project.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // --- 1. Fetch saved findings (site-scoped when applicable) ---
    let findingsQuery = admin
      .from('desk_research_findings')
      .select(
        'id, project_id, source, data_type, title, content, raw_data, notes, site_id, is_saved'
      )
      .eq('project_id', projectId)
      .eq('is_saved', true)
    if (siteId) findingsQuery = findingsQuery.eq('site_id', siteId)

    const { data: findings, error: findingsError } = await findingsQuery
    if (findingsError) {
      console.error('Evidence matrix findings error:', findingsError)
      return NextResponse.json({ error: 'Failed to load findings' }, { status: 500 })
    }

    // --- 2. Fetch entity mentions from org's indexed documents ---
    // mentions are chunk-scoped; we filter to this org via the document join.
    const { data: mentionsRaw, error: mentionsError } = await admin
      .from('document_chunk_mentions')
      .select(
        `id, chunk_id, entity_type, entity_value, entity_canonical, confidence, raw_snippet,
         document_chunks!inner (
           document_id, page_start,
           indexed_documents!inner ( file_name, organization_id )
         )`
      )
      .eq('document_chunks.indexed_documents.organization_id', project.organization_id)

    if (mentionsError) {
      console.error('Evidence matrix mentions error:', mentionsError)
      return NextResponse.json({ error: 'Failed to load mentions' }, { status: 500 })
    }

    const mentions = (mentionsRaw ?? []) as unknown as MentionWithContext[]

    // --- 3. Aggregate both sides into a single entity map ---
    const entityMap = new Map<string, EvidenceEntity>()

    const getOrCreateBucket = (resolved: ResolvedEntity): EvidenceEntity => {
      const key = entityMapKey(resolved)
      const existing = entityMap.get(key)
      if (existing) return existing
      const fresh: EvidenceEntity = {
        type: resolved.type,
        canonical: resolved.canonical,
        displayName: resolved.displayName,
        sources: [],
        sourceKinds: [],
        overlapCount: 0,
        isGap: false,
        isCoveredOnlyByReports: false,
      }
      entityMap.set(key, fresh)
      return fresh
    }

    // 3a. Fold findings in
    for (const finding of (findings ?? []) as DeskResearchFinding[]) {
      const resolved = canonicalKeyForFinding(finding)
      if (!resolved) continue // water_quality, catchment, other, company_report → not bucketed here

      const bucket = getOrCreateBucket(resolved)
      // Prefer the most detailed display name we've seen (longer strings tend
      // to be more descriptive, e.g. "Otter (Lutra lutra)" over "Otter").
      if (resolved.displayName.length > bucket.displayName.length) {
        bucket.displayName = resolved.displayName
      }

      // Map finding.source enum to SourceRef.kind. company_report findings
      // can legitimately exist here (manually saved chunks), so honour them.
      const source = finding.source as SourceRef['kind']
      bucket.sources.push({
        kind: source,
        findingId: finding.id,
        label: finding.title,
        snippet: finding.content ?? undefined,
      })
    }

    // 3b. Fold mentions in
    for (const mention of mentions) {
      const resolved = canonicalKeyForMention(mention)
      const bucket = getOrCreateBucket(resolved)

      const chunk = mention.document_chunks
      const doc = chunk?.indexed_documents
      bucket.sources.push({
        kind: 'company_reports',
        chunkId: mention.chunk_id,
        documentId: chunk?.document_id,
        label: doc?.file_name ?? 'Indexed document',
        snippet: mention.raw_snippet ?? undefined,
        page: chunk?.page_start ?? null,
      })
    }

    // 3c. Post-process each bucket: distinct source kinds, gap/overlap flags
    for (const bucket of entityMap.values()) {
      const kinds = Array.from(new Set(bucket.sources.map((s) => s.kind)))
      bucket.sourceKinds = kinds
      bucket.overlapCount = kinds.length
      const hasReports = kinds.includes('company_reports')
      const hasOfficial = kinds.some((k) => k !== 'company_reports' && k !== 'manual')
      bucket.isGap = hasOfficial && !hasReports
      bucket.isCoveredOnlyByReports = hasReports && !hasOfficial && kinds.length === 1
    }

    // Stable, useful default sort: overlaps first, then type, then name.
    const entities = Array.from(entityMap.values()).sort((a, b) => {
      if (b.overlapCount !== a.overlapCount) return b.overlapCount - a.overlapCount
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return a.displayName.localeCompare(b.displayName)
    })

    const metadata = {
      totalFindings: findings?.length ?? 0,
      totalMentions: mentions.length,
      distinctEntities: entities.length,
      overlapsCount: entities.filter((e) => e.overlapCount > 1).length,
      gapsCount: entities.filter((e) => e.isGap).length,
      onlyReportsCount: entities.filter((e) => e.isCoveredOnlyByReports).length,
    }

    // --- 4. Optional AI narrative ---
    let narrative: string | null = null
    if (generateNarrative && entities.length > 0) {
      // Narrative generation is user-triggered, so surface failures instead of
      // silently returning null — the UI needs something to display in the
      // narrative card so the user can retry.
      try {
        narrative = await generateEvidenceNarrative({
          projectName: project.name,
          entities,
          metadata,
        })
      } catch (err) {
        console.error('Evidence narrative generation failed:', err)
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : 'Narrative generation failed',
          },
          { status: 500 }
        )
      }
    }

    const response: EvidenceMatrixResponse = { entities, narrative, metadata }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Evidence matrix route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * AI narrative synthesis over the matrix. Uses the SYNTHESIS_MODEL (gpt-5) at
 * default reasoning effort — quality matters here, user explicitly triggered
 * this, wait is fine.
 */
async function generateEvidenceNarrative(input: {
  projectName: string
  entities: EvidenceEntity[]
  metadata: EvidenceMatrixResponse['metadata']
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  // Give the model the top overlaps and a sample of gaps — enough to reason
  // across sources without blowing the context window on low-signal entries.
  const topOverlaps = input.entities.filter((e) => e.overlapCount > 1).slice(0, 15)
  const topGaps = input.entities.filter((e) => e.isGap).slice(0, 10)
  const topOnlyReports = input.entities.filter((e) => e.isCoveredOnlyByReports).slice(0, 10)

  const renderEntity = (e: EvidenceEntity) =>
    `- [${e.type}] ${e.displayName} — sources: ${e.sourceKinds.join(', ')}${
      e.sources[0]?.snippet ? `\n    snippet: "${e.sources[0].snippet.slice(0, 180)}"` : ''
    }`

  const contextParts = [
    `# Project: ${input.projectName}`,
    '',
    `## Counts`,
    `- Findings: ${input.metadata.totalFindings}`,
    `- Company-report mentions: ${input.metadata.totalMentions}`,
    `- Distinct entities: ${input.metadata.distinctEntities}`,
    `- Overlaps (≥2 source kinds): ${input.metadata.overlapsCount}`,
    `- Gaps (official data, not in reports): ${input.metadata.gapsCount}`,
    `- Only in company reports: ${input.metadata.onlyReportsCount}`,
    '',
  ]
  if (topOverlaps.length > 0) {
    contextParts.push('## Top overlaps (confirmed across sources)')
    contextParts.push(...topOverlaps.map(renderEntity))
    contextParts.push('')
  }
  if (topGaps.length > 0) {
    contextParts.push('## Gaps (present in official data, not in indexed reports)')
    contextParts.push(...topGaps.map(renderEntity))
    contextParts.push('')
  }
  if (topOnlyReports.length > 0) {
    contextParts.push('## Mentioned only in company reports')
    contextParts.push(...topOnlyReports.map(renderEntity))
    contextParts.push('')
  }

  const systemPrompt = `You are a senior Irish ecological consultant synthesising the evidence base
for a desk assessment. You have structured data from official sources (NPWS, NBDC, EPA)
and extracted mentions from the firm's historic company reports.

Write a cross-source synthesis in 3-4 short paragraphs covering:
1. Overlaps — species / sites / habitats confirmed across multiple sources, and what that implies for the survey scope.
2. Gaps — items in official data that the company reports do not mention, and what follow-up is needed.
3. Report-only findings — items mentioned in company reports that do not appear in official sources, and whether they warrant verification.
4. Recommendation — a one-line practical next step for the field team.

Rules:
- Use correct Irish ecological terminology (SAC/SPA/NHA/pNHA, Annex I/II/IV, FOSSITT codes, Red List).
- Use Latin binomials for species where documented.
- Refer to items by their displayName, not the canonical key.
- No invention: if a source is empty, say so plainly. Do not speculate about items not in the data.
- Irish/British English spelling.
- No bullet lists — prose only. No headings beyond what the four sections naturally suggest.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SYNTHESIS_MODEL,
      // The synthesis is bounded in size (top ~35 entities) and mostly
      // structured rewriting — medium reasoning is overkill and blows the
      // request past the timeout. `low` keeps quality solid while halving wait.
      reasoning_effort: 'low',
      max_completion_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextParts.join('\n') },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI narrative failed (${response.status}): ${errText}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string | null } }>
  }
  const raw = data.choices[0]?.message?.content ?? ''
  return toIrishEnglish(raw.trim())
}
