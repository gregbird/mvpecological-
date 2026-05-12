import {
  formatAquaticResearch,
  formatDataSources,
  formatDeepResearch,
  formatDeskInsights,
  formatFindings,
  formatHabitats,
  formatObservations,
  formatProjectInfo,
  formatReleves,
  formatSurveys,
  formatTargetNotes,
} from './context-formatters'
import type { ReportContextInput } from './types'

/**
 * Build the structured PROJECT DATA block that gets concatenated to the
 * system prompt. The order matters — the AI is trained to look for these
 * headings in this exact sequence:
 *
 *   1. Project info (with optional site scope override)
 *   2. Field surveys
 *   3. Habitats (mapped polygons)
 *   4. Species observations
 *   4b. Relevé vegetation surveys (optional)
 *   5. Desk research findings (split by spatial zone)
 *   6. Target notes
 *   7. Deep research (designated sites)
 *   8. Aquatic research
 *   9. Desk assessment AI insights (Step 3 output)
 *   10. Data sources & references (for Appendix)
 */
export function buildReportContext(input: ReportContextInput): string {
  const parts: string[] = []

  formatProjectInfo(parts, input.project, input.siteContext ?? null, {
    boundaryAreaHa: input.boundaryAreaHa,
    studyAreaHa: input.studyAreaHa,
    bufferRadiusKm: input.bufferRadiusKm,
  })
  formatSurveys(parts, input.surveys)
  formatHabitats(parts, input.habitats)
  formatObservations(parts, input.observations)
  formatReleves(parts, input.releveSurveys, input.releveSpecies)
  formatFindings(
    parts,
    input.findingsByZone.inside,
    input.findingsByZone.buffer,
    input.bufferRadiusKm
  )
  formatTargetNotes(parts, input.targetNotes)
  formatDeepResearch(parts, input.deepResearch)
  formatAquaticResearch(parts, input.aquaticResearch)
  formatDeskInsights(parts, input.deskInsights)
  formatDataSources(parts, input.findings, input.deepResearch, input.aquaticResearch)

  return parts.join('\n')
}
