export const CLAUDE_SYNTHESIS_MODEL = 'claude-sonnet-4-6'
export const CLAUDE_CHEAP_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Heavy report sections that exceed Haiku 4.5's 8K output cap and require
 * Sonnet's higher-quality, longer-output capacity to avoid mid-sentence
 * truncation. Keyed by `${reportType}:${sectionId}`.
 *
 * Tested against PEA v3 + EcIA v2 sample reports where Haiku produced
 * truncated Habitats, Fauna, Mitigation, Residual, and IEF-table sub-sections.
 */
const HEAVY_SECTIONS: ReadonlySet<string> = new Set([
  // PEA — Results carries S-P-R + habitats + IEF table; Constraints + parallel
  // Recommendations table; Discussion synthesises all of it.
  'pea:results',
  'pea:constraints',
  'pea:discussion',
  // EcIA — Baseline (S-P-R + KER table), Assessment (4 sub-sections + summary
  // table), Mitigation (8 sub-sections), Residual (Monitoring table + KER table).
  'ecia:baseline',
  'ecia:assessment',
  'ecia:mitigation',
  'ecia:residual',
  // AA Screening — site_description carries S-P-R + hydrological pathways,
  // natura_sites enumerates per-SAC qualifying interests + conservation
  // objectives, significant_effects assesses every QI × pathway combination,
  // in_combination walks the CDP + LAP + NPF + planning register + cumulative
  // pathways and runs long under Haiku's 2K default cap. AAS TEST v1
  // (AT-2026-759) produced mid-sentence/mid-word truncation in all four.
  'aa_screening:site_description',
  'aa_screening:natura_sites',
  'aa_screening:significant_effects',
  'aa_screening:in_combination',
  // NIS (Natura Impact Statement) — shared prompt set used by `aa_stage2`
  // (Appropriate Assessment Stage 2) and `nia` (Natura Impact Assessment).
  // AAS2 TEST v1 (AS-2026-183) produced mid-sentence truncation in 6 of 8
  // sections at Haiku's 2K-4K default caps. Methodology / site_description
  // carry the S-P-R table and per-stage development description;
  // natura_sites enumerates per-SAC QIs and Conservation Objectives;
  // impact_assessment is the per-site × per-QI integrity matrix (the
  // longest section by far); mitigation carries the Avoidance/CEMP/Monitoring
  // tables; residual carries the Site Integrity Statement; conclusion
  // carries the mandatory References list. Introduction stays on Haiku.
  'aa_stage2:methodology',
  'aa_stage2:site_description',
  'aa_stage2:natura_sites',
  'aa_stage2:impact_assessment',
  'aa_stage2:mitigation',
  'aa_stage2:residual',
  'aa_stage2:conclusion',
  'nia:methodology',
  'nia:site_description',
  'nia:natura_sites',
  'nia:impact_assessment',
  'nia:mitigation',
  'nia:residual',
  'nia:conclusion',
  // Bat Survey — `results` was pre-flight Sonnet; methodology/assessment/
  // mitigation added after BST-2026-196 v1 test surfaced mid-cuts:
  // methodology hit Haiku's 8K cap (28K char output, truncated at
  // "...have been provided"), assessment cut at "...altering hydrology of",
  // mitigation cut mid-bold at "**Ecological clerk". Survey methodology
  // walks PRA + emergence + transect + static-detector + limitations →
  // long by nature; assessment walks per-species + roost + foraging +
  // commuting; mitigation walks avoidance + design + licensing + CEMP.
  'bat_survey:results',
  'bat_survey:methodology',
  'bat_survey:assessment',
  'bat_survey:mitigation',
  // `bat_survey:protection` added in sample-grade restructure (Mallow
  // DixonBrosnan template) — 500-700 word legislative framework with
  // 5-instrument table + derogation licensing detail. Haiku 2K default
  // would mid-cut the Berne/Bonn/EUROBATS rows.
  'bat_survey:protection',
  // Bird Survey — BS-2026-258 v1 baseline produced mid-sentence cuts in
  // 4/6 sections at Haiku's 2-3K default caps: methodology cut at
  // "...Tidal synchronisation (if estuarine or tidal habitat present",
  // results truncated mid-bullet at "Long-eared Owl (Asio otus", discussion
  // cut at "...subject to negative long", recommendations cut at
  // "...woodland (WN, WD2, WD3), scrub". Methodology walks Desk Study +
  // Breeding + Wintering + Vantage Point + Limitations; results carries
  // 5 sub-sections + Evaluation Matrix; discussion carries the Impact
  // Assessment matrix; recommendations carries Recommendations Table +
  // Monitoring Programme Table + Further Surveys + AA Trigger Statement.
  // Introduction + appendices stay on Haiku (clean in baseline).
  'bird_survey:methodology',
  'bird_survey:results',
  'bird_survey:discussion',
  'bird_survey:recommendations',
  // Protected Species Report — Tur 1 pre-flight had only methodology +
  // results + mitigation on Sonnet. Tur 2 PSR-2026-864 v1 surfaced
  // discipline-sensitive bugs (Otter "Annex II,IV&V" leak in mitigation,
  // GCN survey recommendation in 6.1, Section 42 WAA citation in 6.4,
  // Schedule 4/6 number hallucination, 6250* habitat code hallucination)
  // — all in assessment + recommendations sections (Haiku). Sonnet
  // follows prompt directives more reliably; assessment + recommendations
  // promoted in Tur 3 to enforce Annex consistency + cross-section guards.
  'protected_species:methodology',
  'protected_species:results',
  'protected_species:assessment',
  'protected_species:mitigation',
  'protected_species:recommendations',
  // Habitat Survey Report — HSR-2026-128 v1 baseline (19 pages) produced
  // mid-sentence cuts in `habitats` at Haiku's 8K cap (truncated mid-text
  // at "...91A0 *Sambuco-salicetea forests*" — only 4-5 per-FOSSITT
  // sub-sections completed before the Annex I correspondence table was
  // reached) and in `evaluation` at the 2K default (Hedgerow sensitivity
  // bullet cut mid-sentence). Methodology walks Desk Study + Field Survey
  // + Vegetation Recording (DOMIN/DAFOR) + Condition Assessment + Annex I
  // Assessment criteria + Peatland Condition Framework (Sphagnum %, hummock
  // /hollow, NIEA 2012) + Survey Timing table + Limitations. Habitats
  // iterates per-FOSSITT sub-section (typically 15-20 codes mapped) with
  // distribution + composition + condition + Annex I linkage + connectivity
  // + threats blocks. Evaluation carries the CIEEM 5-level GFR matrix +
  // KER list + Sensitivity matrix. Recommendations walks Avoidance /
  // Mitigation table / Habitat Management table / Monitoring Programme
  // table / Further Surveys / References closing.
  'habitat_survey:methodology',
  'habitat_survey:habitats',
  'habitat_survey:evaluation',
  'habitat_survey:recommendations',
  // Other / Generic Technical Report — Tur 1 OTR-2026-243 v1 produced
  // mid-cuts in 4 of 5 sections at the minimal pre-flight: methodology
  // cut at "** Great" (2.3 Specialist Survey list, Haiku 2K default cap),
  // results cut at "...frequently support protected" mid-Hedgerow (5500
  // token cap reached after 3.1 Designated Sites + 3.2 Habitats only —
  // sections 3.3 Protected Species, 3.4 Aquatic Features, 3.5 Data Gaps
  // never written), discussion cut at "...17% of their original extent in"
  // (Cumulative Effects, Haiku 4K cap), recommendations cut at "Consultation
  // with the Inland" (Watercourse Fisheries heading, Haiku 3.5K cap).
  // Despite "Other" being freeform, the content volume rivals taxon-specific
  // reports because the same habitat polygon dataset + per-habitat detail
  // + 5-section results structure is written. Tur 2 promotes the remaining
  // 3 sections to Sonnet so the full 5-sub-section results structure can
  // complete and discussion/recommendations reach their MANDATORY closings.
  'other:methodology',
  'other:results',
  'other:discussion',
  'other:recommendations',
])

/**
 * Choose the Claude model for a given report section. Heavy sections route to
 * Sonnet; everything else stays on Haiku to keep token spend down.
 */
export function getSectionModel(reportType: string, sectionId: string): string {
  return HEAVY_SECTIONS.has(`${reportType}:${sectionId}`)
    ? CLAUDE_SYNTHESIS_MODEL
    : CLAUDE_CHEAP_MODEL
}
