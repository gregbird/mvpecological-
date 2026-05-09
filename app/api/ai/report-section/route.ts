import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { jsonToSections, resolveReportSections } from '@/lib/supabase/queries/templates'
import { REPORT_TYPES } from '@/lib/config/template-types'
import { getSectionPrompt, getSectionMaxTokens } from '@/lib/ai/report-section-prompts'
import { toIrishEnglish } from '@/lib/ai/irish-english'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'
import { buildSpatialClassifier, type SpatialZone } from '@/lib/utils/spatial-classifier'

import { buildReportContext } from './_lib/context-builder'
import { fetchProjectData } from './_lib/data-fetch'
import { buildGuidanceBlocks, injectReleveSubsectionIntoPrompt } from './_lib/guidance-blocks'
import { applyPlacement, getSectionMode, type PlacementContext } from './_lib/placement'
import { buildSystemPrompt } from './_lib/system-prompt'
import type { FindingData, PlacementCategory, PlacementOption } from './_lib/types'

/**
 * AI Report Section Generator API
 * Generates individual report sections via Claude with real project data.
 * Supports all report types (PEA, EcIA, AA Screening, NIS, Bat, Bird, Habitat, etc.)
 *
 * POST /api/ai/report-section
 * Body: { projectId, sectionId, reportType, organizationId?, ecologistOpinion?, siteId? }
 * Response: { sectionId, content, metadata: { model, tokensUsed, dataSources } }
 *
 * Pipeline (kept slim — heavy lifting in `./_lib`):
 *   1. Resolve org template → section definitions; validate sectionId
 *   2. Fetch all primary data tables in parallel (data-fetch.ts)
 *   3. Apply Step 5 placement preferences per data category (placement.ts)
 *   4. Spatial-classify findings into inside / buffer / outside zones
 *   5. Build PROJECT DATA context (context-builder.ts → context-formatters.ts)
 *   6. Compose section prompt + placement guidance (guidance-blocks.ts)
 *   7. Call Claude → post-process for Irish English → return
 */

const REPORT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_TYPES.map((r) => [r.id, r.name])
)

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const {
      projectId,
      sectionId,
      reportType = 'pea',
      organizationId,
      ecologistOpinion,
      siteId,
    } = (await request.json()) as {
      projectId?: string
      sectionId?: string
      reportType?: string
      organizationId?: string
      ecologistOpinion?: string
      siteId?: string | null
    }

    if (!projectId || !sectionId) {
      return NextResponse.json({ error: 'projectId and sectionId are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Resolve section definitions — prefer the org's custom template if
    //    `use_custom=true`, else fall back to Dulra Standard. This MUST happen
    //    before validating sectionId so user-added custom sections aren't
    //    rejected as "unknown".
    let orgTemplateRow: { use_custom: boolean; sections: unknown } | null = null
    if (organizationId) {
      const { data } = await supabase
        .from('report_templates')
        .select('use_custom, sections')
        .eq('organization_id', organizationId)
        .eq('report_type', reportType)
        .maybeSingle()
      orgTemplateRow = data ? { use_custom: !!data.use_custom, sections: data.sections } : null
    }
    const reportSections = resolveReportSections(
      reportType,
      orgTemplateRow as { use_custom: boolean; sections: never } | null
    )
    const sectionDef = reportSections.find((s) => s.id === sectionId)
    if (!sectionDef) {
      return NextResponse.json({ error: `Unknown section: ${sectionId}` }, { status: 400 })
    }

    // 2. Fetch every primary data source in parallel
    const data = await fetchProjectData(supabase, projectId, reportType, siteId ?? null)

    // 3. Apply Step 5 placement preferences by section context
    const placementCtx: PlacementContext = {
      preferences: data.dataAnalysisStepMetadata.placementPreferences as
        | Partial<Record<PlacementCategory, Record<string, PlacementOption>>>
        | undefined,
      mode: getSectionMode(sectionId),
    }
    const sectionMode = placementCtx.mode

    // Linked-survey scoping happens BEFORE placement so unlinked surveys
    // never reach the placement filter.
    const linkScopedSurveys =
      data.linkedSurveyIds.length > 0
        ? data.allSurveys.filter((s) => data.linkedSurveyIds.includes(s.id))
        : data.allSurveys
    const linkScopedObservations =
      data.linkedSurveyIds.length > 0
        ? data.allObservations.filter((o) => data.linkedSurveyIds.includes(o.survey_id))
        : data.allObservations

    let releveSurveys = applyPlacement(placementCtx, data.allReleveSurveys, 'releveSurveys')
    if (data.linkedSurveyIds.length > 0) {
      releveSurveys = releveSurveys.filter((r) => data.linkedSurveyIds.includes(r.survey_id))
    }
    const visibleReleveIds = new Set(releveSurveys.map((r) => r.id))
    const releveSpecies = data.allReleveSpecies.filter((s) => visibleReleveIds.has(s.releve_id))

    const findings = applyPlacement(placementCtx, data.allFindings, 'findings')
    const placedHabitats = applyPlacement(placementCtx, data.habitats, 'habitats')
    const targetNotes = applyPlacement(placementCtx, data.allTargetNotes, 'targetNotes')
    const surveys = applyPlacement(placementCtx, linkScopedSurveys, 'surveys')
    const visibleSurveyIds = new Set(surveys.map((s) => s.id))
    const observations = linkScopedObservations.filter((o) => visibleSurveyIds.has(o.survey_id))

    // 4. Spatial classification — drop anything beyond the buffer entirely
    const classifier = buildSpatialClassifier(data.scopeBoundary, data.scopeBufferKm)
    const findingsByZone: Record<SpatialZone, FindingData[]> = {
      inside: [],
      buffer: [],
      outside: [],
    }
    for (const f of findings) {
      const { zone } = classifier.classify(f.location ?? null)
      findingsByZone[zone].push(f)
    }
    const reportableFindings = [...findingsByZone.inside, ...findingsByZone.buffer]

    // 5. PROJECT DATA block
    const context = buildReportContext({
      project: data.project,
      habitats: placedHabitats,
      observations,
      findings: reportableFindings,
      findingsByZone,
      surveys,
      targetNotes,
      deepResearch: data.deepResearch,
      aquaticResearch: data.aquaticResearch,
      deskInsights: data.deskInsights,
      releveSurveys,
      releveSpecies,
      siteContext: data.siteContext,
      bufferRadiusKm: data.scopeBufferKm,
    })

    // 6. Compose section prompt + placement guidance
    let sectionPrompt: string
    const promptConfig = getSectionPrompt(reportType, sectionId)
    if (promptConfig) {
      sectionPrompt = promptConfig.prompt
    } else {
      sectionPrompt = `Write the ${sectionDef.title} section. Focus on: ${sectionDef.aiPrompt}.`
    }

    if (
      (sectionId === 'results' || sectionId === 'baseline') &&
      sectionMode === 'main' &&
      releveSurveys.length > 0
    ) {
      sectionPrompt = injectReleveSubsectionIntoPrompt(sectionPrompt, releveSurveys.length)
    }

    let customTemplateGuidance = ''
    if (orgTemplateRow?.use_custom && orgTemplateRow.sections) {
      const customSections = jsonToSections(orgTemplateRow.sections as never)
      const customSection = customSections.find((s) => s.id === sectionId)
      if (customSection?.template) {
        customTemplateGuidance = `\n\n**IMPORTANT — Organization Custom Template for this section:**\n${customSection.template}\n\nYou MUST follow this template exactly. If the template says to skip or leave this section empty, output only a brief placeholder note (e.g. "This section is not required for this report."). Structure your output to match the template's format, headings, and content requirements.`
      }
    }

    const guidanceBlocks = buildGuidanceBlocks({
      sectionMode,
      findings,
      habitats: placedHabitats,
      targetNotes,
      surveys,
      observations,
      releveSurveys,
      bufferFindingCount: findingsByZone.buffer.length,
      bufferRadiusKm: data.scopeBufferKm,
      releveSectionMode: sectionMode,
    })
    const placementGuidance = guidanceBlocks.length > 0 ? guidanceBlocks.join('\n\n') : ''

    const reportName = REPORT_TYPE_LABELS[reportType] || 'ecological report'

    const releveMainReminder =
      placementGuidance && sectionMode === 'main'
        ? '\n\n**FINAL REMINDER:** You MUST include a "### 3.5 Vegetation Survey (Relevé Data)" subsection at the end, summarising the relevé data from the RELEVÉ VEGETATION SURVEYS block above. This is mandatory whenever relevé data exists.'
        : ''
    const releveAppendixReminder =
      placementGuidance && sectionMode === 'appendix'
        ? '\n\n**FINAL REMINDER:** You MUST include a "Relevé Data — Appendix I" section with detailed per-relevé data cards from the RELEVÉ VEGETATION SURVEYS block above.'
        : ''

    const userPrompt = `You are writing the **${sectionDef.title}** section of a ${reportName}.
${placementGuidance ? `\n${placementGuidance}\n\n---\n` : ''}
${sectionPrompt}${customTemplateGuidance}

${ecologistOpinion ? `\n**Ecologist's Professional Opinion:**\n${ecologistOpinion}\n\nIncorporate this professional opinion into the section where relevant.` : ''}

---

PROJECT DATA:

${context}

---

Write the section content now. Use markdown formatting (bold, bullet points, tables where appropriate). Do not include the section title as a heading — it will be added separately.${releveMainReminder}${releveAppendixReminder}`

    const maxTokens = getSectionMaxTokens(reportType, sectionId)

    // 7. Call Claude + post-process
    const rawContent = (
      await callClaude({
        model: CLAUDE_CHEAP_MODEL,
        system: buildSystemPrompt(
          reportType,
          data.siteContext
            ? { siteCode: data.siteContext.siteCode, siteName: data.siteContext.siteName }
            : null
        ),
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens,
      })
    ).trim()
    const content = toIrishEnglish(rawContent)

    const dataSources: string[] = []
    if (findings.length > 0) dataSources.push('desk_research_findings')
    if (placedHabitats.length > 0) dataSources.push('habitat_polygons')
    if (observations.length > 0) dataSources.push('species_observations')
    if (surveys.length > 0) dataSources.push('surveys')
    if (targetNotes.length > 0) dataSources.push('target_notes')
    if (data.deepResearch.length > 0) dataSources.push('deep_research_results')
    if (data.aquaticResearch.length > 0) dataSources.push('aquatic_research_results')
    if (data.deskInsights) dataSources.push('desk_insights')
    if (releveSurveys.length > 0) dataSources.push('releve_surveys')

    return NextResponse.json({
      sectionId,
      content,
      metadata: {
        model: CLAUDE_CHEAP_MODEL,
        tokensUsed: 0,
        dataSources,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Report section generation error:', error)
    if (error instanceof Error && error.message === 'Project not found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report section' },
      { status: 500 }
    )
  }
}
