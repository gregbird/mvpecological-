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
