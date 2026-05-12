/**
 * AI Section Prompts for all report types.
 * Each report type has detailed, section-specific prompts that guide GPT-4o
 * to produce high-quality, Irish-legislation-aware ecological report content.
 */

export interface SectionPromptConfig {
  prompt: string
  maxTokens?: number
}

const DEFAULT_MAX_TOKENS = 2000

// ---------------------------------------------------------------------------
// PEA (Preliminary Ecological Appraisal) — CIEEM standard
// ---------------------------------------------------------------------------
const PEA_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~800-1000 words) following the standard CIEEM / NM Ecology / Enviroguide-style PEA opening. Use the markdown sub-headings IN THIS ORDER:

### Project Background and Assessment Brief
- Short opening (2-3 sentences) confirming the PEA has been commissioned for the named project at the supplied site location
- Purpose of the PEA per CIEEM (2017) — rapid baseline assessment to identify ecological features, screen for protected species and designated sites, and inform whether a full EcIA is required
- Reference CIEEM (2017) Guidelines for Preliminary Ecological Appraisal as the governing methodology
- Brief site location: grid reference, county, townland/locality
- Scope of the ecological assessment (habitats, flora, fauna, designated sites, hydrological connectivity)

### Statement of Authority and Competence
- One short paragraph stating the report has been prepared by a suitably qualified ecologist
- If the project data provides a named ecologist (lead author / surveyor name), incorporate that name; otherwise refer to "the principal ecologist" generically
- Note professional standards: CIEEM membership, adherence to the CIEEM Code of Professional Conduct
- One sentence on QA process if available; otherwise omit
- KEEP THIS SUB-SECTION SHORT (60-100 words) — do not fabricate detailed CVs

### Description of the Proposed Development
Provide a structured description with these short paragraphs:
- **Site location and surroundings** — grid reference, county, townland, surrounding land use, distance to nearest settlement
- **Nature of the proposed development** — type inferred from project metadata (residential, infrastructure, mixed-use, etc.); if not specified, describe the assessment area only and note the development specification is appended separately
- **Construction Phase** — brief outline of anticipated construction activities (site clearance, earthworks, foundation works) and the ecological pressures they typically create (sediment, noise, dust, lighting). Keep concise; the PEA does not require the level of construction detail of an EcIA.

### Legislative and Policy Framework
Compact bulleted list grouped under **EU**, **National**, and **Policy & Guidance**:
- EU: Habitats Directive (92/43/EEC); Birds Directive (2009/147/EC); Water Framework Directive (2000/60/EC)
- National: Wildlife Acts 1976–2021; European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011); Flora Protection Order 2022; Planning and Development Acts 2000–2023
- Policy & Guidance: CIEEM (2017) PEA Guidelines; CIEEM (2018) EcIA Guidelines (referenced where escalation may be required); NPWS Conservation Objectives documents

### Report Structure
Brief enumeration of the remaining PEA sections (Methodology, Results, Ecological Constraints, Discussion & Conclusions, Appendices) and what each covers in one line.

Be specific to the supplied project data; do not invent details. Where the project data is silent on a topic, use "to be confirmed" phrasing rather than fabricating figures.`,
    maxTokens: 3000,
  },
  methodology: {
    prompt: `Write the Methodology section (~600-900 words). Cover the four items below in this order. **BREVITY DIRECTIVE:** The Limitations sub-section is MANDATORY and MUST be reached. Keep every bullet 1-2 sentences max. Do NOT expand any item into multiple sub-sub-sections.

1. **Desk Study** — list data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts. ONE compact paragraph or short bullet list. Do NOT write per-database sub-paragraphs.
2. **Field Survey** — describe survey types conducted, dates, methods used, weather conditions, and surveyor effort. ONE paragraph + a short bullet per survey (relevé, botanical, walkover, etc.) — keep each bullet 1-2 sentences.
3. **Habitat Mapping** — reference Fossitt (2000) classification and the NLC 2018 source in 2-4 sentences. **CRITICAL: DO NOT write a habitat extent / FOSSITT code table in this section** — the full habitat table belongs in Section 3 (Results). Just name the classification framework here.
4. **Limitations** — 4-7 compact bullets covering seasonal / temporal / access / data-gap / WFD-data / NPWS-conservation-objectives constraints. Each bullet 1-2 sentences max. This sub-section MUST be reached; if running long, shorten earlier sub-sections.

Reference standard survey guidelines (CIEEM, NRA, Bat Conservation Ireland) inline where relevant — do NOT add a separate "Guidance" sub-section.`,
    maxTokens: 4500,
  },
  results: {
    prompt: `Write the Results section. **BREVITY DIRECTIVE:** This section has SIX sub-sections. The IEF Identification Table at the end is MANDATORY and must always be reached. Aim for ~1800-2200 words total. Use the markdown sub-headings IN THIS ORDER:

### Hydrology and Hydrogeology
1 short paragraph (4-6 sentences). Cover surface watercourses with EPA WFD codes and lengths, drainage direction, bedrock/aquifer status, groundwater/karst connections. State data gaps in one sentence.

### Designated Sites
For each site within the ZoI, ONE short paragraph (4-6 sentences) covering: site code, distance, qualifying interests with EU codes, conservation status, key threats. Do not exceed 2 paragraphs per site.

#### Source–Pathway–Receptor (S-P-R) Linkages
Present as a markdown TABLE only — no extensive prose:

| Designated Site | Site Code | Distance | Potential Source | Pathway (Direct / Hydrological / Hydrogeological / Air / Land / Indirect) | Pathway Active? (Yes / No / Possible) | Rationale |

One row per credible pathway. Rationale column: 1 short sentence per row. Conclude with ONE short paragraph (2-3 sentences) identifying sites with active linkages and AA Screening implications.

### Habitats
Open with a habitat summary TABLE (columns: Fossitt Code | Habitat Type | Area (ha) | % | Annex I Correspondence | Conservation Sensitivity). After the table, ONE short paragraph (3-5 sentences) per DOMINANT habitat (top 3-5 by area or sensitivity). Do NOT write a paragraph per Fossitt code.

### Flora and Invasive Species
ONE short paragraph (4-6 sentences). Cover species recorded with DAFOR, Flora Protection Order 2022 species, invasive species (Third Schedule). If no invasive species found, say so in one sentence and note colonisation-prone habitats.

### Fauna
ONE short bullet group covering each taxon (Bats, Birds, Mammals (excl. bats), Amphibians, Reptiles, Fish, Invertebrates). For each: 1-2 sentences on records (NBDC/NPWS), habitat suitability, legislative status. If zero records, say "data gap; suitability assessed from habitat presence".

### Identification of Important Ecological Features (IEFs)
**MANDATORY — this sub-section closes Section 3 and MUST be reached.** Apply the six-level geographic frame of reference (International / National / Regional / County / Local / Negligible). Present as a TABLE:

| Ecological Feature | Geographic Frame of Reference | Legal / Conservation Status | Important Ecological Feature? (Yes / No) | Rationale |

One row per designated site, per Annex I habitat correspondence, per fauna taxon, plus hedgerow/treeline and invasive species if present. Rationale column: 1 short sentence per row.

Conclude with ONE short paragraph (2-3 sentences) listing IEFs carried forward to the Ecological Constraints section.

**Budget reminder:** every sub-section above must be present. If running long, abbreviate the per-habitat paragraphs and Fauna bullets to ensure the IEF table is completed.`,
    maxTokens: 8000,
  },
  constraints: {
    prompt: `Write the Ecological Constraints and Recommendations section. **BREVITY DIRECTIVE:** FOUR sub-sections. The Recommendations Table, Further Surveys, and AA Screening Trigger MUST be reached. Aim for ~900-1200 words total. Use markdown sub-headings IN THIS ORDER:

### Ecological Constraints
ONE short opening paragraph (2-3 sentences). State that constraints derive from the IEFs in Section 3 and the ZoI assessment, applying the CIEEM (2017) approach.

TABLE (one row per IEF carried from Results):

| Ecological Receptor | Importance (Local / County / Regional / National / International) | Legal / Conservation Status | Potential Constraint to Development | Zone of Influence |

Constraint column: 1-2 sentences max per row. Cover constraints like: direct habitat loss; hydrological disturbance; nesting bird disturbance (1 Mar–31 Aug); bat disturbance (May–Oct / Nov–Mar hibernation); otter disturbance; AA Screening trigger; invasive species spread; Annex I habitat alteration.

### Recommendations
**MANDATORY parallel TABLE matching the Constraints table row-for-row:**

| Ecological Receptor | Recommendation | Timing / Seasonal Restriction | Action Type (Avoidance / Reduction / Further Survey / AA Trigger) | Responsibility |

For Timing use specific dates (e.g. "outside 1 March–31 August", "October–November", "July–September"). Responsibility: "Project ecologist" / "ECoW" / "Design team" / "Contractor". Recommendation column: 1-2 sentences max.

### Further Survey Requirements
**MANDATORY.** Compact bullets (one per recommended survey):
- Target receptor / Optimal window / Standard methodology / Whether result determines EcIA escalation

3-6 bullets typical. Reference BCT Bat Surveys, BTO breeding bird methods, NRA fauna survey guidance.

### AA Screening Trigger Statement
**MANDATORY closing sub-section.** ONE short paragraph (3-5 sentences) explicitly confirming whether the project requires Screening for Appropriate Assessment (SfAA) under Article 6(3) of the Habitats Directive, based on S-P-R linkages from Results. If yes, identify driving designated site(s).

**Budget reminder:** Constraints and Recommendations TABLES must both be present; Further Surveys bullets and AA Screening Trigger paragraph must be reached.`,
    maxTokens: 7000,
  },
  discussion: {
    prompt: `Write the Discussion & Conclusions section. **BREVITY DIRECTIVE:** NINE sub-sections — keep each compact. The closing Conclusion MUST be reached. Aim for ~800-1100 words total. Use markdown sub-headings:

### Synthesis
ONE compact paragraph (4-6 sentences) recapping desk study + field survey findings.

### Potential Impacts
ONE short paragraph or 4-6 compact bullets covering predicted impacts on designated sites, habitats, protected species.

### Cumulative and In-Combination Effects
ONE short paragraph (3-5 sentences). Reference search methodology (radius, time window) for other plans/projects. Note that detailed in-combination assessment is the EcIA stage if escalated.

### Precautionary Principle
1-2 sentences noting where uncertainty exists and how it is handled.

### AA Screening Trigger
**MANDATORY.** ONE short paragraph (3-5 sentences) explicitly stating whether the project triggers SfAA under Article 6(3). If yes, identify driving designated site(s).

### Further Surveys
3-5 compact bullets: target species/habitats / optimal window / methodology / EcIA escalation implication.

### Enhancement Opportunities
3-4 compact bullets: native planting; bat/bird boxes; pollinator habitat (All-Ireland Pollinator Plan); SuDS biodiversity features.

### Monitoring Recommendations
3-4 compact bullets covering pre/during/post construction monitoring.

### Conclusion
**MANDATORY closing.** ONE short paragraph (3-5 sentences) — overall PEA conclusion: is the site suitable for the proposed development subject to recommendations, or is full EcIA required? Confirm legislative compliance pathway.

**Budget reminder:** all 9 sub-sections must be present. Use bullets, not paragraphs, where indicated.`,
    maxTokens: 5500,
  },
  appendices: {
    prompt: `Write the **Data Sources and References** section only (~250-400 words). This section is a PROSE/BULLET reference list ONLY.

**CRITICAL — DO NOT WRITE ANY OF THE FOLLOWING:**
- An "Appendix List" enumerating Appendix A, B, C, etc. (the structured appendices below — Habitat Map, Designated Sites, Species List, Aquatic Features, Site Photographs — are auto-generated from project data and appear right after this section; redefining or renumbering them creates conflicts).
- Any markdown TABLES (\`| col1 | col2 |\` rows). The auto-rendered appendices already tabulate every designated site, habitat polygon, species record, and waterbody.
- Any sub-headings like "APPENDIX — DESIGNATED SITES", "APPENDIX — CATCHMENTS", "APPENDIX — HABITAT MAPPING DETAIL", or similar appendix-style tabular sections.
- Per-record breakdowns of habitats, species observations, or designated sites (those are in the auto-rendered Appendix A–E).

**Only** write a short opening paragraph + grouped bullet/prose references under the three headings below.

Open with one short paragraph (1-2 sentences) explaining that the structured appendices that follow are auto-generated from desk study and field survey data, then list every data source consulted and reference cited, with full citations.

Use the DATA SOURCES AND REFERENCES section from the provided data. Group references under these headings:

**Online databases consulted:**
- National Parks and Wildlife Service (NPWS) — designated sites and species distribution records. URL: https://www.npws.ie. Note specific sites accessed (SAC/SPA codes) in one sentence per source, NOT as a sub-table.
- National Biodiversity Data Centre (NBDC) — Biodiversity Maps. URL: https://maps.biodiversityireland.ie.
- Environmental Protection Agency (EPA) — WFD waterbodies and catchments. URL: https://gis.epa.ie. Note specific water body codes inline.
- National Land Cover Map (NLC) 2018 — Tailte Éireann. URL: https://www.tailte.ie.
- Catchments.ie. URL: https://www.catchments.ie.

**Standard methodological references:**
- Fossitt, J. A. (2000). *A Guide to Habitats in Ireland*. The Heritage Council.
- CIEEM (2017). *Guidelines for Preliminary Ecological Appraisal*.

**Legislation:**
- Wildlife Acts 1976–2021 (Ireland)
- EU Habitats Directive (92/43/EEC); EU Birds Directive (2009/147/EC); Water Framework Directive (2000/60/EC); Flora Protection Order 2022
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011)

Add any further project-specific guidance documents or technical references actually consulted. Format as a structured reference list suitable for inclusion in an ecological report appendix. ABSOLUTELY NO TABLES.`,
    maxTokens: 3500,
  },
}

// ---------------------------------------------------------------------------
// EcIA (Ecological Impact Assessment) — CIEEM 2018 EcIA Guidelines
// ---------------------------------------------------------------------------
const ECIA_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~900-1100 words) following the standard CIEEM / Enviroguide-style EcIA opening. Use the following markdown sub-headings IN THIS ORDER:

### Project Background and Terms of Reference
- Short opening (2-3 sentences) confirming the EcIA has been commissioned for the named project at the supplied site location
- The EIA context requiring this assessment — reference the EIA Directive (2014/52/EU) and EPA (2022) Guidelines on the Information to be Contained in Environmental Impact Assessment Reports
- Terms of reference for the ecological chapter (assessment of likely significant effects on habitats, species, designated sites)
- Guidance followed: CIEEM (2018) Guidelines for Ecological Impact Assessment in the UK and Ireland; NRA (2009) Ecological Surveying Techniques where applicable

### Statement of Authority and Competence
- One short paragraph stating the report has been prepared by a suitably qualified ecologist
- If the project data provides a named ecologist (lead author / surveyor name), incorporate that name; otherwise refer to "the principal ecologist" generically
- Note professional standards: CIEEM membership, adherence to the CIEEM Code of Professional Conduct, competency in ecological assessment under Irish/EU legislation
- One sentence on QA process (peer review, technical sign-off) if the project's deep research data references a review chain
- KEEP THIS SUB-SECTION SHORT (80-120 words) — do not fabricate detailed CVs

### Description of the Proposed Development
Provide a structured description of the development with these short paragraphs:
- **Site location** — grid reference, county, townland/locality, surrounding land use context
- **Nature of the proposed development** — type of development inferred from project metadata (residential, infrastructure, mixed-use, road, etc.); if the data does not specify a development type, describe the assessment site only and note that the development specification is appended separately
- **Construction Phase** — anticipated construction activities (site clearance, excavation, earthworks, foundation works, materials handling, plant movements, temporary drainage), expected duration where stated, and typical construction-phase emissions/discharges that drive ecological risk (sediment, noise, dust, lighting)
- **Operational Phase** — operational characteristics relevant to ecology (permanent land take, surface water drainage regime, lighting strategy, ongoing maintenance, anticipated traffic/visitor levels)
- If decommissioning is foreseeable for the development type, add a one-sentence note; otherwise omit

### Legislative and Policy Framework
Compact bulleted list grouped under **EU**, **National**, and **Policy & Guidance** headings:
- EU: EIA Directive (2014/52/EU); Habitats Directive (92/43/EEC); Birds Directive (2009/147/EC); Water Framework Directive (2000/60/EC)
- National: Wildlife Acts 1976–2021; European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011); Flora Protection Order 2022; Planning and Development Acts 2000–2023
- Policy & Guidance: CIEEM (2018) EcIA Guidelines; EPA (2022) EIA Guidelines; DoHLGH AA Guidance; NPWS Conservation Objectives documents

### Report Structure
Brief enumeration of the remaining EcIA sections (Methodology, Baseline, Assessment of Effects, Mitigation & Enhancement, Residual Effects, Conclusions, Appendices) and what each covers in one line.

Be specific to the supplied project data; do not invent details. Where the project data is silent on a topic (e.g. construction duration), use the phrasing "to be confirmed in the construction methodology" rather than fabricating a figure.`,
    maxTokens: 3500,
  },
  methodology: {
    prompt: `Write the Methodology section (~700-1000 words). Cover the five items below in this order. **BREVITY DIRECTIVE:** The Limitations sub-section is MANDATORY and MUST be reached. Keep every bullet 1-2 sentences max. Do NOT expand any item into multiple sub-sub-sections.

1. **Desk Study** — list data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts. ONE compact paragraph or short bullet list. Do NOT write per-database sub-paragraphs.
2. **Field Surveys** — describe each survey type, dates, methods, weather, surveyor effort. ONE paragraph + short bullet per survey — each bullet 1-2 sentences.
3. **Impact Assessment Methodology** — explain the CIEEM (2018) approach in 3-5 sentences: IEF identification, impact characterisation parameters (magnitude, extent, duration, reversibility, frequency, timing), significance determination via geographic frame of reference. **CRITICAL: DO NOT write a habitat table or Annex I list here** — those belong in Section 3 (Baseline).
4. **Zone of Influence** — 2-4 sentences on how ZoI was determined for different receptor types.
5. **Limitations** — 4-7 compact bullets covering seasonal / temporal / access / data-gap / WFD-data / NPWS-conservation-objectives constraints. Each bullet 1-2 sentences max. This sub-section MUST be reached; if running long, shorten earlier sub-sections.

Reference NRA (2009) guidelines and EPA EIA Scoping guidance inline where relevant — do NOT add a separate "Guidance" sub-section.`,
    maxTokens: 4500,
  },
  baseline: {
    prompt: `Write the Baseline Ecological Environment section. **BREVITY DIRECTIVE:** This section has SIX sub-sections — keep them proportional. The KER table at the end is MANDATORY and must always be reached. Aim for ~1800-2200 words total. If you find yourself writing extensive prose on any single habitat or species, STOP and move on. Use the markdown sub-headings IN THIS ORDER:

### Hydrology and Hydrogeology
1 short paragraph (4-6 sentences). Cover: bedrock, subsoil, aquifer status, EPA WFD watercourses with codes and lengths, drainage direction, groundwater/karst connections. State data gaps in one sentence.

### Designated Sites
For each European site (SAC, SPA) and national site (NHA, pNHA) within the ZoI, write ONE short paragraph (4-6 sentences) covering: site code, distance, qualifying interests with EU codes, conservation status, key threats/pressures. Do not exceed 2 paragraphs per site even if data is rich.

#### Source–Pathway–Receptor (S-P-R) Linkages
Present as a markdown TABLE only — no extensive prose. Columns:

| Designated Site | Site Code | Distance | Potential Source | Pathway (Direct / Hydrological / Hydrogeological / Air / Land / Indirect) | Pathway Active? (Yes/No/Possible) | Rationale |

One row per credible pathway (a site may produce multiple rows). Pathway descriptors: **Direct** (project within site), **Hydrological** (surface water), **Hydrogeological** (groundwater/karst), **Air** (dust/emissions), **Land** (habitat continuity), **Indirect** (recreation/traffic/lighting). Rationale column: 1 sentence max per row.

Conclude with ONE short paragraph (2-3 sentences) naming sites with active linkages requiring further assessment.

### Habitats
Open with a habitat summary TABLE (columns: Fossitt Code | Habitat Type | Area (ha) | % | Annex I Correspondence | Conservation Sensitivity). After the table, write ONE short paragraph (3-5 sentences) per DOMINANT habitat (top 3-5 by area or sensitivity). Do NOT write a paragraph per Fossitt code — the table already lists every code.

### Flora
ONE short paragraph (4-6 sentences). Cover: species recorded with DAFOR if available, Flora Protection Order 2022 species, invasive species (Third Schedule), indicator species. Do not exceed one paragraph.

### Fauna
ONE short bullet group covering each taxon (Bats, Birds, Mammals (excl. bats), Amphibians, Reptiles, Fish, Invertebrates). For each: 1-2 sentences on records (NBDC/NPWS), habitat suitability, legislative status. If zero records returned, say "data gap; suitability assessed from habitat presence" — do not write multi-paragraph speculation.

### Evaluation of Ecological Features — Key Ecological Receptors (KERs)
**MANDATORY — this sub-section closes Section 3 and MUST be reached.** Apply the six-level geographic frame of reference (International / National / Regional / County / Local / Negligible). Present as a TABLE with columns:

| Ecological Feature | Geographic Frame of Reference | Legal / Conservation Status | KER? (Yes / No) | Rationale |

One row per designated site, per Annex I habitat correspondence, per fauna taxon, plus hedgerow/treeline and invasive species if present. Rationale column: 1 short sentence per row.

Conclude with ONE short paragraph (2-3 sentences) listing KERs carried forward to Section 4 (Assessment of Effects).

**Budget reminder:** every sub-section above must be present. If running long, abbreviate the per-habitat paragraphs and reduce per-row Rationale text to ensure the KER table is completed.`,
    maxTokens: 8000,
  },
  assessment: {
    prompt: `Write the Assessment of Effects section (~1800-2400 words). This section MUST carry every Key Ecological Receptor (KER) identified in the Baseline section through the CIEEM (2018) impact characterisation framework. Use the markdown sub-headings IN THIS ORDER:

### Approach to Impact Assessment
Short opening paragraph (3-5 sentences) explaining that effects are characterised per CIEEM (2018) using: magnitude, extent, duration (short / medium / long-term, permanent / temporary), reversibility, frequency, and timing, and that significance is determined against the geographic frame of reference established for each KER in the Baseline section.

### Construction Phase Impacts
Cover potential effects arising during the construction phase. Structure as bullet groups under bold sub-labels:
- **Direct habitat loss / modification** — for each habitat KER, indicate likely area lost or modified (use the Baseline figures), and Annex I implications
- **Disturbance to fauna** — noise, vibration, lighting effects on each fauna KER (bats, breeding birds, otter, etc.); reference sensitive periods (nesting 1 March–31 August, otter breeding, bat activity May–October, hibernation Nov–March)
- **Water quality and hydrological impacts** — sediment, pollution risk, alteration of drainage; assess against the S-P-R linkages identified in Baseline (cross-reference)
- **Air quality and dust deposition** — particularly to designated sites with sensitive Annex I habitats
- **Spread of invasive species** — if any are present or recorded on or near the site
- **Pollution and accidental events** — concrete, fuel, hydrocarbon release risk

For each impact, briefly characterise magnitude (negligible / small / medium / large), extent, duration, reversibility and **pre-mitigation significance** (Imperceptible / Slight / Moderate / Significant / Profound) using the geographic frame of reference from Baseline.

### Operational Phase Impacts
- **Long-term habitat alteration** — permanent land take, fragmentation
- **Ongoing disturbance** — operational noise, lighting (esp. for bats, otter, nesting birds)
- **Surface water and drainage regime changes** — discharge to watercourses, runoff quality
- **Recreational pressure** — where the development increases visitor pressure on designated sites or sensitive habitats
- **Barrier effects** — severance of commuting routes (hedgerow loss, road effect on bats / amphibians / mammals)

Apply the same CIEEM characterisation parameters as for the construction phase.

### Do Nothing Scenario
Short sub-section (80-150 words) describing the expected ecological trajectory of the site if the development does not proceed. Consider:
- Continuation of current land use (agricultural intensification, succession, neglect)
- Pre-existing pressures from the wider landscape (drainage, climate change, invasive species)
- Whether any KER is currently in decline irrespective of the development
This sub-section is a CIEEM/EIA Directive requirement — keep it factual and short.

### In-Combination and Cumulative Effects
Cover the in-combination assessment under Article 6(3) of the Habitats Directive and the EIA Directive's cumulative-effects requirement. Structure:
- **Methodology** — 1-2 sentences on how other plans and projects were identified (relevant County Development Plan, Local Area Plans, planning permissions within a defined search radius and time window — typically 5 years and 500 m–5 km depending on receptor)
- **Relevant plans and policies** — name County Development Plan and any Local Area Plan; if specific plan names are not in the project data, state generically
- **Relevant projects** — note that planning applications and permitted developments along the same impact pathways should be reviewed at the next stage if not already captured
- A summary TABLE with columns: Plan / Project | Type | Pathway to KER | Cumulative Effect | Significance
  - If no specific plans/projects are known from the supplied data, populate the table with a single row stating "To be confirmed at planning submission — search of [Local Authority] planning register within X km over preceding 5 years required" rather than fabricating projects.
- Short concluding paragraph stating whether in-combination effects materially change the residual significance for any KER

### Summary Table of Predicted Effects (Pre-Mitigation)
Conclude the section with a TABLE summarising every KER carried from Baseline:

| Key Ecological Receptor | Phase (Construction / Operational) | Impact Description | Magnitude | Duration | Pre-Mitigation Significance |

Reference the precautionary principle where uncertainty exists, and explicitly link every row to the S-P-R linkages and KER table established in Section 3 (Baseline). Do not introduce KERs that were not evaluated in the Baseline section — instead, flag any gaps and recommend they be addressed at the next stage.`,
    maxTokens: 7000,
  },
  mitigation: {
    prompt: `Write the Avoidance, Mitigation, Compensation and Enhancement Measures section. **BREVITY DIRECTIVE:** This section has EIGHT sub-sections following the CIEEM (2018) hierarchy — keep them proportional. The final CEMP Commitments sub-section MUST be reached. Aim for ~1600-2000 words total. Avoid over-elaborating individual bullets in the CEMP sub-section.

### Mitigation Hierarchy and Approach
ONE short paragraph (2-3 sentences). State the CIEEM (2018) hierarchy (Avoidance → Reduction → Remediation → Compensation, with Enhancement additionally for biodiversity net gain), ECoW oversight, CEMP commitments.

### Avoidance by Design (Embedded Mitigation)
Open with 1-2 sentences. Present design-led avoidance as a TABLE only:

| Embedded Design Feature | KER Protected | Effect Avoided | Notes |

Aim for 4-6 rows covering: setbacks from designated site boundaries (typical 50 m); watercourse buffers (10 m); retention of hedgerows/treelines; SuDS strategy; lighting strategy. Notes column: 1 short sentence per row. If project specifics are unknown, mark "to be confirmed in detailed design".

### Reduction — Construction Phase Best Practice (CEMP)
Compact bulleted groups under bold sub-labels (2-4 bullets per group, each bullet 1-2 sentences):
- **Water quality and pollution prevention** — silt fencing >10 m upgradient of watercourses; bunded fuel storage >50 m from watercourse (150% containment); concrete washout >100 m from watercourse
- **Timing restrictions** — no vegetation clearance 1 March–31 August (nesting birds, Wildlife Acts); in-channel works avoid fish spawning March–June; bat-roost-affecting works restricted to April or October–November
- **Noise, vibration, and lighting** — buffers within 500 m of bat roosts, otter holts, or SPA-qualifying raptor territories
- **ECoW supervision** — pre-works inspections, toolbox talks, sensitive-works monitoring
- **Invasive species controls** — biosecurity, treatment per Irish Invasive Species Action Plan

### Reduction — Operational Phase Measures
4-6 compact bullets, 1-2 sentences each: long-term lighting strategy (downward-directed, warm-spectrum, motion-activated); operational surface water management; recreational pressure controls (signage, screen planting); ongoing invasive species surveillance; maintenance regime aligned with seasonal restrictions.

### Remediation and Reinstatement
3-5 compact bullets: topsoil storage/reinstatement; reseeding with native locally-sourced species; hedgerow gap-up planting; watercourse bank stabilisation.

### Compensation
2-4 compact bullets: like-for-like habitat creation at appropriate ratios (1:1 minimum, higher for high-status habitats); habitat creation locations and management commitments. If no residual loss is expected after Avoidance+Reduction, state this in ONE sentence and move on.

### Enhancement — Biodiversity Net Gain
3-5 compact bullets: native species planting palette; bird and bat box installation; pollinator-friendly planting per All-Ireland Pollinator Plan; wildlife corridors; SuDS features delivering biodiversity benefit.

### Construction Environmental Management Plan (CEMP) Commitments
**MANDATORY closing sub-section.** Short paragraph (3-5 sentences) confirming the measures above are binding CEMP commitments, ECoW-supervised, audited at agreed milestones.

**Budget reminder:** every sub-section must be present and the CEMP Commitments paragraph must be reached. Use bullets, not paragraphs, in the Reduction/Remediation/Compensation/Enhancement sub-sections.`,
    maxTokens: 8000,
  },
  residual: {
    prompt: `Write the Residual Effects and Monitoring section. **BREVITY DIRECTIVE:** This section has FIVE sub-sections. The Monitoring Programme and Statement of Overall Ecological Significance MUST be reached. Aim for ~900-1200 words total. Use the markdown sub-headings IN THIS ORDER:

### Residual Effects Assessment
ONE short opening paragraph (2-3 sentences) explaining residual effects are those remaining after full Section 5 mitigation, using the same CIEEM (2018) significance scale.

TABLE (carry forward every KER from Section 4):

| Key Ecological Receptor | Pre-Mitigation Significance | Mitigation Measures Applied | Residual Significance | Significant Effect? (Yes / No) |

Mitigation column: short summary, e.g. "50 m setback; CEMP; ECoW supervision". Use Imperceptible / Slight / Moderate / Significant / Profound for both significance columns.

### Significant Residual Effects
For each KER where residual significance is Significant or Profound, write ONE short paragraph (3-5 sentences) covering: why the effect cannot be fully mitigated; whether compensation is proposed; whether SAC/SPA conservation objectives are compromised. If no significant residual effects remain, state this in ONE sentence and move on.

### Compensation Proposals
If residual losses feature in the table above, describe compensation as compact bullets:
- Habitat to be created (type, area, ratio)
- Indicative location
- Management and maintenance commitments
- Timing relative to construction
If no compensation is required, state this in ONE sentence and move on. Do not exceed 150 words in this sub-section.

### Monitoring Programme
**MANDATORY sub-section.** This is a CIEEM (2018) requirement. Present as a TABLE (no extensive prose):

| Monitoring Activity | Phase (Pre / During / Post) | Frequency | Responsible Party | Trigger for Action |

Aim for 6-10 rows covering: pre-works ECoW walkover; pre-works nesting bird inspection; pre-works bat roost inspection; weekly ECoW site inspections; water quality monitoring (turbidity, suspended solids, pH); CEMP compliance audits; habitat establishment monitoring at year 3 and year 5; targeted species follow-up (e.g. bat activity transects year 1 + year 3 post-completion).

After the table, ONE short paragraph (2-3 sentences) summarising the reporting cycle and adaptive management triggers.

### Statement of Overall Ecological Significance
**MANDATORY closing sub-section.** ONE short paragraph (3-5 sentences) summarising whether, after full mitigation and monitoring, the development results in any significant residual effects on European sites, Annex I habitats, or protected species, and confirming compliance with relevant legislation (Habitats Directive, Birds Directive, Wildlife Acts 1976–2021, WFD).

**Budget reminder:** the Monitoring TABLE and Statement of Overall Significance MUST be reached. If running long, abbreviate the Significant Residual Effects paragraphs and Compensation bullets.`,
    maxTokens: 6500,
  },
  conclusions: {
    prompt: `Write the Conclusions section. **BREVITY DIRECTIVE:** SIX sub-sections — keep each compact. The closing "Further Survey Requirements" sub-section MUST be reached and completed. Aim for ~700-900 words total. Use markdown sub-headings IN THIS ORDER:

### Summary of Key Ecological Receptors
ONE compact paragraph (4-6 sentences) recapping designated sites within ZoI, dominant habitats, and protected species likely present.

### Overall Assessment of Ecological Effects
2 short paragraphs (Pre-Mitigation + Post-Mitigation), 3-5 sentences each. Reference the Residual Effects Table.

### Compliance with Relevant Legislation
Compact bullets ONLY (one short paragraph per directive, max 2-3 sentences each):
- EU Habitats Directive 92/43/EEC (Article 6(3) AA Screening status)
- EU Birds Directive 2009/147/EC
- Water Framework Directive
- EIA Directive 2014/52/EU
- Wildlife Acts 1976–2021

### Statement of Ecological Significance
ONE short paragraph (3-4 sentences) — state whether the development results in significant effects on European sites or protected features after mitigation, and confirm whether further AA (NIS) is needed.

### Recommendations for Planning Authority
3-5 compact bullets covering: planning conditions, pre-commencement surveys, CEMP, monitoring. Each bullet 2-3 sentences max. **Do NOT write a multi-paragraph "Condition 1 / Condition 2 / Condition 3" sub-section here** — those belong in the Mitigation section if elsewhere needed.

### Further Survey Requirements
**MANDATORY closing sub-section.** 3-5 compact bullets specifying: target species/habitats, optimal survey windows, methodology references. Each bullet 1-2 sentences max. This sub-section closes the report and MUST be reached.

**Budget reminder:** Every sub-section must be present and the Further Surveys bullets must be completed. If running long, shorten the Compliance bullets and Recommendations.`,
    maxTokens: 4500,
  },
  appendices: {
    prompt: `Write the **Data Sources and References** section only (~300-450 words). This section is a PROSE/BULLET reference list ONLY.

**CRITICAL — DO NOT WRITE ANY OF THE FOLLOWING:**
- An "Appendix List" enumerating Appendix A, B, C, etc. (the structured appendices below — Habitat Map, Designated Sites, Species List, Aquatic Features, Site Photographs — are auto-generated from project data and appear right after this section).
- Any markdown TABLES (\`| col1 | col2 |\` rows). The auto-rendered appendices already tabulate every designated site, habitat polygon, species record, and waterbody.
- Any sub-headings like "APPENDIX — DESIGNATED SITES", "APPENDIX — CATCHMENTS", "APPENDIX — HABITAT MAPPING DETAIL", or similar appendix-style tabular sections.
- Per-record breakdowns of habitats, species observations, or designated sites.

**Only** write a short opening paragraph + grouped bullet/prose references under the three headings below.

Open with one short paragraph (1-2 sentences) explaining that the structured appendices that follow are auto-generated from desk study and field survey data, then list every data source consulted and reference cited, with full citations.

Use the DATA SOURCES AND REFERENCES section from the provided data. Group references under these headings:

**Online databases consulted:**
- National Parks and Wildlife Service (NPWS) — designated sites register, conservation objectives, species distribution records. URL: https://www.npws.ie. Note specific sites accessed (SAC/SPA codes).
- National Biodiversity Data Centre (NBDC) — Biodiversity Maps; Global Biodiversity Information Facility (GBIF). URLs: https://maps.biodiversityireland.ie, https://www.gbif.org.
- Environmental Protection Agency (EPA) — WFD waterbodies, catchments, and water quality. URLs: https://gis.epa.ie, https://wfdviewer.epa.ie. Note specific water bodies accessed.
- National Land Cover Map (NLC) 2018 — Tailte Éireann. URL: https://www.tailte.ie.

**Standard methodological references:**
- Fossitt, J. A. (2000). *A Guide to Habitats in Ireland*. The Heritage Council.
- CIEEM (2018). *Guidelines for Ecological Impact Assessment in the UK and Ireland*.
- EPA (2022). *Guidelines on the Information to be Contained in Environmental Impact Assessment Reports*.

**Legislation:**
- Wildlife Acts 1976–2021 (Ireland)
- EU Habitats Directive (92/43/EEC); EU Birds Directive (2009/147/EC); Water Framework Directive (2000/60/EC); EIA Directive (2014/52/EU)
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011)
- Planning and Development Acts 2000–2023

Add any further project-specific guidance documents (e.g. NPWS Conservation Objectives documents), contractor reports, or technical references actually consulted. Format as a structured reference list suitable for inclusion in an ecological report appendix.`,
    maxTokens: 3500,
  },
}

// ---------------------------------------------------------------------------
// AA Screening — Article 6(3) Habitats Directive
// ---------------------------------------------------------------------------
const AA_SCREENING_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Statement that this AA Screening Report is prepared in accordance with Article 6(3) of the EU Habitats Directive (92/43/EEC) and Part XAB of the Planning and Development Act 2000 (as amended)
2. Purpose: to determine whether the proposed development, individually or in combination, is likely to have a significant effect on any European site
3. Description of the proposed development and site location
4. Reference to the precautionary principle as established in case law
5. Guidance followed: DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland, European Commission (2021) Assessment of Plans and Projects in Relation to Natura 2000 Sites

**CASE LAW — CITE ONLY THESE (do NOT invent or paraphrase case names):**
- Waddenzee, CJEU C-127/02 (precautionary principle, "beyond reasonable scientific doubt")
- Kelly v. An Bord Pleanála [2014] IEHC 50 (Irish High Court — competent authority obligations)
- People Over Wind, Coillte Teoranta v. An Bord Pleanála, CJEU C-323/17 (no mitigation at screening)
- Sweetman v. An Bord Pleanála, CJEU C-258/11 (integrity of the site)

Do NOT cite "Stevie Hadden", "Lothian", or any other case names not listed above. If you are unsure of a citation, omit it rather than guess.`,
  },
  site_description: {
    prompt: `Write the Site & Project Description section (~400-500 words). Include:
1. Site location using grid reference, county, and townland
2. Nature and extent of the proposed development
3. Description of the receiving environment — land use, topography, hydrology
4. **Source-Pathway-Receptor (S-P-R) Model** — present as a markdown table with columns **Source | Pathway | Receptor | Notes**. Each row pairs a single source (e.g. "construction runoff") with the pathway it travels (e.g. "AHASCRAGH_020 → Suck → downstream lough") and the receptor it reaches. Do NOT write the S-P-R section as three separate bullet lists — the matrix format is mandatory. Follow the table with a short paragraph explaining the dominant pathway(s).
5. Hydrological connectivity to watercourses and drainage patterns
6. Distance to nearest European sites`,
    maxTokens: 4500,
  },
  natura_sites: {
    prompt: `Write the Natura 2000 Sites section (~600-800 words). Include:
1. Table of all European sites (SACs and SPAs) within the Zone of Influence
2. For each site provide: site code, distance from project, qualifying interests/special conservation interests
3. Conservation objectives for each site (reference NPWS site-specific conservation objectives where available)
4. Known threats and pressures from NPWS site synopses
5. Assessment of connectivity between the project site and each European site
6. Justification for excluding distant sites from further assessment (where applicable)

Present in tabular format followed by detailed site descriptions. Reference deep research data where available.`,
    maxTokens: 6500,
  },
  significant_effects: {
    prompt: `Write the Assessment of Likely Significant Effects section (~600-800 words). Include:
1. For each European site, assess potential for likely significant effects considering:
   - Habitat loss or degradation (direct and indirect)
   - Species disturbance
   - Water quality impacts (construction runoff, operational discharges)
   - Air quality effects (dust, emissions)
   - Changes to hydrological regime
   - Spread of invasive species
2. Apply the **precautionary principle** — significant effects must be excluded beyond reasonable scientific doubt
3. Consider the conservation objectives of each site
4. Reference the test established in Kelly v. An Bord Pleanála [2014] IEHC 50 and People Over Wind, Coillte Teoranta v. An Bord Pleanála, CJEU C-323/17
5. Present assessment in tabular format: **Site | Qualifying Interest | Potential Effect | Significant? | Rationale**

**CRITICAL — NO MITIGATION (Article 6(3) compliance):**
Following People Over Wind (CJEU C-323/17), measures intended to avoid or reduce effects MUST NOT be taken into account at the Screening stage. Do NOT:
- recommend or describe pollution-prevention measures, silt fences, buffer zones, timing restrictions, lighting strategies, or any other mitigation
- conclude "no significant effect with mitigation in place"
- defer to "subject to standard construction management measures"

Mitigation belongs in the Stage 2 NIS, never here. Assess the project in its **unmitigated form** only. If the data permit, state that significant effects "cannot be excluded beyond reasonable scientific doubt" and recommend progressing to Stage 2.

**CASE LAW — CITE ONLY:** Waddenzee C-127/02, Kelly v. ABP [2014] IEHC 50, People Over Wind C-323/17, Sweetman C-258/11. Do not invent case names.`,
    maxTokens: 8000,
  },
  in_combination: {
    prompt: `Write the In-Combination Assessment section (~400-500 words). Include:
1. Methodology for identifying other plans and projects for in-combination assessment
2. Relevant plans: County Development Plan, Local Area Plans, National Planning Framework
3. Relevant projects: planning applications in the area, infrastructure projects
4. Assessment of cumulative/in-combination effects on European sites
5. Conclusion on whether in-combination effects alter the screening determination`,
    maxTokens: 6000,
  },
  conclusion: {
    prompt: `Write the Screening Conclusion section (~250-350 words) followed by a **References** sub-section. Include:

**Conclusion body:**
1. Clear screening determination statement — one sentence at the top stating either "significant effects on European sites cannot be excluded" OR "significant effects can be excluded beyond reasonable scientific doubt"
2. Whether the proposed development, individually or in combination, is likely to have a significant effect on any European site
3. Whether Stage 2 Appropriate Assessment (Natura Impact Statement) is required
4. Reference the legal test: "likely significant effect" means that significant effects cannot be excluded on the basis of objective scientific information
5. Reference case law from the approved list only (see below)
6. Statement on the precautionary principle

**References sub-section (mandatory):**
Add a "## References" heading and list, in CIEEM-style format, every guidance document, regulation, and case cited in this report. At minimum include:
- Council Directive 92/43/EEC (Habitats Directive)
- Council Directive 2009/147/EC (Birds Directive)
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. No. 477/2011)
- Planning and Development Act 2000 (as amended)
- DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland — Guidance for Planning Authorities
- European Commission (2021) Assessment of Plans and Projects in Relation to Natura 2000 Sites — Methodological Guidance on Article 6(3) and (4)
- CIEEM (2018) Guidelines for Ecological Impact Assessment in the UK and Ireland
- NPWS site synopses and Conservation Objectives documents for each European site assessed
- Any case law cited in the report

**CASE LAW — CITE ONLY:** Waddenzee CJEU C-127/02, Kelly v. An Bord Pleanála [2014] IEHC 50, People Over Wind, Coillte Teoranta v. An Bord Pleanála CJEU C-323/17, Sweetman v. An Bord Pleanála CJEU C-258/11. Do NOT invent or paraphrase case names.`,
    maxTokens: 4000,
  },
}

// ---------------------------------------------------------------------------
// NIS (Natura Impact Statement) — shared by aa_stage2 and nia
// ---------------------------------------------------------------------------
const NIS_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~700-900 words) following the standard NIS opening used by Irish ecological consultancies (e.g. Greentrack, Enviroguide). Use the markdown sub-headings IN THIS ORDER:

### Background and Requirement for the Natura Impact Statement
- Short opening (2-3 sentences) confirming the NIS has been commissioned for the named project at the supplied site location, and that Stage 1 Appropriate Assessment Screening concluded that likely significant effects on European sites could not be excluded
- Quote (or paraphrase tightly) Article 6(3) of the Habitats Directive: "any plan or project not directly connected with or necessary to the management of the site but likely to have a significant effect thereon … shall be subject to appropriate assessment of its implications for the site in view of the site's conservation objectives"

### Stages of the Habitats Directive Assessment
Compact bulleted summary of the four stages (Screening → NIS → Alternatives → IROPI per Article 6(4)). 1-2 sentences per stage. State which stage this report is at.

### Statement of Authority and Competence
- ONE short paragraph stating the report has been prepared by a suitably qualified ecologist. If the project data names a lead author / surveyor, incorporate that name; otherwise refer to "the principal ecologist" generically.
- Note CIEEM membership, adherence to CIEEM Code of Professional Conduct, experience in AA / NIS work under Irish/EU legislation.
- KEEP SHORT (80-120 words) — do not fabricate detailed CVs.

### Legislative and Policy Framework
Compact bullets grouped under **EU**, **National**, and **Policy & Guidance** headings:
- EU: Habitats Directive (92/43/EEC); Birds Directive (2009/147/EC); Water Framework Directive (2000/60/EC); EIA Directive (2014/52/EU)
- National: Wildlife Acts 1976–2021; European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011, as amended); Planning and Development Act 2000 (as amended, Part XAB Sections 177U/V)
- Policy & Guidance: DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland; European Commission (2021) Methodological Guidance on Article 6(3) and (4); CIEEM (2018) Guidelines for Ecological Impact Assessment; NPWS Conservation Objectives documents

### Report Structure
Brief enumeration of the remaining sections (Methodology, Project & Site Description, Natura 2000 Sites, Assessment of Effects on Site Integrity, Mitigation Measures, Residual Effects & In-Combination, Conclusion) — one line each.

**CASE LAW — CITE ONLY THESE (do NOT invent case names):**
- Waddenzee, CJEU C-127/02 — site integrity test, "beyond reasonable scientific doubt"
- Sweetman v. An Bord Pleanála, CJEU C-258/11 — strict integrity interpretation
- Kelly v. An Bord Pleanála [2014] IEHC 50 — Irish competent-authority obligations
- People Over Wind, Coillte Teoranta v. An Bord Pleanála, CJEU C-323/17 — no mitigation at Screening (Stage 1); mitigation IS permitted at NIS (Stage 2)

If unsure of a citation, omit it rather than guess.`,
    maxTokens: 3500,
  },
  methodology: {
    prompt: `Write the Methodology section (~700-900 words). **BREVITY DIRECTIVE:** This section has FIVE sub-sections — keep them proportional. The Limitations sub-section is MANDATORY and MUST be reached. Use the markdown sub-headings IN THIS ORDER:

### Approach
ONE compact paragraph (3-5 sentences). State the NIS methodology follows DoEHLG (2010) and European Commission (2021) guidance, and that Stage 2 appropriate assessment uses a structured Source-Pathway-Receptor (S-P-R) framework to evaluate adverse effects on site integrity. Note that mitigation IS permitted at Stage 2 (unlike Stage 1 Screening under People Over Wind C-323/17), but only measures that are specific, enforceable, and demonstrably effective.

### Zone of Influence
Compact bullets covering:
- How the ZoI was determined for different receptor types (hydrological pathways, ecological corridors, species mobility, atmospheric deposition)
- Standard 15 km baseline distance derived from UK guidance (Treweek Environmental Consultants 2006), evaluated case-by-case
- Specific extension where the project is hydrologically connected upstream/downstream of a SAC or where SPA-qualifying species have wide foraging ranges

### Desk Study
Compact bullets listing data sources consulted (NPWS designated sites and Conservation Objectives, NPWS Article 17 data, GBIF, NBDC, EPA WFD database and Catchments.ie, Geological Survey Ireland, planning authority registers for cumulative assessment). 1 sentence per source — include record counts where supplied.

### Field Surveys
Compact bullets per survey type: date, surveyor, method (Fossitt Phase 1/2, IECS otter, BCI bat, BTO bird, etc.), conditions. If only desk study has been completed, state this and reference the Phase 2 survey programme recommended in the Conclusion.

### Limitations and Data Gaps
**MANDATORY closing sub-section.** 4-7 compact bullets, 1-2 sentences each, covering: seasonal/temporal constraints; species record absences; WFD ecological/chemical status gaps; NPWS Conservation Objectives detail availability; access limitations; hydrological modelling/dye-tracing gaps. This sub-section MUST be reached; if running long, shorten earlier sub-sections.`,
    maxTokens: 5500,
  },
  site_description: {
    prompt: `Write the Project & Site Description section (~800-1100 words). **BREVITY DIRECTIVE:** This section has FIVE sub-sections — keep them proportional. The Source-Pathway-Receptor table is MANDATORY. Use the markdown sub-headings IN THIS ORDER:

### General Location and Receiving Environment
1-2 short paragraphs (4-8 sentences). Grid reference, county, townland, surrounding land use, topography. Reference any obvious natural features (rivers, uplands, coastline) and the broader landscape context.

### Site Description
ONE short paragraph (4-6 sentences). On-site habitats, dominant land cover from NLC 2018 / Fossitt, any built features, designated-site proximity. Reference the dominant habitat polygons by area where the project data supplies them.

### Construction Stage
Compact bullet group OR short paragraphs covering anticipated construction activities (site clearance, earthworks, foundation works, drainage installation, plant movements, temporary compounds) and the construction-phase ecological pressures they create: sediment/silt runoff; concrete/cementitious leachate; fuel/oil spillage; dust deposition; noise & vibration; lighting; hydrological alteration.

### Operational Stage
Compact bullet group covering operational characteristics relevant to ecology: permanent land take, surface water drainage regime (SuDS), lighting strategy, ongoing maintenance, traffic/visitor levels, wastewater treatment if relevant. If decommissioning is foreseeable for the development type, add a one-sentence note; otherwise omit.

### Source–Pathway–Receptor (S-P-R) Linkages
**MANDATORY — this is the central NIS analytical tool.** Present as a markdown TABLE with these exact columns:

| Source | Pathway | Receptor (European site) | Pathway Active? (Yes / Possible / No) | Rationale |

Source = activity (e.g. "construction earthworks", "operational surface water discharge"). Pathway = vector (hydrological / hydrogeological / air / land / indirect). Receptor = the European site by name and code. Rationale: 1-2 sentences max per row.

Aim for at least one row per credible pathway from the project to each Natura 2000 site within the ZoI (sites with no credible pathway can be screened out in a single row with "No" + brief justification).

After the table, ONE short paragraph (2-3 sentences) identifying the dominant pathway(s) and which sites are carried forward to Section 4 (Natura 2000 Sites) and Section 5 (Assessment of Effects on Site Integrity).

**Budget reminder:** the S-P-R table MUST be reached. If running long, abbreviate the Construction/Operational bullets.`,
    maxTokens: 6500,
  },
  natura_sites: {
    prompt: `Write the Natura 2000 Sites section (~1500-2000 words). **BREVITY DIRECTIVE:** This is the central baseline section for Stage 2. For each European site carried forward from the S-P-R analysis (Section 3), present the same information block in the same order. Use the markdown sub-headings IN THIS ORDER:

### Overview
ONE short opening paragraph (3-5 sentences) listing every Natura 2000 site within the ZoI, with site code and distance. Note which sites are carried forward to detailed assessment (active S-P-R linkage) and which are screened out at this stage.

### [Site Name] (Site Code XXXXXX) — [Distance from project]
**Repeat this sub-section for EACH site with an active or possible S-P-R linkage to the project.** For each site cover:

- **Site description**: extent in hectares, broad habitat character, location relative to project
- **Qualifying interests / Special Conservation Interests**: present as a compact bulleted list with EU habitat code (e.g. [3110], [4030], [7130]) and species names where applicable. Include Annex II/IV species (otter Lutra lutra, lamprey, white-clawed crayfish, etc.) and Annex I bird species for SPAs.
- **Conservation Objectives**: reference NPWS site-specific Conservation Objectives where available; otherwise the generic CO statement ("maintain or restore the favourable conservation condition of the qualifying interests")
- **Current conservation status**: report Article 17 status (Favourable / Unfavourable–Inadequate / Unfavourable–Bad) per qualifying habitat where the project data supplies it
- **Existing threats and pressures**: 2-4 bullets from NPWS site synopses (e.g. drainage, agricultural intensification, climate change, water abstraction)
- **Connectivity pathway to project**: 2-3 sentences explicitly stating the S-P-R chain (hydrological, hydrogeological, air, land, indirect)

Keep each per-site block to 250-400 words. Use a TABLE only where it materially improves clarity (e.g. multi-QI summary).

### Sites Screened Out at Stage 2
Compact paragraph or short table listing sites within the wider ZoI (e.g. 15 km) for which no credible pathway exists, with a one-line justification per site. This is to demonstrate the assessment is exhaustive.

**Budget reminder:** every site with an active pathway must be detailed. If running long, abbreviate the screened-out sites paragraph.`,
    maxTokens: 8000,
  },
  impact_assessment: {
    prompt: `Write the Assessment of Effects on Site Integrity section (~2000-2500 words). **BREVITY DIRECTIVE:** This is the most important analytical section of the NIS — the per-site × per-QI integrity matrix MUST be reached and completed. Use the markdown sub-headings IN THIS ORDER:

### Approach to Integrity Assessment
ONE compact paragraph (3-5 sentences). State that integrity assessment follows the Waddenzee test (CJEU C-127/02) and Sweetman (CJEU C-258/11) — adverse effects must be excluded "beyond reasonable scientific doubt" in view of the site's conservation objectives. Identify the parameters considered: habitat area, structure & function, distribution, species range, population size, supporting processes (hydrology, water quality, undisturbed flight lines, etc.).

### Construction Phase Effects
For each European site carried forward from Section 4, evaluate construction-phase effects (typically 1-3 paragraphs per site). Cover:
- Direct habitat loss or modification within or contiguous with the site
- Indirect effects via hydrological / hydrogeological pathway (sediment, nutrient enrichment, contamination, dewatering)
- Disturbance to qualifying species (otter, bats, breeding birds) — noise, vibration, lighting, vegetation clearance
- Air quality / dust deposition on sensitive Annex I habitats
- Invasive species translocation risk

### Operational Phase Effects
For each site, cover operational-phase effects (typically 1-2 paragraphs per site):
- Long-term land take / habitat alteration
- Operational surface water discharge quality and quantity
- Ongoing lighting & noise disturbance
- Recreational pressure where the development increases visitor access to designated habitat

### Cumulative and In-Combination Effects
SHORT sub-section (150-250 words). State the methodology (search radius, time window — typically 5 years, 500 m to 15 km depending on receptor) and any specific plans/projects identified. If none are known from the project data, state that the in-combination search is to be completed at planning submission with the Local Authority planning register.

### Integrity Matrix
**MANDATORY closing sub-section.** Present as a markdown TABLE with these exact columns:

| Natura 2000 Site | Qualifying Interest | Conservation Objective | Phase (Construction / Operational) | Potential Effect | Adverse Effect on Site Integrity? (Yes / No / Cannot be Excluded) | Rationale |

Populate ONE row per site × per QI × per phase combination where a credible pathway exists from Section 3. Rationale column: 1-2 sentences max per row.

After the matrix, ONE short paragraph (3-5 sentences) stating which sites and QIs require mitigation (Section 6) and where, on current information, adverse effects on integrity cannot be excluded.

**CASE LAW — CITE ONLY:** Waddenzee CJEU C-127/02, Sweetman CJEU C-258/11. Do not invent case names.

**Budget reminder:** the Integrity Matrix MUST be reached. If running long, abbreviate the per-site construction/operational paragraphs.`,
    maxTokens: 8000,
  },
  mitigation: {
    prompt: `Write the Mitigation Measures section (~1300-1700 words). **BREVITY DIRECTIVE:** Stage 2 (NIS) PERMITS mitigation (unlike Stage 1 Screening per People Over Wind C-323/17), but every measure must be specific, enforceable, and demonstrably effective. The CEMP Commitments and Monitoring Programme sub-sections are MANDATORY. Use the markdown sub-headings IN THIS ORDER:

### Mitigation Approach
ONE short paragraph (2-3 sentences) stating measures follow the CIEEM (2018) hierarchy (Avoidance → Reduction → Remediation → Compensation), are tied to specific qualifying interests at named European sites, and will be implemented via the Construction Environmental Management Plan (CEMP) under the supervision of a Site Ecological Clerk of Works (SECoW).

### Avoidance by Design (Embedded Mitigation)
Present as a TABLE only:

| Embedded Design Feature | Qualifying Interest / Site Protected | Adverse Effect Avoided | Notes |

Aim for 4-6 rows covering setbacks from designated site boundaries, watercourse buffers (typical 10 m minimum), hedgerow/treeline retention, SuDS strategy, lighting strategy (dark-sky, warm-spectrum, downward-directed, motion-activated where practicable).

### Construction-Phase Mitigation (CEMP Measures)
Compact bullet groups under bold sub-labels. 2-4 bullets per group, each bullet 1-2 sentences:
- **Water quality and pollution prevention** (silt fencing 10 m upgradient of FW habitats, settlement ponds, bunded fuel storage at least 50 m from any watercourse with 150% containment, concrete washout > 100 m from any watercourse)
- **Timing restrictions** (no vegetation clearance 1 March–31 August nesting birds; in-channel works avoid fish spawning March–June; bat-roost-affecting works restricted to April or October–November windows)
- **Noise, vibration, and lighting** (500 m buffer from bat roosts / otter holts / SPA-qualifying breeding territories during sensitive periods)
- **SECoW supervision** (pre-works inspection, toolbox talks, sensitive-works supervision)
- **Invasive species controls** (biosecurity protocols per Irish Invasive Species Action Plan)

### Operational-Phase Mitigation
3-5 compact bullets covering: long-term lighting strategy; operational surface water management; recreational pressure controls; ongoing invasive species surveillance; maintenance regime aligned with seasonal restrictions.

### Monitoring Programme
**MANDATORY sub-section.** Present as a TABLE:

| Monitoring Activity | Phase (Pre / During / Post) | Frequency | Responsible Party | Trigger for Action |

Aim for 6-10 rows covering: SECoW pre-works walkover; pre-works nesting bird inspection; pre-works bat roost inspection; weekly SECoW site inspections; water quality monitoring (turbidity, suspended solids, pH) upstream + downstream of works; CEMP compliance audits; habitat condition monitoring of adjacent SAC qualifying habitats at year 1, 3, 5 post-completion.

### Construction Environmental Management Plan (CEMP) Commitments
**MANDATORY closing sub-section.** ONE short paragraph (3-5 sentences) confirming the measures above are binding CEMP commitments, supervised by the SECoW, audited at agreed milestones, and that the CEMP will be submitted to the competent authority for approval prior to commencement.

**Budget reminder:** the Monitoring TABLE and CEMP Commitments must both be reached. If running long, abbreviate the Construction-Phase bullets.`,
    maxTokens: 7000,
  },
  residual: {
    prompt: `Write the Residual Effects and In-Combination section (~900-1200 words). **BREVITY DIRECTIVE:** FIVE sub-sections — the Site Integrity Statement at the end is MANDATORY. Use the markdown sub-headings IN THIS ORDER:

### Residual Effects Assessment
ONE short opening paragraph (2-3 sentences) stating residual effects are those remaining after full implementation of Section 6 mitigation, evaluated against the Waddenzee site integrity test.

Present a summary TABLE with these exact columns:

| Natura 2000 Site | Qualifying Interest | Pre-Mitigation Effect | Mitigation Applied | Residual Effect on Site Integrity (None / Slight / Moderate / Adverse) |

Carry forward every site × QI combination from the Section 5 Integrity Matrix where a credible pathway existed. Mitigation column: short summary (e.g. "10 m riparian buffer; CEMP; SECoW; timing restriction Mar–Aug").

### Adverse Residual Effects
For each row where the residual is "Adverse" or where adverse effects cannot be excluded beyond reasonable scientific doubt, write ONE short paragraph (3-5 sentences) covering: why mitigation cannot eliminate the effect; whether the Article 6(4) IROPI / compensatory measures route is engaged; whether further alternative solutions should be assessed.

If no residual adverse effects remain, state this in ONE sentence and move on.

### In-Combination Assessment
2-4 short paragraphs OR a compact TABLE (Plan/Project | Type | Pathway to QI | Cumulative Effect | Significance). Cover:
- Methodology (search radius, time window, planning register interrogation)
- Relevant County Development Plan and Local Area Plans
- Permitted planning applications and infrastructure projects identified
- Climate-change-driven pressures already documented for the receiving SAC/SPA(s)
- Whether in-combination effects materially alter the residual significance

If specific plans/projects are not in the project data, state generically and reference the search to be performed at planning submission.

### Residual Uncertainty
ONE short paragraph (3-5 sentences) identifying any remaining uncertainty (e.g. unconfirmed Annex I status pending Phase 2 survey, WFD status pending EPA retrieval, hydrological connectivity pending dye-tracing) and noting how the precautionary principle applies.

### Site Integrity Statement
**MANDATORY closing sub-section.** ONE short paragraph (4-6 sentences) — applying the Waddenzee (CJEU C-127/02) and Sweetman (CJEU C-258/11) tests, state for each European site whether adverse effects on site integrity can or cannot be excluded "beyond reasonable scientific doubt", and whether the project complies with Article 6(3) of the Habitats Directive. Where adverse effects cannot be excluded, reference Article 6(4) and the IROPI route.

**Budget reminder:** the Residual Table and Site Integrity Statement MUST both be reached. If running long, abbreviate the In-Combination and Residual Uncertainty paragraphs.`,
    maxTokens: 5500,
  },
  conclusion: {
    prompt: `Write the Conclusion section (~600-900 words) followed by a mandatory **References** sub-section. **BREVITY DIRECTIVE:** Five sub-sections; the References list at the end is MANDATORY. Use the markdown sub-headings IN THIS ORDER:

### Summary of Findings
ONE compact paragraph (4-6 sentences) recapping the European sites assessed, the qualifying interests carried forward, and the principal impact pathways identified.

### Determination on Site Integrity
ONE short paragraph (3-5 sentences) — definitive statement, applying the Waddenzee (CJEU C-127/02) and Sweetman (CJEU C-258/11) tests, whether the proposed development alone or in combination will adversely affect the integrity of any European site in view of its conservation objectives, "beyond reasonable scientific doubt".

### Compliance with Relevant Legislation
Compact bullets (one short paragraph per directive / regulation, 2-3 sentences each):
- EU Habitats Directive 92/43/EEC (Article 6(3) and 6(4) where relevant)
- EU Birds Directive 2009/147/EC
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011, as amended) — Regulation 42
- Water Framework Directive (2000/60/EC)
- Wildlife Acts 1976–2021

### Recommendations for the Competent Authority
3-5 compact bullets covering: planning conditions binding the CEMP and SECoW; pre-commencement Phase 2 surveys where data gaps remain; WFD status retrieval; conditions binding any compensation/IROPI route if engaged.

### Further Survey Requirements
3-5 compact bullets specifying target species/habitats, optimal survey windows, methodology references (BCT bat surveys; IECS otter; BTO breeding bird; NPWS species-specific protocols). Each bullet 1-2 sentences.

### References
**MANDATORY closing sub-section.** Use a markdown heading \`## References\`. List in CIEEM-style citation format every guidance document, regulation, and case cited in this report. At minimum include:
- Council Directive 92/43/EEC (Habitats Directive)
- Council Directive 2009/147/EC (Birds Directive)
- Directive 2000/60/EC (Water Framework Directive)
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. No. 477/2011, as amended)
- Planning and Development Act 2000 (as amended)
- DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland — Guidance for Planning Authorities
- European Commission (2021) Assessment of Plans and Projects in Relation to Natura 2000 Sites — Methodological Guidance on Article 6(3) and (4) of the Habitats Directive 92/43/EEC
- CIEEM (2018) Guidelines for Ecological Impact Assessment in the UK and Ireland
- Fossitt, J.A. (2000) A Guide to Habitats in Ireland
- NPWS Conservation Objectives and Site Synopsis documents for each European site assessed
- Any case law cited in this report

**CASE LAW — CITE ONLY:** Waddenzee CJEU C-127/02, Sweetman CJEU C-258/11, Kelly v. An Bord Pleanála [2014] IEHC 50, People Over Wind, Coillte Teoranta v. An Bord Pleanála CJEU C-323/17. Do NOT invent or paraphrase case names.

**Budget reminder:** the References list MUST be reached. If running long, abbreviate the Recommendations and Further Surveys bullets.`,
    maxTokens: 4500,
  },
}

// ---------------------------------------------------------------------------
// Bat Survey Report — BCIreland guidelines, Collins (2016)
// ---------------------------------------------------------------------------
const BAT_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~700-900 words) following the DixonBrosnan / BCIreland-style structure. Use the markdown sub-headings IN THIS ORDER:

### 1.1 Background
- 1-2 short paragraphs: commissioning party, proposed development context, and the aim of the bat survey (identify roosts within structures, characterise foraging/commuting habitat, support planning/licensing decisions).

### 1.2 Site Context
- Brief site location with grid reference, county, townland (if known), area in hectares (use the **Site boundary area** from PROJECT INFORMATION — NOT habitat polygon totals).
- 2-3 sentences on the receiving environment (urban / agricultural / woodland mosaic).
- If planning/consent context is provided (e.g. "pre-construction bat survey requested by Council"), reference it briefly.

### 1.3 Survey Authors
- ONE short paragraph stating the report has been prepared by a suitably qualified and licensed bat ecologist working under NPWS derogation licence framework.
- If the project data names a surveyor, incorporate that name; otherwise refer to "the principal bat ecologist" generically.
- KEEP SHORT (60-100 words) — do not fabricate detailed CVs or invent qualifications.

### 1.4 Irish Bat Species Context
Open with 1 sentence: "Nine bat species are currently known to be resident in Ireland." Then present the species under their two families (matching the standard Irish bat reference format used in BCIreland and DixonBrosnan reports):

- **Rhinolophidae (Horseshoe bats):** Lesser horseshoe bat (*Rhinolophus hipposideros*)
- **Vespertilionidae (Common bats):**
  - Three pipistrelle species: Common (*Pipistrellus pipistrellus*), Soprano (*Pipistrellus pygmaeus*), Nathusius' (*Pipistrellus nathusii*)
  - Three (or four) Myotis species: Natterer's (*Myotis nattereri*), Daubenton's (*Myotis daubentonii*), Whiskered (*Myotis mystacinus*) [some authorities also list Brandt's *Myotis brandtii* but its Irish status is contested]
  - Brown long-eared bat (*Plecotus auritus*)
  - Leisler's bat (*Nyctalus leisleri*)

Add 1-2 sentences on conservation status: Whiskered and Natterer's bats listed as "Threatened in Ireland" (Whilde 1993 Irish Red Data Book 2); Lesser Horseshoe Bat is the only Irish bat on Annex II Habitats Directive (Ireland is an EU stronghold, c.14,000 individuals); Ireland is an international stronghold for Leisler's bat.

**IRISH RESIDENT BAT SPECIES — STRICT LIST (cite ONLY these nine):**
1. Common pipistrelle (*Pipistrellus pipistrellus*)
2. Soprano pipistrelle (*Pipistrellus pygmaeus*)
3. Nathusius' pipistrelle (*Pipistrellus nathusii*)
4. Brown long-eared bat (*Plecotus auritus*)
5. Leisler's bat (*Nyctalus leisleri*)
6. Natterer's bat (*Myotis nattereri*)
7. Daubenton's bat (*Myotis daubentonii*)
8. Whiskered bat (*Myotis mystacinus*)
9. Lesser horseshoe bat (*Rhinolophus hipposideros*)

**DO NOT include the following species** — they are NOT resident in Ireland and citing them as Irish resident species is a factual error that will undermine the report:
- *Eptesicus serotinus* (common serotine) — resident in Britain, NOT Ireland
- *Miniopterus schreibersii* (Schreiber's bent-winged bat) — continental European, NOT Ireland
- *Myotis bechsteinii*, *Myotis dasycneme*, *Pipistrellus kuhlii*, or any other European bat species not in the strict list above

### 1.5 Purpose and Scope of This Assessment
3-5 compact bullets: establish baseline conditions; identify roost potential in buildings/trees/structures; characterise habitat suitability for foraging and commuting; inform AA Screening / EIA Screening; guide mitigation design.

State that the assessment follows **Collins (2023/2024) Bat Surveys for Professional Ecologists: Good Practice Guidelines, 4th Edition** (Bat Conservation Trust), Bat Conservation Ireland (BCIreland) Best Practice Guidelines, and **Marnell, Kelleher & Mullen (2022) Bat Mitigation Guidelines for Ireland v2** (NPWS Irish Wildlife Manuals No. 134). Do NOT cite Collins 2016 (3rd edition) — that is the superseded earlier version.`,
    maxTokens: 5000,
  },
  protection: {
    prompt: `Write the "Protection of Bats in Ireland" section (~500-700 words) as Section 2 of the report. This is a dedicated legislative framework section (separate from the Introduction). Use the markdown structure below:

Open with a short paragraph: "All bat species in Ireland are protected under domestic and European legislation. The combined effect of this legislative framework is to prohibit the deliberate killing, injury, capture, or disturbance of bats and the destruction or deterioration of their breeding sites or resting places, including the installation of lighting in the vicinity of roosts."

### Wildlife Acts 1976–2021
2-3 sentences: All bat species listed in Schedule 5 of the 1976 Act and subject to Section 23 — offence to intentionally kill, injure or take a bat; possess or control a live/dead specimen or anything derived from a bat; wilfully interfere with any structure or place used for breeding or resting; wilfully interfere with a bat while occupying a structure used for that purpose. Limited exemptions exist for certain construction works subject to NPWS licensing.

### EU Habitats Directive (92/43/EEC)
2-3 sentences: All Irish bat species listed in Annex IV requiring strict protection. The Lesser Horseshoe Bat (*Rhinolophus hipposideros*) is additionally listed in Annex II, which obliges Member States to designate Special Areas of Conservation (SACs) for the species. The Directive also obliges Member States to monitor incidental capture and killing of Annex IV species.

### European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011)
2 sentences: Transposes the Habitats Directive into Irish law; provides the framework for NPWS derogation licensing where works would otherwise breach strict protection. Any works interfering with bats or their roosts (including lighting near a roost) may only be carried out under a derogation licence issued by NPWS.

### Berne Convention
1-2 sentences: Convention on the Conservation of European Wildlife and Natural Habitats. Obliges states to protect and conserve animals and their habitats, especially those listed as endangered or vulnerable.

### Bonn Convention / EUROBATS
1-2 sentences: Convention on the Conservation of Migratory Species of Wild Animals led to the Agreement on the Conservation of Populations of European Bats (EUROBATS), which promotes research, public awareness, and identification/protection of important bat feeding areas.

### Legislative Summary Table
Present the framework above as a compact markdown table with two columns — **Legislation/Convention | Relevance to Irish Bats** — covering all five instruments listed (Wildlife Acts, Habitats Directive, S.I. 477/2011, Berne, Bonn/EUROBATS). One row per instrument, 1-2 sentence summary per row.

### Derogation Licensing
ONE short paragraph: Where a proposed development cannot avoid affecting a bat roost, an NPWS derogation licence under Regulation 54 of the Birds and Natural Habitats Regulations 2011 is required. Applications must demonstrate (a) no satisfactory alternative; (b) the action does not detrimentally affect maintaining favourable conservation status; (c) one of the prescribed reasons (public interest, public health/safety, scientific research, etc.).`,
    maxTokens: 4500,
  },
  methodology: {
    prompt: `Write the Methodology section (~900-1200 words) following the DixonBrosnan / BCIreland-style structure. Use the markdown sub-headings IN THIS ORDER:

### 3.1 Desk Study
Open with one short paragraph stating the desk study was undertaken to identify ecological features within the proposed development site and immediate surroundings, to identify key issues early, and to inform survey design. Then a compact bullet list of sources consulted (with URLs where standard):
- National Parks & Wildlife Service (NPWS) — www.npws.ie
- Environmental Protection Agency (EPA) — www.epa.ie
- National Biodiversity Data Centre (NBDC) — www.biodiversityireland.ie
- Relevant County Development Plan (use the actual county supplied)
- **Collins, J. (ed.) (2023) Bat Surveys for Professional Ecologists: Good Practice Guidelines, 4th Edition. Bat Conservation Trust, London.**
- **Marnell, F., Kelleher, C. & Mullen, E. (2022) Bat Mitigation Guidelines for Ireland v2. Irish Wildlife Manuals No. 134. NPWS.**
- Aughney, T., Kelleher, C. & Mullen, D. (2008) Bat Survey Guidelines: Traditional Farm Buildings Scheme. The Heritage Council.
- NRA (2005, 2006) Best Practice Guidelines for Conservation/Treatment of Bats in National Road Schemes.
- Kelleher, C. & Marnell, F. (2006) Bat Mitigation Guidelines for Ireland. Irish Wildlife Manuals No. 25. NPWS.
- Lundy, M.G., Aughney, T., Montgomery, W.I. & Roche, N. (2011) Landscape Conservation for Irish Bats. Bat Conservation Ireland.

### 3.2 NBDC Habitat Suitability Index
ONE paragraph explaining the NBDC online map viewer's interactive 'habitat suitability' index for bats (Lundy et al. 2011). Maximum Entropy Models (MEM) constructed for each Irish bat species using records from the National Bat Database (2000-2009). Variables: landcover (CORINE), topography, climate, soil pH, riparian habitat, human bias factors. Index scale 0 (least favourable) to 100 (most favourable). State that the index for the project location was queried and is presented in the Results section. If the project data does NOT include a habitat suitability score, write 1 sentence: "Per-species habitat suitability indices for the project hectad were not returned from the desk study and should be obtained from the NBDC interactive viewer prior to finalisation."

### 3.3 Identification of Known Roosts
ONE short paragraph: The NBDC database was consulted to identify any known bat roosts within the vicinity of the proposed development. State the search radius applied (typically 2-5 km). If the project data did not include a roost search return, state: "No NBDC roost search results were returned in the dataset provided; a targeted NBDC roost enquiry should be completed prior to finalisation."

### 3.4 Habitat Assessment
ONE short paragraph: An assessment of habitat suitability for bats was undertaken from the desktop study and a walkover prior to survey commencement. Follows the guidelines in **Collins (2023)** and **Marnell et al. (2022)**. Note the standard caveat: an absence of potential commuting routes or 'good quality' foraging areas around a site cannot be used to confirm the absence of bats; bats are highly mobile and use different habitats seasonally, so additional survey work is required.

Then present the **Collins (2023) habitat suitability matrix** as a markdown table with columns **Potential Suitability | Roosting Habitats | Commuting and Foraging Habitats**, with rows for **None / Negligible / Low / Moderate / High**. Use Collins (2023) Table 4.1 descriptions. This table is MANDATORY.

### 3.5 Assessment of Structures for Potential Bat Roosts
1-2 paragraphs: A detailed building inspection was carried out (state date if provided) looking for potential access points and Potential Roost Features (PRFs) — rub marks, staining, droppings — that bats could use, and any evidence indicating bat presence. Includes ground-based external inspection around each building plus internal inspection of enclosed loft spaces / roof voids where safe access was possible.

List the roosting site types covered: buildings, cellars, churches, stone masonry, bridges, tunnels, mines, caves; plus suitable features within trees. Reference the **Kelleher & Marnell (2006) Bat Species Roost Classification Scheme** — a per-species M/H/L/N matrix across Trees and Buildings × Maternity and Hibernation. Present this as a compact markdown table:

| Species | Trees: Maternity | Trees: Hibernation | Buildings: Maternity | Buildings: Hibernation |
|---|---|---|---|---|
| Common pipistrelle | M | M | H | H |
| Soprano pipistrelle | M | M | H | H |
| Leisler's bat | M | M | H | L |
| Brown long-eared bat | H | H | H | H |
| Daubenton's bat | M? | L? | M | L |
| Lesser horseshoe bat | L | L | H | M |

(Key: N = not recorded; L = low dependence; M = some usage; H = most frequently recorded.) This table is MANDATORY when discussing structure assessment methodology.

### 3.6 Dusk Emergence / Dawn Re-entry Surveys
Compact bullets — sunset/sunrise timing, surveyor positioning (1 per emergence point + cross-reference), heterodyne + full-spectrum detector setup, weather minimums (temperature >= 10°C, wind <= 5 m/s Beaufort 2-3, dry conditions), number of visits per roost (minimum 2-3 per Collins 2023). State the actual surveys completed for this project (dates + outcomes) using the data provided.

### 3.7 Transect Surveys
Compact bullets — route selection along Fossitt linear features (WL1 hedgerows, WL2 treelines, FW watercourses, WN woodland edge), detector setup, pace (1-2 km/h), recording protocol (species, time, GPS, behaviour, habitat). State data gap if no transect was undertaken.

### 3.8 Static Detector Deployment
Compact bullets — detector model (AnaBat / AudioMoth / Kaleidoscope), location selection (woodland edge, watercourse margin), deployment duration (8-week minimum recommended), data processing (BatExplorer / Kaleidoscope automated classification + manual verification). State data gap if no static deployment.

### 3.9 Limitations
**MANDATORY closing sub-section.** 4-7 compact bullets, 1-2 sentences each: seasonal/temporal coverage; surveyor count; weather constraints; equipment limitations; desk study record gaps; what was not surveyed and why. This sub-section MUST be reached.

**BUDGET REMINDER — DO NOT over-elaborate.** Each sub-section should be 60-150 words MAX. The two MANDATORY tables (Collins 2023 Table 4.1 in 3.4, Kelleher & Marnell 2006 matrix in 3.5) ARE the heavy content; supporting prose should be tight. If running long, shorten 3.6/3.7/3.8 to 3-4 bullets each and ensure 3.9 Limitations is completed in full.`,
    maxTokens: 10000,
  },
  results: {
    prompt: `Write the Results section (~1500-2000 words) following the DixonBrosnan / BCIreland-style structure. Use the markdown sub-headings IN THIS ORDER:

### 4.1 Bat Background Data
Open with a short paragraph stating the project site lies within Ordnance Survey (OS) National Grid 10 km square [hectad] — use the actual hectad from the project grid reference if derivable (e.g. "E 202 376" → hectad "N02" with letter/number prefix logic) or state "the relevant hectad" generically. Then 2-3 sentences reminding the reader that nine bat species are resident in Ireland (do not repeat the full species list — Section 1.4 already covered that; reference it briefly).

**Hectad Species Presence Matrix (MANDATORY table).** Present a markdown table titled "Presence of Irish bat species within grid square [hectad]" with columns **Common Name | Scientific Name | Present/Absent**. Include all NINE Irish resident bat species in the rows. For each row, mark **Present** or **Absent** based on the desk study data supplied — and if no NBDC hectad search was returned in the dataset, mark all rows as "Not surveyed" and add ONE sentence below the table: "NBDC hectad presence query was not returned in the dataset; this table should be populated from the NBDC interactive viewer prior to finalisation." Do NOT fabricate Present/Absent records.

**Lundy et al. (2011) Habitat Suitability Indices (MANDATORY table where data permits).** Present a markdown table titled "Model Predicted Habitat Suitability Indices for All Irish Bat Species" with columns **Bat Species | Common Name | Habitat Index (0-100)**. Include all NINE species + an "All Bats" composite row. Use values from the project data if supplied; otherwise mark cells as "Not returned" and add ONE sentence: "Per-species habitat suitability indices were not returned from the desk study; a targeted NBDC query is required prior to finalisation." Do NOT invent index values.

Close 4.1 with 1-2 sentences interpreting the results — e.g. "the indices indicate the area is of moderate value for Common Pipistrelle, Brown Long-eared and Soprano Pipistrelle, low-moderate for Daubenton's, Whiskered and Natterer's, and low for Lesser Horseshoe (consistent with its restricted Irish range)." Adapt based on actual data.

### 4.2 Known Roosts (NBDC)
ONE short paragraph stating whether the NBDC roost database returned any known roosts within the search radius. If yes, summarise (species, approximate location, distance from site). If no roosts returned, state explicitly: "The NBDC does not hold records of bat roosts within the searched vicinity of the proposed development." If the surveyor's own records add context (e.g. "the surveyor's own previous records include..."), include that — otherwise omit.

### 4.3 Habitat Assessment Findings
2-3 paragraphs describing the habitat mosaic recorded within the site and 1 km study area, grouped by Fossitt class. Use the **PROJECT DATA** habitat polygon listing. State which habitats represent high-value bat foraging/commuting habitat (hedgerows WL1, treelines WL2, semi-natural woodland WN, watercourses FW, wet grassland GS4) and which are lower value (improved grassland GA1, BL3 buildings). DO NOT invent NLC sub-categories within Fossitt codes.

### 4.4 Bat Building Survey
Open with 1-2 sentences describing how the building inspection was carried out (internal + external, daylight, looking for grease staining, droppings, urine marks, corpses, feeding signs, Nycteribiidae spp. pupae).

**Per-Building Survey Table (MANDATORY where building data exists).** Present a markdown table titled "Description of buildings within development site" with columns **Building Reference | Description | Roost Potential**. One row per building/structure surveyed. Where the project data does not include a building inventory, state: "No dedicated Preliminary Roost Assessment data has been provided. The presence of BL3 'Buildings and artificial surfaces' habitat across the site indicates structures with potential bat roost value; a full PRA by a licensed bat consultant is required prior to finalisation." Do NOT fabricate per-building descriptions.

Close with the overall classification — e.g. "Overall, the structures are considered of negligible to low potential for roosting bats" or "Two structures with Moderate roost potential were identified requiring emergence/re-entry surveys." Adapt to actual data.

### 4.5 Activity Survey Results
- Species detected with identification confidence (from survey records).
- Bat passes per hour — temporal and spatial activity patterns. Present per-species/per-survey bat pass counts in a markdown table where survey data permits.
- Key commuting routes and foraging areas identified.

If no activity survey data exists, state: "No transect or static detector activity data was returned in the project dataset. Bat passes per hour cannot be reported." Honest data gap.

### 4.6 Roost Survey Results
- Confirmed / probable / possible roosts.
- Species and roost type (maternity, transitional, hibernation, day).
- Emergence/re-entry counts and timing.

If no roost was confirmed, state explicitly and reference the caveat that "the absence of confirmed roosts does not constitute confirmation of absence; further survey effort is required per Collins (2023)."

Include sonogram analysis reference where applicable.`,
    maxTokens: 8000,
  },
  assessment: {
    prompt: `Write the Assessment section (~400-500 words). Include:
1. Importance of bat populations using the site (local, county, national significance)
2. Roost classification and importance (following **Collins (2023) Table 4.1** — NOT Collins 2016 which is the superseded 3rd edition)
3. Key foraging areas and commuting corridors — sensitivity to disturbance
4. Potential impacts of the proposed development: roost loss/disturbance, severance of commuting routes, lighting effects, habitat loss
5. Assessment of impact significance for each bat species/roost

Reference Marnell, Kelleher & Mullen (2022) Bat Mitigation Guidelines for Ireland v2 for species-specific sensitivity context.`,
    maxTokens: 5000,
  },
  mitigation: {
    prompt: `Write the Mitigation & Recommendations section (~500-700 words). Include:
1. **Impact Avoidance** — design changes, sensitive lighting strategy (following BCIreland/ILP guidance and the lighting recommendations in **Marnell et al. (2022)** and **Collins (2023)** Section 6), buffer zones from roosts and commuting routes
2. **Mitigation** — timing restrictions (avoid maternity season May-August per **Marnell et al. (2022)**), bat box installation (types and locations per BCT bat box guidance), habitat retention/enhancement, replacement roosting features (Schwegler / Kent / 1FF bat boxes; reference Marnell et al. 2022 for the Irish-context selection)
3. **Derogation Licensing** — if roost disturbance/destruction is unavoidable, NPWS derogation licence requirements under **Regulation 54 of the European Communities (Birds and Natural Habitats) Regulations 2011** (S.I. 477/2011); licence application must demonstrate (a) no satisfactory alternative, (b) action will not detrimentally affect favourable conservation status, (c) one of the prescribed grounds
4. **Monitoring Programme** — post-construction bat activity monitoring schedule (typically minimum 3 years post-completion; static detectors recommended for objective comparison with pre-construction baseline)
5. **Construction Method Statement** — where works occur near or include roost features, a Construction Method Statement / Ecological Clerk of Works role is required

Follow NPWS best practice guidance and the **Marnell, Kelleher & Mullen (2022) Bat Mitigation Guidelines for Ireland v2** (Irish Wildlife Manuals No. 134) — this is the current authoritative Irish reference and supersedes the 2006 Kelleher & Marnell guidelines for mitigation design. Use **Collins (2023) 4th Edition** for survey-derived mitigation triggers.`,
    maxTokens: 5500,
  },
  appendices: {
    prompt: `Write the **Data Sources and References** section only (~250-350 words). This section is a PROSE/BULLET reference list ONLY.

**CRITICAL — DO NOT WRITE ANY OF THE FOLLOWING:**
- An "Appendix List" enumerating Appendix A, B, C, etc. (the structured appendices are auto-generated from project data and appear right after this section).
- Any markdown TABLES (\`| col1 | col2 |\` rows).
- Any sub-headings like "APPENDIX — ..." or similar appendix-style tabular sections.
- Per-record breakdowns of habitats, species observations, or designated sites.

**Only** write a short opening paragraph + grouped bullet/prose references under the headings below.

Open with one short paragraph (1-2 sentences) explaining that the structured appendices that follow are auto-generated from desk study and field survey data, then list every data source consulted and reference cited, with full citations.

Use the DATA SOURCES AND REFERENCES section from the provided data. Group references under these headings:

**Online databases consulted:**
- NPWS, NBDC, GBIF, BCIreland — full URLs and specific records accessed.

**Standard methodological references (use CURRENT editions only — DO NOT cite Collins 2016 or other superseded references):**
- **Collins, J. (ed.) (2023). *Bat Surveys for Professional Ecologists: Good Practice Guidelines* (4th edn). Bat Conservation Trust, London.**
- **Marnell, F., Kelleher, C. & Mullen, E. (2022). *Bat Mitigation Guidelines for Ireland v2*. Irish Wildlife Manuals No. 134. National Parks and Wildlife Service, Department of Housing, Local Government and Heritage, Dublin.**
- Kelleher, C. & Marnell, F. (2006). *Bat Mitigation Guidelines for Ireland*. Irish Wildlife Manuals No. 25. NPWS. [Per-species roost classification table — superseded by Marnell et al. 2022 for mitigation but still cited for the Trees/Buildings × Maternity/Hibernation matrix.]
- Lundy, M.G., Aughney, T., Montgomery, W.I. & Roche, N. (2011). *Landscape Conservation for Irish Bats & Species-Specific Roosting Characteristics*. Bat Conservation Ireland. [Source of NBDC habitat suitability index 0-100 scale.]
- Aughney, T., Kelleher, C. & Mullen, D. (2008). *Bat Survey Guidelines: Traditional Farm Buildings Scheme*. The Heritage Council.
- McAney, K. (2006). *A Conservation Plan for Irish Vesper Bats*. Irish Wildlife Manuals No. 20. NPWS.
- BCIreland (Bat Conservation Ireland) Best Practice Guidelines and lighting guidance notes.
- Fossitt, J. A. (2000). *A Guide to Habitats in Ireland*. The Heritage Council, Kilkenny.
- CIEEM (2018). *Guidelines for Ecological Impact Assessment in the UK and Ireland: Terrestrial, Freshwater, Coastal and Marine* (2nd edn).

**Legislation:**
- Wildlife Acts 1976–2021 (Ireland) — Schedule 5, Section 23 prohibitions
- EU Habitats Directive (92/43/EEC) — Annex IV (all Irish bats) and Annex II (Lesser horseshoe bat)
- EU Birds Directive (2009/147/EC) — where relevant for in-combination
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011) — Regulation 54 derogation licensing
- Berne Convention on the Conservation of European Wildlife and Natural Habitats
- Bonn Convention on the Conservation of Migratory Species of Wild Animals (EUROBATS Agreement)

Add any further project-specific references actually consulted. Format as a structured reference list.`,
  },
}

// ---------------------------------------------------------------------------
// Bird Survey Report — BirdWatch Ireland / BTO methodology
// ---------------------------------------------------------------------------
const BIRD_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~700-900 words) following the standard CIEEM-style avifaunal survey opening. Use the markdown sub-headings IN THIS ORDER:

### Project Background and Survey Brief
- Short opening (2-3 sentences) confirming the bird survey has been commissioned for the named project at the supplied site location
- Purpose: characterise breeding and (where relevant) wintering bird assemblages, screen for Annex I and BoCCI Red/Amber-listed species, identify SPA-qualifying interactions, and inform impact assessment
- Brief site location: grid reference, county, townland/locality, surrounding habitat context

### Statement of Authority and Competence
- One short paragraph stating the report has been prepared by a suitably qualified ornithologist / ecologist
- If the project data names a lead surveyor, incorporate that name; otherwise refer to "the principal ornithologist" generically
- Note CIEEM membership / BTO accreditation where relevant, adherence to the CIEEM Code of Professional Conduct
- KEEP SHORT (60-100 words) — do not fabricate detailed CVs

### Legislative and Policy Framework
Compact bullets grouped under **EU**, **National**, and **Policy & Guidance** headings:
- EU: Birds Directive (2009/147/EC) — Annex I species protection, Special Protection Areas (SPAs); Article 12 reporting
- National: Wildlife Acts 1976–2021 (Section 22 — protection of breeding birds; Section 40 — restrictions on hedgerow cutting 1 March–31 August); European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011)
- Policy & Guidance: BirdWatch Ireland Birds of Conservation Concern in Ireland (BoCCI) Red/Amber lists; BTO standard methodologies; I-WeBS (Irish Wetland Bird Survey); NPWS Conservation Objectives for relevant SPAs

### Survey Rationale and Scope
2-4 short bullets covering: habitats present likely to support breeding birds; Annex I / BoCCI Red species reasonably expected from the landscape context (e.g. Hen Harrier, Merlin, Peregrine, Whooper Swan, Curlew, Lapwing — based on site context); proximity to SPAs and qualifying species; specific survey types undertaken (breeding bird / wintering bird / vantage point).

### Report Structure
Brief enumeration of the remaining sections (Methodology, Results, Discussion, Recommendations, Appendices) — one line each.

Be specific to the supplied project data; do not invent species records. Where the desk study returned no species records, state this explicitly as a data gap rather than fabricating observations.`,
    maxTokens: 3500,
  },
  methodology: {
    prompt: `Write the Methodology section (~700-1000 words). **BREVITY DIRECTIVE:** This section has SIX sub-sections — keep them proportional. The Limitations sub-section is MANDATORY and MUST be reached. Use the markdown sub-headings IN THIS ORDER:

### Desk Study
1-2 short paragraphs (or a compact bullet list). List data sources consulted: NBDC species occurrence records, NPWS records for the area and any nearby SPAs, BirdWatch Ireland records, I-WeBS count site data for adjacent wetlands, GBIF cross-reference, Article 12 reporting (national population estimates). State the search radius used (typically 2 km for breeding records, 5–10 km for SPA wintering populations). Include record counts where supplied; state data gaps explicitly.

### Habitat Assessment
ONE short paragraph (3-5 sentences) describing the habitat-based screening that informed survey design: which Fossitt habitat types are present (hedgerow WL1, treeline WL2, woodland WN/WD2/WD3, scrub WS1, grassland GA1/GS, wetland FW/FL, bog PB1/PB2) and which bird assemblages each habitat supports.

### Breeding Bird Surveys
Compact bullets (each 1-2 sentences): methodology following Bibby et al. (2000) Bird Census Techniques + Gilbert et al. (1998) Bird Monitoring Methods; number of visits (typically 3–4 across the April–July breeding season); start time relative to sunrise; weather restrictions; territory mapping vs. point count / transect approach used. State the survey dates with weather conditions per visit.

### Wintering Bird Surveys (where applicable)
Compact bullets: I-WeBS methodology where wetland habitat is present; count frequency (typically monthly Oct–Mar); tidal synchronisation for estuarine sites; target species (wildfowl, waders, gulls). If no wintering survey was undertaken because no suitable habitat exists, state this in 1 sentence and move on.

### Vantage Point Surveys (where applicable)
Compact bullets: VP locations chosen to maximise visibility of the development envelope; observation hours per VP; target species (raptors, swans, geese); flight activity recording per Scottish Natural Heritage (SNH 2014) guidance; collision risk model framework if relevant. If not undertaken, state in 1 sentence.

### Limitations
**MANDATORY closing sub-section.** 4-7 compact bullets, 1-2 sentences each: seasonal/temporal coverage; access constraints; weather-driven cancellations; equipment constraints; species records not returned from desk study (and what that implies); inability to confirm cryptic / nocturnal species without targeted survey (e.g. owls, Nightjar). This sub-section MUST be reached.

Reference CIEEM (2018) Guidelines for Ecological Impact Assessment, NRA (2009) ecological surveying techniques where relevant, and any site-specific scope agreed with the planning authority.`,
    maxTokens: 5500,
  },
  results: {
    prompt: `Write the Results section. **BREVITY DIRECTIVE:** This section has FIVE sub-sections plus a mandatory Evaluation Matrix. Aim for ~1500-2200 words total. The Evaluation of Bird Interest table MUST be reached. Use the markdown sub-headings IN THIS ORDER:

### Desk Study Results
ONE short opening paragraph (3-4 sentences) summarising the desk study scope and what was returned from NBDC, NPWS, BirdWatch Ireland, I-WeBS. If zero species records were returned, state this as a data gap.

**MANDATORY: NBDC Historical Species Table.** Present a markdown TABLE of all Annex I bird species and BoCCI Red/Amber-listed species recorded within the desk study search radius (typically 10 km grid square per Sample 1 DixonBrosnan / Sample 2 MKO conventions). Format:

| Species (Common Name) | Scientific Name | Annex I (Birds Directive) | BoCCI Status (Red / Amber) | Historical Records in Study Area |

Populate from NBDC desk study data. If no records were returned, populate the table with the standard expected suite based on landscape context (1-2 row note explaining this is inferred from habitat suitability), and flag explicitly as a data gap. Do NOT fabricate specific record counts — use "Yes" / "—" / "Inferred from habitat" cells. Aim for 15-30 rows where data permits, mirroring the Sample 1 NBDC R04 grid square table (28 species).

Close the sub-section with ONE short paragraph (2-3 sentences) noting which species in the table are of greatest concern for the proposed development (Annex I + Red List entries within suitable habitat).

### Habitat-Based Assessment
ONE short paragraph (4-6 sentences) describing habitat suitability for bird assemblages within the site. Cross-reference Fossitt habitat types (WL1, WL2, WN, WD2, WD3, WS1, GA1, GS, GS4, PB1, PB2, FL, FW) with the species groups each supports (e.g. hedgerows + treelines → passerine breeding birds and corvid commuting; wetlands → wildfowl + waders; uplands → Hen Harrier, Merlin, Curlew). Do NOT speculate beyond what habitats are confirmed by the desk data.

### Breeding Bird Survey Results
Compact bullets per species observed during fieldwork:
- **[Species common name]** (*[Scientific name]*) — breeding status (possible / probable / confirmed per BTO criteria), estimated territory count, habitat used, BoCCI status (Red / Amber / Green), Annex I status if applicable.

If breeding bird survey results are sparse or absent, present as compact bullets with 1-2 sentence summary per finding. Present per-species territory counts in a markdown TABLE where survey data permits the format:

| Species | Scientific Name | BoCCI Status | Annex I? | Breeding Evidence | Territories |

**Per-species deep treatment (conditional):** If the survey programme is wind-farm-scale or raptor-focused, AND if 5 or more BoCCI Red-listed OR Annex I species are present (in NBDC desk records OR field observations), produce a per-species sub-heading (\`#### [Species Name] ([Scientific Name])\`) under this sub-section for each priority species, with 3-5 sentences covering: distribution within/around the site, observed activity, breeding evidence, BoCCI/Annex I context, conservation significance. Otherwise, the table above is sufficient — do NOT add per-species sub-headings for routine farmland / hedgerow assemblages.

### Wintering Bird Survey Results (where applicable)
If wintering surveys were undertaken, ONE short paragraph plus a TABLE of peak counts per species per visit. Include species, peak count, count visit dates, comparison to 1% national / international population thresholds where relevant. If not undertaken, state in 1 sentence and move on.

### Vantage Point Results (where applicable)
If VP surveys were undertaken, ONE short paragraph summarising flight activity by target species (raptors, swans, geese), flight heights (low / rotor swept / high if wind context), flight directions, and any collision-risk-relevant observations. If not undertaken, state in 1 sentence.

### Evaluation of Bird Interest — Key Avifaunal Receptors
**MANDATORY — this sub-section closes Section 3 and MUST be reached.** Apply the CIEEM (2018) six-level geographic frame of reference (International / National / Regional / County / Local / Negligible) to every key avifaunal receptor identified. Present as a TABLE:

| Avifaunal Receptor | Geographic Frame of Reference | Legal / Conservation Status (Annex I / BoCCI / Wildlife Acts) | Important Ecological Feature? (Yes / No) | Rationale |

Populate one row per Annex I species likely present, per BoCCI Red/Amber species recorded, per habitat-of-importance for breeding birds (hedgerows under Wildlife Acts), and per SPA-qualifying species with potential site interaction. Rationale column: 1 short sentence per row.

After the table, conclude with ONE short paragraph (2-3 sentences) listing which receptors will be carried forward to Section 4 (Discussion) and Section 5 (Recommendations).

**Budget reminder:** both the NBDC Historical Species Table AND the Evaluation Matrix MUST be reached. If running long, abbreviate the per-species bullets and use the wintering/VP summaries.`,
    maxTokens: 8000,
  },
  discussion: {
    prompt: `Write the Discussion section (~900-1200 words). **BREVITY DIRECTIVE:** FIVE sub-sections — the Impact Assessment matrix is MANDATORY. Use the markdown sub-headings IN THIS ORDER:

### Bird Community Evaluation
ONE short paragraph (4-6 sentences) summarising the avifaunal interest at the site — diversity, dominant species groups, presence/absence of Annex I and BoCCI Red/Amber species. Place the site in its regional context (e.g. typical assemblage for upland / lowland / wetland / agricultural landscape).

### Habitat Use and Seasonal Variation
ONE short paragraph (3-5 sentences) explaining how birds use the site through breeding and (where surveyed) wintering seasons. Cross-reference Fossitt habitats and key features (linear vegetation for commuting, wetland for roosting/feeding, etc.).

### Connectivity with Designated Sites
Compact bullets covering each SPA within the wider area (typically up to 15 km for SPAs designated for wide-ranging species such as Whooper Swan, Greenland White-fronted Goose, Hen Harrier). For each: site name, code, distance, qualifying interests, any observed or likely site connection (e.g. commuting flight lines, foraging support function). If no SPAs within ZoI, state in 1 sentence.

### Impact Assessment — Predicted Effects
**MANDATORY sub-section.** Present as a markdown TABLE summarising predicted effects on each Key Avifaunal Receptor:

| Avifaunal Receptor | Phase (Construction / Operational) | Impact Pathway | Magnitude | Duration | Pre-Mitigation Significance |

Impact pathways to cover: direct habitat loss (breeding, foraging, roosting); disturbance from noise / human presence / lighting (sensitive periods 1 March–31 August for breeding birds; Oct–Mar for wintering wildfowl); collision risk (relevant for wind / tall structures); barrier effects on commuting flight lines; displacement. Significance scale: Imperceptible / Slight / Moderate / Significant / Profound (CIEEM 2018).

### Per-Species Discussion (conditional)
**Conditional sub-section** — include this ONLY if the Results section produced per-species sub-headings (i.e. 5 or more BoCCI Red-listed OR Annex I priority species identified, typical for wind-farm or raptor-focused projects). For each priority species, produce a 3-5 sentence paragraph under \`#### [Species Name] (Scientific Name)\` covering: observed/likely activity at the site, conservation context (BoCCI status, Annex I, SPA-qualifying), habitat preference within the site, and species-specific impact concerns (collision risk for raptors, disturbance for waders, displacement for ground-nesters). This mirrors Sample 2 MKO style (Discussion sections 4.1–4.12).

If the project is a routine farmland / hedgerow assessment with fewer than 5 priority species, OMIT this sub-section — the Impact Assessment Matrix above suffices and the next sub-section follows directly.

### Context within BoCCI Population Trends
ONE short paragraph (3-5 sentences) interpreting findings against published BoCCI population trends (e.g. ongoing declines in Curlew, Lapwing, Yellowhammer; recovery in some raptors). Note whether the site supports species in national / regional decline.

**Budget reminder:** the Impact Assessment Matrix MUST be reached. If running long, abbreviate the connectivity bullets and skip the conditional Per-Species Discussion.`,
    maxTokens: 6500,
  },
  recommendations: {
    prompt: `Write the Recommendations section. **BREVITY DIRECTIVE:** FIVE sub-sections — the Recommendations Table, Further Surveys, and Monitoring Programme MUST be reached. Aim for ~900-1200 words total. Use markdown sub-headings IN THIS ORDER:

### Recommendations Approach
ONE short paragraph (2-3 sentences). State that recommendations follow the CIEEM (2018) mitigation hierarchy (Avoidance → Reduction → Compensation), are tied to specific Key Avifaunal Receptors from Section 3, and are designed to comply with the Wildlife Acts 1976–2021 (in particular Section 22 on disturbance to breeding birds and Section 40 on hedgerow cutting).

### Avoidance and Mitigation Measures
Present as a TABLE summarising recommended measures matched to each Key Avifaunal Receptor:

| Avifaunal Receptor | Recommendation | Timing / Seasonal Restriction | Action Type (Avoidance / Mitigation / Further Survey) | Responsibility |

Action Type options: **Avoidance** (design changes, setback distances), **Mitigation** (CEMP measures, timing restrictions, lighting strategy, buffer zones, nest box installation), **Further Survey** (additional fieldwork prior to consent). Timing column: specific dates (e.g. "vegetation clearance October–February; outside 1 March–31 August", "wintering wildfowl surveys October–March"). Responsibility: "Project ecologist" / "ECoW" / "Design team" / "Contractor".

### Monitoring Programme
**MANDATORY sub-section.** Present as a TABLE with these columns:

| Monitoring Activity | Phase (Pre / During / Post) | Frequency | Responsible Party | Trigger for Action |

Aim for 5-8 rows covering: pre-construction breeding bird survey (within the construction year); pre-construction wintering bird survey (if relevant); pre-works nesting bird inspection (ECoW, 48 hours before clearance); construction-phase ECoW supervision (weekly during sensitive works); post-construction breeding bird monitoring (year 1, 3, 5); post-construction wintering bird monitoring (where applicable); collision-risk monitoring (where relevant).

### Further Survey Requirements
**MANDATORY sub-section.** Compact bullets specifying outstanding surveys to address data gaps:
- Each bullet: target species/group / optimal survey window / standard methodology (Bibby, BTO BBS, I-WeBS, SNH VP) / whether the result determines further EcIA escalation
- Typical surveys: breeding bird survey (April–July) if not yet undertaken; wintering bird survey (Oct–March) if wetland habitat present; nocturnal owl survey (March–July, dusk–dawn); vantage point flight activity survey for raptors (April–August); targeted Hen Harrier / Merlin survey where moorland present (March–August).

### SPA Connectivity and AA Trigger Statement
ONE short paragraph (3-5 sentences) — explicit statement whether the project requires Appropriate Assessment Screening under Article 6(3) of the Habitats Directive on the basis of potential effects on SPA-qualifying bird species (commuting / foraging / roosting). If yes, identify driving SPA(s).

**Budget reminder:** every sub-section must be present and the Recommendations Table + Monitoring Programme TABLE must both be reached.`,
    maxTokens: 5500,
  },
  appendices: {
    prompt: `Write the **Data Sources and References** section only (~250-350 words). This section is a PROSE/BULLET reference list ONLY.

**CRITICAL — DO NOT WRITE ANY OF THE FOLLOWING:**
- An "Appendix List" enumerating Appendix A, B, C, etc. (the structured appendices are auto-generated from project data and appear right after this section).
- Any markdown TABLES (\`| col1 | col2 |\` rows).
- Any sub-headings like "APPENDIX — ..." or similar appendix-style tabular sections.
- Per-record breakdowns of habitats, species observations, or designated sites.

**Only** write a short opening paragraph + grouped bullet/prose references under the headings below.

Open with one short paragraph (1-2 sentences) explaining that the structured appendices that follow are auto-generated from desk study and field survey data, then list every data source consulted and reference cited, with full citations.

Use the DATA SOURCES AND REFERENCES section from the provided data. Group references under these headings:

**Online databases consulted:**
- NPWS, NBDC, GBIF, BirdWatch Ireland, eBird — full URLs and specific records accessed.

**Standard methodological references:**
- Bibby, C. J., Burgess, N. D., Hill, D. A., & Mustoe, S. (2000). *Bird Census Techniques* (2nd edn).
- Gilbert, G., Gibbons, D. W., & Evans, J. (1998). *Bird Monitoring Methods: A Manual of Techniques for Key UK Species*. RSPB.
- BTO methodology guidance (Common Birds Census, Breeding Bird Survey, Wetland Bird Survey).
- Gilbert et al. (2021). *Birds of Conservation Concern in Ireland (BoCCI)*.

**Legislation:**
- Wildlife Acts 1976–2021 (Ireland)
- EU Birds Directive (2009/147/EC) — Annex I species protection, SPAs
- European Communities (Birds and Natural Habitats) Regulations 2011 (S.I. 477/2011)

Add any further project-specific references actually consulted. Format as a structured reference list.`,
  },
}

// ---------------------------------------------------------------------------
// Habitat Survey Report — Fossitt (2000)
// ---------------------------------------------------------------------------
const HABITAT_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Purpose of the habitat survey at the project site
2. Fossitt (2000) A Guide to Habitats in Ireland as the classification system
3. Context within Irish planning and environmental legislation
4. Reference to EU Habitats Directive Annex I habitats
5. Scope of the assessment — survey area, objectives`,
  },
  methodology: {
    prompt: `Write the Methodology section (~400-500 words). Include:
1. **Desk Study** — NPWS habitat data, National Land Cover 2018 (NLC), Preliminary Habitat Inventory, historical mapping (OSI 6-inch, 25-inch)
2. **Field Survey** — Fossitt (2000) classification methodology, survey dates, mapping technique (GPS-based), ground-truthing of aerial photography
3. **Vegetation Recording** — relevé plots (if applicable), DOMIN/DAFOR scale, quadrat methodology
4. **Condition Assessment** — structure, function, typical species assessment criteria
5. **Annex I Assessment** — criteria for determining Annex I habitat correspondence
6. Survey limitations and seasonal constraints`,
  },
  habitats: {
    prompt: `Write the Habitat Descriptions section (~800-1000 words). For each habitat recorded:
1. Fossitt code and full name
2. Area (hectares) and proportion of survey area
3. Dominant and characteristic species with DAFOR/DOMIN abundance
4. Habitat condition assessment (structure, function, typical species)
5. Correspondence with EU Habitats Directive Annex I habitats (if applicable)
6. Connectivity to adjacent habitats and ecological corridors
7. Threats and pressures observed
8. Any notable or indicator species within the habitat

Present habitat areas in a summary table. Include relevé data where available.`,
    maxTokens: 3000,
  },
  evaluation: {
    prompt: `Write the Evaluation section (~500-600 words). Include:
1. Ecological value assessment using criteria: naturalness, rarity (national and county context), size/extent, diversity, connectivity, fragility, typicalness
2. Geographic importance for each habitat (Local, County, National, International)
3. Key Ecological Receptors (KERs) identification
4. Annex I habitat assessment — does any habitat qualify for Annex I designation?
5. Habitat sensitivity and vulnerability to change
6. Context within the landscape — habitat connectivity and ecological networks`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~400-500 words). Include:
1. **Impact Avoidance** — design to retain high-value habitats, setback distances
2. **Mitigation** — transplantation, seed harvesting (if habitat loss unavoidable), protective fencing during construction
3. **Habitat Management Plan** — management prescriptions for retained habitats (grazing regime, scrub management, etc.)
4. **Habitat Creation/Enhancement** — native planting schemes, wetland creation, wildflower meadow establishment
5. **Monitoring** — post-development habitat condition monitoring programme with specific indicators`,
  },
  appendices: {
    prompt: `Write the **Data Sources and References** section only (~250-350 words). This section is a PROSE/BULLET reference list ONLY.

**CRITICAL — DO NOT WRITE ANY OF THE FOLLOWING:**
- An "Appendix List" enumerating Appendix A, B, C, etc. (the structured appendices are auto-generated from project data and appear right after this section).
- Any markdown TABLES (\`| col1 | col2 |\` rows).
- Any sub-headings like "APPENDIX — ..." or similar appendix-style tabular sections.
- Per-record breakdowns of habitats, species observations, or designated sites.

**Only** write a short opening paragraph + grouped bullet/prose references under the headings below.

Open with one short paragraph (1-2 sentences) explaining that the structured appendices that follow are auto-generated from desk study and field survey data, then list every data source consulted and reference cited, with full citations.

Use the DATA SOURCES AND REFERENCES section from the provided data. Group references under these headings:

**Online databases consulted:**
- NPWS, NBDC, GBIF, EPA, NLC 2018 — full URLs and specific records accessed.

**Standard methodological references:**
- Fossitt, J. A. (2000). *A Guide to Habitats in Ireland*. The Heritage Council.
- JNCC (2010). *Handbook for Phase 1 Habitat Survey*.
- Rodwell, J. S. (ed.) (1991-2000). *British Plant Communities* (NVC), vols 1-5.
- Smith, G. F. et al. (2011). *Best Practice Guidance for Habitat Survey and Mapping*. The Heritage Council.

**Legislation:**
- EU Habitats Directive (92/43/EEC) — Annex I habitats
- Wildlife Acts 1976–2021 (Ireland)
- Flora Protection Order 2022

Add any further project-specific references actually consulted. Format as a structured reference list.`,
  },
}

// ---------------------------------------------------------------------------
// Protected Species Report
// ---------------------------------------------------------------------------
const PROTECTED_SPECIES_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Purpose of the protected species assessment at the project site
2. Legislation covered: Wildlife Acts 1976-2021, EU Habitats Directive (Annex II, IV, V), EU Birds Directive (Annex I), Flora (Protection) Order 2022, Irish Red Lists
3. Species groups assessed
4. Scope and objectives of the survey programme`,
  },
  methodology: {
    prompt: `Write the Methodology section (~500-600 words). Include:
1. **Desk Study** — NPWS, NBDC, GBIF records for the area
2. **Mammal Surveys** — badger sett survey (NRA 2009 methodology), otter survey (sprainting sites, holts, couches, territories), other mammals
3. **Bat Assessment** — preliminary roost assessment, activity surveys (reference BCIreland guidelines, Collins 2016)
4. **Amphibian Survey** — smooth newt, common frog: pond assessment, torch survey methodology
5. **Botanical Survey** — rare/protected plant search, Flora Protection Order species focus
6. Survey dates, weather conditions, and effort for each survey type
7. **Limitations** — seasonal constraints, survey coverage, detection probability`,
  },
  results: {
    prompt: `Write the Results section (~800-1000 words). Present findings by species group:

### 3.1 Mammals
- Evidence recorded: sightings, field signs (prints, droppings, setts, holts, paths)
- Location within the site, GPS coordinates where available
- Population/activity assessment

### 3.2 Bats
- Roost assessment results, species detected, activity levels
- Key foraging and commuting areas

### 3.3 Birds (protected species focus)
- Annex I species, BoCCI Red-listed species recorded
- Breeding evidence, territory assessment

### 3.4 Amphibians & Reptiles
- Ponds assessed, smooth newt/common frog records
- Habitat Suitability Index scores if calculated

### 3.5 Flora
- Flora Protection Order species search results
- Notable or indicator plant species

Include both positive findings and confirmed absences. State survey confidence.`,
    maxTokens: 3000,
  },
  assessment: {
    prompt: `Write the Species Assessments section (~500-600 words). For each confirmed/potential protected species:
1. Legal protection status (specific legislation and schedule/annex)
2. Conservation status — Irish Red List category, Article 17 reporting status
3. Population importance (local, county, national, international scale)
4. Sensitivity to the proposed development
5. Impact pathways: habitat loss, disturbance, fragmentation, pollution, barrier effects
6. Assessment of significance for each species`,
  },
  mitigation: {
    prompt: `Write the Mitigation Measures section (~500-600 words). Species-specific mitigation:
1. **Badger** — exclusion zones around setts (30m for main setts, 20m for subsidiary), NPWS licence if disturbance unavoidable under Section 23 of the Wildlife Acts
2. **Otter** — 30m buffer from holts, 150m during breeding (January-June), NPWS licence requirements
3. **Bats** — sensitive lighting strategy (BCIreland/ILP guidance), timing restrictions (avoid maternity season May-August), bat boxes, NPWS derogation licence under Regulation 54
4. **Nesting Birds** — seasonal clearance restrictions (1 March – 31 August per Section 40 of the Wildlife Acts)
5. **Other Species** — as applicable to findings
6. NPWS derogation licence requirements where applicable
7. Pre-construction survey requirements`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~300-400 words). Include:
1. **Further Survey Requirements** — species requiring additional survey effort, optimal timing windows
2. **Pre-construction Surveys** — update surveys needed before works commence (timing for each species)
3. **Monitoring Programme** — construction and post-construction ecological monitoring schedule
4. **Reporting Obligations** — protected species reporting to NPWS`,
  },
}

// ---------------------------------------------------------------------------
// Other / Generic Technical Report
// ---------------------------------------------------------------------------
const OTHER_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~250-350 words). Include:
1. Purpose and context of the ecological report for the project site
2. Legislative framework (Wildlife Acts 1976-2021, EU Habitats & Birds Directives)
3. Scope of the assessment
4. Guidance followed (CIEEM guidelines)
5. Report structure overview`,
  },
  methodology: {
    prompt: `Write the Methodology section (~300-400 words). Include:
1. Desk study sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts
2. Field survey methods, dates, weather conditions
3. Any specialist survey methods employed
4. Limitations and constraints`,
  },
  results: {
    prompt: `Write the Results section (~600-800 words). Include:
1. Desk study findings — designated sites, species records, habitat data
2. Field survey findings — habitats, species observations
3. Notable or protected species/habitats identified
4. Present findings organised by ecological receptor or theme

Use markdown sub-headings and tables where appropriate.`,
    maxTokens: 3000,
  },
  discussion: {
    prompt: `Write the Discussion section (~400-500 words). Include:
1. Interpretation of results in the context of the proposed development
2. Ecological significance of findings
3. Potential impacts on identified receptors
4. Cumulative effects consideration
5. Key ecological constraints and sensitivities`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~300-400 words). Include:
1. Mitigation measures for identified impacts
2. Further survey requirements with optimal timing
3. Ecological monitoring recommendations
4. Biodiversity enhancement opportunities`,
  },
}

// ---------------------------------------------------------------------------
// Master registry
// ---------------------------------------------------------------------------
export const SECTION_PROMPTS: Record<string, Record<string, SectionPromptConfig>> = {
  pea: PEA_PROMPTS,
  ecia: ECIA_PROMPTS,
  aa_screening: AA_SCREENING_PROMPTS,
  aa_stage2: NIS_PROMPTS,
  nia: NIS_PROMPTS,
  bat_survey: BAT_SURVEY_PROMPTS,
  bird_survey: BIRD_SURVEY_PROMPTS,
  habitat_survey: HABITAT_SURVEY_PROMPTS,
  protected_species: PROTECTED_SPECIES_PROMPTS,
  other: OTHER_PROMPTS,
}

/**
 * Get the prompt config for a specific report type and section.
 * Returns null if no specific prompt exists (falls back to generic in route.ts).
 */
export function getSectionPrompt(
  reportType: string,
  sectionId: string
): SectionPromptConfig | null {
  return SECTION_PROMPTS[reportType]?.[sectionId] ?? null
}

/**
 * Get the max tokens for a specific report type and section.
 * Defaults to 2000 if no override exists.
 */
export function getSectionMaxTokens(reportType: string, sectionId: string): number {
  return SECTION_PROMPTS[reportType]?.[sectionId]?.maxTokens ?? DEFAULT_MAX_TOKENS
}
