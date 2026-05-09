// Placement-aware guidance blocks injected into the user prompt before the
// PROJECT DATA dump. Each block tells the AI how to format the records the
// ecologist designated for this section: aggregate prose in the main body,
// full per-record tables in the appendix.

import type { SectionMode } from './placement'
import type {
  FindingData,
  HabitatData,
  ObservationData,
  ReleveData,
  SurveyData,
  TargetNoteData,
} from './types'

export interface GuidanceInput {
  sectionMode: SectionMode
  findings: FindingData[]
  habitats: HabitatData[]
  targetNotes: TargetNoteData[]
  surveys: SurveyData[]
  observations: ObservationData[]
  releveSurveys: ReleveData[]
  bufferFindingCount: number
  bufferRadiusKm: number
  releveSectionMode: SectionMode
}

export function buildGuidanceBlocks(input: GuidanceInput): string[] {
  const blocks: string[] = []
  const {
    sectionMode,
    findings,
    habitats,
    targetNotes,
    surveys,
    observations,
    releveSurveys,
    bufferFindingCount,
    bufferRadiusKm,
    releveSectionMode,
  } = input

  if (sectionMode === 'main' || sectionMode === 'appendix') {
    if (findings.length > 0) {
      blocks.push(buildFindingsBlock(sectionMode, findings.length))
    }
    if (habitats.length > 0) {
      blocks.push(buildHabitatsBlock(sectionMode, habitats.length))
    }
    if (targetNotes.length > 0) {
      blocks.push(buildTargetNotesBlock(sectionMode, targetNotes.length))
    }
    if (surveys.length > 0) {
      blocks.push(buildSurveysBlock(sectionMode, surveys.length, observations.length))
    }
  }

  if (bufferFindingCount > 0 && sectionMode === 'main') {
    blocks.push(buildBufferZoneBlock(bufferFindingCount, bufferRadiusKm))
  }

  if (releveSurveys.length > 0) {
    if (releveSectionMode === 'main') {
      blocks.push(buildReleveMainBlock(releveSurveys.length))
    } else if (releveSectionMode === 'appendix') {
      blocks.push(buildReleveAppendixBlock(releveSurveys.length))
    }
  }

  return blocks
}

function buildFindingsBlock(mode: 'main' | 'appendix', count: number): string {
  if (mode === 'main') {
    return `**DESK FINDINGS PLACEMENT (MAIN BODY):**
The ecologist has designated ${count} desk research finding(s) for the main body. Within the relevant Results subsections (e.g. 3.1 Designated Sites, 3.2 Habitats, 3.3 Flora, 3.4 Fauna, 3.x Water Quality):
- Provide a **summarised inline table or prose** of the most relevant findings — typically the top N by importance (highest legal protection, closest to boundary, or most ecologically significant)
- Reference the source database for each (NPWS, NBDC, GBIF, EPA, Catchments)
- Include a closing line: "A full list of recorded species/sites/water bodies is provided in the relevant Appendix."`
  }
  return `**DESK FINDINGS PLACEMENT (APPENDIX):**
The ecologist has designated ${count} desk research finding(s) for the appendix. Present them as **full reference tables**, grouped by data type:
- **Appendix — Species Records:** every species with Latin name, common name, source, year, distance from boundary
- **Appendix — Designated Sites:** site code, name, type (SAC/SPA/NHA/pNHA), distance, qualifying interest features
- **Appendix — Water Quality:** water body code, name, type, WFD status, risk
- Use markdown tables. Do not paraphrase — present the raw data.`
}

function buildHabitatsBlock(mode: 'main' | 'appendix', count: number): string {
  if (mode === 'main') {
    return `**HABITATS PLACEMENT (MAIN BODY):**
The ecologist has designated ${count} habitat polygon(s) for the main body. Within the Habitats subsection (typically 3.2):
- Provide a **summary table**: Fossitt code, habitat name, area (ha), condition. Group by Fossitt category if there are many.
- Reference Fossitt (2000) classification.
- Add a closing line: "Detailed per-polygon data including threats and listed species is provided in the Appendix."`
  }
  return `**HABITATS PLACEMENT (APPENDIX):**
The ecologist has designated ${count} habitat polygon(s) for the appendix. Present as **full per-polygon detail rows or cards**: Fossitt code, name, area (ha), condition, EU Annex code, evaluation, threats, listed species, ecologist notes. Use markdown tables.`
}

function buildTargetNotesBlock(mode: 'main' | 'appendix', count: number): string {
  if (mode === 'main') {
    return `**TARGET NOTES PLACEMENT (MAIN BODY):**
The ecologist has designated ${count} target note(s) for the main body. Present them as an inline **EWIC Table 1 format** — a 2-column markdown table:
| Note ID | Description |
| --- | --- |
| N1 | <description text> |
| N2 | <description text> |
…
Use the note's category + title as the description prefix where helpful (e.g. "[habitat] Damaged drainage line near eastern boundary..."). Cross-reference any note that supports a finding in the prose above.`
  }
  return `**TARGET NOTES PLACEMENT (APPENDIX):**
The ecologist has designated ${count} target note(s) for the appendix. Present them as a full **EWIC Table 1 format** in a dedicated "Target Notes" appendix subsection — same 2-column structure (Note ID | Description) listing every designated note in full.`
}

function buildSurveysBlock(
  mode: 'main' | 'appendix',
  surveyCount: number,
  observationCount: number
): string {
  if (mode === 'main') {
    return `**SURVEY RESULTS PLACEMENT (MAIN BODY):**
The ecologist has designated ${surveyCount} field survey(s) for the main body. Add or expand a **"Survey Results"** subsection summarising:
- Total surveys, dates, survey types, weather conditions
- Aggregate species observations (${observationCount} records inherited from these surveys) — group by taxon, highlight protected species
- DAFOR / count summaries where present
- Closing line: "Full per-survey data and complete species observation tables are provided in the 'Survey Data' appendix."`
  }
  return `**SURVEY DATA PLACEMENT (APPENDIX):**
The ecologist has designated ${surveyCount} field survey(s) for the appendix. Present a **"Survey Data"** appendix section with:
- Per-survey detail block: date, type, time, weather, surveyor notes
- Full **species observations table** for each survey: scientific name, common name, taxon, count, abundance (DAFOR), evidence type, protected status, behaviour notes
- Use markdown tables. Do not paraphrase.`
}

function buildBufferZoneBlock(bufferCount: number, bufferRadiusKm: number): string {
  return `**BUFFER ZONE FINDINGS — MANDATORY SEPARATE SUBSECTION:**
The PROJECT DATA below contains ${bufferCount} finding(s) located **outside the project boundary but within the ${bufferRadiusKm} km buffer zone**. These are grouped under "FINDINGS WITHIN BUFFER ZONE (outside boundary)".
- Acknowledge these findings in a clearly-labelled separate paragraph or subsection — e.g. "### Nearby Designated Sites (within ${bufferRadiusKm} km buffer)" or "### Surrounding Context".
- Describe the habitats, species, and condition of these designated sites/records — they are not within the project but may be ecologically connected.
- Do NOT treat buffer-zone findings as if they were inside the boundary, and do NOT silently merge them with on-site findings. Greg requires the spatial distinction to be explicit.`
}

function buildReleveMainBlock(count: number): string {
  return `**⚠ MANDATORY — RELEVÉ VEGETATION SUBSECTION (MAIN BODY):**
The ecologist has designated ${count} relevé(s) for inclusion in this Results section. You **MUST add a new subsection** at the end of the Results (after any existing Fauna subsection) with the heading:

\`### 3.5 Vegetation Survey (Relevé Data)\`

This subsection is **REQUIRED whenever relevé data is provided** — it is not optional and must NOT be omitted even if other data categories (species observations, fauna) are empty. The source data for this subsection is the \`RELEVÉ VEGETATION SURVEYS\` block in the PROJECT DATA below (NOT the species_observations table — relevé species are a SEPARATE data source). Present the relevé(s) as an **aggregate prose summary with statistics**, following the standard Relevé report format:

- State the number of relevés recorded, survey date(s), and recorder name(s)
- State the habitat type(s) (Fossitt code) of the relevé(s) and any site characteristics (soil, aspect, slope)
- Report the total number of vascular plant species documented across all relevés
- For each constant/dominant species, cite Latin name + English common name + DOMIN cover value
- Summarise vegetation cover percentages (total, graminea, forbs) and maximum/median heights
- Reference Fossitt (2000) habitat classification where applicable
- End with: "Full per-relevé data cards are provided in Appendix I."

**DO NOT list each relevé individually with its own sub-heading.** Do not reproduce raw species lists or per-relevé DOMIN tables in the main body — those belong in Appendix I. Write flowing prose summarising the aggregate findings.

If the 3.3 Flora subsection says "no plant species observations were recorded", that refers ONLY to the species_observations table (casual field sightings). Relevé species are a DIFFERENT data source and MUST still be reported under 3.5.`
}

function buildReleveAppendixBlock(count: number): string {
  return `**RELEVÉ PLACEMENT — APPENDIX I FULL DATA:**
The ecologist has designated ${count} relevé(s) for inclusion in this Appendix section. Present them as **detailed per-relevé data cards** following the standard Appendix I format:
- Create a separate subsection for each relevé, headed by its Relevé Code
- For each relevé, provide a two-column metadata block covering: Area, Recorder, Habitat Type (Fossitt code), Soil Type, Soil Stability, Aspect, Slope, Maximum/Median heights (graminea & forbs), and all percentage covers (total vegetation, graminea, forbs, mosses, trees, shrubs, litter, bare soil, bare rock, open water)
- Follow with a **Species Recorded** table listing every species with Latin name, English common name, and DOMIN cover value
- End each card with Other Species in Proximity, Fauna Observations, and Relevé Comment lines where present
- Use markdown tables for clarity. Do not paraphrase — present the raw field data in full.`
}

/**
 * When the ecologist designates relevés for the main body, splice a 3.5
 * Vegetation Survey subsection definition into the section prompt so the AI
 * treats it as part of the core structure rather than an afterthought.
 */
export function injectReleveSubsectionIntoPrompt(
  sectionPrompt: string,
  releveCount: number
): string {
  const releveSubsection = `
### 3.5 Vegetation Survey (Relevé Data)
- **MANDATORY:** This subsection must be included whenever the PROJECT DATA contains a \`RELEVÉ VEGETATION SURVEYS\` block. Relevé species are a **separate data source** from species_observations and MUST NOT be lumped under "Flora" as "no plant species recorded". Source: the \`RELEVÉ VEGETATION SURVEYS\` block in PROJECT DATA below.
- State the number of relevés (${releveCount} in this report), survey date(s), recorder name(s), and habitat type(s) (Fossitt code)
- Site characteristics: soil type, soil stability, aspect, slope, vegetation cover percentages (total/graminea/forbs), maximum and median heights
- Total number of vascular plant species documented across all relevés
- Name the dominant/constant species using Latin name + English common name + DOMIN cover value
- End with: "Full per-relevé data cards are provided in Appendix I."
- Write this as flowing prose with aggregate statistics — DO NOT list each relevé as a separate sub-heading and DO NOT reproduce raw species tables (those belong in Appendix I).
`

  const closingMarker = 'Use markdown sub-headings'
  if (sectionPrompt.includes(closingMarker)) {
    return sectionPrompt.replace(closingMarker, `${releveSubsection}\n${closingMarker}`)
  }
  return `${sectionPrompt}\n${releveSubsection}`
}
